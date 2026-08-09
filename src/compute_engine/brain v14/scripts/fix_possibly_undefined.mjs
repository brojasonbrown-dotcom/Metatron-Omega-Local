/**
 * Option B possibly-undefined fixer (TS2532 / TS18048 only).
 *
 * Reads tsc --pretty false output, and for each flagged (file,line,col) wraps the
 * indexed READ at that exact coordinate in the bounds-checked accessor at().
 * Value-preserving by construction: it never touches a write target, never adds
 * a numeric fallback, never asserts away the check. The suite is the safety net.
 *
 * Conservative: any coordinate whose source shape it cannot confidently parse is
 * recorded as "skipped" for hand-fixing — never guessed.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BRAIN = path.dirname(path.dirname(decodeURIComponent(new URL(import.meta.url).pathname))).replace(/^\/([A-Za-z]:)/, "$1");
const ERROR_CODES = new Set(["TS2532", "TS18048"]);

function tscErrors() {
  let out = "";
  try {
    out = execFileSync("npx tsc --noEmit --pretty false", [], { cwd: BRAIN, shell: true, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    out = (e.stdout || "") + (e.stderr || "");
  }
  const re = /^(.+?)\((\d+),(\d+)\): error (TS\d+):/gm;
  const errs = [];
  let m;
  while ((m = re.exec(out))) {
    if (ERROR_CODES.has(m[4])) errs.push({ file: m[1], line: +m[2], col: +m[3], code: m[4] });
  }
  return errs;
}

// Match a receiver+index read starting at 0-based offset `o` in `text`.
// Returns { raw, receiver, index, end } or null if the shape is not a simple read.
function parseReadAt(line, o) {
  const rest = line.slice(o);
  // A PLAIN identifier receiver followed by ONE index bracket. We deliberately
  // refuse dotted paths and pre-indexed receivers (this._x, adjacency[i]) here:
  // those are nested/member shapes handed to the manual pass, so a codemod can
  // never mistake a write-target's row for a readable value.
  const m = /^([A-Za-z_$][\w$]*)(\[)([^\[\]]+)(\])/.exec(rest);
  if (!m) return null;
  const receiver = m[1];
  const index = m[3];
  const after = rest.slice(m[0].length);
  // WRITE GUARD: if what follows the closing bracket is an assignment operator
  // (optionally after further [index] chains), this is a WRITE target — skip.
  // e.g. `a[i] =`, `a[i] +=`, `a[i][j] =`, `a[i][j] *=`. Reads (==, =>, <=, ? :)
  // and call/index continuations that are not assignments are left eligible.
  if (/^(\s*\[[^\[\]]*\])*\s*(=|\+=|-=|\*=|\/=|%=|\+\+|--)(?![=>])/.test(after)) return null;
  return { raw: m[0], receiver, index, end: o + m[0].length };
}

function fixFile(file, errs) {
  const p = path.join(BRAIN, file);
  let lines = fs.readFileSync(p, "utf8").split("\n");
  // group by line, apply right-to-left so columns stay valid
  const byLine = new Map();
  for (const e of errs) {
    if (!byLine.has(e.line)) byLine.set(e.line, []);
    byLine.get(e.line).push(e);
  }
  let applied = 0, skipped = [];
  for (const [ln, list] of [...byLine.entries()].sort((a, b) => b[0] - a[0])) {
    let text = lines[ln - 1];
    for (const e of list.sort((a, b) => b.col - a.col)) {
      const o = e.col - 1;
      // the receiver may START before the flagged col (tsc points at the index expr).
      // find the read whose bracket-span contains or starts at this offset.
      let done = false;
      for (let s = o; s >= Math.max(0, o - 40); s--) {
        const r = parseReadAt(text, s);
        if (r && s + r.raw.length > o) {
          // avoid double-wrap
          if (!text.slice(Math.max(0, s - 3), s).endsWith("at(")) {
            text = text.slice(0, s) + `at(${r.receiver}, ${r.index})` + text.slice(r.end);
            applied++;
          }
          done = true;
          break;
        }
      }
      if (!done) skipped.push(`${file}(${e.line},${e.col})`);
    }
    lines[ln - 1] = text;
  }
  // ensure import of at()
  let src = lines.join("\n");
  if (applied > 0 && !/from ["']\.\.?\/.*core\/indexing\.ts["']/.test(src) && !/require\(.*core\/indexing/.test(src)) {
    // compute relative path from file's dir to core/indexing.ts
    const dir = path.dirname(file);
    const rel = path.relative(dir, "core/indexing.ts").split(path.sep).join("/");
    const spec = rel.startsWith(".") ? rel : "./" + rel;
    // insert after last import
    const lastImport = src.lastIndexOf("\nimport ");
    if (lastImport >= 0) {
      const nl = src.indexOf("\n", lastImport + 1);
      src = src.slice(0, nl) + `\nimport { at } from "${spec}";` + src.slice(nl);
    } else {
      src = `import { at } from "${spec}";\n` + src;
    }
  }
  if (applied > 0) fs.writeFileSync(p, src);
  return { applied, skipped };
}

const errs = tscErrors();
console.log(`possibly-undefined errors to process: ${errs.length}`);
const byFile = new Map();
for (const e of errs) {
  if (!byFile.has(e.file)) byFile.set(e.file, []);
  byFile.get(e.file).push(e);
}
let totalApplied = 0; const allSkipped = [];
for (const [file, list] of byFile) {
  const { applied, skipped } = fixFile(file, list);
  totalApplied += applied; allSkipped.push(...skipped);
  console.log(`${file}: wrapped ${applied}/${list.length}`);
}
console.log(`\nTOTAL wrapped: ${totalApplied}; skipped for hand-fix: ${allSkipped.length}`);
if (allSkipped.length) console.log("SKIPPED:\n" + allSkipped.slice(0, 60).join("\n"));
