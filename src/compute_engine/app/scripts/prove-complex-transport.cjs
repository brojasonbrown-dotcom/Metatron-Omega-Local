// Prove the fix: the field's information is a COMPLEX rotation (phase advances),
// but the current signature collapses to |c_k|^2 (phase-blind) so persistence wins.
// A complex diagonal transport model (RHUFT: c_k <- lambda_k · c_k, |lambda_k|<phi^-1)
// captures the rotation and beats persistence — proving the self-model CAN adapt
// once it sees the full holomorphic coefficients.
const PHI = (1 + Math.sqrt(5)) / 2;
const LAMBDA_MAX = 1 / PHI; // |lambda| < phi^-1

function makeComplex(d) {
  return { re: new Float64Array(d), im: new Float64Array(d) };
}

// Simple complex diagonal transport with online theta update (one per mode).
class ComplexTransport {
  constructor(d, lr = 0.01) {
    this.d = d;
    this.lr = lr;
    this.theta = new Float64Array(d); // magnitude param
    this.phi = new Float64Array(d);   // phase param
    this.b = makeComplex(d);          // bias
    this.b.re.fill(0); this.b.im.fill(0);
  }
  lambda(k) {
    const m = LAMBDA_MAX * Math.tanh(this.theta[k]);
    return { re: m * Math.cos(this.phi[k]), im: m * Math.sin(this.phi[k]) };
  }
  predict(x, out) {
    for (let k = 0; k < this.d; k++) {
      const l = this.lambda(k);
      out.re[k] = l.re * x.re[k] - l.im * x.im[k] + this.b.re[k];
      out.im[k] = l.re * x.im[k] + l.im * x.re[k] + this.b.im[k];
    }
    return out;
  }
  update(x, y) {
    for (let k = 0; k < this.d; k++) {
      const l = this.lambda(k);
      const pr = l.re * x.re[k] - l.im * x.im[k] + this.b.re[k];
      const pi = l.re * x.im[k] + l.im * x.re[k] + this.b.im[k];
      const er = y.re[k] - pr;
      const ei = y.im[k] - pi;
      // dL/dtheta (magnitude) and dL/dphi (phase) via finite structure (chain rule)
      const m = LAMBDA_MAX * Math.tanh(this.theta[k]);
      const dm = LAMBDA_MAX * (1 - Math.tanh(this.theta[k]) ** 2);
      const dLdm = 2 * (er * (Math.cos(this.phi[k]) * x.re[k] - Math.sin(this.phi[k]) * x.im[k]) +
                        ei * (Math.cos(this.phi[k]) * x.im[k] + Math.sin(this.phi[k]) * x.re[k]));
      const dLdphi = 2 * (er * (-m * Math.sin(this.phi[k]) * x.re[k] - m * Math.cos(this.phi[k]) * x.im[k]) +
                          ei * (-m * Math.sin(this.phi[k]) * x.im[k] + m * Math.cos(this.phi[k]) * x.re[k]));
      this.theta[k] -= this.lr * dLdm * dm;
      this.phi[k] -= this.lr * dLdphi;
      this.b.re[k] += this.lr * er;
      this.b.im[k] += this.lr * ei;
    }
  }
}

// Persistent baseline: predict "stay the same".
function persistenceMse(seq) {
  let mse = 0, n = 0;
  for (let t = 1; t < seq.length; t++) {
    for (let k = 0; k < seq[t].re.length; k++) {
      const dr = seq[t].re[k] - seq[t - 1].re[k];
      const di = seq[t].im[k] - seq[t - 1].im[k];
      mse += dr * dr + di * di;
      n += 2;
    }
  }
  return mse / n;
}

// Generate a rotating field: d modes, global phase advance omega per tick.
const d = 13, omega = 2 * Math.PI * 0.38196601125010515; // phi^-2 cycles/tick (the engine's own line)
const seq = [];
for (let t = 0; t < 2000; t++) {
  const c = makeComplex(d);
  for (let k = 0; k < d; k++) {
    const amp = Math.exp(-k / 5);
    c.re[k] = amp * Math.cos(omega * t + k);
    c.im[k] = amp * Math.sin(omega * t + k);
  }
  seq.push(c);
}

const model = new ComplexTransport(d);
const out = makeComplex(d);
let mse = 0;
const burn = 200;
for (let t = burn; t < seq.length; t++) {
  model.predict(seq[t - 1], out);
  // one-step-ahead error
  for (let k = 0; k < d; k++) {
    const dr = out.re[k] - seq[t].re[k];
    const di = out.im[k] - seq[t].im[k];
    mse += dr * dr + di * di;
  }
  model.update(seq[t - 1], seq[t]);
}
const testMse = mse / ((seq.length - burn) * d * 2);
const persistMse = persistenceMse(seq);

console.log('COMPLEX TRANSPORT MODEL vs PERSISTENCE on a rotating field:');
console.log('  persistence (stay same) MSE:', persistMse.toExponential(4));
console.log('  complex transport MSE:      ', testMse.toExponential(4));
console.log('  skill (1 - model/persist):  ', ((1 - testMse / persistMse) * 100).toFixed(2) + '%');
for (let k = 0; k < 3; k++) {
  const l = model.lambda(k);
  console.log(`  mode ${k}: |lambda|=`, Math.hypot(l.re, l.im).toFixed(4), ' arg=', Math.atan2(l.im, l.re).toFixed(4), '(omega=', omega.toFixed(4) + ')');
}
