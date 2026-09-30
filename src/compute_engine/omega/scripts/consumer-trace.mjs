// Rigorous consumer-trace: classify every src module by who (transitively) uses it.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname, normalize } from 'node:path';

const ROOT = resolve('packages/trnn-core');
const SRC = join(ROOT, 'src');
const TEST = join(ROOT, 'test');

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.ts')) out.push(p);
  }
  return out;
}

const srcFiles = walk(SRC);
const testFiles = walk(TEST);
const all = [...srcFiles, ...testFiles];

// module id = path relative to ROOT without extension
const id = (p) => normalize(p.slice(ROOT.length + 1)).replace(/\.(ts|js)$/i, '').replace(/\\/g, '/');
const idSet = new Set(srcFiles.map(id));

// resolve a relative import spec from an importer file to a module id (or null)
function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  let target = resolve(dirname(fromFile), spec);
  // strip .js/.ts
  target = target.replace(/\.(ts|js)$/i, '');
  // try exact, then index
  const cands = [target, join(target, 'index')];
  for (const c of cands) {
    const m = normalize(c.slice(ROOT.length + 1)).replace(/\\/g, '/');
    if (idSet.has(m)) return m;
  }
  return null;
}

const IMPORT_RE = /(?:from\s*|import\s*\()?['"]([^'"]+)['"]/g;
const imports = new Map(); // importer id -> Set(module id)
for (const f of all) {
  const src = readFileSync(f, 'utf8');
  const set = new Set();
  const re = /(?:from\s+['"]|import\s*\(\s*['"]|require\s*\(\s*['"])([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) {
    const resolved = resolveImport(f, m[1]);
    if (resolved) set.add(resolved);
  }
  imports.set(id(f), set);
}

// reverse edges (module -> importers)
const reverse = new Map();
for (const [imp, deps] of imports) for (const d of deps) {
  if (!reverse.has(d)) reverse.set(d, new Set());
  reverse.get(d).add(imp);
}

function reach(entryIds) {
  const seen = new Set();
  const q = [...entryIds].filter((e) => idSet.has(e));
  while (q.length) {
    const cur = q.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const d of imports.get(cur) ?? []) if (idSet.has(d) && !seen.has(d)) q.push(d);
  }
  return seen;
}

const liveEntry = ['src/runtime/host'];
const live = reach(liveEntry);
const testReach = reach(testFiles.map(id));
const barrelReach = reach(['src/index']);

// classification per src module
const rows = [];
for (const f of srcFiles) {
  const i = id(f);
  const importedBy = reverse.get(i) ?? new Set();
  const onlyTests = [...importedBy].every((x) => testFiles.map(id).includes(x));
  let cls;
  if (live.has(i)) cls = 'LIVE';
  else if (testReach.has(i)) cls = 'TEST_ONLY';
  else if (barrelReach.has(i)) cls = 'BARREL_ONLY';
  else cls = 'ORPHAN';
  rows.push({ i, cls, nImporters: importedBy.size });
}

const by = {};
for (const r of rows) (by[r.cls] ??= []).push(r.i);
for (const k of Object.keys(by).sort()) by[k].sort();

for (const k of ['LIVE', 'TEST_ONLY', 'BARREL_ONLY', 'ORPHAN']) {
  const list = by[k] ?? [];
  console.log(`\n=== ${k} (${list.length}) ===`);
  for (const x of list) console.log('  ' + x);
}
console.log(`\nTOTAL src modules: ${srcFiles.length}`);
console.log(`LIVE: ${(by.LIVE??[]).length}  TEST_ONLY: ${(by.TEST_ONLY??[]).length}  BARREL_ONLY: ${(by.BARREL_ONLY??[]).length}  ORPHAN: ${(by.ORPHAN??[]).length}`);
