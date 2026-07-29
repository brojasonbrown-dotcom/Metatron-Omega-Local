# TOROIDAL INFORMATION FLOW — AVA UI ⟷ v14 Mind ⟷ Ollama

> Every output is an input. The loop closes through the human.
> Present + past → future — the λ = φ⁻² law, at cognitive scale.

## The map

```
                ┌──────────────── THE WORLD ────────────────┐
                │  mic · camera · screen · files · CHAT     │
                └──────────────┬─────────────────────────────┘
                               ▼  (raw measurements)
       AVA renderer ── 100 ms waveform / 144×89 luminance ──► AVA main
       (sensors.js)                                           (sensory.cjs)
                               │  28-field, computed ONCE
             ┌─────────────────┼───────────────────────────┐
             ▼                 ▼                           ▼
    EngineLoop (app)    SensorBus (v14)             Stability panel
    64-node ring, ν=0.5 validated fan-in            Σ panel:
    4 invariants/tick   capacity F₁₁ = 89           engine + MIND
                               ▼
                   FractalNodeEngine.process(field)
                               ▼
                   ExistenceDetector ── exists×3 ──► THOUGHT
                   (signal·persistence·coherence·relation)
                               ▼
                   ConceptRegistry (resonance recognition)
                               ▼
                   DriveArbiter → LlmTool → Ollama (phi · mathstral)
                               ▼
                   answers RE-ENCODED → SensorBus ("llm.answer")
                               ▼
                   MemoryStore · HopfieldMemory (episodes)
                               ▼
                   snapshot → restored next boot ──► back to start
```

## Edge contracts (rates, shapes, validation)

| Edge | Payload | Rate | Validation |
|---|---|---|---|
| renderer → main (audio) | Float32Array[8192] waveform + true rate | 10 Hz | main: finite checks |
| renderer → main (video) | Float32Array[144×89] luminance | 2 Hz | main: dimension + finite |
| main → EngineLoop | energy/mean scalar via `dampedRegularization` | per frame | clamp [0,1] |
| main → mind bus | 28-field (audio.mic / vision.screen origin) | per frame | `schemas/validate.ts` |
| chat → mind bus | `encodeText(text)` 28-field (text.feed) | per message | non-empty, ≤500 chars |
| bus → engine | `SensoryFrame` (validated only) | ≤5/tick | schema gate at push |
| engine → thoughts | root field `Float64Array[28]` | 146 ms tick | ExistenceDetector ×3 ticks |
| mind → UI | NDJSON journal relays (thought/voice/boot/error) | as born | sanitize (JSON-safe) |
| LLM ↔ tools | phi phrase / nameThis / define / relate / verify | 1 in-flight/model | response schema validators |
| persist | registry snapshot + journal.jsonl | 13 thoughts / 987 ticks | quarantine on corruption |

## The closure rules (what makes it toroidal, not a pipeline)

1. **Senses re-enter.** LLM answers are re-encoded and pushed back through
   the SensorBus as `llm.answer` frames — the mind hears itself think.
2. **The human is in the loop.** Chat text becomes a `text.feed` field; the
   mind's voice becomes chat bubbles. The interface is a sense organ AND a
   voice, not a viewer.
3. **Memory survives death.** Snapshots restore the registry at boot —
   present + past → future, the same conservative law as the engine's
   λ = φ⁻² memory kernel, one abstraction level up.
4. **Dual-feed, single measurement.** One projection (sensory.cjs) feeds
   both the EngineLoop's drives and the mind's SensorBus — no measurement
   is taken twice, no truth is duplicated.
5. **Degradation is honest everywhere.** No mic → the button says so.
   No Ollama → tools report down, senses keep flowing. No brain dir → ψ
   reports it. Absence is information; nothing is fabricated.

## Resolution upgrades over the v14-native senses

| Sense | v14 native | via AVA UI | Gain |
|---|---|---|---|
| ear | ffmpeg 16 kHz, 5 s segments | Web Audio native rate, 100 ms windows | 50× temporal |
| eye | PowerShell screen 89×55 @ 0.39 Hz | camera 144×89 (F₁₂×F₁₁) @ 2 Hz | 2.6× spatial, 5× temporal |
| model warm | phi + mathstral (~9 GB peak) | phi at boot, mathstral on demand | ~half peak RAM |
