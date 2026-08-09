import fs from "node:fs";
import path from "node:path";

// Wrap ternary-neighbor locals the AST codemod can't reach (error lands on the
// USE line, not the declaration):
//   const prev = i > 0 ? arr[i - 1] : arr[N - 1];
//   const next = i < N - 1 ? arr[i + 1] : arr[0];
// Both indexed branches become at(arr, idx). Value-preserving.
const BRAIN = process.cwd();
const pat = /(const\s+\w+\s*=\s*i\s*[<>][^?;]*?\?\s*)([A-Za-z_][\w]*)\[([^\[\]]+)\](\s*:\s*)([A-Za-z_][\w]*)\[([^\[\]]+)\](\s*;)/g;

function walk(dir, acc) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "_archive", "dist"].includes(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (ent.name.endsWith(".ts")) acc.push(p);
  }
  return acc;
}
let total = 0;
for (const p of walk(BRAIN, [])) {
  let s = fs.readFileSync(p, "utf8");
  if (!pat.test(s)) continue;
  pat.lastIndex = 0;
  const count = (s.match(pat) || []).length;
  s = s.replace(pat, (m, pre, a1, i1, mid, a2, i2, post) => `${pre}at(${a1}, ${i1})${mid}at(${a2}, ${i2})${post}`);
  if (!/core\/indexing\.ts/.test(s)) {
    const rel = path.relative(path.dirname(p), path.join(BRAIN, "core/indexing.ts")).split(path.sep).join("/");
    const spec = rel.startsWith(".") ? rel : "./" + rel;
    const imports = [...s.matchAll(/^import[\s\S]*?from ["'][^"']+["'];?\s*$/gm)];
    if (imports.length) { const idx = imports[imports.length - 1].index + imports[imports.length - 1][0].length; s = s.slice(0, idx) + `\nimport { at } from "${spec}";` + s.slice(idx); }
    else s = `import { at } from "${spec}";\n` + s;
  }
  fs.writeFileSync(p, s);
  total += count;
  console.log(`${path.relative(BRAIN, p)}: ${count} wrapped`);
}
console.log(`TOTAL ternary-locals wrapped: ${total}`);
