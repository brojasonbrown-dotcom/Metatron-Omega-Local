/**
 * Pre-pack hygiene for the build pipeline.
 *
 * Two failure modes this removes (both observed in practice):
 *  1. An orphaned v14 mind (run_mind_bridge.ts) from a previous AVA session
 *     keeps a handle on release\win-unpacked\resources\... , so electron-builder
 *     dies with EBUSY unlink app.asar. We kill only minds whose working brain
 *     dir is THIS repo's — never an unrelated node process.
 *  2. A half-written win-unpacked from an aborted pack. We remove the stale
 *     output so the pack starts from a clean slate.
 *
 * Exit 0 always — these are best-effort hygiene, not build gates. The pack
 * itself is the gate.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseDir = path.join(appRoot, "release");
const unpacked = path.join(releaseDir, "win-unpacked");
const brainFragment = "compute_engine\\brain v14";

/** Kill orphaned run_mind_bridge processes rooted at this repo's brain. */
function killOrphanedMinds() {
  if (process.platform !== "win32") return; // taskkill/wmic are Windows-only
  let rows = "";
  try {
    rows = execFileSync(
      "wmic",
      ["process", "where", "name='node.exe'", "get", "ProcessId,CommandLine", "/format:list"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch {
    return; // wmic absent on some Win11 builds — skip the kill, rely on the rm retry
  }
  // /format:list emits blank-line-separated records of Key=Value lines.
  for (const rec of rows.split(/\r?\n\r?\n/)) {
    const cmd = /CommandLine=(.+)/.exec(rec)?.[1] ?? "";
    const pid = Number(/ProcessId=(\d+)/.exec(rec)?.[1]);
    const isMind = cmd.includes("run_mind_bridge.ts") && cmd.includes(brainFragment);
    if (isMind && Number.isInteger(pid) && pid !== process.pid) {
      try {
        execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
        console.log(`  killed orphaned mind (pid ${pid})`);
      } catch { /* already gone */ }
    }
  }
}

/** Remove a path with a few retries — Windows releases file handles lazily. */
function rmWithRetry(target, attempts = 6) {
  for (let i = 0; i < attempts; i++) {
    try {
      fs.rmSync(target, { recursive: true, force: true });
      if (!fs.existsSync(target)) return true;
    } catch { /* fall through to retry */ }
    // brief backoff: 100, 200, 400 … capped, total ~3s
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.min(100 * 2 ** i, 1000));
  }
  return !fs.existsSync(target);
}

killOrphanedMinds();
if (fs.existsSync(unpacked)) {
  if (rmWithRetry(unpacked)) {
    console.log(`  cleared stale ${path.relative(appRoot, unpacked)}`);
  } else {
    // Not fatal here — but warn loudly, because electron-builder will EBUSY on it.
    console.warn(
      `  WARNING: could not clear ${unpacked} (a handle is still open).\n` +
      `  The pack step below may fail with EBUSY; close any AVA/electron window and retry.`,
    );
  }
}
console.log("  release hygiene done");
