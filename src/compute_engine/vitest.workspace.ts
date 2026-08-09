import { defineWorkspace } from "vitest/config";

// RHUFT UNIFIED TEST GATE (Option B / M1).
//
// One command — `vitest run` from this directory — executes BOTH suites as
// first-class members of a single gate:
//   - engine   : the verified multiscale core (422 tests)
//   - brain v14: the mind/cognition layer (335 tests + 2 skipped)
//
// Each project keeps its own tsconfig (they share the strict soundness core via
// ../tsconfig.base.json) and its own module resolution, but no suite is green
// unless BOTH are green. This is the single gate the merge is held to.
export default defineWorkspace([
  "engine/vitest.config.ts",
  "brain v14/vitest.config.ts",
]);
