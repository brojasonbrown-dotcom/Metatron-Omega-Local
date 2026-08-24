/**
 * AVA responder — the chat brain. REAL COMPUTATION ONLY (golden rule B-10):
 * every answer is derived live from the bundled RHUFT engine. No canned facts,
 * no mock LLM. Where no computational intent matches, the responder says so
 * honestly and lists what it CAN compute.
 */
"use strict";

const E = require("./engine-bundle.cjs");

const fmt = {
  sci(x, digits = 6) {
    if (x === 0) return "0";
    return x.toExponential(digits).replace("e", "×10^");
  },
  scaled(s, digits = 6) {
    return `${s.mantissa.toPrecision(digits + 1)}×10^${s.exp10}`;
  },
};

/** The capabilities list — also the fallback answer. */
function help() {
  return [
    "I compute directly from the RHUFT engine (no canned answers). Try:",
    "• `scale 13` — full ScaleRecord for a rung (L, τ, ρ_I, v_wave, winding, residue)",
    "• `ladder` — the 18 dense-core stable rungs + continuation census",
    "• `lucas 27` / `fib 50` — exact integer, mod-13 residue, stability",
    "• `phi` — golden-ratio identities, verified live (φ⁻¹+φ⁻²=1, φ⁻²⁶)",
    "• `closure 13` — run the closure residual on the Metatron field at a rung",
    "• `torus 13` — torus geometry + surface area + Lucas floor",
    "• `memory` — conservative kernel: roots, deep-memory weights, W∞ = 1/2",
    "• `overlap` — golden-delay self-overlap C(t) on a live recursion",
    "• `status` — engine structure read live (subsystems, modules, exports)",
  ].join("\n");
}

/** scale N — one ScaleRecord, computed. */
function scaleInfo(n) {
  let r;
  try {
    r = E.getScale(n);
  } catch {
    return `n=${n} is not a Lucas-stable rung on the ladder (stable ⇔ Lₙ ≡ ±1 mod 13 ⇔ n ≡ {1,13,15,27} mod 28).`;
  }
  const nb = E.ladderNeighbors(n);
  return [
    `Scale n=${n}${r.isMetatronShell ? "  — the METATRON SHELL" : ""} (stable: Lₙ mod 13 residue ${r.lucasResidue})`,
    `  L      = ${fmt.scaled(r.L)} m`,
    `  τ      = ${fmt.scaled(r.tau)} s   (T·(1+0.01n), T = ${fmt.scaled(r.T)} s)`,
    `  ρ_I    = ${fmt.scaled(r.rhoI)} m⁻³`,
    `  v_wave = ${fmt.scaled(r.vWave)} m/s  (c·φ⁻ⁿᐟ², canonical ladder form)`,
    `  winding W = ${r.winding}   complexity = ${r.complexityBits.toFixed(4)} bits`,
    `  ladder neighbours: ${nb[0] ?? "—"} ← ${n} → ${nb[1] ?? "—"};  octave partners (open): ${n - 13}, ${n + 13}`,
  ].join("\n");
}

/** closure N — actually run the File-6 residual on the Metatron IC. */
function closureInfo(n) {
  let t;
  try {
    t = E.torusForScale(n);
  } catch {
    return `n=${n} is not a Lucas-stable rung — closure is only measured on stable rungs.`;
  }
  const ic = E.initialCondition(t);
  const r = E.closureResidual(ic, t);
  const score = E.closureScore(ic, t);
  const floor = E.minimallyOpenFloor(t);
  const periodic = E.isClosed(ic, t);
  return [
    `Closure at n=${n} (Metatron initial condition, live measurement):`,
    `  residual  = ${r.value.toExponential(6)}  (${r.provenance})`,
    `  score     = ${score.toFixed(8)}  (1 = frictionless)`,
    `  periodic  = ${periodic}`,
    `  Lucas floor = ${fmt.scaled(floor.value)}  (φ^${-26 - 2 * (n - 13)}; the residual can never reach 0 — Lₙ mod 13 ≠ 0)`,
  ].join("\n");
}

