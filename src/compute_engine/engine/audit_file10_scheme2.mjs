// audit_file10_scheme2.mjs — verify the MODIFIED-EQUATION leapfrog resolves the
// contract tension: order ≈4 at fixed Courant AND CFL boundary at exactly ν*=3/2
// (so ν=1.0 is provably stable). Run once, DELETE.
//
// Scheme: u⁺ = 2u − u⁻ + dt²v²Δ₄u + (dt⁴v⁴/12)Δ₄(Δ₄u)
// Derivation: u(t±dt) Taylor ⇒ u⁺−2u+u⁻ = dt²u_tt + dt⁴u_tttt/12 + O(dt⁶);
//             u_tt = v²Δu ⇒ u_tttt = v⁴Δ²u. Both truncations now O(4).
// Stability: g(s) = 1 − s/2 + s²/24 with s = dt²v²λ, λ∈[0, 16/(3dx²)].
//            |g|≤1 ⇔ s ≤ 12 ⇔ ν ≤ √(12·3/16) = 3/2 exactly.
const log = (k, v) => console.log(String(k).padEnd(58), v);

function lap4(u, dx) {
  const N = u.length, out = new Array(N), c = 1 / (12 * dx * dx);
  for (let i = 0; i < N; i++) {
    const m2 = u[(i - 2 + N) % N], m1 = u[(i - 1 + N) % N], p1 = u[(i + 1) % N], p2 = u[(i + 2) % N];
    out[i] = c * (-m2 + 16 * m1 - 30 * u[i] + 16 * p1 - p2);
  }
  return out;
}
function stepMod(present, past, dx, dt, v, gamma) {
  const L = lap4(present, dx), L2 = lap4(L, dx), N = present.length, out = new Array(N);
  const a = 1 + gamma * dt / 2, b = 1 - gamma * dt / 2;
  const c2 = dt * dt * v * v, c4 = (c2 * c2) / 12;
  for (let i = 0; i < N; i++) out[i] = (2 * present[i] - b * past[i] + c2 * L[i] + c4 * L2[i]) / a;
  return out;
}

// W1 — convergence order ≈4 on a SMOOTH MULTI-MODE pulse, fixed Courant ν=0.5
{
  const v = 1, nu = 0.5, T = 0.4, f = (x) => Math.exp(Math.cos(2 * Math.PI * x));
  const errs = [];
  for (const N of [32, 64, 128, 256]) {
    const dx = 1 / N, steps = Math.round(T / (nu * dx)), dt = T / steps;
    let past = Array.from({ length: N }, (_, i) => f(i * dx + v * dt)); // u(x,−dt) traveling f(x−vt)
    let present = Array.from({ length: N }, (_, i) => f(i * dx));
    for (let k = 0; k < steps; k++) { const nx = stepMod(present, past, dx, dt, v, 0); past = present; present = nx; }
    let err = 0;
    for (let i = 0; i < N; i++) err = Math.max(err, Math.abs(present[i] - f(i * dx - v * T)));
    errs.push(err);
  }
  log("W1 errors N=32,64,128,256", errs.map((e) => e.toExponential(3)).join(", "));
  for (let i = 1; i < errs.length; i++) log(`W1 order ${16 * 2 ** i}→${32 * 2 ** i}`, Math.log2(errs[i - 1] / errs[i]).toFixed(4));
}

// W2 — CFL boundary at exactly ν* = 3/2 (0.999 stable / 1.001 unstable), Nyquist-seeded
{
  const N = 64, dx = 1 / N, v = 1, nuStar = 1.5;
  for (const fac of [0.999, 1.001]) {
    const dt = fac * nuStar * dx / v;
    let past = Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * i * dx) + 1e-8 * (i % 2 ? 1 : -1));
    let present = [...past];
    let blew = false;
    for (let k = 0; k < 20000 && !blew; k++) {
      const nx = stepMod(present, past, dx, dt, v, 0); past = present; present = nx;
      if (Math.max(...present.map(Math.abs)) > 1e6) blew = true;
    }
    log(`W2 ν = ${fac}·(3/2) → ${blew ? "UNSTABLE" : "stable 2·10⁴ steps"}`, Math.max(...present.map(Math.abs)).toExponential(2));
  }
}

// W3 — CFL exactly 1.0: stable for 10⁵ steps with Nyquist seed (contract clause)
{
  const N = 64, dx = 1 / N, v = 1, dt = 1.0 * dx / v;
  let past = Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * i * dx) + 1e-8 * (i % 2 ? 1 : -1));
  let present = [...past];
  let maxAbs = 0;
  for (let k = 0; k < 100000; k++) {
    const nx = stepMod(present, past, dx, dt, v, 0); past = present; present = nx;
    maxAbs = Math.max(maxAbs, Math.max(...present.map(Math.abs)));
  }
  log("W3 ν=1.0, 10⁵ steps, max|u| (bounded ⇒ stable)", maxAbs.toExponential(4));
}

// W4 — damped modified scheme: energy decays monotonically
{
  const N = 64, dx = 1 / N, v = 1, dt = 0.4 * dx, gamma = 0.5;
  let past = Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * i * dx));
  let present = [...past];
  const energy = (p, q) => { let e = 0; for (let i = 0; i < N; i++) { const ut = (p[i] - q[i]) / dt, ux = (p[(i + 1) % N] - p[i]) / dx; e += ut * ut + v * v * ux * ux; } return e * dx; };
  const e0 = energy(present, past);
  let eMid = 0;
  for (let k = 0; k < 4000; k++) {
    const nx = stepMod(present, past, dx, dt, v, gamma); past = present; present = nx;
    if (k === 2000) eMid = energy(present, past);
  }
  const eEnd = energy(present, past);
  log("W4 damped energy e0→e(2000)→e(4000)", `${e0.toExponential(3)} → ${eMid.toExponential(3)} → ${eEnd.toExponential(3)}`);
}
