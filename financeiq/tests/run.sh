#!/bin/sh
# Runs every FinanceIQ test from the terminal on a Mac. No installs needed.
#   sh financeiq/tests/run.sh
cd "$(dirname "$0")/.." || exit 1
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
status=0

echo "== Formula, rating and indicator tests (js/calc.js, quant.js, ratings.js, screen.js) =="
if [ -x "$JSC" ]; then
  "$JSC" js/calc.js js/quant.js js/ratings.js js/screen.js js/market.js tests/tests.js || status=1
elif command -v node >/dev/null 2>&1; then
  node -e "global.Calc=require('./js/calc.js'); global.Quant=require('./js/quant.js'); global.Ratings=require('./js/ratings.js'); global.Screen=require('./js/screen.js'); global.Market=require('./js/market.js'); global.print=console.log; require('./tests/tests.js')" || status=1
else
  echo "No JavaScript engine found. Open tests/index.html in a browser instead."
fi

echo
echo "== Data pipeline tests (tools/build_data.py) =="
python3 -m unittest -q tools/test_build_data.py || status=1

echo
echo "== Independent recalculation in Python (tools/crosscheck.py) =="
python3 tools/crosscheck.py > /dev/null || status=1

echo
echo "== Market indicators recalculated in Python (tools/crosscheck_quant.py) =="
python3 tools/crosscheck_quant.py > /dev/null || status=1

echo
echo "== Figures quoted in the AI summaries (tools/check_summaries.py) =="
python3 tools/check_summaries.py || status=1

echo
echo "== Syntax check of every script =="
if [ -x "$JSC" ]; then
  for f in js/*.js js/pages/*.js tests/*.js; do
    "$JSC" -e "try { new Function(readFile('$f')); } catch (e) { print('SYNTAX ERROR in $f: ' + e); quit(1); }" || status=1
  done
  echo "all scripts parse"
fi
python3 -m py_compile tools/build_data.py tools/validate_filings.py tools/crosscheck.py tools/check_summaries.py tools/crosscheck_quant.py tools/snapshot_ratings.py tools/build_prices.py && echo "python scripts compile" || status=1

exit $status
