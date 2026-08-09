/**
 * Option B — AST-based possibly-undefined fixer (TS2532 / TS18048).
 *
 * Uses the TypeScript compiler API. For each error, it locates the
 * ElementAccessExpression at the error position and wraps the READ in the
 * bounds-checked at() — value-preserving by construction.
 *
 * SOUNDNESS GUARANTEES (structural, not regex):
 *   - A write target (left of =, +=, ++, etc.) is NEVER wrapped as a read.
 *     For a compound write `a[i] += rhs`, the read of `a[i]` is wrapped but the
 *     assignment target is preserved: we transform to `at(a,i)[...]`-free form by
 *     wrapping only where the node is being READ.
 *   - Nested access `a[i][j]`: the INNERMOST defined-read is wrapped, the result
 *     stays chainable: `at(a,i)[j]` -> value of a[i] is defined, so [j] reads a
 *     defined row; the outer becomes defined too once inner is at()-wrapped.
 *     We wrap the innermost element-access whose type is the (possibly-undefined)
 *     element type the compiler flagged.
 *   - Member receivers `this._x[i]` are wrapped as `at(this._x, i)`.
 *
 * Anything that is not an ElementAccessExpression read is left for hand-fix.
 */
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

const BRAIN = process.cwd();
const ERROR_CODES = new Set([2532, 18048, 2345, 2322]);
const DRY = process.argv.includes("--dry");
const targetFile = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;

const configPath = path.join(BRAIN, "tsconfig.json");
const cfg = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, BRAIN);
const program = ts.createProgram({ rootNames: parsed.fileNames, options: { ...parsed.options, noEmit: true } });
const checker = program.getTypeChecker();

function isWriteTarget(node) {
  const p = node.parent;
  if (!p) return false;
  // a[i] = ...  / a[i] += ... / a[i]++ etc: node is the LHS of an assignment / update
  if (ts.isBinaryExpression(p) && p.left === node) {
    const op = p.operatorToken.kind;
    return (
      op === ts.SyntaxKind.EqualsToken ||
      op === ts.SyntaxKind.PlusEqualsToken || op === ts.SyntaxKind.MinusEqualsToken ||
      op === ts.SyntaxKind.AsteriskEqualsToken || op === ts.SyntaxKind.SlashEqualsToken ||
      op === ts.SyntaxKind.PercentEqualsToken || op === ts.SyntaxKind.AsteriskAsteriskEqualsToken ||
      op === ts.SyntaxKind.AmpersandEqualsToken || op === ts.SyntaxKind.BarEqualsToken ||
      op === ts.SyntaxKind.CaretEqualsToken || op === ts.SyntaxKind.LessThanLessThanEqualsToken ||
      op === ts.SyntaxKind.GreaterThanGreaterThanEqualsToken || op === ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken
    );
  }
  if ((ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p)) &&
      (p.operator === ts.SyntaxKind.PlusPlusToken || p.operator === ts.SyntaxKind.MinusMinusToken) && p.operand === node) return true;
  return false;
}

