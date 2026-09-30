const O = require('../electron/omega-bundle.cjs');
for (const lr of [0.02, 0.01, 0.005, 0.002, 0.001, 0.0005, 0.0002]) {
  const h = new O.EngineHost({ profile: 'NANO', seed: 'rhuf-lr', drive: 0.618 });
  const rt = new O.RhufTransport(13, lr);
  let prev = null;
  for (let i = 0; i < 3000; i++) {
    h.stepOnce();
    const c = h.snapshot().coeffs;
    if (!c) continue;
    const K2 = c.length / 2;
    const cv = { re: new Float64Array(K2), im: new Float64Array(K2), n: K2 };
    for (let k = 0; k < K2; k++) { cv.re[k] = c[2 * k]; cv.im[k] = c[2 * k + 1]; }
    if (prev) rt.observe(prev, cv);
    prev = cv;
  }
  const r = rt.report();
  console.log('lr=' + lr.toFixed(4).padStart(6), ' skill=' + (r.skill * 100).toFixed(1).padStart(7) + '%', ' radius=' + r.spectralRadius.toFixed(3));
}
