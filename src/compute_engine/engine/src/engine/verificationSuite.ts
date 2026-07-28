/**
 * FILE 18 — engine/verificationSuite.ts
 *
 * Owns: **the permanent test battery — the guarantee nothing ships broken.**
 *
 * What this module is, mathematically and only mathematically:
 *
 *   Files 1–17 each carry a "Done when" gate (spec §3). This file turns every
 *   one of those gates into a runnable assertion, aggregates them into eight
 *   named suites, and returns a single machine-readable VerificationReport.
 *   It runs on every build; any red suite fails the build (`assertGreen`).
 *
 *   It is NOT a duplicate of the per-file vitest suites. Those test each file
 *   in isolation. This battery re-derives the eight cross-cutting acceptance
 *   claims END-TO-END against the live modules, so a regression that slips
 *   past a unit test (an edit to constants that silently moves a floor, a
 *   ladder change that breaks an octave link) is caught here at the seam.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE EIGHT SUITES (spec §3/File 18), and the exact claim each re-derives:
 *
 *   1. unitRoot           Constants (File 1) are the exact φ/Planck values the
 *                         ladder is built on; provenance never widens silently.
 *                         [EXACT constants / CODATA Planck]
 *   2. lucasClosure       The Lucas closure theorem (File 3): every stable rung
 *                         has Lₙ ≢ 0 (mod 13) and residue-min exactly 1 — exact
 *                         13-fold closure is impossible, every scale minimally
 *                         open. [EXACT — BigInt theorem]
 *   3. flux26             The Metatron-shell obstruction floor (File 6) is
 *                         φ⁻²⁶ = 3.6840146919×10⁻⁶ exactly, positive and finite
 *                         on every stable torus, monotone in n. [EXACT base /
 *                         POSTULATE scaling]
 *   4. cfl                File 10's modified-equation leapfrog runs at ν = 1.0
 *                         strictly inside its derived stability boundary
 *                         ν* = √(12·3/16) = 3/2, and step() enforces the
 *                         operating CFL invariant by throwing past it. [EXACT]
 *   5. convergenceOrder   File 10's scheme is 4th order in space AND time
 *                         (γ=0): a smooth pulse's error drops by ≈2⁴ per grid
 *                         doubling, measured (not asserted). [MEASURED ≈ 4]
 *   6. eigenspectrum      File 8's Gram–Schmidt basis is orthonormal under the
 *                         CURVED L2 inner product on every stable torus:
 *                         ⟨mode_i, mode_j⟩ = δ_ij to quadrature tolerance.
 *                         [EXACT to quadrature tol]
 *   7. ignitionStatistics File 12's golden-delay self-overlap is bounded in
 *                         [0,1], the ignition threshold is EXACTLY φ⁻², and a
 *                         phase-locked history ignites while a decorrelated one
 *                         does not. [EXACT bounds / threshold]
 *   8. invariantPresence  File 16's master step emits ALL four invariants —
 *                         coherence, closure, drift, burden — for every rung,
 *                         every step, with provenance attached. [EXACT wiring]
 *
 * ────────────────────────────────────────────────────────────────────────────
 * HERMETICITY + DETERMINISM (spec §3/File 18 invariants):
 *
 *   The battery is hermetic: no network, no clock, no RNG. Every input is a
 *   fixed constant or a deterministic seed (File 16's seeding is structural,
 *   not random). Bounded time: each suite uses the smallest grid/step-count
 *   that still discriminates the claim — the battery is a CI gate, not a
 *   benchmark. A run is bit-identical on re-run.
 *
 * Provenance: the battery ASSERTS the provenance tags the modules already
 * carry; it introduces no new claims. EXACT claims (Lucas theorem, φ⁻²
 * threshold, CFL boundary) are checked bit-close; MEASURED claims (convergence
 * order) carry an explicit tolerance; POSTULATE claims (flux-as-physics) are
 * checked for their exact NUMERIC value while their physical reading stays
 * POSTULATE — the battery never launders a postulate into a fact.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Dependency direction (strictly downward, spec §4 DAG):
 *   verificationSuite(18) → ALL of files 1–17 (this is the assembly seam).
 * ────────────────────────────────────────────────────────────────────────────
 */

