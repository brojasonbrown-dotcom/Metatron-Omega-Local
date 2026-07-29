/**
 * RHUFT Mind — Bridge Entry Point: the mind, wired to a host UI over stdio
 *
 * Composition variant of run_mind.ts — SAME boot order, SAME components,
 * with the MindBridge attached. ADDITIVE: run_mind.ts is untouched.
 *
 * Differences from run_mind.ts (all deliberate, all honest):
 *   1. console.log is redirected to stderr — stdout carries ONLY NDJSON
 *      protocol frames (bridge events, journal relays, state).
 *   2. TTS defaults OFF (MIND_TTS=1 re-enables) — the host UI is the voice.
 *   3. Lazy model warm: only phi is warmed at boot (the voice path);
 *      mathstral warms on its first real call. MIND_WARM=all restores the
 *      old behaviour. This halves peak RAM at wake-up.
 *   4. Shutdown arrives via stdin {type:"shutdown"}, stdin-close (host
 *      gone), or the usual SIGINT/SIGTERM.
 *
 * Run:  node run_mind_bridge.ts        (Node ≥ 25, native type-stripping)
 */

// 1. CHANNEL HYGIENE FIRST — before any module can print to stdout.
const _stdoutWrite = process.stdout.write.bind(process.stdout);
console.log = (...args: unknown[]) => console.error(...args);
void _stdoutWrite;

import * as path from "node:path";
import { LlmTool } from "./adapters/llm_tool.ts";
import { MATHSTRAL_MODEL, OllamaSupervisor, PHI_MODEL } from "./adapters/ollama_supervisor.ts";
import { AudioSensor } from "./adapters/sensors/audio_mic.ts";
import { SensorBus } from "./adapters/sensors/sensor_bus.ts";
import { TextFeedSensor } from "./adapters/sensors/text_feed.ts";
import { FileVisionSensor } from "./adapters/sensors/vision_files.ts";
import { ScreenVisionSensor } from "./adapters/sensors/vision_screen.ts";
import { VoiceOut } from "./adapters/voice_out.ts";
import { MindBridge } from "./adapters/mind_bridge.ts";
import { CognitiveLoop } from "./cognition/cognitive_loop.ts";
import { ConceptRegistry } from "./cognition/concept_registry.ts";
import { ConceptGlossary } from "./cognition/glossary.ts";
import { MemoryStore } from "./cognition/memory_store.ts";
import { FractalNodeEngine } from "./fractal_node_engine.ts";

const BRAIN_DIR = import.meta.dirname;
const STATE_DIR = path.join(BRAIN_DIR, "mind_state");
const INBOX_DIR = path.join(BRAIN_DIR, "mind_inbox");

if (process.env["MIND_TTS"] === undefined) process.env["MIND_TTS"] = "0";
const WARM_ALL = process.env["MIND_WARM"] === "all";

/** NDJSON boot-phase frame (stdout stays protocol-pure). */
function phase(name: string, data: Record<string, unknown> = {}): void {
  process.stdout.write(JSON.stringify({ t: Date.now(), type: "boot", phase: name, ...data }) + "\n");
}

