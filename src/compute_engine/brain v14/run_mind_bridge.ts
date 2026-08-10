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
import { MATHSTRAL_MODEL, OllamaSupervisor, PHI_MODEL } from "./adapters/ollama_supervisor.ts";
import { AudioSensor } from "./adapters/sensors/audio_mic.ts";
import { SensorBus } from "./adapters/sensors/sensor_bus.ts";
import { OcrFeedSensor } from "./adapters/sensors/ocr_feed.ts";
import { WebFeedSensor } from "./adapters/sensors/web_feed.ts";
import { TextFeedSensor } from "./adapters/sensors/text_feed.ts";
import { FileVisionSensor } from "./adapters/sensors/vision_files.ts";
import { ScreenVisionSensor } from "./adapters/sensors/vision_screen.ts";
import { VoiceOut } from "./adapters/voice_out.ts";
import { MindBridge } from "./adapters/mind_bridge.ts";
import { CognitiveLoop } from "./cognition/cognitive_loop.ts";
import { ConceptRegistry } from "./cognition/concept_registry.ts";
import { ConceptGlossary } from "./cognition/glossary.ts";
import { LinguisticGate } from "./cognition/linguistic_gate.ts";
import { InstrumentRouter } from "./cognition/instrument_router.ts";
import { Lexicon } from "./cognition/lexicon.ts";
import { MemoryStore } from "./cognition/memory_store.ts";
import { FieldGenome } from "./cognition/field_genome.ts";
import { ResonanceManifold } from "./cognition/resonance_manifold.ts";
import { LearningModeGovernor } from "./cognition/learning_mode.ts";
import { RetainedMemory } from "./cognition/retained_memory.ts";
import { TelemetryTape } from "./cognition/telemetry_tape.ts";
import { DomainCurriculum, type Corpus, type CorpusResult } from "./adapters/domain_curriculum.ts";
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
  // M7 — the language front: the grounded relation graph beside the meanings.
  const lexicon = new Lexicon(STATE_DIR, registry, glossary);
  const lexiconLoaded = lexicon.load();
  if (lexiconLoaded.quarantined) {
    console.warn(`[boot] corrupt relations quarantined → ${lexiconLoaded.quarantined}; starting fresh.`);
  }
  phase("memory", { concepts: registry.size, lifetimeThoughts: loaded.stableThoughtCount, glossary: glossary.size, relations: lexicon.relationCount });

  // Phase 5 — the Field-State Genome: the mind's field memory. Loaded beside
  // the concept geometry; a corrupt genome file quarantines, never repairs.
  const genome = new FieldGenome(STATE_DIR);
  const genomeLoaded = genome.load();
  if (genomeLoaded.quarantined) {
    console.warn(`[boot] corrupt field genome quarantined → ${genomeLoaded.quarantined}; warm ring fresh.`);
  }
  phase("genome", { warmRestored: genomeLoaded.restored });

  // P6-B — the resonance manifold: the correlation/ontology layer. Built on the
  // registry; derives measured is-a / shares-feature / analogous-to relations.
  const manifold = new ResonanceManifold();
  phase("manifold", {});

  // P6-D — the learning-mode governor: the honest speed/consolidation dial.
  // Boots EFFICIENT (reinjection + idle replay OFF); the operator raises it to
  // TRAINING / REPLAY to consolidate memory offline. The governor defers to the
  // HardwareGovernor's measured depth ceiling — it never overrides the RAM law.
  const modeGovernor = new LearningModeGovernor();
  phase("learningMode", { mode: modeGovernor.mode });

  // 2b. The switchable language instrument (M9): the router holds both the
  // local Ollama pair and the K3 frontier model, and the CognitiveLoop queries
  // it as its single `llm`. Boot default: MIND_INSTRUMENT (ollama|k3) and
  // MIND_OLLAMA_MODEL override the persisted choice; otherwise the router
  // restores the last selection (or auto-detects what's reachable).
  const instrument = new InstrumentRouter({
    ollamaBaseUrl: supervisor.baseUrl,
    // LIVE port: the supervisor rebinds after a crash-restart, so the router
    // re-points its Ollama tool before every probe/call (never a stale URL).
    ollamaBaseUrlNow: () => supervisor.baseUrl,
    stateDir: STATE_DIR,
    store,
  });
  const envInstrument = process.env["MIND_INSTRUMENT"];
  const envModel = process.env["MIND_OLLAMA_MODEL"];
  if (envInstrument === "ollama" || envInstrument === "k3") {
    await instrument.setInstrument(envInstrument, envModel);
  } else {
    await instrument.autoSelect();
  }
  const llm = instrument.split; // M10 — the loop queries the split facade:
  // Kimi answers (when its toggle is ON), Ollama always runs the thought
  // methods, and every call fails over honestly. instrument is kept for the
  // ollama model/power + the Kimi toggle frames the bridge serves.
  const instStatus = await instrument.availability();
  phase("instrument", {
    active: instStatus.active,
    ollamaModel: instStatus.ollamaModel,
    kimiOn: instStatus.kimiOn,
    answerSource: instStatus.answerSource,
    available: instStatus.instruments.filter((i) => i.available).map((i) => i.id),
  });

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
  // F3 — the READING sense: images/scans in <inbox>/ocr/ are OCR'd to text and
  // fed through the SAME language path as typed words, so the mind learns to
  // read (and correlate what it reads) via the existing Ollama loops.
  const ocrEye = new OcrFeedSensor(bus, INBOX_DIR);
  // F4 — the WEB sense: <inbox>/web/ holds URL pointers; the bridge also serves
  // a direct web.feed verb. Pages are read + learned through the same language path.
  const webEye = new WebFeedSensor(bus, INBOX_DIR);
  screenEye.start();
  fileEye.start();
  await ear.start();
  reader.start();
  ocrEye.start();
  webEye.start();
  phase("sensors", { mic: ear.stats().micActive, ocr: true });

  // P6-E — the domain curriculum: specialise the mind by instructed corpora.
  // Business docs, software UIs and operator instructions are canonicalised
  // through the P6-C codec and fed onto the SAME validated bus, then measured
  // against the registry mastery ledger. Shares the one bus the sensors use.
  const curriculum = new DomainCurriculum(bus, registry);
  phase("curriculum", {});

  // 5. The mind + the bridge.
  const voice = new VoiceOut(store);
  // M8 — the anti-hallucination gate, LIVE in production (was test-only:
  // every gate branch in the loop was inert without this injection).
  const gate = new LinguisticGate(registry);
  const loop = new CognitiveLoop(
    { engine, bus, registry, store, llm, voice, glossary, lexicon, gate, genome, manifold, modeGovernor,
      // ADR-001 - the Sigma-panel training senses, wired into the production mind.
      // Both default DISABLED (their documented SPEC: inert until the operator
      // flips them via sense.set, so today's loop is byte-for-byte unchanged).
      // Retention reads the engine's real measured HardwareGovernor for headroom
      // (never writes it); admissions/deferrals are journaled through the store;
      // the tape shares the one validated SensorBus.
      retainedMemory: new RetainedMemory(engine.hardware_governor, store, false),
      telemetryTape: new TelemetryTape(bus, false),
    },
    loaded.stableThoughtCount,
    loaded.episodes ?? []
  );
  const bridge = new MindBridge({ bus, store, loop, registry, llm, glossary, lexicon, engine, instrument, supervisor, curriculum, webFeed: webEye });

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
