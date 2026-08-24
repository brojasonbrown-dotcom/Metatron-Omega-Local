/**
 * AVA — Drift / burden health scan (the "is the loop actually at rest?" check).
 *
 * Why this exists: coherence is cos²(u(t), u(t−dt)) — a PHASE-LOCK measure. It
 * compares the field's SHAPE to its own immediate past and is blind to
 * magnitude. A field blowing up secularly (amplitude ×10⁹) stays perfectly
 * phase-locked to itself, so coherence pins at exactly 1.0000 while the energy
 * runs away. The burden (E = Σu²) and the drift (|log(E/E₀)|) are the only
 * signals that see that growth — so this scan reads THEM, and treats a pinned
 * 1.0000 coherence as the masking signature it is, never as "rest".
 *
 * The verdicts (each carries the WHY, not just a colour):
 *   NOMINAL        — drift under the certificate line, closure balanced, burden bounded.
 *   DRIFTING       — drift over the certificate line but not yet a runaway.
 *   ENERGY BLOW-UP — drift is large: the field has gained e^drift × its seed
 *                    energy while coherence held. Coherence-at-1.0 is stated as
 *                    phase-lock, NOT rest. This is the pairing the operator
 *                    flagged (drift 2.36e+1, burden 6.66e12, coherence 1.0000).
 *   OPEN CIRCUIT   — closure defect ~1: |Σu| ≈ Σ|u|, net flux fully imbalanced;
 *                    the ring's flow is one-directional (circuit still open).
 *
 * Pure function — no engine state kept here; the verdict is recomputed from
 * the live invariants every call so it can never go stale.
 */
"use strict";

// The honest certificate line the loop reports drift against (measured: ~4e-4
// saturation over 30k ticks; 1e-3 is the bound, not a rounding-level fantasy).
const DRIFT_CERTIFICATE = 1e-3;
// drift beyond this is a secular runaway, not the bounded naive-energy slide:
// e^1 ≈ 2.7× the seed energy is already far outside the modified-equation bound.
const DRIFT_BLOWUP = 1.0;
// closure defect above this reads as an open (one-directional) circuit.
const CLOSURE_OPEN = 0.9;
// coherence within this of 1.0 is "pinned" — suspicious precisely because it is
// exact phase-lock, which hides magnitude.
const COHERENCE_PINNED = 1 - 1e-6;

/**
 * Classify one live-invariants snapshot.
 * @param {{drift:number, driftSigned?:number, closure:number, coherence:number,
 *          burden:number, nodes:number, burdenPeak?:number}} inv
 * @returns {{level:string, code:string, headline:string, detail:string,
 *            ratio:(number|null), peakRatio:(number|null), openCircuit:boolean}}
 */
function scanDrift(inv) {
  const drift = Number.isFinite(inv.drift) ? inv.drift : 0;
  const closure = Number.isFinite(inv.closure) ? inv.closure : 0;
  const coherence = Number.isFinite(inv.coherence) ? inv.coherence : 0;
  const burden = Number.isFinite(inv.burden) ? inv.burden : 0;
  const nodes = Number.isInteger(inv.nodes) && inv.nodes > 0 ? inv.nodes : 1;
  const peak = Number.isFinite(inv.burdenPeak) && inv.burdenPeak > 0 ? inv.burdenPeak : burden;

  // Energy gain relative to the seed anchor: e^drift. Null when the anchor is 0.
  const ratio = drift > 0 ? Math.exp(Math.min(drift, 700)) : 1; // exp overflows > ~709
  // Burden growth vs the running peak baseline (per-node so it's resolution-fair).
  const peakRatio = peak > 0 ? burden / peak : 1;
  const openCircuit = closure >= CLOSURE_OPEN;
  const pinned = coherence >= COHERENCE_PINNED;

  const driftStr = drift.toExponential(2);
  const burdenStr = burden.toExponential(2);
  const gainStr = ratio !== null && ratio < 1e300 ? ratio.toExponential(2) : "≫1e300";

  let level, code, headline, detail;
  if (drift >= DRIFT_BLOWUP) {
    level = "blowup";
    code = "ENERGY BLOW-UP";
    headline = `drift ${driftStr} — field at ${gainStr}× seed energy`;
    detail = pinned
      ? `coherence ${coherence.toFixed(4)} is PHASE-LOCK, not rest: cos²-overlap is blind to magnitude, so the runaway reads as perfect coherence. Burden Σu² = ${burdenStr} across ${nodes} nodes. The energy anchor E₀ is lost — reseed the field to recover the certificate.`
      : `drift ${driftStr} means the field gained ~e^drift × its seed energy; burden Σu² = ${burdenStr} across ${nodes} nodes. The anchor is slipping secularly.`;
  } else if (drift >= DRIFT_CERTIFICATE) {
    level = "drifting";
    code = "DRIFTING";
    headline = `drift ${driftStr} over the 1e-3 certificate line`;
    detail = `naive-energy deviation has crossed the bounded-slide bound; burden Σu² = ${burdenStr}. Watch it — if it keeps climbing it becomes a blow-up.`;
  } else {
    level = "nominal";
    code = "NOMINAL";
    headline = `drift ${driftStr} within the 1e-3 certificate`;
    detail = `bounded naive-energy slide; burden Σu² = ${burdenStr} across ${nodes} nodes.`;
  }

  if (openCircuit) {
    const oc = `closure defect ${closure.toExponential(2)} ≈ 1 — net flux |Σu| ≈ Σ|u|: the ring flow is one-directional, the circuit is still OPEN.`;
    detail = `${detail} ${oc}`;
    // An open circuit is reported even when drift is nominal — it is its own axis.
    if (level === "nominal") { level = "open"; code = "OPEN CIRCUIT"; headline = oc; }
    else code = `${code} + OPEN CIRCUIT`;
  }

  return { level, code, headline, detail, ratio, peakRatio, openCircuit };
}

module.exports = { scanDrift, DRIFT_CERTIFICATE, DRIFT_BLOWUP, CLOSURE_OPEN, COHERENCE_PINNED };
