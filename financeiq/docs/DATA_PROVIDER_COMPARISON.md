# Data provider comparison

Researched on 25 November 2026

No free API plan from any provider checked here clearly permits a public website to display raw prices, and none clearly permits public display of derived values either. Every free or low-cost self-serve plan is licensed for personal or internal use, and several (FMP, Finnhub, Nasdaq Data Link, EODHD) name derived output explicitly as restricted. The only free way found to show raw price charts publicly is to embed a TradingView widget, which keeps the data on TradingView's side and requires its attribution to stay visible. The cheapest published plan that lists external display is Twelve Data Venture at 149 USD per month (124 USD per month billed annually); Tiingo publishes a redistribution licence at 250 USD per month for start-ups.

How to read this file: "Verified" means the statement was read on the provider's own page on the research date, and the URL is given. Quotes are short extracts. Prices and limits change often. Nothing here is legal advice. Get written confirmation from the provider before publishing anything.

## Summary table

| Provider | Free tier | Cheapest relevant paid plan | Adjusted EOD + volume | Analyst estimates | Public display of raw prices | Public display of derived data | Verified? |
|---|---|---|---|---|---|---|---|
| Alpha Vantage | 25 requests/day. Daily series limited to latest 100 points on free keys | 49.99 USD/month (75 requests/min) | Daily adjusted is premium only. Weekly adjusted is not marked premium | Yes: EARNINGS (estimates and surprise) and EARNINGS_ESTIMATES (with revision history), not marked premium | No. Licence is personal, non-commercial; wider use needs a written agreement | Not addressed separately. Same personal-use limit applies | Yes (terms, pricing, docs) |
| Tiingo | 50 requests/hour, 1,000/day, 500 symbols/month, 30+ years of prices | 30 USD/month individual. Redistribution licence 250 USD/month (start-up) | Yes: raw and adjusted OHLCV, dividends, splits, ETFs | Not verified (none seen) | No on self-serve plans. Yes with a redistribution licence | Not addressed. Self-serve plans are internal use only | Yes (pricing, docs, product pages) |
| FMP | 250 calls/day, 5 years, about 87 symbols only | Starter 29 USD/month (19 USD/month billed yearly), US coverage, 5 years | Yes, including dividend-adjusted series | Yes: financial estimates, earnings report, grades, price targets (limits vary by plan) | No. Needs a Data Display and Licensing Agreement | No. Explicitly prohibited on individual plans | Yes (pricing, terms) |
| Polygon.io, now Massive | 5 calls/min, 2 years, end of day | Stocks Starter 29 USD/month, 5 years. Business plan 2,499 USD/month | Corporate actions listed as available. Adjusted flag not verified today | Only via Benzinga partner data (99 USD/month per dataset, individual use) | No on individual plans | Unclear. Licence bars providing a service to other users | Yes (pricing, both terms documents) |
| Twelve Data | 8 credits/min, 800/day | Grow 29 USD/month (personal). Venture 149 USD/month (commercial, external display) | Yes: `adjust` parameter, default `splits`. Volume included | "Analysis data" (analysts' forecasts) listed on Ultra. Exact endpoints not verified | No on Basic, Grow, Pro, Ultra. Venture lists "External display data access" | Most favourable wording found, but still unclear. Needs written confirmation | Yes (pricing, business pricing, terms, docs) |
| EODHD | 20 calls/day, 1 year of history | 19.99 USD/month (personal EOD). Commercial price not published | Yes: adjusted close, split-adjusted volume, separate splits and dividends API, ETFs | Yes, inside the Fundamentals feed (59.99 USD/month personal): estimates, trend, revision counts, surprise history | No on personal plans. Commercial licence required | No on personal plans. Derived outputs are part of the licensing test | Yes (pricing, terms, help pages) |
| Nasdaq Data Link | No free EOD price product found today | Sharadar Equity Prices, premium, price shown only after login | Yes (Sharadar: adjusted and unadjusted OHLCV, corporate actions) | Not verified | No without a service order that allows it | No. Derived data is internal use only by default | Partly (terms and product page yes, price no) |
| Stooq | Free bulk download and per-symbol history, no API key | None | Daily US data offered. Adjustment method not verified | No | No. Personal use only; redistribution needs Stooq's consent | Not addressed. Personal-use statement still applies | Yes (download page, terms) |
| Yahoo Finance (unofficial) | No official API. Unofficial scraping only | None | Not verified (no official documentation) | Not verified | No. Terms forbid reproduction and automated collection | No. Terms forbid automated collection in the first place | Yes (Yahoo terms only) |
| TradingView widgets (added) | Free embeddable chart widgets | None needed | Charts only. No data reaches your script | No | Yes, as an embedded widget with TradingView attribution left intact | Not possible. The widget does not give you data to calculate with | Yes (policies, widget docs) |
| Finnhub (added, checked briefly) | Not verified | Not verified | Not verified | Not verified | No. Plans are personal use | No. Terms name "derived results" | Terms only |

## Alpha Vantage

- Free tier: 25 API requests per day. Source: https://www.alphavantage.co/premium/
- Paid: 49.99 USD/month for 75 requests/min, then 99.99, 149.99, 199.99, 249.99 USD/month for higher rates. Annual plans are listed at about ten times the monthly price. Source: same page.
- Daily prices: `TIME_SERIES_DAILY` returns raw prices. On a free key only `outputsize=compact` works, which is the latest 100 data points. The docs say "The \"full\" outputsize is available to premium keys." `TIME_SERIES_DAILY_ADJUSTED` (adjusted close, splits, dividends, 25+ years) is marked as a premium function. Source: https://www.alphavantage.co/documentation/
- Weekly: `TIME_SERIES_WEEKLY_ADJUSTED` covers 25+ years and carried no premium label in the docs today. This could support 5 years of weekly adjusted history on a free key, but that was not tested because no API key was used.
- Splits: a `SPLITS` endpoint exists. ETFs are supported symbols according to the docs.
- Estimates: `EARNINGS` returns quarterly EPS with "analyst estimates and surprise metrics". `EARNINGS_ESTIMATES` returns EPS and revenue estimates "along with analyst count and revision history". Neither carried a premium label today. Whether the revision history is timestamped point-in-time data was not verified.
- Licence: the terms grant use "for personal, non-commercial use, unless you and Alpha Vantage have agreed otherwise in writing". Commercial use includes any purpose beyond activities "that are private and individual in nature". A public website is not private and individual, so public display is not covered. Derived data is not mentioned. Source: https://www.alphavantage.co/terms_of_service/ (PDF).
- Attribution: no attribution clause in the terms.
- Contact for wider rights: premium@alphavantage.co (address given in the terms).

## Tiingo

- Free (Starter): 50 requests/hour, 1,000 requests/day, 500 unique symbols/month, 1 GB/month, 30+ years of price history, 5 years of fundamentals. Source: https://www.tiingo.com/about/pricing
- Paid: Power 30 USD/month or 300 USD/year for individuals. Internal commercial use 50 USD/month or 499 USD/year. Source: same page.
- Data: EOD includes "Open, High, Low, Close, Volume, Dividend, Splits - both Raw and Adjusted prices". US equities, ETFs and mutual funds, history from 1962. Source: https://www.tiingo.com/products/end-of-day-stock-price-data
- Estimates: no analyst estimates, surprises or revisions product was seen on the pages read. Not verified as absent.
- Licence: the pricing page labels the plans "Internal Use Only" and says "you may not display or share the data with another person or organization." The API docs say "You may not redistribute the data in any form". Source: https://www.tiingo.com/documentation/general/overview
- Public display: a product page says "external display needs one Tiingo redistribution license" and "Our Base Equities redistribution license is $250/month for startups and $500/month for enterprise." Source: https://www.tiingo.com/products/consolidated-real-time-stock-api. The EOD product page shows the same two prices.
- Derived data: not addressed on the pages read.
- Attribution: not mentioned on the pages read. The general terms of use (https://app.tiingo.com/tos/) grant use "for your personal or internal business purposes".

## Financial Modeling Prep (FMP)

- Free (Basic): 250 calls/day, end of day data, 5 years of history, 500 MB bandwidth per 30 days. Most endpoints on Basic are "Symbol Limited to AAPL, TSLA, AMZN and 84 more". ETF and mutual fund data is "No Coverage" on Basic. Whether the 38 site tickers and SPY fall inside the free symbol list was not verified. Source: https://site.financialmodelingprep.com/developer/docs/pricing
- Paid: Starter 29 USD/month (19 USD/month billed yearly), 300 calls/min, US coverage, 5 years. Premium 69 USD/month (49 yearly), 30+ years. Ultimate 139 USD/month (99 yearly). Source: same page.
- Data: stock price and volume, unadjusted price, dividend-adjusted price, split details, all listed per plan.
- Estimates: "Financial Estimates" (annual only on Basic and Starter), "Earnings Report", stock grades, price targets and historical ratings are listed. A bulk "Earnings Surprises" endpoint is listed and is not included on Basic. Timestamped estimate revisions were not found.
- Licence, raw: the pricing page says "Displaying or redistributing data sourced from FMP requires a specific Data Display and Licensing Agreement with FMP." The terms say you may not "redistribute, republish, display, broadcast, resell, or otherwise make Market Data available to any other person". Source: https://site.financialmodelingprep.com/terms-of-service (effective 17 November 2026).
- Licence, derived: Commercial Use includes use to make available "analysis, signals, recommendations, insight, reports, or other information derived from or based on FMP Data" to anyone else, "whether or not for a fee". Individual plans may not be used for Commercial Use. This is the clearest prohibition of derived display found.
- Attribution: the terms forbid removing any attribution or notice. A specific attribution format would come with the display agreement. Not verified.
- Commercial plan prices: not verified (the commercial tab was not read). Contact given in the terms: info@financialmodelingprep.com.

## Polygon.io (now Massive)

- Branding: https://polygon.io/pricing now redirects permanently to https://massive.com/pricing.
- Free (Stocks Basic): "5 API Calls / Minute", "2 Years Historical Data", "End of Day Data", all US stock tickers, corporate actions available. Licence type personal. Source: plan data embedded in https://massive.com/pricing
- Paid, individual: Stocks Starter 29 USD/month (unlimited calls, 5 years, 15-minute delayed). Stocks Developer 79 USD/month (10 years). Stocks Advanced 199 USD/month. All are marked "Individual use only".
- Paid, business: Stocks Business 2,499 USD/month. Source: https://massive.com/business
- Data: corporate actions (splits, dividends) are listed as available on every stocks plan. The adjusted-price flag on the aggregates endpoint was not checked in the API docs today. ETFs are US-listed tickers and should be covered, not verified per symbol.
- Estimates: no native estimates were seen. Benzinga partner data (analyst ratings) is 99 USD/month per dataset for individuals.
- Licence: the licence is "solely for your own personal, non-business and non-commercial use" and "does not permit you to share Information with anyone else, develop or provide a service or application to other users". You may not "Share, redistribute, publish, sell, sublicense or rebrand Information". Source: https://massive.com/legal/market-data-terms-of-service
- Derived data: the terms treat derived data as covered "Information" when it "can identify, recalculate, reverse engineer" the source or "create a substitute". Scores and grades may fall outside that definition, but the ban on providing a service to other users still applies. Treat as not permitted without written confirmation. Source: https://massive.com/legal/individuals-terms-of-service
- Attribution: the NYSE and Nasdaq schedules attached to the market data terms contain source-attribution duties. No general attribution rule for individuals was found.

## Twelve Data

- Free (Basic): 8 API credits/min, 800 per day. Listed as "Internal non-display usage". Source: https://twelvedata.com/pricing
- Paid, personal: Grow from 29 USD/month (55 credits/min, "Internal display data access"), Pro from 99 USD/month, Ultra from 329 USD/month.
- Paid, commercial: Venture 149, 299 or 499 USD/month (124, 248, 414 billed annually). Venture lists "External display data access". Enterprise starts at 1,099 USD/month and adds "External distribution market data". Source: https://twelvedata.com/pricing-business
- Data: `time_series` costs 1 credit per symbol and has an `adjust` parameter with values `all`, `splits`, `dividends`, `none`, default `splits`. Source: https://twelvedata.com/docs/market-data/time-series. About 45 symbols once a day fits inside 800 credits. History depth on the Basic plan and US ETF coverage on Basic were not verified.
- Estimates: the pricing page lists "Analysis data" as "Pre-calculated calculations, metric trends, and analysts' forecasts" under the Ultra plan. The individual endpoint pages and their plan requirements were not verified.
- Licence, raw: the terms define Internal Use as use "solely for Customer's internal business purposes and not for redistribution or external commercial purposes". External display is allowed "only if and as expressly authorized by a Redistribution Rights Add-On or separate written agreement". Source: https://twelvedata.com/terms
- Licence, derived: the terms allow the customer to "Create Derived Data that cannot be reverse-engineered to recreate the original Data" and say "Customer retains rights to Derived Data created in compliance with this Agreement." The same terms list "Create derivative works for redistribution" as a prohibited activity. The terms do not say plainly whether derived data may be shown publicly on a Basic or Grow plan.
- Attribution: the terms mention "attribution requirements" for external display but do not state the wording. Not verified.
- Contact: sales@twelvedata.com (address given in the terms).

## EOD Historical Data (EODHD)

- Free: 20 API calls/day, 1 year of history, plus a one-time 500-call welcome bonus. Source: https://eodhd.com/pricing
- Paid, personal: EOD Historical All-World 19.99 USD/month (199.00 USD/year), 100,000 calls/day, 30+ years, dividends and splits. Fundamentals Data Feed 59.99 USD/month. All-In-One 99.99 USD/month. A 30% first-year discount was advertised until 1 December.
- Paid, commercial: no prices published. The page offers "Commercial / B2B Plans" through sales.
- Data: `adjusted_close` is adjusted for splits and dividends; volume is adjusted for splits; splits and dividends come from a separate API; ETFs are covered. Source: https://eodhd.com/financial-apis/api-for-historical-data-and-volumes
- Estimates: the Fundamentals API has an Earnings section with history (actual, estimate, surprise percent) and trend (estimates by period, EPS trend, EPS revision counts). Source: https://eodhd.com/financial-apis/stock-etfs-fundamental-data-feeds. Whether the revisions are timestamped history or only current counts was not verified.
- Licence: personal users are prohibited from "Selling, reselling, retransmitting, redistributing, displaying, or granting access to the Information". Source: https://eodhd.com/financial-apis/terms-conditions
- Commercial test: commercial use includes "any display or distribution of the data to others, including in apps, websites and products." Licensing depends on "whether the data or derived outputs will be displayed, downloaded or redistributed." Source: https://eodhd.com/help/commercial. The page does not exempt free or educational sites.
- Attribution: not mentioned on the pages read.
- Contact: sales@eodhistoricaldata.com. The site also lists "Universities & Academic Research licensing" and a 50% student discount; terms for those were not read.

## Nasdaq Data Link

- Free tier: no free end-of-day US price product was found today. The old community WIKI prices page (https://data.nasdaq.com/databases/WIKIP) and the EOD page (https://data.nasdaq.com/databases/EOD) both returned HTTP 404 with no product content.
- Paid: Sharadar Equity Prices is listed as Premium with "Adjusted and unadjusted EOD Stock prices and corporate actions" from 1998 for about 21,000 US companies. The price is shown only after login. Source: https://data.nasdaq.com/databases/SEP
- Estimates: not verified.
- Licence: you may not "redistribute, disseminate" or otherwise provide access to the information beyond the licence. On derived data: "Client may create Derived Data for internal use only" unless a service order or the provider's written approval says otherwise. Source: https://data.nasdaq.com/termsandconditions
- Attribution: not verified.

## Stooq

- Free: bulk downloads of daily, hourly and 5-minute history by region (US daily file about 600 MB), updated daily. No API key. Request limits are not documented. Source: https://stooq.com/db/h/ (opens only in a browser because of a JavaScript check).
- Data: daily US stocks and ETFs. Whether prices are split-adjusted or dividend-adjusted is not stated on the pages read. Not verified.
- Estimates: none.
- Licence: the download page says "This data is intended solely for personal use. Any commercial use is prohibited." The terms say "Redistribution of data found on the website is not allowed without the consent of Stooq." Source: https://stooq.com/terms.html
- Derived data: not addressed. Stooq is the only provider here whose terms name a simple route to permission (its consent), so an email request is worth sending.
- Attribution: none stated.
- Note: the automated-download behaviour of the site (JavaScript verification) may block a scheduled Python script. Not tested.

## Yahoo Finance (unofficial)

- There is no official public API and no pricing page. Libraries that fetch Yahoo data are unofficial and were not evaluated as providers.
- Licence: the Yahoo terms say you must not "reproduce, modify, rent, lease, sell, trade, distribute, transmit" the services or content. They also forbid collecting data "using any automated means" without "express, prior permission". Source: https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html
- Result: a scheduled script and any public display, raw or derived, are both outside the terms. Not suitable for a public site.
- Data coverage, adjustment and estimates: not verified, because there is no official documentation.

## TradingView widgets (added option)

- What it is: free embeddable chart widgets. The data is fetched and drawn by TradingView inside the widget. Your site never receives or stores the prices. Source: https://www.tradingview.com/widget-docs/getting-started/
- Fit: the docs say a widget can be integrated "into any website or app" and list finance blogs and similar sites as examples. This works on a static GitHub Pages site with no server.
- Licence: "The use of any TradingView products outside the TradingView website, without a proper attribution of TradingView, is not allowed." For widgets, "attribution should remain as was originally designed and intended." Source: https://www.tradingview.com/policies/ (section 4).
- Limits: "we do not permit commercial usage of any of our services or APIs" without a separate agreement. The site is non-commercial, so this should be acceptable, but it rules out later monetisation without a new agreement.
- Privacy: the widget FAQ says "Widgets do not set any cookies." TradingView does log the embedding page URL, widget type, symbol and visitor IP. Source: https://www.tradingview.com/widget-docs/faq/general/
- Not possible: momentum scores, P/E or grades cannot be computed from a widget. Derived values still need a data licence.
- Not verified: a page that states in plain words that widgets are free of charge.

## Finnhub (added, checked briefly)

- Terms: "All plan listed on Finnhub website is strictly for personal use unless explicitly stated otherwise." Users agree "to not redistribute or share access to data or derived results". Source: https://finnhub.io/terms-of-service
- Result: not suitable for public display of raw or derived data. Prices, limits and coverage were not checked.

## What is still unverified

- Alpha Vantage: whether `TIME_SERIES_WEEKLY_ADJUSTED`, `EARNINGS` and `EARNINGS_ESTIMATES` really work on a free key (docs show no premium label; not tested). Whether the "revision history" is timestamped.
- Alpha Vantage: whether it will grant written permission for a non-commercial public site, and at what price.
- Tiingo: whether the 250 USD/month redistribution licence is the full cost or is added to a base plan. Whether a discount exists for a non-commercial educational site. Whether derived values alone need the licence. Attribution wording.
- Tiingo: whether any analyst estimate data exists.
- FMP: commercial plan prices and the cost of a Data Display and Licensing Agreement. Whether all 38 tickers and SPY are in the free symbol list.
- Massive (Polygon): whether split-adjusted aggregates are returned on the free plan (API docs not read today). Whether derived scores that cannot recreate prices may be shown publicly on an individual plan.
- Twelve Data: whether "External display data access" on Venture covers an open public website with no login, for US stocks and ETFs, with no extra exchange fee. Whether derived data may be shown publicly on Basic or Grow. History depth and US ETF coverage on Basic. Attribution wording. Which plan unlocks earnings estimates, EPS trend and EPS revisions.
- EODHD: commercial licence price. Terms of the university and academic licence. Whether a free educational site can get a reduced rate. Whether EPS revision data is historical and timestamped.
- Nasdaq Data Link: price of Sharadar Equity Prices. Whether any free EOD dataset still exists. Whether a service order can allow public display for a small site.
- Stooq: adjustment method for splits and dividends. Whether Stooq will give consent for a non-commercial educational site. Whether a scheduled script can download without a browser.
- Yahoo Finance: nothing about data coverage was verified. Only the terms were read.
- TradingView: no page read today says in plain words that widgets cost nothing. Whether an educational site with no ads and no revenue counts as non-commercial in TradingView's view.
- Marketstack: terms page redirected to a general legal index and was not read. Not evaluated.
- Exchange rules: whether end-of-day US prices shown with a one-day delay need any exchange approval was not verified with any provider.
- Timestamped historical estimate revisions: no provider page read today clearly offers point-in-time revision history at a small price.

## Recommendation

No free option permits public display of raw prices from data you fetch and host yourself. No free option clearly permits public display of derived values either. Plan on the basis that written permission or a paid display licence is needed.

1. Free, derived-data-only display. Best candidate: Twelve Data Basic, because its terms define Derived Data and say the customer keeps rights to it, and 800 credits/day covers about 45 symbols daily. It is not safe to publish on that basis alone, because the Basic plan is "Internal non-display usage" and the terms prohibit derivative works for redistribution. Send the questions below first. A second free request worth sending is to Stooq, whose terms allow redistribution with its consent. Estimated cost: 0 USD/month if either provider confirms in writing. If neither confirms, the cheapest published route is Twelve Data Venture at 149 USD/month (124 USD/month billed annually). Do not use FMP, Finnhub, EODHD personal plans or Nasdaq Data Link for this, because their terms restrict derived output explicitly.

2. Raw price charts on a public site. Free route: embed TradingView chart widgets and leave the TradingView attribution in place. Estimated cost: 0 USD/month. The limits are that the site must stay non-commercial and the charts cannot feed your own calculations. Paid route for self-hosted charts from your own stored data: Twelve Data Venture at 149 USD/month (124 annual), which lists external display, or a Tiingo redistribution licence at 250 USD/month for start-ups. Both need the scope confirmed in writing before paying.

3. Practical combined path at 0 USD/month: keep SEC EDGAR as the only stored data, show price charts through TradingView widgets, and hold back price-based derived values (momentum, P/E, grades) until one provider confirms in writing that they may be published. If a budget of about 125 to 150 USD/month is acceptable, Twelve Data Venture is the single plan that could cover raw charts and derived values together.

4. Analyst estimates, surprises and revisions: treat as out of scope for now. Alpha Vantage and EODHD have the data, but neither licence allows public display on a personal plan, and no cheap source of timestamped revisions was verified.

## Questions to ask the provider before paying

Send these by email and keep the reply. Describe the site in one line first: a free, public, non-commercial, educational stock-research site with no ads, no login and no revenue, covering 38 US stocks plus SPY and a few sector ETFs, updated once a day or once a week by a script.

1. May I display end-of-day prices and volume (one day delayed, about 5 years of history, about 45 US symbols) as charts on a public web page? On which plan, and at what monthly price?
2. May I publish values calculated from your data but not the data itself (momentum scores, P/E and other valuation ratios, letter grades)? Does this need the same licence as raw display, a cheaper one, or none?
3. Does your answer change because the site is non-commercial and educational? Is there a discount or a free licence for this case?
4. May the fetched data be stored as static JSON files in a public GitHub repository and served by GitHub Pages, where anyone can download the files? If not, what storage or obfuscation do you require?
5. Are there exchange fees, exchange agreements or approvals on top of your price for end-of-day US stock and ETF data shown publicly?
6. What attribution text, logo or link do you require, and where must it appear?
7. Are prices split-adjusted and dividend-adjusted, and may I show the adjusted series?
8. May I display analyst EPS estimates, earnings surprises and estimate revisions, or values derived from them? Which plan includes them, and is the revision history timestamped?
9. If I cancel, may the already published derived values and charts stay online, or must they be removed?
10. Will you confirm the answers above in writing (email is enough) so I can keep it on file?
