/**
 * RHUFT Mind — Typecheck Regression Gate
 *
 * Epistemic Status: [SPEC] — Build tooling, no math.
 *
 * Runs `tsc --noEmit` over the WHOLE brain v14 program and enforces the
 * no-regression contract honestly:
 *
 *   1. ZERO errors may originate in the new mind layer
 *      (adapters/, cognition/, schemas/, tests/, run_mind.ts, scripts/).
 *   2. Errors in pre-existing legacy files (frameworks.ts, RHUFTFrameworks.ts,
 *      compute_worker.ts, GeometricReflection.ts, membrane_stabilizer.ts,
 *      resonance_finder.ts, SpherePrinciple.ts) are LATENT conditions revealed
 *      by the first-ever typecheck of this directory — they predate the mind
 *      layer, which never edited them. They are reported, counted, and gated:
 *      the count may never EXCEED the recorded baseline (a growth would mean
 *      a real regression).
 *
 * These legacy type errors do not affect runtime: Node ≥ 25 executes the .ts
 * files via type-stripping, and the engine has always run this way.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BRAIN_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Baseline of pre-existing legacy errors, recorded at mind-layer integration.
// [SPEC] If legacy files are ever fixed, lower this number accordingly.
const LEGACY_ERROR_BASELINE = 45;

// Any error whose file path starts with one of these prefixes is NEW-LAYER
// code and must be perfectly clean.
const MIND_LAYER_PREFIXES = [
  "adapters/",
  "cognition/",
  "schemas/",
  "tests/",
  "scripts/",
  "run_mind.ts",
];

const tsc = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsc", "--noEmit", "--pretty", "false"],
  { cwd: BRAIN_DIR, encoding: "utf8", shell: process.platform === "win32", maxBuffer: 16 * 1024 * 1024 }
);

const output = `${tsc.stdout ?? ""}\n${tsc.stderr ?? ""}`;
// tsc non-pretty error lines look like:  path(line,col): error TSxxxx: message
const errorLines = output
  .split(/\r?\n/)
  .filter((line) => /\berror TS\d+:/.test(line));

const mindErrors = [];
const legacyErrors = [];
for (const line of errorLines) {
  const file = line.split("(")[0].replaceAll("\\", "/");
  const isMind = MIND_LAYER_PREFIXES.some(
    (p) => file === p || file.startsWith(p)
  );
  (isMind ? mindErrors : legacyErrors).push(line);
}

console.log("── typecheck regression gate ──────────────────────────────────");
console.log(`total tsc errors : ${errorLines.length}`);
console.log(`mind-layer errors: ${mindErrors.length} (must be 0)`);
console.log(`legacy errors    : ${legacyErrors.length} (baseline ${LEGACY_ERROR_BASELINE}, pre-existing)`);

let failed = false;

if (mindErrors.length > 0) {
  failed = true;
  console.error("\nFAIL — errors in the new mind layer:");
  for (const line of mindErrors) console.error("  " + line);
}

if (legacyErrors.length > LEGACY_ERROR_BASELINE) {
  failed = true;
  console.error(
    `\nFAIL — legacy error count grew past baseline (${legacyErrors.length} > ${LEGACY_ERROR_BASELINE}); a legacy file regressed:`
  );
  for (const line of legacyErrors) console.error("  " + line);
}

if (!failed) {
  console.log("\nPASS — mind layer is strict-clean; legacy baseline unchanged.");
}
process.exit(failed ? 1 : 0);
