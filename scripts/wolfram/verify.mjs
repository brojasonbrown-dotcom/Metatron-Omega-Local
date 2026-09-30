#!/usr/bin/env node
/**
 * Wolfram verification re-runner (H2).
 *
 * Runs the Wolfram Engine's φ-identity bank (wolfram-verify.wls) and diffs it
 * against the committed fixture (trnn-core/test/fixtures/wolfram-verified.json).
 * Honest exit codes — never a silent success:
 *   0  PASS        identical to the fixture
 *   1  DRIFT       a constant/identity moved (the fixture is stale or wrong)
 *   2  UNVERIFIED  Wolfram unavailable / license lapse / malformed output
 *
 * Run:  node scripts/wolfram/verify.mjs
 * The wolframscript path is WOLFRAM_SCRIPT if set, else the default install.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const WLS = join(here, "wolfram-verify.wls");
const FIXTURE = join(
  here, "..", "..", "src", "compute_engine", "omega", "packages",
  "trnn-core", "test", "fixtures", "wolfram-verified.json",
);

const wolframScript =
  process.env.WOLFRAM_SCRIPT ||
  "C:/Program Files/Wolfram Research/WolframScript/wolframscript.exe";

const run = spawnSync(wolframScript, ["-f", WLS], { encoding: "utf8", timeout: 120000 });
if (run.error || run.status !== 0) {
  console.error(`UNVERIFIED: wolframscript failed — ${run.error ? run.error.message : `exit ${run.status}`}`);
  console.error("(likely license lapse — run `wolframscript -activate` and retry)");
  process.exit(2);
}

const out = run.stdout ?? "";
const start = out.indexOf("{");
const end = out.lastIndexOf("}");
if (start < 0 || end <= start) {
  console.error("UNVERIFIED: wolfram-verify.wls emitted no JSON object (license lapse?)");
  process.exit(2);
}

let live;
try {
  live = JSON.parse(out.slice(start, end + 1));
} catch (err) {
  console.error(`UNVERIFIED: bad JSON from wolfram-verify.wls — ${err.message}`);
  process.exit(2);
}

let fixture;
try {
  fixture = JSON.parse(readFileSync(FIXTURE, "utf8"));
} catch (err) {
  console.error(`UNVERIFIED: cannot read fixture ${FIXTURE} — ${err.message}`);
  process.exit(2);
}

let drift = 0;
// Identities must be exactly 0.
for (const [k, v] of Object.entries(fixture.identities ?? {})) {
  if (live.identities?.[k] !== v) {
    console.error(`DRIFT identity ${k}: fixture=${v} live=${live.identities?.[k]}`);
    drift++;
  }
}
// 60-digit values diff at float64-nearest (the s6 lock precision): a move of even
// one ulp is a drift.
for (const [k, v] of Object.entries(fixture.values ?? {})) {
  const liveVal = live.values?.[k];
  if (liveVal === undefined || Number(v) !== Number(liveVal)) {
    console.error(`DRIFT value ${k}: fixture=${v} live=${liveVal}`);
    drift++;
  }
}

if (drift > 0) {
  console.error(`DRIFT: ${drift} mismatch(es) between Wolfram and the committed fixture`);
  process.exit(1);
}
console.log("PASS: Wolfram φ-identity bank matches the committed fixture");
process.exit(0);
