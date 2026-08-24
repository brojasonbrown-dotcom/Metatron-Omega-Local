/**
 * Pre-pack lock probe for the build pipeline.
 *
 * electron-builder dies with EBUSY when something holds
 * release\win-unpacked\resources\brain v14. The usual culprit on this machine
 * is an Electron-based editor/assistant (VS Code, Kimi, Cursor, …) watching the
 * tree: Chromium's ReadDirectoryChangesW opens the dir with FILE_SHARE_READ but
 * NOT FILE_SHARE_DELETE, so any rename of the dir (or an ancestor) fails —
 * while creating/deleting files *inside* it still works.
 *
 * This probe replicates the exact operation electron-builder fails at: renaming
 * resources\brain v14 (and back). On failure it prints the processes most
 * likely holding the lock so the operator knows what to close.
 *
 * Exit 0 = clear. Exit 1 = locked (build should stop before wasting a pack).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resources = path.join(appRoot, "release", "win-unpacked", "resources");
const brainDir = path.join(resources, "brain v14");

/**
 * The electron-builder failure is rmdir/rename of brain v14. Test that exact
 * operation: rename the dir to a temp name and back. If anything holds it
 * without FILE_SHARE_DELETE, the rename fails — even when the dir is empty.
 */
function probe() {
  if (!fs.existsSync(brainDir)) return true; // nothing packed yet — nothing to lock
  const tmp = brainDir + `.lockprobe-${process.pid}`;
  try {
    fs.renameSync(brainDir, tmp);
    fs.renameSync(tmp, brainDir);
    return true;
  } catch {
    // If the first rename succeeded but the restore failed, put it back.
    try { if (fs.existsSync(tmp) && !fs.existsSync(brainDir)) fs.renameSync(tmp, brainDir); } catch { /* leave */ }
    return false;
  }
}

/** Best-effort identification of likely holders (Electron watchers, AV, …). */
function reportLikelyHolders() {
  if (process.platform !== "win32") return;
  const suspects = [
    "Kimi", "Code", "Cursor", "electron", "AVA", "ollama",
    "SearchIndexer", "SearchProtocolHost", "MsMpEng",
  ];
  let rows = "";
  try {
    rows = execFileSync(
      "powershell",
      [
        "-NoProfile", "-Command",
        "Get-Process | Select-Object Id,ProcessName | ConvertTo-Csv -NoTypeInformation",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch {
    return;
  }
  const hits = [];
  for (const line of rows.split(/\r?\n/).slice(1)) {
    const m = /^"(\d+)","(.+)"$/.exec(line);
    if (!m) continue;
    const [, pid, name] = m;
    if (suspects.some((s) => name.toLowerCase().includes(s.toLowerCase()))) {
      hits.push(`    pid ${pid.padStart(6)}  ${name}`);
    }
  }
  if (hits.length > 0) {
    console.error("  likely holders (close any that have this project open):");
    for (const h of hits) console.error(h);
  }
}

if (probe()) {
  console.log("  lock probe: clear");
  process.exit(0);
}

console.error(
  `  LOCKED: ${brainDir} cannot be renamed/deleted.\n` +
  "  Something is holding release\\win-unpacked — usually an Electron app\n" +
  "  (VS Code / Kimi / Cursor) watching this folder, or a real-time AV scan.\n" +
  "  Close it and re-run the build.",
);
reportLikelyHolders();
process.exit(1);
