/**
 * Engine bundler — exploits the esbuild already vendored inside the engine's
 * node_modules (via Vitest); no new dependency is introduced (golden rule C-16).
 * Produces electron/engine-bundle.cjs: the engine's public API as one CJS file
 * the Electron main process can require() directly.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const engineRoot = path.resolve(appRoot, "../engine");
const require = createRequire(path.join(engineRoot, "package.json"));

let esbuild;
try {
  esbuild = require("esbuild");
} catch {
  console.error(
    "esbuild not found in the engine's node_modules. Run `npm install` in src/compute_engine/engine first.",
  );
  process.exit(1);
}

const outfile = path.join(appRoot, "electron", "engine-bundle.cjs");
fs.mkdirSync(path.dirname(outfile), { recursive: true });

await esbuild.build({
  entryPoints: [path.join(appRoot, "electron", "engine-entry.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  outfile,
  logLevel: "info",
});

console.log(`engine bundle written: ${path.relative(appRoot, outfile)}`);
