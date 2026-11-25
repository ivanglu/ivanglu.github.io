"""Tests for the data pipeline (tools/build_data.py).

    python3 -m unittest financeiq/tools/test_build_data.py

These use small made-up filings, so they run offline.
"""
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_data as bd


def fact(end, val, filed, form="10-K", start=None, accn="0000000000-00-000001"):
    f = {"end": end, "val": val, "filed": filed, "form": form, "accn": accn}
    if start:
        f["start"] = start
    return f


def tag(*facts, unit="USD"):
    return {"units": {unit: list(facts)}}


class AnnualFacts(unittest.TestCase):
    def test_keeps_the_original_filing_not_the_restatement(self):
        facts = {"Revenues": tag(
            fact("2023-12-31", 100, "2024-02-01", start="2023-01-01"),
            fact("2023-12-31", 105, "2025-02-01", start="2023-01-01"),  # restated a year later
        )}
        got = bd.annual_facts(facts, "Revenues", flow=True)
        self.assertEqual(got["2023-12-31"]["val"], 100)

    def test_ignores_quarterly_periods(self):
        facts = {"Revenues": tag(
            fact("2023-12-31", 30, "2024-02-01", start="2023-10-01"),   # one quarter
            fact("2023-12-31", 100, "2024-02-01", start="2023-01-01"),  # full year
        )}
        self.assertEqual(bd.annual_facts(facts, "Revenues", flow=True)["2023-12-31"]["val"], 100)

    def test_ignores_quarterly_reports_for_flows(self):
        facts = {"Revenues": tag(fact("2023-12-31", 100, "2024-05-01", form="10-Q", start="2023-01-01"))}
        self.assertEqual(bd.annual_facts(facts, "Revenues", flow=True), {})

    def test_53_week_year_counts_as_a_full_year(self):
        self.assertTrue(bd.is_full_year({"start": "2022-09-25", "end": "2023-09-30"}))   # 370 days
        self.assertFalse(bd.is_full_year({"start": "2023-01-01", "end": "2023-06-30"}))
        self.assertFalse(bd.is_full_year({"end": "2023-06-30"}))

    def test_wrong_unit_is_ignored(self):
        facts = {"Revenues": tag(fact("2023-12-31", 100, "2024-02-01", start="2023-01-01"), unit="EUR")}
        self.assertEqual(bd.annual_facts(facts, "Revenues", flow=True), {})

    def test_balance_sheet_prefers_10k_over_later_10q(self):
        facts = {"Assets": tag(
            fact("2023-12-31", 999, "2024-05-01", form="10-Q"),
            fact("2023-12-31", 500, "2024-02-01"),
        )}
        self.assertEqual(bd.annual_facts(facts, "Assets", flow=False)["2023-12-31"]["val"], 500)


class Pick(unittest.TestCase):
    def test_first_tag_with_a_value_wins(self):
        a = {"2023-12-31": fact("2023-12-31", 1, "2024-02-01")}
        b = {"2023-12-31": fact("2023-12-31", 2, "2024-02-01")}
        self.assertEqual(bd.pick([a, b], "2023-12-31")["val"], 1)
        self.assertEqual(bd.pick([{}, b], "2023-12-31")["val"], 2)
        self.assertIsNone(bd.pick([{}, {}], "2023-12-31"))

    def test_a_10k_value_under_a_later_tag_beats_a_10q_value_under_an_earlier_tag(self):
        from_10q = {"2023-12-31": fact("2023-12-31", 53, "2024-05-01", form="10-Q")}
        from_10k = {"2023-12-31": fact("2023-12-31", 46, "2024-02-01")}
        self.assertEqual(bd.pick([from_10q, from_10k], "2023-12-31")["val"], 46)
        self.assertIsNone(bd.pick([from_10q], "2023-12-31", annual_only=True))
        self.assertEqual(bd.pick([from_10q], "2023-12-31")["val"], 53)


class TotalDebt(unittest.TestCase):
    def total(self, values):
        return bd.total_debt(lambda key, end: values.get(key), "x")[0]

    def test_noncurrent_plus_current_plus_commercial_paper(self):
        # Apple's layout: term debt (non-current), term debt (current), commercial paper
        self.assertEqual(self.total({"ltDebtNoncurrent": 70, "ltDebtCurrent": 10, "shortTermBorrowings": 2}), 82)

    def test_debt_current_line_replaces_the_separate_current_pieces(self):
        # PepsiCo's layout: "short-term debt obligations" already contains the current part of
        # long-term debt, so the separately tagged current maturities must not be used instead.
        self.assertEqual(self.total({"ltDebtNoncurrent": 42, "debtCurrent": 7, "ltDebtCurrent": 4}), 49)

    def test_combined_long_term_tag_used_when_there_is_no_noncurrent_line(self):
        self.assertEqual(self.total({"ltDebtAll": 80, "shortTermBorrowings": 5}), 85)

    def test_all_in_long_term_figure_used_when_no_current_line_exists(self):
        # Alphabet's layout: only a non-current line on the balance sheet, plus a total in the notes
        self.assertEqual(self.total({"ltDebtNoncurrent": 48.5, "ltDebtAll": 49.1}), 49.1)

    def test_total_tag_wins(self):
        self.assertEqual(self.total({"debtTotalTag": 99, "ltDebtNoncurrent": 80}), 99)

    def test_parts_are_returned_for_checking(self):
        total, parts = bd.total_debt(lambda k, e: {"ltDebtNoncurrent": 70, "ltDebtCurrent": 10}.get(k), "x")
        self.assertEqual((total, [v for _, v in parts]), (80, [70, 10]))

    def test_nothing_reported_returns_none(self):
        self.assertIsNone(self.total({}))