async function main(): Promise<void> {
  phase("start");

  // 1. LLM runtime — phi + mathstral from this directory's model store.
  const supervisor = new OllamaSupervisor(BRAIN_DIR);
  const status = await supervisor.ensureRunning();
  if (status.running) {
    console.log(`[boot] ollama ready at ${status.baseUrl} (models: ${status.models.join(", ")})`);
    if (WARM_ALL) {
      await supervisor.warmModels();
    } else {
      // Lazy warm: phi only (the voice path); mathstral warms on first use.
      try {
        await fetch(`${supervisor.baseUrl}/api/generate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ model: PHI_MODEL, prompt: "", keep_alive: "30m", stream: false }),
          signal: AbortSignal.timeout(120_000),
        });
      } catch { /* best-effort; real call path retries */ }
    }
  } else {
    console.warn(`[boot] WARNING: no ollama reachable — tools fail honestly until it appears.`);
  }
  phase("ollama", { running: status.running, baseUrl: status.baseUrl, models: status.models, warm: WARM_ALL ? "all" : PHI_MODEL });
  const llm = new LlmTool(supervisor.baseUrl);

  // 2. Persistence — validated load, corrupt state quarantined.
  const store = new MemoryStore(STATE_DIR);
  store.open();
  const registry = new ConceptRegistry();
  const loaded = store.load(registry);
  if (loaded.quarantined) {
    console.warn(`[boot] corrupt state quarantined → ${loaded.quarantined}; starting fresh.`);
  }
  // M4 — the dictionary: meanings persist beside the concept geometry.
  const glossary = new ConceptGlossary(STATE_DIR);
  const glossaryLoaded = glossary.load();
  if (glossaryLoaded.quarantined) {
    console.warn(`[boot] corrupt glossary quarantined → ${glossaryLoaded.quarantined}; starting fresh.`);
  }
  phase("memory", { concepts: registry.size, lifetimeThoughts: loaded.stableThoughtCount, glossary: glossary.size });

  // 3. Engine — highest resolution the ladder allows. [SPEC]
  // MIND_TARGET_SCALE: 192 (default, Human band) or 292 (Cosmic — 9 ladder
  // levels, hundreds of nodes; the deep-processing configuration).
  const targetScale = Number(process.env["MIND_TARGET_SCALE"] ?? 192);
  if (!Number.isInteger(targetScale)) throw new RangeError(`MIND_TARGET_SCALE must be an integer scale index, got ${process.env["MIND_TARGET_SCALE"]}`);
  const engine = new FractalNodeEngine({
    target_scale: targetScale,
    hardware_adaptive: true,
    target_resource_usage: 0.618, // φ⁻¹ — now genuinely honored by the governor
  });
  engine.initialize();
  phase("engine", { targetScale, nodes: engine.get_state().total_nodes });

  // 4. Sensors — every sense feeds the one validated bus.
  const bus = new SensorBus();
  const screenEye = new ScreenVisionSensor(bus);
  const fileEye = new FileVisionSensor(bus, INBOX_DIR);
  const ear = new AudioSensor(bus, INBOX_DIR);
  const reader = new TextFeedSensor(bus, INBOX_DIR);
  screenEye.start();
  fileEye.start();
  await ear.start();
  reader.start();
  phase("sensors", { mic: ear.stats().micActive });

  // 5. The mind + the bridge.
  const voice = new VoiceOut(store);
  const loop = new CognitiveLoop(
    { engine, bus, registry, store, llm, voice, glossary },
    loaded.stableThoughtCount,
    loaded.episodes ?? []
  );
  const bridge = new MindBridge({ bus, store, loop, registry, llm, glossary });

  store.journal({
    t: Date.now(),
    kind: "boot",
    data: {
      ollama: status.baseUrl,
      ollamaRunning: status.running,
      concepts: registry.size,
      lifetimeThoughts: loaded.stableThoughtCount,
      mic: ear.stats().micActive,
      mode: "bridge",
    },
  });

  // Graceful sleep: snapshot + journal, release everything, exit.
  let shuttingDown = false;
  const shutdown = (): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    phase("shutdown", { reason: "requested" });
    loop.stop();
    screenEye.stop();
    fileEye.stop();
    ear.stop();
    reader.stop();
    store.journal({
      t: Date.now(),
      kind: "shutdown",
      data: { concepts: registry.size, stableThoughts: loop.stableThoughtCount, ticks: loop.tickCount },
    });
    store.close();
    supervisor.stop();
    phase("sleep", { concepts: registry.size, stableThoughts: loop.stableThoughtCount });
    process.exit(0);
  };
  bridge.onShutdown(shutdown);
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  loop.start();
  bridge.attach();
  phase("awake", { tickMs: 146 });

  // Watchdog: unhandled rejections are journaled, never fatal. [SPEC]
  process.on("unhandledRejection", (reason) => {
    store.journal({ t: Date.now(), kind: "error", data: { where: "unhandledRejection", error: String(reason) } });
  });

  // Keep the process alive forever (all timers are unref'd by design).
  setInterval(() => { /* heartbeat */ }, 60_000);
}

main().catch((err) => {
  process.stdout.write(
    JSON.stringify({ t: Date.now(), type: "fatal", message: String(err instanceof Error ? err.message : err) }) + "\n"
  );
  console.error("[fatal] mind failed to boot:", err);
  process.exit(1);
});