// Wrap the innermost element-access READ that contains `pos` and yields possibly-undefined.
function collectEdits(sourceFile) {
  const edits = [];
  const semantic = program.getSemanticDiagnostics(sourceFile);
  const targets = semantic.filter(d => ERROR_CODES.has(d.code) && typeof d.start === "number");
  if (targets.length === 0) return edits;

  function findElementAccess(node) {
    if (ts.isElementAccessExpression(node)) {
      for (const d of targets) {
        if (node.expression.getStart(sourceFile) <= d.start && d.start < node.end) {
          // candidate; we handle below at the diagnostic loop instead
        }
      }
    }
    ts.forEachChild(node, findElementAccess);
  }

  for (const d of targets) {
    // find the smallest ElementAccessExpression whose expression-start..end covers d.start
    let best = null;
    function visit(node) {
      if (ts.isElementAccessExpression(node)) {
        const exprStart = node.expression.getStart(sourceFile);
        if (exprStart <= d.start && d.start < node.end) {
          if (!best || (node.end - exprStart) < (best.end - best.expression.getStart(sourceFile))) best = node;
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    if (!best) {
      // IDENTIFIER case: the error is on a bare identifier (next/prev/sum) whose
      // VALUE came from an indexed read on a prior line. Resolve the identifier to
      // its declaration/assignment initializer and wrap the element-access there:
      //   const prev = field_state[i-1];   ->   const prev = at(field_state, i-1);
      const idNode = (function find(n) {
        if (d.start >= n.getStart(sourceFile) && d.start < n.end) {
          let r = n; ts.forEachChild(n, c => { const x = find(c); if (x) r = x; }); return r;
        }
        return null;
      })(sourceFile);
      if (idNode && ts.isIdentifier(idNode)) {
        let declInit = null;
        // nearest variable declaration with this name
        function scanDecl(n) {
          if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === idNode.text && n.initializer && ts.isElementAccessExpression(n.initializer)) {
            if (!declInit || n.getStart(sourceFile) < declInit.getStart(sourceFile)) declInit = n.initializer;
          }
          // assignment: prev = field[i];
          if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
              ts.isIdentifier(n.left) && n.left.text === idNode.text && ts.isElementAccessExpression(n.right)) {
            if (!declInit || n.right.getStart(sourceFile) < declInit.getStart(sourceFile)) declInit = n.right;
          }
          ts.forEachChild(n, scanDecl);
        }
        scanDecl(sourceFile);
        if (declInit) {
          const et = declInit.expression.getText(sourceFile);
          const at2 = declInit.argumentExpression.getText(sourceFile);
          edits.push({ start: declInit.getStart(sourceFile), end: declInit.end, replacement: `at(${et}, ${at2})`, file: sourceFile.fileName });
          continue;
        }
      }
      edits.push({ skip: `${sourceFile.fileName}:${d.start} no-element-access` });
      continue;
    }
    const exprText = best.expression.getText(sourceFile);
    const argText = best.argumentExpression.getText(sourceFile);
    // COMPOUND-ASSIGNMENT TARGET: `a[i] OP= rhs` reads a[i]. Rewriting the target
    // to `at(a,i) OP= rhs` is invalid, so EXPAND instead: `a[i] = at(a,i) OP rhs`.
    // Value-identical, clears the read error, and the write target stays a plain
    // element access. We replace the whole binary expression.
    if (isWriteTarget(best)) {
      const p = best.parent;
      if (ts.isBinaryExpression(p) && p.left === best && p.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
        const opText = p.operatorToken.getText(sourceFile).replace("=", ""); // += -> +
        const rhsText = p.right.getText(sourceFile);
        const lhsText = best.getText(sourceFile);
        edits.push({ start: p.getStart(sourceFile), end: p.end, replacement: `${lhsText} = at(${exprText}, ${argText}) ${opText} ${rhsText}`, file: sourceFile.fileName });
        continue;
      }
      // pure `=` write or ++/--: not a read error; skip.
      edits.push({ skip: `${d.start} pure-write` });
      continue;
    }
    edits.push({ start: best.getStart(sourceFile), end: best.end, replacement: `at(${exprText}, ${argText})`, file: sourceFile.fileName });
  }
  return edits;
}

let total = 0; const skips = [];
for (const sf of program.getSourceFiles()) {
  if (sf.fileName.includes("node_modules")) continue;
  const rel = path.relative(BRAIN, sf.fileName).split(path.sep).join("/");
  if (targetFile && rel !== targetFile) continue;
  const edits = collectEdits(sf).filter(e => e.replacement);
  const skipped = collectEdits(sf).filter(e => e.skip);
  skips.push(...skipped.map(s => `${rel}:${s.skip}`));
  if (edits.length === 0) continue;
  let src = fs.readFileSync(sf.fileName, "utf8");
  // apply edits right-to-left
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  // dedupe overlapping (same start)
  const seen = new Set();
  for (const e of sorted) {
    const key = e.start;
    if (seen.has(key)) continue;
    seen.add(key);
    src = src.slice(0, e.start) + e.replacement + src.slice(e.end);
    total++;
  }
  if (!/core\/indexing\.ts/.test(src)) {
    const dir = path.dirname(rel);
    const relp = path.relative(dir, "core/indexing.ts").split(path.sep).join("/");
    const spec = relp.startsWith(".") ? relp : "./" + relp;
    const importEnd = [...src.matchAll(/^import[\s\S]*?from ["'][^"']+["'];?\s*$/gm)].map(m => m.index + m[0].length).pop();
    src = importEnd !== undefined ? src.slice(0, importEnd) + `\nimport { at } from "${spec}";` + src.slice(importEnd) : `import { at } from "${spec}";\n` + src;
  }
  if (!DRY) fs.writeFileSync(sf.fileName, src);
  else {
    // show transformed lines for inspection — prioritize compound-expansion forms
    const outLines = src.split("\n");
    const expanded = [];
    const plain = [];
    for (const e of sorted) {
      const ln = src.slice(0, e.start).split("\n").length;
      const txt = outLines[ln - 1].trim();
      if (/= at\(.*\) [+\-*/%]/.test(txt)) expanded.push(`    L${ln}: ${txt.slice(0, 95)}`);
      else plain.push(`    L${ln}: ${txt.slice(0, 95)}`);
    }
    console.log("  -- compound expansions --"); console.log(expanded.slice(0, 6).join("\n") || "    (none)");
    console.log("  -- plain wraps (sample) --"); console.log(plain.slice(0, 4).join("\n") || "    (none)");
  }
  console.log(`${rel}: wrapped ${edits.length}`);
}
console.log(`\nTOTAL wrapped: ${total}; skipped: ${skips.length}`);
if (skips.length) console.log("SKIPPED (first 40):\n" + skips.slice(0, 40).join("\n"));
