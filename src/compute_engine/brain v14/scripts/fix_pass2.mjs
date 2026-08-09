/**
 * Option B pass 2 — extended possibly-undefined fixer (TS2532 / TS18048).
 *
 * Handles the shapes pass 1 deliberately skipped. All transforms are
 * VALUE-PRESERVING (wrap a READ in the bounds-checked at(); narrow a row). Never
 * touches a write target's value, never adds a numeric fallback, never a `!`.
 *
 * Shapes handled (compiler-coordinate driven):
 *   1. trailing-inner:   at(a, i)[j]            -> at(at(a, i), j)
 *   2. member read:      this._x[i]             -> at(this._x, i)
 *   3. member 2D read:   this._x[i][j]          -> at(at(this._x, i), j)
 *   4. plain 2D read:    a[i][j]                -> at(at(a, i), j)
 *   5. compound WRITE:   a[i] OP= rhs  /  a[i][j] OP= rhs   (+= -= *= /= %=)
 *                        -> narrow the READ of the target only; the write is left.
 *   6. plain read:       a[i] (not a write)     -> at(a, i)
 * Anything ambiguous is left for hand-fix (reported), never guessed.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BRAIN = process.cwd();
const ERROR_CODES = new Set(["TS2532", "TS18048"]);
const IDENT = "[A-Za-z_$][\\w$]*";

function tscErrors() {
  let out = "";
  try {
    out = execFileSync("npx tsc --noEmit --pretty false", [], { cwd: BRAIN, shell: true, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  } catch (e) { out = (e.stdout || "") + (e.stderr || ""); }
  const re = new RegExp(`^(.+?)\\((\\d+),(\\d+)\\): error (TS\\d+):`, "gm");
  const errs = []; let m;
  while ((m = re.exec(out))) if (ERROR_CODES.has(m[4])) errs.push({ file: m[1], line: +m[2], col: +m[3] });
  return errs;
}

const ASSIGN = "(=|\\+=|-=|\\*=|/=|%=|\\+\\+|--)";
// order matters: most specific first
const PATTERNS = [
  // 5. compound/assign WRITE on a 2D target: recv[i][j] OP=  -> wrap inner read recv[i]
  { re: new RegExp(`^((?:this\\.)?${IDENT})\\[([^\\[\\]]+)\\]\\[([^\\[\\]]+)\\]\\s*${ASSIGN}(?![=>])`),
    emit: (m) => `at(at(${m[1]}, ${m[2]}), ${m[3]})` },
  // 1. trailing-inner after a prior at(): at(a, i)[j]
  { re: new RegExp(`^at\\(((?:this\\.)?${IDENT}),\\s*([^\\[\\]]+?)\\)\\[([^\\[\\]]+)\\]`),
    emit: (m) => `at(at(${m[1]}, ${m[2]}), ${m[3]})` },
  // 3/4. 2D read (member or plain), not a write: a[i][j] / this._x[i][j]
  { re: new RegExp(`^((?:this\\.)?${IDENT})\\[([^\\[\\]]+)\\]\\[([^\\[\\]]+)\\]`),
    guard: (m, after) => !new RegExp(`^\\s*${ASSIGN}(?![=>])`).test(after),
    emit: (m) => `at(at(${m[1]}, ${m[2]}), ${m[3]})` },
  // 5. compound/assign WRITE on a 1D target: a[i] OP=  -> wrap read a[i]
  { re: new RegExp(`^((?:this\\.)?${IDENT})\\[([^\\[\\]]+)\\]\\s*${ASSIGN}(?![=>])`),
    emit: (m) => `at(${m[1]}, ${m[2]})` },
  // 6. plain 1D read: a[i] / this._x[i]
  { re: new RegExp(`^((?:this\\.)?${IDENT})\\[([^\\[\\]]+)\\]`),
    guard: (m, after) => !new RegExp(`^\\s*${ASSIGN}(?![=>])`).test(after),
    emit: (m) => `at(${m[1]}, ${m[2]})` },
];

function fixLine(text, col) {
  // try to start a match at or just before the flagged column
  for (let s = col - 1; s >= Math.max(0, col - 60); s--) {
    const rest = text.slice(s);
    if (rest.startsWith("at(") && s >= 3 && text.slice(s - 3, s) === "at(") { continue; }
    for (const p of PATTERNS) {
      const m = p.re.exec(rest);
      if (m) {
        const after = rest.slice(m[0].length);
        if (p.guard && !p.guard(m, after)) continue;
        // skip if already wrapped (the read starts with at( at this exact spot)
        if (/^at\(at\(/.test(rest) && p.re.source.includes("\\]\\[")) continue;
        const replacement = p.emit(m);
        return { text: text.slice(0, s) + replacement + after, changed: true };
      }
    }
  }
  return { text, changed: false };
}

const targetFile = process.argv[2] || null;
const DRY = process.argv.includes("--dry");
const errs = tscErrors().filter(e => !targetFile || e.file === targetFile);
const byFile = new Map();
for (const e of errs) { if (!byFile.has(e.file)) byFile.set(e.file, []); byFile.get(e.file).push(e); }
let totalApplied = 0; const skipped = [];
for (const [file, list] of byFile) {
  const p = path.join(BRAIN, file);
  const lines = fs.readFileSync(p, "utf8").split("\n");
  const byLine = new Map();
  for (const e of list) { if (!byLine.has(e.line)) byLine.set(e.line, []); byLine.get(e.line).push(e); }
  let applied = 0;
  for (const [ln, es] of [...byLine.entries()].sort((a, b) => b[0] - a[0])) {
    let text = lines[ln - 1];
    for (const e of es.sort((a, b) => b.col - a.col)) {
      const r = fixLine(text, e.col);
      if (r.changed) { text = r.text; applied++; } else skipped.push(`${file}(${e.line},${e.col})`);
    }
    lines[ln - 1] = text;
  }
  if (applied > 0) {
    let src = lines.join("\n");
    if (!/core\/indexing\.ts/.test(src)) {
      const dir = path.dirname(file);
      const rel = path.relative(dir, "core/indexing.ts").split(path.sep).join("/");
      const spec = rel.startsWith(".") ? rel : "./" + rel;
      // insert after the LAST complete import statement (a line ending in from "...";)
      const importEnd = [...src.matchAll(/^import[\s\S]*?from ["'][^"']+["'];?\s*$/gm)].map(m => m.index + m[0].length).pop();
      if (importEnd !== undefined) src = src.slice(0, importEnd) + `\nimport { at } from "${spec}";` + src.slice(importEnd);
      else src = `import { at } from "${spec}";\n` + src;
    }
    if (!DRY) fs.writeFileSync(p, src);
  }
  totalApplied += applied;
  if (targetFile) {
    console.log(`${file}: wrapped ${applied}/${list.length}`);
    if (DRY) {
      const out = lines.join("\n").split("\n");
      [114, 244, 272, 282, 284, 292, 295, 300, 303, 312, 315, 317, 322, 1437, 1450, 1578].forEach(l => { if (out[l - 1]) console.log(`  L${l}: ` + out[l - 1].trim().slice(0, 95)); });
    }
  }
}
console.log(`\nTOTAL wrapped: ${totalApplied}; skipped: ${skipped.length}`);
if (skipped.length) console.log("SKIPPED (first 50):\n" + skipped.slice(0, 50).join("\n"));