/** overlap — golden-delay self-overlap on a live conservative recursion. */
function overlapInfo() {
  const mk = new E.MemoryKernel();
  let cur = [1, 0.5, -0.2, 0.7];
  let prev = [-0.3, 0.8, 0.1, -0.5];
  const snaps = [prev, cur];
  for (let i = 0; i < 40; i++) {
    const nxt = mk.stepField(cur, prev);
    prev = cur;
    cur = nxt;
    snaps.push(cur);
  }
  const C = E.selfOverlap({ snapshots: snaps, tau: 1 });
  return [
    `Golden-delay self-overlap after 40 conservative steps (λ = φ⁻²):`,
    `  C(t) = ${C.value.toFixed(8)}  — cos²θ between Ψ(t) and Ψ(t−φτ)`,
    `  ignition threshold φ⁻² = ${E.PHI_NEG2}: ${C.value > E.PHI_NEG2 ? "EXCEEDED (ignition)" : "not exceeded"}`,
    `  the recursion converges to a fixed point, so C → 1: the field phase-locks to its own golden-delayed past.`,
  ].join("\n");
}

/** status — engine structure read live from the file system (no hardcoding).
 *  Golden rule B-10: report what actually exists on disk, never a frozen
 *  count. Scans engine/src per subsystem and counts the real modules — the
 *  engine is a living tree, so this is recomputed on every call. */