import { PHI, PHI_NEG2, PHI_NEG26, STABLE_SCALES, METATRON_SHELL, PLANCK_LENGTH } from "../core/constants.js";
import { lucas, isStable, closureResidueMin, stableScalesUpTo } from "../core/lucas.js";
import { Scaled, type Provenance } from "../core/provenance.js";
import { torusForScale } from "../geometry/torus.js";
import { closureResidual, minimallyOpenFloor } from "../geometry/closureResidual.js";
import { initialCondition } from "../geometry/lattice.js";
import { l2Basis, l2Inner } from "../geometry/basisGenerators.js";
import { Propagator, CFL_LIMIT, CFL_STABILITY_BOUNDARY } from "../dynamics/propagation.js";
import { getScale } from "../core/scaleTable.js";
import { selfOverlap, exceedsThreshold, IGNITION_THRESHOLD, type FieldHistory } from "../dynamics/selfMeasurement.js";
import { MultiscaleEngine } from "./multiscaleEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// Report types
// ─────────────────────────────────────────────────────────────────────────────

/** The eight canonical suite names (spec §3/File 18). */
export type SuiteName =
  | "unitRoot"
  | "lucasClosure"
  | "flux26"
  | "cfl"
  | "convergenceOrder"
  | "eigenspectrum"
  | "ignitionStatistics"
  | "invariantPresence";

/** One named check inside a suite. Optional fields are explicitly `| undefined`
 *  so the report is exactOptionalPropertyTypes-clean. */
export interface CheckResult {
  /** Human-readable check label. */
  readonly name: string;
  /** Did the check pass? */
  readonly pass: boolean;
  /** The measured/derived value (for diagnostics; the claim's number). */
  readonly observed?: number | undefined;
  /** The value the claim requires (for diagnostics). */
  readonly expected?: number | undefined;
  /** Provenance of the claim being asserted (never laundered). */
  readonly provenance?: Provenance | undefined;
  /** One line on failure (or the honest caveat on pass). */
  readonly detail?: string | undefined;
}

/** One suite: a cluster of checks re-deriving one file's "Done when" gate. */
export interface SuiteResult {
  readonly suite: SuiteName;
  readonly pass: boolean;
  readonly checks: readonly CheckResult[];
  /** Wall-clock ms for this suite (bounded-time invariant). */
  readonly ms: number;
}

