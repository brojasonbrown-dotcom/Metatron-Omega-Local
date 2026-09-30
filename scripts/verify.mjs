#!/usr/bin/env node
/**
 * METATRON Ω — unified verify entry point (H6).
 *
 * One command for the full verification battery. Each step is a thin dispatch
 * to the existing script (no logic is duplicated):
 *   wolfram  → scripts/wolfram/verify.mjs    φ-identity bank vs fixture
 *   gematria → scripts/sandbox-highres.cjs   gematria + resonance + live engine
 *   corridor → scripts/field-vectoring.cjs   coupling morphism + field vectoring
 *   scale    → scripts/scale-benchmark.cjs   PICO→GRAND finite + deterministic
 *   all      → the four above, in order (default)
 *
 * Exit codes are honest: a step's exit 1 (DRIFT) fails the battery; a step's
 * exit 2 (UNVERIFIED, e.g. Wolfram license lapse) is reported as a WARNING and
 * does NOT fail the battery (it was never run, so it cannot pass).
 *
 * Run:  node scripts/verify.mjs [wolfram|gematria|corridor|scale|all]
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const NODE = process.execPath;
const APP_SCRIPTS = join(here, "..", "src", "compute_engine", "app", "scripts");

const STEPS = [
  { id: "wolfram", label: "Wolfram φ-identity bank", script: join(here, "wolfram", "verify.mjs") },
  { id: "gematria", label: "gematria + resonance + live engine", script: join(APP_SCRIPTS, "sandbox-highres.cjs") },
  { id: "corridor", label: "corridor morphism + field vectoring", script: join(APP_SCRIPTS, "field-vectoring.cjs") },
  { id: "scale", label: "resolution scale benchmark", script: join(APP_SCRIPTS, "scale-benchmark.cjs") },
];

const arg = process.argv[2] ?? "all";
const wanted = arg === "all" ? STEPS.map((s) => s.id) : [arg];

let failed = 0;
let warned = 0;
for (const step of STEPS) {
  if (!wanted.includes(step.id)) continue;
  console.log(`\n═══ ${step.label} (${step.id}) ═══`);
  const r = spawnSync(NODE, [step.script], { stdio: "inherit" });
  if (r.status === 1) {
    console.error(`[verify] ${step.id}: DRIFT (exit 1)`);
    failed++;
  } else if (r.status === 2) {
    console.warn(`[verify] ${step.id}: UNVERIFIED (exit 2) — skipped, not a pass`);
    warned++;
  } else if (r.status !== 0) {
    console.error(`[verify] ${step.id}: FAILED (exit ${r.status})`);
    failed++;
  }
}

console.log(`\n[verify] ${failed} failure(s), ${warned} unverified warning(s)`);
process.exit(failed > 0 ? 1 : 0);
