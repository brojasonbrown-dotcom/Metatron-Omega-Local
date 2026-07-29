/**
 * RHUFT Mind — Entry Point: boot everything, run forever
 *
 * Epistemic Status: [SPEC] — Composition root. No math lives here.
 *
 * Boot order:
 *   1. Ollama supervisor  — serve phi + mathstral from THIS directory's
 *                           model store (manifests/ + blobs/), warm both.
 *   2. Memory store       — load persisted lexicon (validated; corrupt →
 *                           quarantined + fresh start), open journal.
 *   3. Engine             — FractalNodeEngine at high resource budget
 *                           (target_resource_usage = φ⁻¹ [SPEC], hardware-
 *                           adaptive: highest resolution the host allows).
 *   4. Sensors            — screen eye, vision/audio/text inboxes, mic.
 *   5. Cognitive loop     — sense → thought → voice → learn, forever.
 *
 * Run:  node run_mind.ts        (Node ≥ 25, native type-stripping)
 * Stop: Ctrl+C — graceful snapshot + shutdown journal entry.
 * Env:  MIND_TTS=0 disables the audible voice.
 */

import * as path from "node:path";
import { LlmTool } from "./adapters/llm_tool.ts";
import { MATHSTRAL_MODEL, OllamaSupervisor, PHI_MODEL } from "./adapters/ollama_supervisor.ts";
import { AudioSensor } from "./adapters/sensors/audio_mic.ts";
import { SensorBus } from "./adapters/sensors/sensor_bus.ts";
import { TextFeedSensor } from "./adapters/sensors/text_feed.ts";
import { FileVisionSensor } from "./adapters/sensors/vision_files.ts";
import { ScreenVisionSensor } from "./adapters/sensors/vision_screen.ts";
import { VoiceOut } from "./adapters/voice_out.ts";
import { CognitiveLoop } from "./cognition/cognitive_loop.ts";
import { ConceptRegistry } from "./cognition/concept_registry.ts";
import { MemoryStore } from "./cognition/memory_store.ts";
import { VisualMemory } from "./cognition/visual_memory.ts";
import { FractalNodeEngine } from "./fractal_node_engine.ts";

const BRAIN_DIR = import.meta.dirname;
const STATE_DIR = path.join(BRAIN_DIR, "mind_state");
const INBOX_DIR = path.join(BRAIN_DIR, "mind_inbox");

async function main(): Promise<void> {
  console.log("═".repeat(72));
  console.log("RHUFT MIND — autonomous cognition over the fractal-node engine");
  console.log("═".repeat(72));

  // 1. LLM runtime — phi + mathstral served from this directory's model store.
  console.log("[boot] starting ollama supervisor…");
  const supervisor = new OllamaSupervisor(BRAIN_DIR);
  const status = await supervisor.ensureRunning();
  if (status.running) {
    console.log(`[boot] ollama ready at ${status.baseUrl} (models: ${status.models.join(", ")})`);
    console.log(`[boot] warming ${PHI_MODEL} + ${MATHSTRAL_MODEL}…`);
    await supervisor.warmModels();
  } else {
    console.warn(
      `[boot] WARNING: no ollama with ${PHI_MODEL}+${MATHSTRAL_MODEL} reachable at ${status.baseUrl}. ` +
        "Tools will fail honestly until the server appears (supervisor keeps retrying)."
    );
  }
  const llm = new LlmTool(supervisor.baseUrl);

  // 2. Persistence — validated load, corrupt state quarantined.
  const store = new MemoryStore(STATE_DIR);
  store.open();
  const registry = new ConceptRegistry();
  const loaded = store.load(registry);
  if (loaded.quarantined) {
    console.warn(`[boot] corrupt state quarantined → ${loaded.quarantined}; starting fresh.`);
  }
  console.log(
    `[boot] lexicon: ${registry.size} concepts, ${loaded.stableThoughtCount} lifetime stable thoughts`
  );

  // 3. Engine — highest resolution the hardware allows. [SPEC]
  const engine = new FractalNodeEngine({
    hardware_adaptive: true,
    target_resource_usage: 0.618, // φ⁻¹ — maximal sustained budget. [SPEC]
  });
  engine.initialize();
  console.log("[boot] fractal-node engine initialized");

  // 4. Sensors — every sense feeds the one validated bus.
  const bus = new SensorBus();
  const screenEye = new ScreenVisionSensor(bus);
  const fileEye = new FileVisionSensor(bus, INBOX_DIR);

  // P2 — true vision: both eyes feed visual episodic memory (see/remember).
  const visualMemory = new VisualMemory(STATE_DIR);
  const vload = visualMemory.load();
  if (vload.quarantined) {
    console.warn(`[boot] visual_memory corrupt — quarantined to ${vload.quarantined}`);
  }
  screenEye.onGrid((g, w, h) => visualMemory.observe(g, w, h, "screen"));
  fileEye.onGrid((g, w, h, file) => visualMemory.observe(g, w, h, file));
  const ear = new AudioSensor(bus, INBOX_DIR);
  const reader = new TextFeedSensor(bus, INBOX_DIR);

  screenEye.start();
  fileEye.start();
  await ear.start();
  reader.start();
  console.log(`[boot] sensors up — screen eye + inboxes at ${INBOX_DIR}`);
  console.log(`[boot] visual memory: ${visualMemory.size} frames remembered (restored ${vload.restored})`);
  const earStats = ear.stats();
  console.log(
    earStats.micActive
      ? `[boot] microphone live: ${earStats.micDevice}`
      : `[boot] microphone unavailable (${earStats.lastError ?? "unknown"}) — WAV drops still heard`
  );

  // 5. The mind.
  const voice = new VoiceOut(store);
  const loop = new CognitiveLoop(
    { engine, bus, registry, store, llm, voice },
    loaded.stableThoughtCount
  );

  store.journal({
    t: Date.now(),
    kind: "boot",
    data: {
      ollama: status.baseUrl,
      ollamaRunning: status.running,
      concepts: registry.size,
      lifetimeThoughts: loaded.stableThoughtCount,
      mic: earStats.micActive,
    },
  });

  loop.start();
  console.log("[boot] cognitive loop running — the mind is awake. Ctrl+C to sleep.");

  // Graceful shutdown: snapshot + journal, then release everything.
  let shuttingDown = false;
  const shutdown = (): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("\n[shutdown] snapshotting mind state…");
    loop.stop(); // stops ticking + saves a final snapshot
    screenEye.stop();
    fileEye.stop();
    ear.stop();
    reader.stop();
    store.journal({
      t: Date.now(),
      kind: "shutdown",
      data: {
        concepts: registry.size,
        stableThoughts: loop.stableThoughtCount,
        ticks: loop.tickCount,
      },
    });
    store.close();
    supervisor.stop();
    console.log(
      `[shutdown] done — ${registry.size} concepts, ${loop.stableThoughtCount} lifetime thoughts.`
    );
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Watchdog: unhandled rejections are journaled, never fatal. [SPEC]
  process.on("unhandledRejection", (reason) => {
    store.journal({
      t: Date.now(),
      kind: "error",
      data: { where: "unhandledRejection", error: String(reason) },
    });
  });

  // Keep the process alive forever (all timers are unref'd by design).
  setInterval(() => {
    /* heartbeat */
  }, 60_000);
}

main().catch((err) => {
  console.error("[fatal] mind failed to boot:", err);
  process.exit(1);
});
