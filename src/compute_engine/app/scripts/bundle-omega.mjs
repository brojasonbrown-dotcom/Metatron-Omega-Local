/**
 * Omega bundler — bundles the METATRON Ω brain (trnn-core + field-kernel-core)
 * into one CJS file the Electron main process can require() directly. Mirrors
 * the old engine bundler: exploits the esbuild vendored inside the app's
 * node_modules; no new dependency. Output: electron/omega-bundle.cjs.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const omegaRoot = path.resolve(appRoot, "../omega");
// esbuild is resolved from the app's own node_modules (electron-builder tree).
const require = createRequire(path.join(appRoot, "package.json"));

let esbuild;
try {
  esbuild = require("esbuild");
} catch {
  console.error("esbuild not found in the app's node_modules.");
  process.exit(1);
}

const outfile = path.join(appRoot, "electron", "omega-bundle.cjs");
fs.mkdirSync(path.dirname(outfile), { recursive: true });

await esbuild.build({
  entryPoints: [path.join(omegaRoot, "packages/trnn-core/src/index.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  outfile,
  logLevel: "info",
});

console.log(`omega bundle written: ${path.relative(appRoot, outfile)}`);