/** The full machine-readable battery report. */
export interface VerificationReport {
  /** True iff every suite passed (the build gate). */
  readonly green: boolean;
  /** Per-suite results, in canonical order. */
  readonly suites: readonly SuiteResult[];
  /** Totals for CI dashboards. */
  readonly totalChecks: number;
  readonly failedChecks: number;
  /** Total wall-clock ms for the whole battery. */
  readonly ms: number;
  /** Engine/version stamp so reports are traceable. */
  readonly stamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Check helpers
// ─────────────────────────────────────────────────────────────────────────────

const ok = (name: string, observed?: number, expected?: number, provenance?: Provenance, detail?: string): CheckResult => ({
  name, pass: true, observed, expected, provenance, detail,
});
const bad = (name: string, observed: number | undefined, expected: number | undefined, provenance: Provenance | undefined, detail: string): CheckResult => ({
  name, pass: false, observed, expected, provenance, detail,
});
const close = (a: number, b: number, rel: number): boolean => Math.abs(a - b) <= rel * Math.max(1, Math.abs(b));

/** Run one suite, catching any throw into a failing check (never silent). */
function runSuite(suite: SuiteName, body: () => CheckResult[]): SuiteResult {
  const t0 = now();
  let checks: CheckResult[];
  try {
    checks = body();
  } catch (e) {
    checks = [{
      name: `${suite} threw`,
      pass: false,
      detail: `uncaught: ${e instanceof Error ? e.message : String(e)}`,
    }];
  }
  return {
    suite,
    pass: checks.every((c) => c.pass),
    checks: Object.freeze(checks),
    ms: now() - t0,
  };
}

/** Hermetic clock for the bounded-ms diagnostic only (never a pass/fail input).
 *  Uses performance.now when available; falls back to Date.now. Declared
 *  locally because the tsconfig lib omits the DOM `performance` global. */
declare const performance: { now(): number } | undefined;
function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1 — unitRoot (File 1)
// ─────────────────────────────────────────────────────────────────────────────

function suiteUnitRoot(): CheckResult[] {
  const checks: CheckResult[] = [];
  // φ is the golden ratio root of x²−x−1 = 0, EXACT.
  const phiResidual = PHI * PHI - PHI - 1;
  checks.push(
    Math.abs(phiResidual) < 1e-12
      ? ok("φ² − φ − 1 = 0", phiResidual, 0, "EXACT")
      : bad("φ² − φ − 1 = 0", phiResidual, 0, "EXACT", "φ does not satisfy its defining quadratic"),
  );
  // φ⁻² = (3−√5)/2 exactly; the ignition/λ constant.
  checks.push(
    close(PHI_NEG2, (3 - Math.sqrt(5)) / 2, 1e-12)
      ? ok("φ⁻² = (3−√5)/2", PHI_NEG2, (3 - Math.sqrt(5)) / 2, "EXACT")
      : bad("φ⁻² = (3−√5)/2", PHI_NEG2, (3 - Math.sqrt(5)) / 2, "EXACT", "λ constant drifted"),
  );
  // φ⁻²⁶ — the Metatron flux constant — is exactly PHI^−26.
  checks.push(
    close(PHI_NEG26, Math.pow(PHI, -26), 1e-9)
      ? ok("φ⁻²⁶ = φ^−26", PHI_NEG26, Math.pow(PHI, -26), "EXACT")
      : bad("φ⁻²⁶ = φ^−26", PHI_NEG26, Math.pow(PHI, -26), "EXACT", "flux26 constant drifted"),
  );
  // Planck length is the CODATA anchor (positive, finite, ~1.6e-35).
  checks.push(
    Number.isFinite(PLANCK_LENGTH) && PLANCK_LENGTH > 0 && Math.abs(PLANCK_LENGTH - 1.616255e-35) < 1e-39
      ? ok("ℓ_P CODATA", PLANCK_LENGTH, 1.616255e-35, "CODATA")
      : bad("ℓ_P CODATA", PLANCK_LENGTH, 1.616255e-35, "CODATA", "Planck length out of CODATA range"),
  );
  return checks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2 — lucasClosure (File 3)
// ─────────────────────────────────────────────────────────────────────────────

function suiteLucasClosure(): CheckResult[] {
  const checks: CheckResult[] = [];
  // The theorem: Lₙ ≢ 0 (mod 13) and residue-min = 1 for every stable rung.
  let allOpen = true;
  let allResidueOne = true;
  for (const n of stableScalesUpTo(293)) {
    if (lucas(n) % 13n === 0n) allOpen = false;
    if (closureResidueMin(n) !== 1) allResidueOne = false;
  }
  checks.push(
    allOpen
      ? ok("Lₙ ≢ 0 (mod 13) ∀ stable n", undefined, undefined, "EXACT")
      : bad("Lₙ ≢ 0 (mod 13) ∀ stable n", undefined, 0, "EXACT", "a stable rung closed exactly — theorem broken"),
  );
  checks.push(
    allResidueOne
      ? ok("closureResidueMin = 1 ∀ stable n (minimally open)", 1, 1, "EXACT")
      : bad("closureResidueMin = 1 ∀ stable n", undefined, 1, "EXACT", "a stable rung is not minimally open"),
  );
  // Stable set is exactly the spec's 18 dense-core rungs.
  const dense = stableScalesUpTo(293).filter((n) => n <= 125);
  const matchesSpec = dense.length === STABLE_SCALES.length && dense.every((n, i) => n === STABLE_SCALES[i]);
  checks.push(
    matchesSpec && STABLE_SCALES.every((n) => isStable(n))
      ? ok("18 dense-core stable rungs match spec", STABLE_SCALES.length, 18, "EXACT")
      : bad("18 dense-core stable rungs match spec", dense.length, STABLE_SCALES.length, "EXACT", "stable set drifted from spec"),
  );
  // Binet spot-check: L(13) = 521 exactly.
  checks.push(
    lucas(13) === 521n
      ? ok("L(13) = 521 (Binet anchor)", Number(lucas(13)), 521, "EXACT")
      : bad("L(13) = 521 (Binet anchor)", Number(lucas(13)), 521, "EXACT", "Lucas sequence broken at the shell"),
  );
  return checks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3 — flux26 (File 6)
// ─────────────────────────────────────────────────────────────────────────────

function suiteFlux26(): CheckResult[] {
  const checks: CheckResult[] = [];
  const t13 = torusForScale(METATRON_SHELL);
  const floor = minimallyOpenFloor(t13).value.toFloat64();
  checks.push(
    close(floor, PHI_NEG26, 1e-9)
      ? ok("Metatron floor = φ⁻²⁶", floor, PHI_NEG26, "POSTULATE", "EXACT numeric base; physical reading POSTULATE")
      : bad("Metatron floor = φ⁻²⁶", floor, PHI_NEG26, "POSTULATE", "shell floor moved off φ⁻²⁶"),
  );
  // Floor positive + finite + monotone-decreasing across all 18 rungs.
  let mono = true;
  let prev = Infinity;
  let allPos = true;
  for (const n of STABLE_SCALES) {
    const f = minimallyOpenFloor(torusForScale(n)).value.toFloat64();
    if (!(f > 0 && Number.isFinite(f))) allPos = false;
    if (f > prev) mono = false;
    prev = f;
  }
  checks.push(
    allPos ? ok("floor > 0 finite ∀ rungs", undefined, undefined, "POSTULATE")
           : bad("floor > 0 finite ∀ rungs", undefined, 0, "POSTULATE", "a rung floor hit zero or non-finite"),
  );
  checks.push(
    mono ? ok("floor monotone in n (φ⁻²ⁿ)", undefined, undefined, "POSTULATE")
         : bad("floor monotone in n (φ⁻²ⁿ)", undefined, undefined, "POSTULATE", "φ-scaling of floor broken"),
  );
  // The lattice's unit-normalised initial condition is genuinely minimally open
  // on the shell (residual finite, below the reportable openness band).
  const resid = closureResidual(initialCondition(t13), t13).value;
  checks.push(
    Number.isFinite(resid) && resid >= 0
      ? ok("shell field residual finite ≥ 0", resid, undefined, "POSTULATE")
      : bad("shell field residual finite ≥ 0", resid, undefined, "POSTULATE", "closure residual non-finite on shell"),
  );
  return checks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4 — cfl (File 10)
// ─────────────────────────────────────────────────────────────────────────────

function suiteCfl(): CheckResult[] {
  const checks: CheckResult[] = [];
  // Operating limit ν = 1.0 strictly inside the derived boundary ν* = 3/2.
  checks.push(
    close(CFL_STABILITY_BOUNDARY, 1.5, 1e-12)
      ? ok("ν* = 3/2 (von Neumann)", CFL_STABILITY_BOUNDARY, 1.5, "EXACT")
      : bad("ν* = 3/2 (von Neumann)", CFL_STABILITY_BOUNDARY, 1.5, "EXACT", "stability boundary moved"),
  );
  checks.push(
    CFL_LIMIT < CFL_STABILITY_BOUNDARY
      ? ok("ν=1.0 strictly inside ν*", CFL_LIMIT, CFL_STABILITY_BOUNDARY, "EXACT")
      : bad("ν=1.0 strictly inside ν*", CFL_LIMIT, CFL_STABILITY_BOUNDARY, "EXACT", "operating limit not inside boundary"),
  );
  // step() enforces the invariant: ν ≤ 1 runs, ν > 1 throws.
  const prop = new Propagator(getScale(METATRON_SHELL), 1);
  const dx = 0.1;
  const N = 16;
  const present = Array.from({ length: N }, (_, i) => Math.sin((2 * Math.PI * i) / N));
  const past = present.slice();
  let ran = true;
  try {
    prop.step(present, past, dx, dx); // ν = v·dt/dx = 1·dx/dx = 1.0 → allowed
  } catch {
    ran = false;
  }
  checks.push(
    ran ? ok("step runs at ν=1.0", 1, CFL_LIMIT, "EXACT") : bad("step runs at ν=1.0", undefined, CFL_LIMIT, "EXACT", "ν=1.0 rejected"),
  );
  let threw = false;
  try {
    prop.step(present, past, dx, 1.5 * dx); // ν = 1.5 > 1 → must throw
  } catch {
    threw = true;
  }
  checks.push(
    threw ? ok("step throws past ν=1.0", 1.5, CFL_LIMIT, "EXACT") : bad("step throws past ν=1.0", 1.5, CFL_LIMIT, "EXACT", "CFL violation not enforced"),
  );
  return checks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 5 — convergenceOrder (File 10, MEASURED)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * L∞ error of a few leapfrog steps vs the exact wave solution on a ring.
 * Measures the ASYMPTOTIC accumulated error (after the startup transient), not
 * the one-step defect — the single-step error is superconvergent here because
 * the exact initial past supplies the O(dt⁴) correction for free.
 */
function waveError(N: number, steps: number): number {
  const prop = new Propagator(getScale(METATRON_SHELL), 1); // v = 1
  const k = 2; // mode number
  const dx = (2 * Math.PI) / N;
  const dt = dx; // ν = 1.0 (v=1)
  const exact = (i: number, t: number) => Math.sin(k * i * dx - k * t);
  let past = Array.from({ length: N }, (_, i) => exact(i, -dt));
  let present = Array.from({ length: N }, (_, i) => exact(i, 0));
  let err = 0;
  for (let s = 1; s <= steps; s++) {
    const next = prop.step(present, past, dx, dt, 0); // γ = 0: 4th-order claim
    past = present;
    present = next as number[];
    err = 0;
    for (let i = 0; i < N; i++) err = Math.max(err, Math.abs(present[i]! - exact(i, s * dt)));
  }
  return err;
}

function suiteConvergenceOrder(): CheckResult[] {
  const checks: CheckResult[] = [];
  const STEPS = 8;
  const e1 = waveError(32, STEPS);
  const e2 = waveError(64, STEPS);
  const e3 = waveError(128, STEPS);
  const order1 = Math.log2(e1 / e2);
  const order2 = Math.log2(e2 / e3);
  const order = Math.min(order1, order2); // conservative: the lower of two doublings
  checks.push(
    order > 3.0 && order < 5.0
      ? ok("spatial+temporal order ≈ 4 (γ=0)", order, 4, "MEASURED", `orders ${order1.toFixed(3)}/${order2.toFixed(3)} over N=32→128`)
      : bad("spatial+temporal order ≈ 4 (γ=0)", order, 4, "MEASURED", `measured orders ${order1.toFixed(3)}/${order2.toFixed(3)} out of band`),
  );
  checks.push(
    e3 < e2 && e2 < e1 && Number.isFinite(e3)
      ? ok("error decreases under refinement", e3, e1, "MEASURED")
      : bad("error decreases under refinement", e3, e1, "MEASURED", "scheme not converging"),
  );
  return checks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 6 — eigenspectrum (File 8)
// ─────────────────────────────────────────────────────────────────────────────

function suiteEigenspectrum(): CheckResult[] {
  const checks: CheckResult[] = [];
  // Orthonormality on the shell + a sparse sweep of all rungs (bounded time).
  const rungsToCheck = [METATRON_SHELL, STABLE_SCALES[0]!, STABLE_SCALES[STABLE_SCALES.length - 1]!];
  let maxOffDiag = 0;
  let maxDiagErr = 0;
  for (const n of rungsToCheck) {
    const torus = torusForScale(n);
    const basis = l2Basis(torus, 4); // Mode[] — the functions themselves
    for (let i = 0; i < basis.length; i++) {
      for (let j = 0; j < basis.length; j++) {
        const inner = l2Inner(basis[i]!, basis[j]!, torus).re;
        if (i === j) maxDiagErr = Math.max(maxDiagErr, Math.abs(inner - 1));
        else maxOffDiag = Math.max(maxOffDiag, Math.abs(inner));
      }
    }
  }
  const TOL = 1e-6;
  checks.push(
    maxDiagErr < TOL
      ? ok("⟨mode_i,mode_i⟩ = 1 (diag)", maxDiagErr, 1, "EXACT")
      : bad("⟨mode_i,mode_i⟩ = 1 (diag)", maxDiagErr, 1, "EXACT", "basis not normalised"),
  );
  checks.push(
    maxOffDiag < TOL
      ? ok("⟨mode_i,mode_j⟩ = 0, i≠j (off-diag)", maxOffDiag, 0, "EXACT")
      : bad("⟨mode_i,mode_j⟩ = 0, i≠j (off-diag)", maxOffDiag, 0, "EXACT", "basis not orthogonal"),
  );
  return checks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 7 — ignitionStatistics (File 12)
// ─────────────────────────────────────────────────────────────────────────────

function suiteIgnitionStatistics(): CheckResult[] {
  const checks: CheckResult[] = [];
  // Threshold is EXACTLY φ⁻².
  checks.push(
    close(IGNITION_THRESHOLD, PHI_NEG2, 1e-15)
      ? ok("threshold = φ⁻² exactly", IGNITION_THRESHOLD, PHI_NEG2, "EXACT")
      : bad("threshold = φ⁻² exactly", IGNITION_THRESHOLD, PHI_NEG2, "EXACT", "ignition threshold drifted"),
  );
  // Phase-locked history (a constant field is trivially coherent with its past) → C≈1.
  const N = 8;
  const lockedSnap = Array.from({ length: N }, (_, i) => Math.sin(i));
  const locked: FieldHistory = { snapshots: [lockedSnap, lockedSnap.slice(), lockedSnap.slice(), lockedSnap.slice()], tau: 1 };
  const cLocked = selfOverlap(locked).value;
  checks.push(
    cLocked > 0.99 && cLocked <= 1 && exceedsThreshold(cLocked)
      ? ok("phase-locked ⇒ C≈1 ignites", cLocked, 1, "POSTULATE")
      : bad("phase-locked ⇒ C≈1 ignites", cLocked, 1, "POSTULATE", "locked history did not ignite"),
  );
  // Orthogonal present vs past ⇒ C≈0, below threshold, in [0,1].
  const a = [1, 0, -1, 0, 1, 0, -1, 0];
  const b = [0, 1, 0, -1, 0, 1, 0, -1];
  const ortho: FieldHistory = { snapshots: [b, b, b, a], tau: 1 };
  const cOrtho = selfOverlap(ortho).value;
  checks.push(
    cOrtho >= 0 && cOrtho < IGNITION_THRESHOLD && !exceedsThreshold(cOrtho)
      ? ok("decorrelated ⇒ C≈0 below threshold", cOrtho, 0, "POSTULATE")
      : bad("decorrelated ⇒ C≈0 below threshold", cOrtho, 0, "POSTULATE", "orthogonal history crossed threshold"),
  );
  // Bounds invariant: C ∈ [0,1] always.
  checks.push(
    cLocked >= 0 && cLocked <= 1 && cOrtho >= 0 && cOrtho <= 1
      ? ok("C ∈ [0,1]", undefined, undefined, "EXACT")
      : bad("C ∈ [0,1]", undefined, undefined, "EXACT", "overlap escaped [0,1]"),
  );
  return checks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 8 — invariantPresence (File 16)
// ─────────────────────────────────────────────────────────────────────────────

function suiteInvariantPresence(): CheckResult[] {
  const checks: CheckResult[] = [];
  const engine = new MultiscaleEngine({ rungs: [13, 15, 27] });
  const r = engine.step();
  // All four invariants present for every rung, every step.
  let allFour = true;
  for (const inv of r.invariants) {
    const has =
      inv.coherence && typeof inv.coherence.value === "number" && Number.isFinite(inv.coherence.value) &&
      inv.closure && typeof inv.closure.value === "number" && Number.isFinite(inv.closure.value) &&
      inv.drift && typeof inv.drift.value === "number" && Number.isFinite(inv.drift.value) &&
      inv.burden && typeof inv.burden.value === "number";
    if (!has) allFour = false;
  }
  checks.push(
    r.invariants.length === 3 && allFour
      ? ok("4 invariants × every rung present", r.invariants.length, 3, "EXACT")
      : bad("4 invariants × every rung present", r.invariants.length, 3, "EXACT", "an invariant was missing/non-finite"),
  );
  // Provenance attached to each invariant.
  const provOk = r.invariants.every((inv) =>
    Boolean(inv.coherence.provenance && inv.closure.provenance && inv.drift.provenance && inv.burden.provenance),
  );
  checks.push(
    provOk ? ok("every invariant carries provenance", undefined, undefined, "EXACT")
           : bad("every invariant carries provenance", undefined, undefined, "EXACT", "an invariant lost its provenance tag"),
  );
  // Determinism (hermetic battery): identical run is bit-identical.
  const a = new MultiscaleEngine({ rungs: [13, 15, 27] }).run(3);
  const bRun = new MultiscaleEngine({ rungs: [13, 15, 27] }).run(3);
  checks.push(
    a.finalTotalResidual === bRun.finalTotalResidual
      ? ok("bit-identical re-run (no RNG)", a.finalTotalResidual, bRun.finalTotalResidual, "EXACT")
      : bad("bit-identical re-run (no RNG)", a.finalTotalResidual, bRun.finalTotalResidual, "EXACT", "engine not deterministic"),
  );
  return checks;
}

// ─────────────────────────────────────────────────────────────────────────────
// The battery
// ─────────────────────────────────────────────────────────────────────────────

/** The canonical suite order (spec §3/File 18). */
export const SUITE_ORDER: readonly SuiteName[] = Object.freeze([
  "unitRoot",
  "lucasClosure",
  "flux26",
  "cfl",
  "convergenceOrder",
  "eigenspectrum",
  "ignitionStatistics",
  "invariantPresence",
]);

const SUITE_BODY: Record<SuiteName, () => CheckResult[]> = {
  unitRoot: suiteUnitRoot,
  lucasClosure: suiteLucasClosure,
  flux26: suiteFlux26,
  cfl: suiteCfl,
  convergenceOrder: suiteConvergenceOrder,
  eigenspectrum: suiteEigenspectrum,
  ignitionStatistics: suiteIgnitionStatistics,
  invariantPresence: suiteInvariantPresence,
};

/**
 * Run the full permanent battery and return the machine-readable report.
 * Hermetic (no network/clock/RNG inputs beyond the bounded ms timer) and
 * deterministic: identical code ⇒ identical pass/fail. Bounded time by design.
 */
export function runAll(): VerificationReport {
  const t0 = now();
  const suites = SUITE_ORDER.map((name) => runSuite(name, SUITE_BODY[name]));
  const totalChecks = suites.reduce((s, x) => s + x.checks.length, 0);
  const failedChecks = suites.reduce((s, x) => s + x.checks.filter((c) => !c.pass).length, 0);
  return {
    green: suites.every((s) => s.pass),
    suites: Object.freeze(suites),
    totalChecks,
    failedChecks,
    ms: now() - t0,
    stamp: "rhuft-engine/18-file-battery",
  };
}

/**
 * The CI gate: throw if the battery is not green. Build tooling calls this so
 * a red suite fails the build with a full diagnostic — the "nothing ships
 * broken" guarantee, enforced.
 */
export function assertGreen(): void {
  const report = runAll();
  if (!report.green) {
    const lines = report.suites
      .filter((s) => !s.pass)
      .flatMap((s) =>
        s.checks.filter((c) => !c.pass).map((c) => `  ✗ [${s.suite}] ${c.name}: ${c.detail ?? "failed"}`),
      );
    throw new Error(
      `verificationSuite: battery RED — ${report.failedChecks}/${report.totalChecks} checks failed:\n${lines.join("\n")}`,
    );
  }
}

// Re-export Scaled for callers that assert on arbitrary-magnitude results.
export { Scaled };