function statusInfo() {
  const fs = require("node:fs");
  const path = require("node:path");
  const srcRoot = path.join(__dirname, "..", "..", "engine", "src");
  if (!fs.existsSync(srcRoot)) {
    return `Engine source not found at ${srcRoot} — bundle path is broken.`;
  }
  // Every subsystem directory; each module is a .ts file. index.ts files are
  // just re-export barrels, not implementation, so they are not counted.
  const subsystems = fs
    .readdirSync(srcRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const lines = [];
  let total = 0;
  for (const sub of subsystems) {
    const modules = fs
      .readdirSync(path.join(srcRoot, sub))
      .filter((f) => f.endsWith(".ts") && f !== "index.ts")
      .map((f) => f.replace(/\.ts$/, ""));
    total += modules.length;
    lines.push(`  ${sub.padEnd(12)} ${String(modules.length).padStart(2)}  ${modules.join(", ")}`);
  }
  return [
    `Engine structure (read live from ${path.relative(process.cwd(), srcRoot)}):`,
    `  ${subsystems.length} subsystems, ${total} modules:`,
    ...lines,
    `  exports in bundle: ${Object.keys(E).length}`,
    `  open postulate: ${E.UNRESOLVED.mediumWaveSpeed}`,
  ].join("\n");
}

/** Intent router — deterministic, ordered, first match wins. */
function respond(message) {
  const m = message.trim().toLowerCase();
  const num = (re) => {
    const hit = m.match(re);
    return hit ? Number.parseInt(hit[1], 10) : null;
  };

  let n;
  if ((n = num(/(?:scale|rung)\s+(\d+)/)) !== null) return scaleInfo(n);
  if ((n = num(/(?:closure|close|residual)\s+(\d+)/)) !== null) return closureInfo(n);
  if ((n = num(/(?:torus|geometry|area)\s+(\d+)/)) !== null) {
    try {
      const t = E.torusForScale(n);
      return [
        `Torus at n=${n}: R = ${fmt.scaled(t.R)} m, r = ${fmt.scaled(t.r)} m, aspect R/r = φ (POSTULATE, KAM-motivated)`,
        `  surface area 4π²Rr = ${fmt.scaled(E.surfaceArea(t))} m²`,
        `  Lucas-obstruction floor: ${fmt.scaled(E.minimallyOpenFloor(t).value)}`,
      ].join("\n");
    } catch {
      return `n=${n} is not a Lucas-stable rung.`;
    }
  }
  if ((n = num(/lucas\s+(\d+)/)) !== null) {
    return [
      `L(${n}) = ${E.lucas(n)}  (exact BigInt)`,
      `  mod 13 = ${E.lucasResidue(n)}  →  ${E.isStable(n) ? "STABLE rung" : "unstable"} (closure residue min ${E.closureResidueMin(n)}; never 0 by theorem)`,
      `  Binet defect |φⁿ − Lₙ| = φ⁻ⁿ = ${fmt.sci(E.binetDefect(n), 4)}`,
    ].join("\n");
  }
  if ((n = num(/fib\s+(\d+)/)) !== null) {
    return `F(${n}) = ${E.fibonacci(n)}  (exact BigInt)`;
  }
  if (/^(help|what can you|capabilities|hi|hello|hey)\b/.test(m)) return help();
  if (/ladder|stable scales|rungs/.test(m)) {
    return [
      `The 18 dense-core stable rungs: ${E.STABLE_SCALES.join(", ")}`,
      `  + ${E.CONTINUATION.length} continuation rungs up to n=${E.LADDER[E.LADDER.length - 1]} (total census ${E.LADDER.length})`,
      `  stability ⇔ Lₙ ≡ ±1 (mod 13) ⇔ n ≡ {1,13,15,27} (mod 28) — computed, not asserted.`,
    ].join("\n");
  }
  if (/phi|golden/.test(m)) {
    const pair = E.goldenPairSum();
    return [
      `φ = ${E.PHI}  (EXACT: (1+√5)/2)`,
      `  φ⁻¹ + φ⁻² = ${pair}  (telescopes to 1 — ${pair === 1 ? "bit-exact" : "to 1e-15"})`,
      `  λ = φ⁻² = ${E.PHI_NEG2}  (conservative memory coupling; unit-root partner root)`,
      `  flux(13) = φ⁻²⁶ = ${E.PHI_NEG26}  (Metatron-shell anchor)`,
      `  spectral weight Σₖ₌₀¹² φ⁻ᵏ = ${E.spectralWeightSum()}`,
    ].join("\n");
  }
  if (/memory|kernel|recursion/.test(m)) {
    const mk = new E.MemoryKernel();
    const [z1, z2] = mk.characteristicRoots();
    return [
      `Conservative recursion Ψ(t+τ) = (1−λ)Ψ(t) + λΨ(t−τ), λ = φ⁻²`,
      `  characteristic roots: z₁ = ${z1}, z₂ = ${z2}  (unit root + |z₂| < 1 ⇒ conservative)`,
      `  deep-memory weights w_k = φ^{1−3k};  W∞ = Σw_k = ${E.MemoryKernel.deepMemoryTotalWeight()}  (exactly 1/2)`,
      `  certificate: isConservative() = ${mk.isConservative()}`,
    ].join("\n");
  }
  if (/overlap|self.?measure|ignition|conscious/.test(m)) return overlapInfo();
  if (/closure|residual/.test(m)) return closureInfo(13);
  if (/status|state|progress|build/.test(m)) return statusInfo();
  if (/density|rho/.test(m)) {
    return [
      `ρ_I envelope per rung: ρ₀·φ⁻ⁿ with ρ₀ = ℓ_P⁻³`,
      `  ρ_I(1)   = ${fmt.scaled(E.envelopeDensity(1))} m⁻³`,
      `  ρ_I(13)  = ${fmt.scaled(E.envelopeDensity(13))} m⁻³`,
      `  ρ_I(125) = ${fmt.scaled(E.envelopeDensity(125))} m⁻³`,
      `  (convex H/R/K/S mixture is mean-1, so the envelope is conserved — File 13)`,
    ].join("\n");
  }
  return `I don't have a computed answer for that — I only report what the engine can actually compute.\n\n${help()}`;
}

module.exports = { respond };