class Splits(unittest.TestCase):
    def test_four_for_one_split_is_detected_and_applied(self):
        # FY2019 was reported as 100 shares, then restated to 400 after a 4-for-1 split.
        shares = {
            "2018-12-31": [("2019-02-01", 110)],                       # only in the old filing
            "2019-12-31": [("2020-02-01", 100), ("2021-02-01", 400)],
            "2020-12-31": [("2021-02-01", 390)],
        }
        eps = {
            "2018-12-31": [("2019-02-01", 8.0)],
            "2019-12-31": [("2020-02-01", 10.0), ("2021-02-01", 2.5)],
            "2020-12-31": [("2021-02-01", 3.0)],
        }
        s, e, splits = bd.split_adjust(shares, eps)
        self.assertEqual(splits, [("2021-02-01", 4.0)])
        self.assertEqual(s["2018-12-31"], 440)      # 110 x 4
        self.assertEqual(s["2019-12-31"], 400)      # already restated
        self.assertEqual(e["2018-12-31"], 2.0)      # 8.00 / 4
        self.assertEqual(e["2020-12-31"], 3.0)

    def test_two_splits_multiply(self):
        shares = {
            "2018-12-31": [("2019-02-01", 10)],
            "2019-12-31": [("2020-02-01", 10), ("2021-02-01", 50)],    # 5-for-1
            "2021-12-31": [("2022-02-01", 50), ("2023-02-01", 150)],   # 3-for-1
        }
        s, _, splits = bd.split_adjust(shares, {})
        self.assertEqual([r for _, r in splits], [5.0, 3.0])
        self.assertEqual(s["2018-12-31"], 150)      # 10 x 5 x 3

    def test_buybacks_are_not_mistaken_for_a_split(self):
        shares = {"2019-12-31": [("2020-02-01", 100), ("2021-02-01", 97)]}
        s, _, splits = bd.split_adjust(shares, {})
        self.assertEqual(splits, [])
        self.assertEqual(s["2019-12-31"], 97)

    def test_split_detected_from_eps_when_no_share_count_is_tagged(self):
        eps = {"2019-12-31": [("2020-02-01", 60.0)], "2020-12-31": [("2021-02-01", 58.6), ("2023-02-01", 2.93)]}
        _, e, splits = bd.split_adjust({}, eps)
        self.assertEqual(splits, [("2023-02-01", 20.0)])
        self.assertEqual(e["2019-12-31"], 3.0)


class QualityChecks(unittest.TestCase):
    def year(self, fy, **o):
        y = {"fy": fy, "assets": 100, "liabilities": 60, "equity": 40, "revenue": 50, "grossProfit": 20,
             "eps": 1.0, "dilutedShares": 10, "netIncome": 10}
        y.update(o)
        return y

    def test_clean_data_has_no_warnings(self):
        self.assertEqual(bd.quality_checks([self.year(2022), self.year(2023)]), [])

    def test_balance_sheet_that_does_not_add_up(self):
        w = bd.quality_checks([self.year(2023, liabilities=40)])
        self.assertTrue(any("assets differ" in x for x in w))

    def test_missing_fiscal_year(self):
        self.assertTrue(any("gap" in x for x in bd.quality_checks([self.year(2021), self.year(2023)])))

    def test_unadjusted_split_shows_up_as_a_share_count_jump(self):
        w = bd.quality_checks([self.year(2022), self.year(2023, dilutedShares=40, eps=0.25)])
        self.assertTrue(any("share count changed" in x for x in w))

    def test_gross_profit_above_revenue(self):
        self.assertTrue(any("gross profit" in x for x in bd.quality_checks([self.year(2023, grossProfit=60)])))


class BuiltData(unittest.TestCase):
    """Checks on the real data file, if it has been built."""

    @classmethod
    def setUpClass(cls):
        path = bd.OUT / "financials.json"
        cls.data = json.loads(path.read_text()) if path.exists() else None

    def setUp(self):
        if self.data is None:
            self.skipTest("data/financials.json has not been built")

    def test_every_listed_company_was_built(self):
        self.assertEqual({c["ticker"] for c in self.data["companies"]}, set(bd.COMPANIES))

    def test_core_figures_are_present_and_in_dollars(self):
        for c in self.data["companies"]:
            for y in c["years"]:
                for key in ("revenue", "netIncome", "assets", "operatingCashFlow"):
                    self.assertIsNotNone(y[key], f"{c['ticker']} FY{y['fy']} {key}")
                self.assertGreater(y["revenue"], 1e9, f"{c['ticker']} revenue should be whole dollars, not millions")
                if y["dilutedShares"] is not None:
                    self.assertGreater(y["dilutedShares"], 1e7, f"{c['ticker']} FY{y['fy']} shares should be whole shares")

    def test_fiscal_years_are_consecutive_and_links_point_to_sec(self):
        for c in self.data["companies"]:
            years = [y["fy"] for y in c["years"]]
            self.assertEqual(years, list(range(years[0], years[0] + len(years))), c["ticker"])
            for y in c["years"]:
                self.assertTrue(y["url"].startswith("https://www.sec.gov/Archives/edgar/data/"))

    def test_eps_agrees_with_net_income_over_shares_in_the_latest_year(self):
        for c in self.data["companies"]:
            y = c["years"][-1]
            if y["eps"] and y["dilutedShares"]:
                implied = y["netIncome"] / y["dilutedShares"]
                self.assertAlmostEqual(implied, y["eps"], delta=max(0.06, 0.06 * abs(y["eps"])), msg=c["ticker"])


if __name__ == "__main__":
    unittest.main()
