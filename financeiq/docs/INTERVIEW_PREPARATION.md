# Interview preparation

Ivan, this file is for you. Its job is to make sure you can explain every part of FinanceIQ yourself,
without the site open and without notes.

**How to use it.** For each section: read it, close it, and say the explanation out loud. Then do the exercise.
If you cannot do the exercise, you do not understand that part yet, and it is far better to find that out here
than in an interview. Where your own view matters (most places), there is no model answer on purpose.

A rule for interviews: never claim more than is true. "An AI assistant wrote most of the code; here is what I
decided, what I checked and what I learned" is a strong answer when you can then explain the finance without
help. "I built all of it myself" is a weak answer the moment someone asks a follow-up question.

---

## 1. Reading the three financial statements

| Statement | Question it answers | Covers |
|---|---|---|
| Income statement | Did the company make a profit? | A period (one year) |
| Balance sheet | What does it own and owe? | One day (the last day of the year) |
| Cash flow statement | Where did the cash come from and go? | A period (one year) |

**Income statement, top to bottom:** revenue → minus cost of making the product = gross profit → minus
operating costs (research, marketing, administration) = operating income → minus interest, plus or minus other
items = pre-tax income → minus tax = net income. Net income ÷ shares = earnings per share (EPS).

**Balance sheet:** assets = liabilities + equity. Always. Assets are what the company controls. Liabilities are
what it owes. Equity is what is left for the owners. "Current" means due or usable within a year.

**Cash flow statement, three parts:** operating (cash from running the business), investing (buying and
selling long-lived assets and investments; capital spending is here), financing (borrowing, repaying,
dividends, buybacks).

**Exercise 1.** Open Apple's latest 10-K from the Sources table on the Comparison page. Find revenue, operating
income, net income, total assets and operating cash flow, and check each against the site. Note which page of
the filing each came from.

**Exercise 2.** In the same filing, check that total assets equals total liabilities plus shareholders' equity.

---

## 2. Why cash flow differs from net income

Net income follows accounting rules about *when* to count something. Cash flow counts money actually moving.
The main differences:

- **Depreciation.** A $10B factory is paid for in cash in year one, but the cost hits profit a little each
  year for decades. So in later years profit carries a cost that takes no cash.
- **Timing of customer payments.** A sale counts as revenue when the product is delivered, even if the
  customer pays 60 days later. Subscriptions paid up front work the other way: cash first, revenue later.
- **Stock-based pay.** Paying staff in shares is an expense on the income statement and costs no cash.
- **Capital spending.** Building data centres is cash going out today that does not reduce profit today.

That last one is the story of Microsoft in this data: operating cash flow hit a record while free cash flow
fell, because capital spending rose so fast.

**Exercise 3.** On the Comparison page pick Coca-Cola and PepsiCo. Coca-Cola's free cash flow is far below its
net income in the latest two years. Find the reason in the cash flow statement of its 10-K. (Start by comparing
operating cash flow with net income, then read what the company says about the difference.)

**Likely question:** "Which would you trust more, profit or cash flow?" Have a view and a reason. A good
answer explains what each one can hide.

---

## 3. How the ratios are calculated

You should be able to write each of these from memory and say what it tells you.

| Ratio | Formula | Tells you |
|---|---|---|
| Gross margin | gross profit ÷ revenue | Pricing power and production cost |
| Operating margin | operating income ÷ revenue | Profitability of the core business |
| Net margin | net income ÷ revenue | What owners keep from each sales dollar |
| Revenue CAGR | (end ÷ start)^(1 ÷ years) − 1 | Smoothed yearly growth |
| Free cash flow | operating cash flow − capital spending | Cash left after maintaining and growing the business |
| Debt-to-equity | debt ÷ equity | Reliance on borrowed money |
| Current ratio | current assets ÷ current liabilities | Ability to pay bills due within a year |
| Interest coverage | operating income ÷ interest expense | Safety margin on debt payments |
| Net debt ÷ EBITDA | (debt − cash) ÷ EBITDA | Years of operating profit needed to clear net debt |
| ROE | net income ÷ average equity | Return on owners' money |
| ROA | net income ÷ average assets | Return on everything the company controls |
| Asset turnover | revenue ÷ average assets | Sales generated per dollar of assets |
| ROIC | operating income × (1 − tax rate) ÷ average (debt + equity) | Return on all capital, however financed |

