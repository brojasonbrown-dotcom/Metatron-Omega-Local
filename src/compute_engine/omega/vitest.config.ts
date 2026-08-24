import { defineConfig } from "vitest/config";

// METATRON Ω — the certified brain battery (trnn-core). The web-shell tests from
// the Lovable export are gone; this is the only suite, and it is CPU-bound
// simulation, so a generous timeout keeps a busy box from turning red for no
// reason — a failure here is a real hang, not machine load.
export default defineConfig({
  test: {
    include: ["packages/trnn-core/test/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
