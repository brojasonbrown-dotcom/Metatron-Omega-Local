import { defineWorkspace } from "vitest/config";

// METATRON Ω — single test gate. The certified brain battery (trnn-core) is the
// only suite; the old engine/ and brain v14/ projects are gone.
export default defineWorkspace(["omega/vitest.config.ts"]);
