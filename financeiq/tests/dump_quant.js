/* Builds a made-up but realistic price series and prints it with every indicator,
   for tools/crosscheck_quant.py to recalculate independently. */
function series(seed, drift) {
  // a small deterministic random-number generator, so both languages see the same data
  let x = seed; const rnd = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
  const close = [100], high = [], low = [], volume = [];
  for (let i = 0; i < 400; i++) {
    if (i > 0) close.push(close[i - 1] * (1 + drift + (rnd() - 0.5) * 0.04));
    const spread = close[i] * (0.004 + rnd() * 0.012);
    high.push(close[i] + spread * rnd()); low.push(close[i] - spread * rnd());
    volume.push(Math.round(1e6 * (0.5 + rnd())));
  }
  return { close, high, low, volume };
}
const stock = series(42, 0.0009), bench = series(7, 0.0004);
print(JSON.stringify({ stock, bench, metrics: Quant.metrics(stock, bench) }));
