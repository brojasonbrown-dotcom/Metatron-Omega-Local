import { defineConfig } from "vitest/config";

// RHUFT v14 (mind layer) test project — member of the unified gate at
// compute_engine/vitest.workspace.ts. globals:true matches the engine suite so
// both projects speak one test dialect under a single `vitest run`.
export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
});
