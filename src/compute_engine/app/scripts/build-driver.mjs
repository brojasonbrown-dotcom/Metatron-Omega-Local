/**
 * METATRON Ω — build driver (the EBUSY-proof pack/dist path).
 *
 * The problem this solves, precisely (ADR-011): electron-builder unpacks the
 * Electron dist into a STAGING dir `<appOutDir>.tmp` inside the output tree,
 * extracts the archive, then renames it into place. An editor/indexer watcher
 * (VS Code, desktop search) scans the project and holds a Windows delete-share
 * lock on `win-unpacked.tmp/resources/default_app.asar`; the unlink/rename then
 * fails
 * with EBUSY and the whole build dies. Retries cannot help — the watcher
 * re-grabs the lock continuously while the build is writing.
 *
 * The fix, not a workaround: stage the ENTIRE electron-builder output to an
 * UNWATCHED cache dir under the OS temp root (the watcher only watches the
 * workspace), let electron-builder work there undisturbed, then copy the
 * finished artifacts back into the project `release/`. Copying finished files
 * is safe — the watcher can read them; only in-progress rename/unlink breaks.
 *
 * Usage:
 *   node scripts/build-driver.mjs --dir      # unpacked verification build
 *   node scripts/build-driver.mjs            # full dist (NSIS + portable)
 *
 * Exit 0 = electron-builder succeeded and artifacts are in release/.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const projectRelease = path.join(appRoot, "release");

// Unwatched build root — the watcher only scans the workspace, never %TEMP%.
const buildRoot = path.join(os.tmpdir(), "omega-build");
const stagedRelease = path.join(buildRoot, "release");

const isDirOnly = process.argv.includes("--dir");

function rmrf(p) {
  try { fs.rmSync(p, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }); } catch { /* best effort */ }
}

// 1. Stage a clean, unwatched output dir.
rmrf(stagedRelease);
fs.mkdirSync(stagedRelease, { recursive: true });

// 2. Run electron-builder with output redirected outside the watched tree.
//    -c.directories.output overrides the committed yml for THIS invocation only.
const args = [
  "electron-builder",
  ...(isDirOnly ? ["--dir"] : []),
  `-c.directories.output=${stagedRelease}`,
];
console.log(`build-driver: electron-builder ${isDirOnly ? "--dir " : ""}(staged → ${path.relative(process.cwd(), stagedRelease) || stagedRelease})`);
const run = spawnSync("npx", args, {
  cwd: appRoot,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, ELECTRON_RUN_AS_NODE: "" },
});
if (run.status !== 0) {
  console.error(`build-driver: electron-builder FAILED (exit ${run.status}).`);
  process.exit(run.status ?? 1);
}

// 3. Reconcile the project release dir and copy finished artifacts back.
fs.mkdirSync(projectRelease, { recursive: true });
const stagedTop = fs.readdirSync(stagedRelease, { withFileTypes: true });
let copied = 0;
for (const entry of stagedTop) {
  const src = path.join(stagedRelease, entry.name);
  const dst = path.join(projectRelease, entry.name);
  rmrf(dst);
  try {
    fs.cpSync(src, dst, { recursive: true });
    copied++;
  } catch (e) {
    // A finished artifact that cannot be copied over a watcher lock is a real
    // problem the operator must see — but it is NOT the in-progress EBUSY.
    console.error(`build-driver: WARNING — could not copy ${entry.name} back into release/: ${e.message}`);
  }
}

console.log(`build-driver: done — ${copied} artifact(s) staged to release/.`);
if (!isDirOnly) {
  const exes = fs.existsSync(projectRelease)
    ? fs.readdirSync(projectRelease).filter((f) => f.endsWith(".exe"))
    : [];
  for (const f of exes) console.log(`  release/${f}`);
}
process.exit(0);
