/**
 * Integration Test — real phi via a live ollama server (NO MOCKS, EVER)
 *
 * TRUTH_SOURCES: if no ollama server with phi:latest is reachable, these
 * tests are SKIPPED with an honest message — they are never faked.
 *
 * When the server is up, this exercises the real thought → tool → learn path:
 *   - llm.nameThis on a real percept description → schema-valid labels
 *   - labels → language codec → concept minted in the registry
 */

import { describe, expect, it } from "vitest";
import { encodeText } from "../adapters/language_codec.ts";
import { LlmTool } from "../adapters/llm_tool.ts";
import { PHI_MODEL } from "../adapters/ollama_supervisor.ts";
import { ConceptRegistry } from "../cognition/concept_registry.ts";

/** Probe candidate ports for a live ollama serving phi:latest (3 s budget each). */
async function findLiveOllama(): Promise<string | null> {
  for (const port of [11434, 11435, 11436]) {
    const baseUrl = `http://127.0.0.1:${port}`;
    try {
      const res = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) continue;
      const body = (await res.json()) as { models?: Array<{ name?: string }> };
      const names = (body.models ?? []).map((m) => m.name ?? "");
      if (names.includes(PHI_MODEL)) return baseUrl;
    } catch {
      // not listening on this port — keep probing
    }
  }
  return null;
}

const liveUrl = await findLiveOllama();
if (!liveUrl) {
  // Honest skip — never a mocked pass. [SPEC]
  console.warn(
    `[integration] SKIPPED: no ollama server with ${PHI_MODEL} reachable on 11434-11436. ` +
      "Start it (or run run_mind.ts once) and re-run to execute the real-LLM path."
  );
}

describe.skipIf(!liveUrl)("real phi integration (live ollama)", () => {
  it(
    "nameThis on a real percept → schema-valid labels → concept minted",
    { timeout: 120_000 },
    async () => {
      const llm = new LlmTool(liveUrl!);
      const out = await llm.nameThis(
        "sensed via [vision.screen]; a bright rectangular region with dark text lines, " +
          "signal 1.532, coherence 0.741, persistence 0.902, relation-to-environment 0.611"
      );

      expect(out.ok, out.ok ? "" : `phi call failed: ${(out as { reason: string }).reason}`).toBe(
        true
      );
      if (!out.ok) return;

      // Schema contract already validated inside LlmTool; assert its shape held.
      expect(out.value.labels.length).toBeGreaterThan(0);
      expect(out.value.confidence).toBeGreaterThanOrEqual(0);
      expect(out.value.confidence).toBeLessThanOrEqual(1);

      // The answer physically becomes a field and a concept — the learn path.
      const registry = new ConceptRegistry();
      const field = encodeText(out.value.labels.join(" "));
      const obs = registry.observe(field, out.value.labels, "llm.nameThis");
      expect(obs.isNew).toBe(true);
      expect(registry.size).toBe(1);
      const roundTrip = registry.nearest(field, 1);
      expect(roundTrip[0]?.concept.id).toBe(obs.concept.id);
    }
  );

  it(
    "phrase turns concept labels into a spoken sentence",
    { timeout: 120_000 },
    async () => {
      const llm = new LlmTool(liveUrl!);
      const out = await llm.phrase(["screen", "text", "light"], {
        curiosity: 0.8,
        coherence: 0.7,
      });
      expect(out.ok, out.ok ? "" : `phi call failed: ${(out as { reason: string }).reason}`).toBe(
        true
      );
      if (!out.ok) return;
      expect(out.value.trim().length).toBeGreaterThan(0);
    }
  );
});
