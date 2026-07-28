// audit_file10_scheme.mjs — pre-build numeric verification for File 10 (propagation).
// Verifies, before any TypeScript is written:
//   V1. order-2 stencil at Courant ν=1.0 is EXACT (magic time step) and stable.
//   V2. order-4 stencil + leapfrog with dt ∝ dx² converges at order ≈ 4.
//   V3. order-4 stability boundary is EXACTLY ν* = √3/2 (symbol max 16/(3dx²)).
//   V4. radial reduction w = r·u makes 1/r amplitude (⇒ 1/r² intensity) EMERGE.
//   V5. damped case (γ>0) has bounded, decaying energy.
// Run once, read output, DELETE (not part of the engine DAG).
const log = (k, v) => console.log(String(k).padEnd(58), v);

// 4th-order periodic Laplacian
function lap4(u, dx) {
  const N = u.length, out = new Array(N), c = 1 / (12 * dx * dx);
  for (let i = 0; i < N; i++) {
    const m2 = u[(i - 2 + N) % N], m1 = u[(i - 1 + N) % N], p1 = u[(i + 1) % N], p2 = u[(i + 2) % N];
    out[i] = c * (-m2 + 16 * m1 - 30 * u[i] + 16 * p1 - p2);
  }
  return out;
}
// 2nd-order periodic Laplacian
function lap2(u, dx) {
  const N = u.length, out = new Array(N), c = 1 / (dx * dx);
  for (let i = 0; i < N; i++) out[i] = c * (u[(i - 1 + N) % N] - 2 * u[i] + u[(i + 1) % N]);
  return out;
}
// damped leapfrog: (1+γdt/2)u⁺ = 2u − (1−γdt/2)u⁻ + dt²v²·Lap(u)
function leap(present, past, lap, dx, dt, v, gamma) {
  const L = lap(present, dx), N = present.length, out = new Array(N);
  const a = 1 + gamma * dt / 2, b = 1 - gamma * dt / 2, c = dt * dt * v * v;
  for (let i = 0; i < N; i++) out[i] = (2 * present[i] - b * past[i] + c * L[i]) / a;
  return out;
}

// V1 — magic time step: ν=1, order-2, traveling wave f(x−t), f=sin2πx
{
  const N = 64, dx = 1 / N, dt = dx, v = 1, K = 10 * N; // 10 full periods
  const f = (x) => Math.sin(2 * Math.PI * x);
  let past = Array.from({ length: N }, (_, i) => f(i * dx));
  let present = Array.from({ length: N }, (_, i) => f(i * dx - dt));
  for (let k = 1; k < K; k++) { const nx = leap(present, past, lap2, dx, dt, v, 0); past = present; present = nx; }
  let err = 0;
  for (let i = 0; i < N; i++) err = Math.max(err, Math.abs(present[i] - f(i * dx - K * dt)));
  log("V1 magic-step max error after 10 periods (≈round-off)", err.toExponential(3));
}

// V2 — convergence order: order-4 stencil, standing wave sin2πx·cos2πt, dt ∝ dx²
{
  const T = 0.5, v = 1, errs = [];
  for (const N of [32, 64, 128]) {
    const dx = 1 / N, steps = Math.round(T / (2 * dx * dx)), dt = T / steps;
    const exact = (x, t) => Math.sin(2 * Math.PI * x) * Math.cos(2 * Math.PI * t);
    let past = Array.from({ length: N }, (_, i) => exact(i * dx, 0));
    let present = Array.from({ length: N }, (_, i) => exact(i * dx, dt));
    for (let k = 1; k < steps; k++) { const nx = leap(present, past, lap4, dx, dt, v, 0); past = present; present = nx; }
    let err = 0;
    for (let i = 0; i < N; i++) err = Math.max(err, Math.abs(present[i] - exact(i * dx, T)));
    errs.push(err);
  }
  log("V2 errors N=32,64,128", errs.map((e) => e.toExponential(3)).join(", "));
  log("V2 order 32→64", Math.log2(errs[0] / errs[1]).toFixed(4));
  log("V2 order 64→128", Math.log2(errs[1] / errs[2]).toFixed(4));
}