**Why "average" equity or assets?** Profit is earned over the whole year, so it is compared with the average
amount of capital in use during the year, not the amount on the last day.

**Exercise 4.** By hand, with a calculator: take Walmart's and Costco's latest figures from the Sources table
and compute net margin, free cash flow and debt-to-equity for each. Compare with the site.

**Exercise 5.** Why does CAGR use a root instead of dividing total growth by the number of years? Work out both
for 100 → 200 over 3 years and explain why one is wrong.

---

## 4. Why ROIC matters

Growth only creates value if the company earns more on new investment than that investment costs. ROIC measures
the return on all the money put into the business, by lenders and shareholders together.

- ROIC above the cost of capital (often taken as roughly 8–10%): each dollar reinvested is worth more than a dollar.
- ROIC below it: the company destroys value by growing.

ROIC also avoids a trap in ROE. A company can raise ROE just by borrowing more or buying back shares, without
the business getting any better. ROIC puts debt in the denominator, so that trick does not work.

**Splitting ROIC in two:** ROIC ≈ operating margin after tax × capital turnover. A grocer earns a thin margin
but turns its capital over fast. A drinks brand earns a fat margin on capital that turns slowly. Both can reach
the same ROIC by opposite routes.

**Exercise 6.** On the Coca-Cola vs PepsiCo research page, the metrics table shows operating margin and asset
turnover for both. Explain why their ROICs are close even though their margins are far apart.

**Exercise 7.** Apple's ROIC on the site is very high. Open the Methodology page, find how FinanceIQ defines
invested capital, and explain why that definition flatters Apple. What would a stricter definition change?

---

## 5. How a DCF works

**The idea in one sentence:** a business is worth the cash it will produce in the future, with each future
dollar counted as less than a dollar today.

**Why less?** A dollar today can be invested and grow. If you can earn 9% a year, $1.00 next year is worth
$1 ÷ 1.09 = $0.917 today, and $1.00 in five years is worth $1 ÷ 1.09⁵ = $0.65.

**The steps FinanceIQ follows:**

1. Start from the latest free cash flow to the firm.
2. Grow it at an assumed rate for 5 to 10 years.
3. Discount each year back to today: cash ÷ (1 + rate)^year.
4. Add a terminal value for all the years after that:
   final-year cash × (1 + terminal growth) ÷ (discount rate − terminal growth).
5. The total is the **enterprise value**: the value of the whole business.
6. Subtract debt (it belongs to lenders), add cash: that is the **equity value**.
7. Divide by the number of shares.

**FCFF vs FCFE.** Free cash flow to the *firm* is cash available to lenders and shareholders, before interest.
Free cash flow to *equity* is what is left for shareholders after interest. If you value the whole firm and
then subtract debt, you must use FCFF. Using cash that is already after interest and then subtracting debt as
well would charge for the debt twice. FinanceIQ approximates FCFF as operating cash flow − capex + after-tax
interest.

