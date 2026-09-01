/**
 * METATRON Ω — pre-pack staging reconciler.
 *
 * Why this exists (ADR-011 honest-limit, now closed by build-outside-tree):
 * an editor/indexer watcher (VS Code) holds a Windows delete-share lock
 * on files under the project `release/` dir — most stubbornly the Electron
 * staging archive `win-unpacked.tmp/resources/default_app.asar`. electron-builder
 * then dies with EBUSY on the unlink before writing a byte of the new build.
 * The lock is transient and on STALE generated output — never on source.
 *
 * The real fix (build-driver.mjs): pack/dist output is staged to an UNWATCHED
 * cache dir under the OS temp root, so the watcher never sees those files and
 * the lock never happens. This reconciler remains as a safety net: it best-effort
 * clears stale staging inside the project `release/` so the dir is never
 * mistaken for a real artifact, and it reports plainly what it did. A residual
 * external lock here is harmless (the build no longer stages in-tree), so this
 * never fails the build.
 *
 * Pure Node, no deps.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const releaseDir = path.join(appRoot, "release");

const STALE = ["win-unpacked", "win-unpacked.tmp"];

const RETRIES = 4;
const RETRY_MS = 250;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function tryRemove(target) {
  try {
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
    return !fs.existsSync(target);
  } catch {
    return !fs.existsSync(target);
  }
}

async function clearWithRetries(target) {
  if (!fs.existsSync(target)) return true;
  for (let i = 0; i < RETRIES; i++) {
    if (tryRemove(target)) return true;
    await wait(RETRY_MS);
  }
  return !fs.existsSync(target);
}

for (const name of STALE) {
  const target = path.join(releaseDir, name);
  const cleared = await clearWithRetries(target);
  const rel = path.relative(appRoot, target);
  if (cleared) {
    console.log(`pre-pack: cleared ${rel}`);
  } else {
    // Harmless now that the build stages outside the watched tree — report, don't fail.
    console.warn(`pre-pack: note — ${rel} is held by an external watcher; left in place (build stages outside the tree, so this does not block).`);
  }
}
console.log("pre-pack: project release/ staging reconciled.");