// V3 — order-4 stability boundary at ν* = √3/2 exactly
{
  const nuStar = Math.sqrt(3) / 2, N = 64, dx = 1 / N, v = 1;
  for (const fac of [0.999, 1.001]) {
    const dt = fac * nuStar * dx / v;
    // seed includes the Nyquist mode (the worst-case eigenvector)
    let past = Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * i * dx) + 1e-8 * (i % 2 ? 1 : -1));
    let present = [...past];
    let blew = false;
    for (let k = 0; k < 20000 && !blew; k++) {
      const nx = leap(present, past, lap4, dx, dt, v, 0); past = present; present = nx;
      if (Math.max(...present.map(Math.abs)) > 1e6) blew = true;
    }
    log(`V3 ν = ${fac}·√3/2 → ${blew ? "UNSTABLE (blew up)" : "stable 2·10⁴ steps"}`, Math.max(...present.map(Math.abs)).toExponential(2));
  }
}

// V4 — inverse square emergent: radial w = r·u, 1D kernel, measure amplitude vs r
{
  const R = 120, M = 2400, dr = R / M, v = 1, dt = 0.9 * dr; // order-2 radial, Dirichlet
  const pulse = (s) => Math.exp(-((s - 10) ** 2) / 2); // gaussian at r0=10
  let past = Array.from({ length: M + 1 }, (_, i) => pulse(i * dr));
  let present = Array.from({ length: M + 1 }, (_, i) => pulse(i * dr - v * dt)); // outgoing
  past[0] = present[0] = 0; past[M] = present[M] = 0; // w(0)=0 regularity, far wall
  const samples = [];
  const snapshotAt = [20, 40, 60, 80, 100].map((r) => Math.round((r - 10) / (v * dt)));
  let step = 0;
  const maxStep = Math.max(...snapshotAt);
  const lapD = (u) => { const o = new Array(M + 1).fill(0); for (let i = 1; i < M; i++) o[i] = (u[i - 1] - 2 * u[i] + u[i + 1]) / (dr * dr); return o; };
  while (step <= maxStep) {
    if (snapshotAt.includes(step)) {
      let best = 0, bestR = 0;
      for (let i = 1; i < M; i++) { const u = present[i] / (i * dr); if (Math.abs(u) > best) { best = Math.abs(u); bestR = i * dr; } }
      samples.push([bestR, best]);
    }
    const L = lapD(present), nx = new Array(M + 1).fill(0);
    for (let i = 1; i < M; i++) nx[i] = 2 * present[i] - past[i] + dt * dt * v * v * L[i];
    past = present; present = nx; step++;
  }
  // least-squares slope of ln a vs ln r
  const xs = samples.map(([r]) => Math.log(r)), ys = samples.map(([, a]) => Math.log(a));
  const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  log("V4 measured amplitude exponent (expect −1)", slope.toFixed(5));
  log("V4 ⇒ intensity exponent (expect −2)", (2 * slope).toFixed(5));
}

// V5 — damped case: energy bounded & decaying
{
  const N = 64, dx = 1 / N, v = 1, dt = 0.4 * dx, gamma = 0.5;
  let past = Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * i * dx));
  let present = [...past];
  const energy = (p, q) => { let e = 0; for (let i = 0; i < N; i++) { const ut = (p[i] - q[i]) / dt, ux = (p[(i + 1) % N] - p[i]) / dx; e += ut * ut + v * v * ux * ux; } return e * dx; };
  const e0 = energy(present, past);
  let eMid = 0, eEnd = 0;
  for (let k = 0; k < 4000; k++) {
    const nx = leap(present, past, lap4, dx, dt, v, gamma); past = present; present = nx;
    if (k === 2000) eMid = energy(present, past);
  }
  eEnd = energy(present, past);
  log("V5 energy e0 → e(2000) → e(4000)", `${e0.toExponential(3)} → ${eMid.toExponential(3)} → ${eEnd.toExponential(3)}`);
  log("V5 monotone bounded?", eEnd <= eMid + 1e-12 && eMid <= e0 ? "YES (decaying)" : "NO");
}