**Exercise 8.** The worked example in the test file: starting cash flow 100, growth 10%, discount rate 10%, 5
years, terminal growth 2%, debt 200, cash 50, 10 shares. Do it on paper. You should get an enterprise value of
1,775 and 162.50 per share. (When growth equals the discount rate, every year's present value is exactly 100.)

**Exercise 9.** On the Valuation page, note what share of the enterprise value comes from the terminal value.
Why is it so large? What does that say about how much to trust the result?

---

## 6. Why discount rates affect valuations so much

The discount rate appears in the denominator once for every year, and in the terminal value formula as
(discount rate − terminal growth), which is a small number. Small changes to a small denominator make large
changes to the answer.

Example: terminal value multiplier = 1 ÷ (r − g). At r = 9%, g = 2.5% that is 15.4. At r = 8% it is 18.2. One
point off the discount rate raises the largest piece of the valuation by 18%.

This is also why share prices of fast-growing companies fall when interest rates rise: more of their value
sits in distant years.

**Exercise 10.** On the Valuation page, change only the discount rate from 9% to 10% and note the percentage
change in value per share. Then reset and change only the growth rate by one point. Which matters more, and why?

**Likely question:** "So is the stock undervalued?" The honest answer is that the model cannot tell you. It
tells you what you would have to believe about growth and risk for a given price to make sense.

---

## 7. How the financial data is retrieved

Be ready to explain this in about four sentences:

1. Every US public company files an annual report, the 10-K, with the SEC. Each number in it carries a
   standard tag.
2. The SEC publishes those tagged numbers free through a service called EDGAR.
3. A Python script (`tools/build_data.py`) downloads the data for 38 companies, picks the right tag for each
   line item, keeps the figure from the original report for each year, adjusts per-share figures for stock
   splits and runs consistency checks.
4. It writes one file, `financials.json`, which the website loads. All ratios are then calculated in the
   browser by `js/calc.js`.

**Problems worth knowing about**, because they show what real data is like:

- Companies use different tags for the same thing (five for revenue alone).
- The same year appears in three different reports, sometimes restated.
- Stock splits make old EPS figures incomparable unless adjusted.
- "Total debt" is not one number in a filing. It has to be added up, and the first rule for doing it was wrong
  for PepsiCo. It was caught by reading the balance sheet. The details are in `FINANCIAL_VALIDATION.md`.

**Exercise 11.** Run `python3 financeiq/tools/build_data.py AAPL` and read the output. Then open
`build_data.py`, find the `FLOW` dictionary and explain why "revenue" has five entries.

**Exercise 12.** Read section 5 of `FINANCIAL_VALIDATION.md` and explain discrepancy #1 in your own words: what
was wrong, how it was found and how it was fixed.

---

## 8. How the scoring algorithm works

Three steps, all in `js/calc.js`:

1. **Normalize.** Each of 19 measures is turned into 0–100 points on a straight line between two published
   levels. Operating margin: 0% → 0 points, 30% → 100 points, so 15% → 50 points. Values beyond the ends are capped.
2. **Average within a category.** Five categories: growth, profitability, stability, cash flow, efficiency.
3. **Weighted average across categories.** Default 25 / 25 / 20 / 20 / 10. The sliders change the weights, which
   are always rescaled to total 100%.

**Design choices you should be able to defend or criticise:**

- *Missing data is skipped, not scored as zero.* Otherwise a company would be punished for how it files.
- *Negative equity removes debt-to-equity and ROE.* The ratios stop making sense. Leverage is still measured
  two other ways.
- *The levels are judgement calls.* They are published so anyone can disagree.
- *One scale for all industries.* Simple and transparent, but unfair to low-margin industries.

**Exercise 13.** Costco's profitability score is low. Is Costco an unprofitable business? Use the Benchmarks
page to make your argument.

**Exercise 14.** Pick one threshold in the scoring table that you think is wrong. Say what you would change it
to and why. (There is no right answer. Having a reasoned one is the point.)

**Exercise 15.** Set the weights to the Conservative preset. Which of the two default companies gains and
which loses, and which category explains it?

---

## 9. Why industry comparisons matter

Ratios reflect the kind of business as much as its quality. A supermarket: thin margin, fast turnover, little
debt needed. A software firm: fat margin, few physical assets. A drinks company: steady enough to carry debt
that would be reckless for a chip maker whose sales swing with the economy.

So "Costco's net margin is 3%" means nothing alone. Against other retailers it is ordinary to good.

**Limits of FinanceIQ's benchmarks, which you should volunteer:** each peer group is seven to nine hand-picked
large companies, not the whole industry, so the site shows "rank 3 of 8", not a percentile.

**Exercise 16.** Why are banks excluded from FinanceIQ? (Think about what "debt" and "revenue" mean for a bank.)

---

## 10. How AI was used

Get this exactly right. It is the question you are most likely to be asked.

**What is true about the project:**

- An AI coding assistant (Claude Code) wrote most of the code, the data pipeline, the tests and the
  documentation, from a written specification.
- AI does no calculation on the site. Every number comes from fixed formulas that can be tested.
- The "Strengths and risks" summaries are AI-written and labelled as such on the page.
- The research case studies and the personal sections of the About page are yours and contain no AI writing.

**What only you can say**, and what you need to make true before any interview:

- Which parts of the specification were your ideas.
- What you checked yourself (the exercises above count).
- What you changed, questioned or disagreed with.
- What you learned that you did not know before.

Write your own account in `about.txt` under "How I used AI". Be specific. "I checked Apple's revenue against
the income statement in its 10-K and it matched" is worth more than any general statement.

**Likely questions:**

- "Could you have built this without AI?" (Honest answer, then what you would have needed to learn.)
- "How do you know the AI's code is correct?" (Tests, validation against filings, the independent
  recalculation, and one real bug that those checks caught.)
- "What did the AI get wrong?" (See `FINANCIAL_VALIDATION.md`, section 5.)
- "Show me one formula in the code and explain it." (Practise with `dcf()` and `scale()` in `js/calc.js`.)

**Exercise 17.** Open `js/calc.js`, find the `dcf` function and explain every line to someone else.

**Exercise 18.** Open `tests/index.html` in a browser. Pick three tests and explain what each one proves.

---

## 11. The application's limitations

Being able to list these without being asked is a sign of real understanding.

1. Backward-looking: annual reports only, sometimes many months old.
2. 38 large US companies. No banks, insurers or property trusts.
3. No live prices, so no valuation multiples.
4. Debt excludes leases, which are large for retailers and restaurants.
5. Free cash flow is not adjusted for stock-based pay or acquisitions.
6. The health score uses one scale for all industries.
7. The DCF uses one growth rate and illustrative discount rates.
8. The data depends on how each company tagged its filing.
9. AI summaries cover 16 companies and do not update automatically.
10. Only the latest year of each company was matched against its filing.

**Exercise 19.** Pick the limitation you think matters most and describe how you would fix it.

---

## 12. The two-minute demonstration

Start at `financeiq/index.html?tour=1`, or press "Take the 2-minute tour". Practise until you can do it without
reading the tour text.

| Time | Page | Do | Say (in your own words) |
|---|---|---|---|
| 0:00 | Overview | Show Apple and Microsoft loaded. Switch one company and switch back | What the tool does and where the data comes from |
| 0:25 | Financial Health | Point at the two scores and the category bars | What the score measures, and that every rule is published |
| 0:50 | Financial Health | Click Conservative. Drag one slider | Why different investors would weight things differently |
| 1:15 | Valuation | Drag the discount rate. Point at the sensitivity table | Why a DCF is a range, not a number |
| 1:45 | Research | Open one case study | Your question, your finding, your conclusion |

End with one thing you learned that surprised you. Decide in advance what it is.

**Do not** demo a research page that you have not written yet.

---

## 13. Questions to practise

**Finance**

1. What is the difference between revenue, operating income and net income?
2. A company has positive net income and negative free cash flow. How is that possible? Is it a problem?
3. Why can a company with negative shareholders' equity still be healthy? Why might it not be?
4. What does a current ratio below 1 mean? Why is it normal for some retailers?
5. Two companies have the same ROE. One has far more debt. Which would you prefer, and why?
6. Why is terminal growth capped at a low number such as 2–3%?
7. What happens to a DCF value if interest rates rise? Why?
8. Why adjust EPS for stock splits? Does a split change what the company is worth?

**The project**

9. Why SEC filings and not a finance website?
10. Why is there no "buy" or "sell" on the site?
11. How did you decide the category weights? What would change if you doubled the weight on growth?
12. What was the hardest data problem?
13. How do you know the numbers are right?
14. What would you add with another month?

**About you**

15. Why finance? Why did you build a tool to learn it?
16. Which of the three case studies changed your mind about something?
17. What do you understand now that you did not when you started?

For 15 to 17 there is nothing to memorise. Write your answers down once, in your own words, and they will be there when you need them.
