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
 *   4. Sensors            — screen eye, vision/audio/text/ocr/web inboxes, mic.
 *   5. Cognitive loop     — sense → thought → voice → learn, forever.
 *
 * PARITY (ADR-009, the operator's law "ALL areas active"): this standalone
 * entry now wires the SAME components run_mind_bridge.ts does — the language
 * front (glossary/lexicon/gate), the field genome, the resonance manifold, the
 * learning-mode governor, the domain curriculum, the novelty gate, and ALL SIX
 * training/observer lanes — every one default-ON via the same senseOn() gate.
 * Only the host-UI pieces stay bridge-only (MindBridge, InstrumentRouter/K3,
 * NDJSON boot frames): this is the console entry, so it logs to stdout and
 * speaks TTS by default instead of serving a host. No lane is silently dark.
 *
 * Run:  node run_mind.ts        (Node ≥ 25, native type-stripping)
 * Stop: Ctrl+C — graceful snapshot + shutdown journal entry.
 * Env:  MIND_TTS=0 disables the audible voice; MIND_<SENSE>=0 opts one lane
 *       out; MIND_ALL=0 disables the whole learning layer (minimal diagnostic).
 */

import * as path from "node:path";
import { LlmTool } from "./adapters/llm_tool.ts";
import { MATHSTRAL_MODEL, OllamaSupervisor, PHI_MODEL } from "./adapters/ollama_supervisor.ts";
import { AudioSensor } from "./adapters/sensors/audio_mic.ts";
import { SensorBus } from "./adapters/sensors/sensor_bus.ts";
import { OcrFeedSensor } from "./adapters/sensors/ocr_feed.ts";
import { WebFeedSensor } from "./adapters/sensors/web_feed.ts";
import { TextFeedSensor } from "./adapters/sensors/text_feed.ts";
import { FileVisionSensor } from "./adapters/sensors/vision_files.ts";
import { ScreenVisionSensor } from "./adapters/sensors/vision_screen.ts";
import { resolveSensoryDepth, type SensoryDepthTelemetry } from "./adapters/sensors/sensory_depth.ts";
import { hiResFieldFromLuminanceGrid } from "./adapters/sensors/signal_codec.ts";
import { HardwareGovernor } from "./hardware_governor.ts";
import { VoiceOut } from "./adapters/voice_out.ts";
import { CognitiveLoop } from "./cognition/cognitive_loop.ts";
import { ConceptRegistry } from "./cognition/concept_registry.ts";
import { ConceptGlossary } from "./cognition/glossary.ts";
import { LinguisticGate } from "./cognition/linguistic_gate.ts";
import { Lexicon } from "./cognition/lexicon.ts";
import { MemoryStore } from "./cognition/memory_store.ts";
import { VisualMemory } from "./cognition/visual_memory.ts";
import { FieldGenome } from "./cognition/field_genome.ts";
import { ResonanceManifold } from "./cognition/resonance_manifold.ts";
import { LearningModeGovernor } from "./cognition/learning_mode.ts";
import { RetainedMemory } from "./cognition/retained_memory.ts";
import { TelemetryTape } from "./cognition/telemetry_tape.ts";
import { CrossScaleFlow } from "./cognition/cross_scale_flow.ts";
import { EigenmodeGridObserver } from "./cognition/eigenmode_grid.ts";
import { MultiscaleBridge } from "./cognition/multiscale_bridge.ts";
import { CrossModalCorrelator } from "./cognition/cross_modal_correlator.ts";
import { NoveltyGate } from "./cognition/novelty_gate.ts";
import { DomainCurriculum } from "./adapters/domain_curriculum.ts";
import { FractalNodeEngine } from "./fractal_node_engine.ts";

const BRAIN_DIR = import.meta.dirname;
const STATE_DIR = path.join(BRAIN_DIR, "mind_state");
const INBOX_DIR = path.join(BRAIN_DIR, "mind_inbox");

/**
 * THE WHOLE SYSTEM RUNS IN SYNC. Every learning / correlation / observer sense
 * defaults ON — the operator's law: "everything is supposed to be enabled."
 * The env override is INVERTED to opt-OUT: MIND_<SENSE>=0 disables one lane;
 * MIND_ALL=0 disables the whole learning layer at once (e.g. for a minimal
 * diagnostic boot). No sense is ever silently inert again. [SPEC]
 */
const ALL_OFF = process.env["MIND_ALL"] === "0";
const senseOn = (name: string): boolean => !ALL_OFF && process.env[`MIND_${name}`] !== "0";

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
  // ADR-009 — SPEECH-MODULE SELF-HEAL: verify the phi/mathstral weights (the mind's
  // speech module) are present in the brain store; repair via pull when missing and a
  // network path exists. Reported honestly — a mute brain never hides WHY. [SPEC]
  const speech = await supervisor.ensureModelsPresent();
  if (!speech.phi || !speech.mathstral) console.warn(`[boot] WARNING: ${speech.note}`);
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
  // M7 — the language front: the grounded relation graph beside the meanings.
  const lexicon = new Lexicon(STATE_DIR, registry, glossary);
  const lexiconLoaded = lexicon.load();
  if (lexiconLoaded.quarantined) {
    console.warn(`[boot] corrupt relations quarantined → ${lexiconLoaded.quarantined}; starting fresh.`);
  }
  console.log(
    `[boot] lexicon: ${registry.size} concepts, ${loaded.stableThoughtCount} lifetime stable thoughts, ` +
      `${glossary.size} meanings, ${lexicon.relationCount} relations`
  );

  // Phase 5 — the Field-State Genome: the mind's field memory. Loaded beside
  // the concept geometry; a corrupt genome file quarantines, never repairs.
  const genome = new FieldGenome(STATE_DIR);
  const genomeLoaded = genome.load();
  if (genomeLoaded.quarantined) {
    console.warn(`[boot] corrupt field genome quarantined → ${genomeLoaded.quarantined}; warm ring fresh.`);
  }

  // P6-B — the resonance manifold: the correlation/ontology layer. Built on the
  // registry; derives measured is-a / shares-feature / analogous-to relations.
  const manifold = new ResonanceManifold();

  // P6-D — the learning-mode governor: the honest speed/consolidation dial.
  // Boots EFFICIENT (reinjection + idle replay OFF); the operator raises it to
  // TRAINING / REPLAY to consolidate memory offline. The governor defers to the
  // HardwareGovernor's measured depth ceiling — it never overrides the RAM law.
  const modeGovernor = new LearningModeGovernor();

  // 3. Engine — highest resolution the hardware allows. [SPEC]
  const engine = new FractalNodeEngine({
    hardware_adaptive: true,
    target_resource_usage: 0.618, // φ⁻¹ — maximal sustained budget. [SPEC]
  });
  engine.initialize();
  console.log("[boot] fractal-node engine initialized");

  // 4. Sensors — every sense feeds the one validated bus.
  const bus = new SensorBus();
  // MIND_VISION_HIRES=1 captures the 233x144 detail grid alongside the fast
  // 89x55 grid (multi-scale perception); default off = byte-identical fast path.
  const screenEye = new ScreenVisionSensor(bus, undefined, process.env["MIND_VISION_HIRES"] === "1");
  const fileEye = new FileVisionSensor(bus, INBOX_DIR);

  // P2 — true vision: both eyes feed visual episodic memory (see/remember).
  const visualMemory = new VisualMemory(STATE_DIR);
  const vload = visualMemory.load();
  if (vload.quarantined) {
    console.warn(`[boot] visual_memory corrupt — quarantined to ${vload.quarantined}`);
  }
  screenEye.onGrid((g, w, h) => visualMemory.observe(g, w, h, "screen"));
  fileEye.onGrid((g, w, h, file) => visualMemory.observe(g, w, h, file));
  // ADR-007 — SENSORY-DEPTH SCALING. The hi-res detail grid is consumed HERE: the
  // fine multi-scale percept field is resolved at full measured resolution, and
  // visual_memory persists the 32×32 DCT descriptor that separates near-identical
  // scenes the 128-bit hashes cannot. Opt-in: only active when MIND_VISION_HIRES=1
  // (the legacy fast path is byte-identical otherwise). [SPEC]
  const sensoryTele = (): SensoryDepthTelemetry => {
    const t = engine.get_scaling_telemetry();
    const budgetMs = HardwareGovernor.CADENCE_MS * Number(engine.hardware_governor.target_usage);
    return { depth: t.depth, maxDepth: t.maxDepth, emaTickMs: t.emaTickMs, budgetMs };
  };
  screenEye.setSensoryDepthSource(sensoryTele);
  screenEye.onHiRes((g, w, h) => {
    const decision = resolveSensoryDepth(sensoryTele());
    const hiRes = hiResFieldFromLuminanceGrid(g, w, h, { octaves: decision.octaves });
    visualMemory.observe(g, w, h, "screen-hires", hiRes);
  });
  const ear = new AudioSensor(bus, INBOX_DIR);
  const reader = new TextFeedSensor(bus, INBOX_DIR);
  // F3 — the READING sense: images/scans in <inbox>/ocr/ are OCR'd to text and
  // fed through the SAME language path as typed words.
  const ocrEye = new OcrFeedSensor(bus, INBOX_DIR);
  // F4 — the WEB sense: <inbox>/web/ holds URL pointers.
  const webEye = new WebFeedSensor(bus, INBOX_DIR);

  screenEye.start();
  fileEye.start();
  await ear.start();
  reader.start();
  ocrEye.start();
  webEye.start();
  console.log(`[boot] sensors up — screen eye + inboxes at ${INBOX_DIR}`);
  console.log(`[boot] visual memory: ${visualMemory.size} frames remembered (restored ${vload.restored})`);
  const earStats = ear.stats();
  console.log(
    earStats.micActive
      ? `[boot] microphone live: ${earStats.micDevice}`
      : `[boot] microphone unavailable (${earStats.lastError ?? "unknown"}) — WAV drops still heard`
  );

  // P6-E — the domain curriculum: specialise the mind by instructed corpora.
  // Canonicalised through the P6-C codec and fed onto the SAME validated bus.
  const curriculum = new DomainCurriculum(bus, registry);

  // 5. The mind.
  const voice = new VoiceOut(store);
  // M8 — the anti-hallucination gate, live here too (was test-only).
  const gate = new LinguisticGate(registry);
  // The novelty gate — the salience z-score that decides what is *surprising*.
  // Wired live so retention + novelty + anti-echo share one measured verdict.
  const noveltyGate = new NoveltyGate(senseOn("NOVELTY"));
  const loop = new CognitiveLoop(
    { engine, bus, registry, store, llm, voice, glossary, lexicon, gate, genome, manifold, modeGovernor, noveltyGate,
      // ADR-001 — the training senses, wired into the mind. ALL DEFAULT ON — the
      // operator's law: the whole system runs in sync. senseOn() resolves each
      // lane; MIND_<SENSE>=0 opts one out, MIND_ALL=0 disables the layer.
      retainedMemory: new RetainedMemory(engine.hardware_governor, store, senseOn("RETENTION")),
      telemetryTape: new TelemetryTape(bus, senseOn("TAPE")),
      // L1/L3/L5 — the deep observer lanes, live. crossScaleFlow reconciles
      // through the engine's own scale_mapper (L0).
      crossScaleFlow: new CrossScaleFlow(engine.scale_mapper, senseOn("CROSS_SCALE")),
      eigenmodeGrid: new EigenmodeGridObserver(senseOn("EIGEN_GRID")),
      multiscaleBridge: new MultiscaleBridge(bus, senseOn("MULTISCALE")),
      crossModalCorrelator: new CrossModalCorrelator(
        senseOn("CROSS_MODAL"),
        senseOn("CROSS_MODAL_LAG"),
      ),
    },
    loaded.stableThoughtCount,
    loaded.episodes ?? []
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
      speechModule: { phi: speech.phi, mathstral: speech.mathstral },
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
    ocrEye.stop();
    webEye.stop();
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
