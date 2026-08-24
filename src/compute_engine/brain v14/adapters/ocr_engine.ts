/**
 * RHUFT Mind — OCR Engine Adapter (F2): sight → text, unlimited, self-contained
 *
 * Epistemic Status: [SPEC] — Adapter-layer instrument. ADDITIVE module.
 *
 * [PHIL] — OCR is NOT a new sense; it is a TRANSLATOR. An image or a scanned
 * PDF page carries language as PIXELS; the mind only ever learns language as
 * 28-element fields through the one L4_Sensory door. This adapter's sole job is
 * to turn those pixels into honest text so the EXISTING language path
 * (encodeText → SensorBus "text.feed" → LinguisticGate → registry → manifold)
 * can learn from it — exactly as if the words had been typed. No new learning
 * subsystem, no special door: OCR is how the mind READS.
 *
 * UNLIMITED (the operator's mandate): there is NO character cap here. A whole
 * scanned book, a long screenshot, a tall document — every recognised line is
 * emitted. The caller (the OCR feed sense) chunks and paces the text onto the
 * bus so a flood never overwhelms the loop; the engine itself never truncates.
 *
 * HONESTY (TRUTH_SOURCES):
 *   - tesseract.js is a REAL WASM OCR engine running locally — offline, no
 *     network, no external install. What it reads is what it reports.
 *   - A page with no legible text yields an empty result and the caller says
 *     so; nothing is invented to fill the silence.
 *   - Recognition confidence is MEASURED per block and surfaced, so the gate
 *     downstream can weigh a blurry read against a crisp one.
 *
 * The engine is LAZY: the WASM worker (and its language data) loads on the
 * first real recognise() call, so booting the mind never pays the OCR cost
 * until the first image actually arrives.
 */

// tesseract.js is an optional, heavy dependency: imported lazily so the mind
// boots (and the test-suite typechecks) even where it is not installed.
type TesseractWorker = {
  recognize(image: unknown): Promise<{ data: { text: string; confidence: number } }>;
  terminate(): Promise<unknown>;
};
type TesseractModule = {
  createWorker?(langs?: string | string[]): Promise<TesseractWorker>;
};

/** The image buffer kinds the engine accepts. */
export type OcrImage = Buffer | Uint8Array | ArrayBuffer;

/** One recognised page/region: the text plus its measured confidence. */
export interface OcrResult {
  /** The recognised text (may be empty — honestly). */
  readonly text: string;
  /** Mean recognition confidence 0..100 measured by the engine. */
  readonly confidence: number;
  /** Wall-clock ms the recognition took (for pacing / telemetry). */
  readonly elapsedMs: number;
}

export class OcrEngine {
  private readonly _langs: string;
  private _worker: TesseractWorker | null = null;
  private _loading: Promise<TesseractWorker> | null = null;
  private _mod: TesseractModule | null = null;

  /**
   * @param langs Tesseract language code(s), e.g. "eng" or "eng+fra". Defaults
   * to English; the caller can widen it without a rebuild.
   */
  constructor(langs: string = "eng") {
    this._langs = langs;
  }

  /** Lazily import the module (kept out of the cold boot path). */
  private async _module(): Promise<TesseractModule> {
    if (this._mod) return this._mod;
    const mod = (await import("tesseract.js")) as unknown as TesseractModule & { default?: TesseractModule };
    // ESM/CJS interop: some builds nest the API under .default.
    const resolved = (mod.createWorker ? mod : mod.default) as TesseractModule | undefined;
    if (typeof resolved?.createWorker !== "function") {
      throw new Error("tesseract.js did not expose createWorker (unexpected module shape)");
    }
    this._mod = resolved;
    return this._mod;
  }

  /** Lazily create the single reusable worker (WASM + language data). */
  private async _ensureWorker(): Promise<TesseractWorker> {
    if (this._worker) return this._worker;
    if (this._loading) return this._loading;
    this._loading = (async () => {
      const mod = await this._module();
      const create = mod.createWorker;
      if (typeof create !== "function") {
        throw new Error("tesseract.js createWorker unavailable after module resolution");
      }
      const worker = await create(this._langs);
      this._worker = worker;
      return worker;
    })();
    try {
      return await this._loading;
    } finally {
      this._loading = null;
    }
  }

  /**
   * Recognise ONE image/page. UNLIMITED: the full recognised text is returned,
   * however long. Honest on failure: throws with the engine's own message —
   * the caller converts that into an ok:false verdict, never a fabrication.
   */
  async recognize(image: OcrImage): Promise<OcrResult> {
    const started = Date.now();
    const worker = await this._ensureWorker();
    const res = await worker.recognize(image);
    const text = (res?.data?.text ?? "").replace(/\r\n/g, "\n");
    const confidence = typeof res?.data?.confidence === "number" ? res.data.confidence : 0;
    return { text, confidence, elapsedMs: Date.now() - started };
  }

  /**
   * Recognise MANY images (a multi-page scan) as an async stream: each page's
   * result is yielded the moment it completes, so the caller can start feeding
   * the bus on page 1 while page 40 is still reading. UNLIMITED across pages.
   */
  async *recognizeAll(images: readonly OcrImage[]): AsyncGenerator<OcrResult & { page: number }> {
    for (let i = 0; i < images.length; i++) {
      const r = await this.recognize(images[i] as OcrImage);
      yield { ...r, page: i + 1 };
    }
  }

  /** Free the WASM worker (memory honesty). Safe to call when never started. */
  async terminate(): Promise<void> {
    const w = this._worker;
    this._worker = null;
    if (w) {
      try {
        await w.terminate();
      } catch {
        // Termination is best-effort; a half-loaded worker must not throw here.
      }
    }
  }
}
