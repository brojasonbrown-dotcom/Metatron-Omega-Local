/**
 * SCENE RECOGNITION — on-device object detection + open-vocabulary scene
 *
 * transformers.js v3 (WebGPU when available, WASM fallback), lazily loaded on
 * first use and cached by the browser. If the download fails, EVERYTHING here
 * degrades to null and the caller keeps the existing geometric descriptors —
 * no throw ever reaches the render path.
 *
 * Framework routing:
 *   F5 Geometric — box centroids as a point set: convex-hull compactness and
 *                  nearest-neighbour spacing tested against the φ ladder.
 *   F8 Galactic  — apparent object scale placed on an octave ladder, giving
 *                  honest scale-band occupancy instead of a flat object list.
 */

import { PHI } from '@/constants/metatron';

export const DETECTION_MODEL = 'Xenova/yolos-tiny';
export const SCENE_MODEL = 'Xenova/clip-vit-base-patch32';

export function sceneDisabled(): boolean {
  try { return localStorage.getItem('metatron_scene_off') === '1'; } catch { return false; }
}

export interface Detection {
  label: string;
  score: number;
  /** Normalised [0,1] box: xmin, ymin, xmax, ymax. */
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

// ═══ Model lifecycle ════════════════════════════════════════════════════

type Pipe = (input: unknown, opts?: unknown) => Promise<unknown>;
let detector: Pipe | null = null;
let loading: Promise<Pipe | null> | null = null;
let lastError: string | null = null;

export function sceneStatus(): { loaded: boolean; loading: boolean; error: string | null } {
  return { loaded: detector !== null, loading: loading !== null, error: lastError };
}

/** Lazy-load the detector. Returns null (never throws) when unavailable. */
export async function ensureDetector(): Promise<Pipe | null> {
  if (detector) return detector;
  if (sceneDisabled()) return null;
  if (loading) return loading;
  loading = (async () => {
    try {
      const mod = await import('@huggingface/transformers');
      const hasGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
      const p = (await mod.pipeline('object-detection', DETECTION_MODEL, {
        device: hasGPU ? 'webgpu' : 'wasm',
      })) as unknown as Pipe;
      detector = p;
      lastError = null;
      return p;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      return null;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/**
 * Detect objects in a frame. `src` is anything transformers.js accepts —
 * a data URL, an object URL, or a canvas-derived blob URL.
 */
export async function detectObjects(src: string, threshold = 0.5): Promise<Detection[]> {
  const pipe = await ensureDetector();
  if (!pipe) return [];
  try {
    const raw = (await pipe(src, { threshold, percentage: true })) as Array<{
      label: string; score: number; box: Detection['box'];
    }>;
    return Array.isArray(raw) ? raw.filter((d) => d && d.box) : [];
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
    return [];
  }
}

// ═══ F5 — spatial geometry of the detected point set ════════════════════

export interface SpatialGeometry {
  count: number;
  /** Mean nearest-neighbour spacing over the centroid set (normalised units). */
  meanSpacing: number;
  /** SD/mean of nearest-neighbour spacing — 0 = perfectly regular lattice. */
  spacingDispersion: number;
  /** Relative distance of the spacing ratio ladder to φ, mapped to [0,1]. */
  phiSpacingLock: number;
  /** Convex-hull area / bounding-box area. 1 = convex fill, 0 = collinear. */
  hullCompactness: number;
}

function centroids(dets: readonly Detection[]): Array<[number, number]> {
  return dets.map((d) => [(d.box.xmin + d.box.xmax) / 2, (d.box.ymin + d.box.ymax) / 2] as [number, number]);
}

function convexHullArea(pts: ReadonlyArray<[number, number]>): number {
  if (pts.length < 3) return 0;
  const p = [...pts].sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const build = (src: Array<[number, number]>) => {
    const h: Array<[number, number]> = [];
    for (const q of src) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop();
      h.push(q);
    }
    h.pop();
    return h;
  };
  const hull = [...build(p), ...build([...p].reverse())];
  let a = 0;
  for (let i = 0; i < hull.length; i += 1) {
    const [x1, y1] = hull[i];
    const [x2, y2] = hull[(i + 1) % hull.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

export function spatialGeometry(dets: readonly Detection[]): SpatialGeometry {
  const pts = centroids(dets);
  const empty: SpatialGeometry = {
    count: pts.length, meanSpacing: 0, spacingDispersion: 0, phiSpacingLock: 0, hullCompactness: 0,
  };
  if (pts.length < 2) return empty;

  const nn: number[] = [];
  for (let i = 0; i < pts.length; i += 1) {
    let best = Infinity;
    for (let j = 0; j < pts.length; j += 1) {
      if (i === j) continue;
      const dx = pts[i][0] - pts[j][0];
      const dy = pts[i][1] - pts[j][1];
      const d = Math.hypot(dx, dy);
      if (d < best) best = d;
    }
    if (Number.isFinite(best)) nn.push(best);
  }
  const mean = nn.reduce((a, b) => a + b, 0) / nn.length;
  const variance = nn.reduce((a, b) => a + (b - mean) ** 2, 0) / nn.length;
  const dispersion = mean > 0 ? Math.sqrt(variance) / mean : 0;

  // φ-lock: how close consecutive sorted spacings sit to a φ ratio.
  const sorted = [...nn].sort((a, b) => a - b).filter((x) => x > 1e-9);
  let lock = 0;
  if (sorted.length >= 2) {
    let acc = 0;
    for (let i = 1; i < sorted.length; i += 1) {
      const e = Math.abs(Math.log(sorted[i] / sorted[i - 1]) / Math.log(PHI));
      acc += Math.exp(-((e - Math.round(e)) ** 2) / (2 * Math.pow(PHI, -4) ** 2));
    }
    lock = acc / (sorted.length - 1);
  }

  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const bbox = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
  const hull = convexHullArea(pts);

  return {
    count: pts.length,
    meanSpacing: mean,
    spacingDispersion: dispersion,
    phiSpacingLock: lock,
    hullCompactness: bbox > 0 ? Math.min(1, hull / bbox) : 0,
  };
}

// ═══ F8 — scale-band occupancy over apparent object size ════════════════

/** Octave bands over apparent area, from 2⁻¹⁴ to 2⁰ of the frame. */
export const SCALE_BANDS = 14;

export interface ScaleOccupancy {
  /** Normalised occupancy per octave band, sums to 1 (or all zero). */
  bands: Float64Array;
  /** Normalised Shannon entropy of the occupancy — 1 = scale-flat scene. */
  scaleEntropy: number;
  /** Dominant octave index. */
  dominantBand: number;
}

export function scaleOccupancy(dets: readonly Detection[]): ScaleOccupancy {
  const bands = new Float64Array(SCALE_BANDS);
  let z = 0;
  for (const d of dets) {
    const area = Math.max(1e-9, (d.box.xmax - d.box.xmin) * (d.box.ymax - d.box.ymin));
    const oct = Math.min(SCALE_BANDS - 1, Math.max(0, Math.floor(-Math.log2(area))));
    bands[oct] += d.score;
    z += d.score;
  }
  if (z > 0) for (let i = 0; i < SCALE_BANDS; i += 1) bands[i] /= z;
  let h = 0;
  let dominant = 0;
  for (let i = 0; i < SCALE_BANDS; i += 1) {
    if (bands[i] > 0) h -= bands[i] * Math.log(bands[i]);
    if (bands[i] > bands[dominant]) dominant = i;
  }
  return { bands, scaleEntropy: z > 0 ? h / Math.log(SCALE_BANDS) : 0, dominantBand: dominant };
}

// ═══ Scene → 22-band vector (shared address space) ══════════════════════

/**
 * Project a scene onto the same 22-dimensional basis the audio and lexicon
 * use, so a seen object and a spoken word can resonate in one space.
 * Dimensions 0..13 are the scale-octave occupancy; 14..21 are geometric
 * descriptors, all in [0,1].
 */
export function sceneTo22(dets: readonly Detection[]): Float64Array {
  const v = new Float64Array(22);
  const occ = scaleOccupancy(dets);
  for (let i = 0; i < SCALE_BANDS; i += 1) v[i] = occ.bands[i];
  const g = spatialGeometry(dets);
  v[14] = Math.min(1, g.count / 21);
  v[15] = Math.min(1, g.meanSpacing);
  v[16] = Math.min(1, g.spacingDispersion);
  v[17] = g.phiSpacingLock;
  v[18] = g.hullCompactness;
  v[19] = occ.scaleEntropy;
  v[20] = occ.dominantBand / Math.max(1, SCALE_BANDS - 1);
  v[21] = dets.length > 0 ? dets.reduce((a, d) => a + d.score, 0) / dets.length : 0;
  return v;
}

export interface SceneReport {
  detections: Detection[];
  geometry: SpatialGeometry;
  scale: ScaleOccupancy;
  vec22: Float64Array;
  /** True when the model was unavailable and the report is empty. */
  degraded: boolean;
  t: number;
}

export function emptyScene(): SceneReport {
  return {
    detections: [],
    geometry: spatialGeometry([]),
    scale: scaleOccupancy([]),
    vec22: sceneTo22([]),
    degraded: true,
    t: Date.now(),
  };
}

export async function analyseScene(src: string, threshold = 0.5): Promise<SceneReport> {
  const detections = await detectObjects(src, threshold);
  if (detections.length === 0 && !detector) return emptyScene();
  return {
    detections,
    geometry: spatialGeometry(detections),
    scale: scaleOccupancy(detections),
    vec22: sceneTo22(detections),
    degraded: false,
    t: Date.now(),
  };
}

export const SCENE_PROVENANCE =
  'Object boxes come from Xenova/yolos-tiny run fully on-device (transformers.js ' +
  'v3, WebGPU with WASM fallback). Labels and scores are the model\'s, not the ' +
  'engine\'s. Geometry (nearest-neighbour spacing, hull compactness) and octave ' +
  'scale-band occupancy are deterministic measurements over those boxes. Nothing ' +
  'here is CODATA-compared; when the model is unavailable the report is flagged ' +
  'degraded and the existing geometric descriptors stand unchanged.';