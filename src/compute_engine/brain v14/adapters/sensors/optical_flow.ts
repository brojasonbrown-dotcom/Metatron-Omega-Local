/**
 * RHUFT Mind — Optical-Flow Region Tracker (M4, the movement-anchor)
 *
 * Epistemic Status: [MATH] — per-region motion computed by real optical flow on
 * the luminance grid the sensor already produces. No proxy, no fake data.
 *
 * WHY THIS EXISTS. ADR-002 deferred movement-anchor because the 28-field is a
 * WHOLE-frame projection — it cannot say WHERE motion happened. But the sensor's
 * 89×55 luminance grid IS a 2-D image: consecutive grids differ exactly where the
 * world moved. This module computes a real per-region flow field over that grid
 * (a dense, brightness-constancy optical flow — the Lucas–Kanade family, solved
 * in closed form per region), so the correlator can anchor a sound to the REGION
 * THAT MOVED rather than to the whole frame.
 *
 * THE DOG/CAR FIX, MADE REAL. A dog sits still while a car passes. The car's
 * pixels change (a real region-motion vector in the car's region); the dog's do
 * not. When a "vroom" arrives, this tracker attributes it to the car's region —
 * NOT to the static dog. That is the causal attribution ADR-002 required, built
 * on measured pixel motion, not a heuristic.
 *
 * MATHEMATICS (brightness constancy). For grid I(x,y,t), the constancy assumption
 * I_x·u + I_y·v + I_t = 0 per pixel gives, per region R, the 2×2 normal equations
 *   [ ΣI_x²  ΣI_xI_y ] [u]   [ −ΣI_xI_t ]
 *   [ ΣI_xI_y ΣI_y²  ] [v] = [ −ΣI_yI_t ]
 * solved by 2×2 Cramer inversion when the structure tensor is well-conditioned
 * (determinant above a floor); otherwise the region is textureless and reports
 * zero motion (honest — aperture problem, not a fabricated vector). Gradients are
 * central differences; I_t is the frame difference. Pure, deterministic, no I/O.
 *
 * DISCIPLINE: this module is ADDITIVE and read-only. It never touches the locked
 * 28-field bus contract. It consumes the luminance grid the sensor already has
 * and emits per-region motion; the sensor attaches it as optional metadata. Inert
 * until enabled. [SPEC]
 */

/** φ⁻¹ — the engine's decay/hardening law. [MATH] */
const PHI_INV = 0.6180339887498949;

/**
 * Minimum structure-tensor determinant for a region to yield a trustworthy flow
 * vector (the aperture floor). Below this the region is too uniform to disambiguate
 * the motion component along the gradient; we report zero rather than invent one.
 * [SPEC — tuned to the 0..255 luminance scale, not derived]
 */
const MIN_STRUCTURE_DET = 1e-2;

/**
 * A region's measured motion for one frame pair. The vector is in grid-cells per
 * frame; magnitude is its Euclidean length; energy is the region's mean |I_t|
 * (how much raw change the region saw, independent of how well it resolved into
 * a vector). [MATH]
 */
export interface RegionMotion {
  /** Region row (0-based, top). */
  readonly row: number;
  /** Region column (0-based, left). */
  readonly col: number;
  /** Horizontal flow (grid cells / frame), +right. */
  readonly u: number;
  /** Vertical flow (grid cells / frame), +down. */
  readonly v: number;
  /** |flow| = √(u²+v²). */
  readonly magnitude: number;
  /** Mean |I_t| over the region — raw change energy. */
  readonly energy: number;
  /**
   * Confidence that this region's flow is real (structure-tensor conditioning),
   * in [0,1]. A textureless region reports ~0 even if its pixels flickered.
   */
  readonly confidence: number;
}

/** The per-region flow field for one captured frame pair. */
export interface FlowField {
  /** Region grid dimensions. */
  readonly regionRows: number;
  readonly regionCols: number;
  /** One RegionMotion per region, row-major (length = regionRows·regionCols). */
  readonly regions: readonly RegionMotion[];
  /** The single region with the highest confident magnitude, or null if none. */
  readonly dominant: RegionMotion | null;
}

/**
 * Dense per-region optical flow between two luminance grids.
 *
 * @param prev  Row-major luminance grid (length = width·height), the earlier frame.
 * @param next  Row-major luminance grid, the later frame. Same shape.
 * @param width Grid width (> 0).
 * @param height Grid height (> 0).
 * @param regionRows Number of region rows to tile the grid into (> 0).
 * @param regionCols Number of region columns (> 0).
 */
export function opticalFlowRegions(
  prev: Float64Array,
  next: Float64Array,
  width: number,
  height: number,
  regionRows: number,
  regionCols: number
): FlowField {
  if (prev.length !== width * height || next.length !== width * height) {
    throw new RangeError(
      `optical_flow: grid length ${prev.length}/${next.length} ≠ ${width}×${height}`
    );
  }
  if (regionRows < 1 || regionCols < 1) {
    throw new RangeError("optical_flow: region grid must be ≥ 1×1");
  }

  // Per-pixel spatial gradients (central differences) + temporal difference.
  // Computed once over the whole grid, then pooled per region. [MATH]
  const gx = new Float64Array(width * height);
  const gy = new Float64Array(width * height);
  const gt = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const xm = x > 0 ? i - 1 : i;
      const xp = x < width - 1 ? i + 1 : i;
      const ym = y > 0 ? i - width : i;
      const yp = y < height - 1 ? i + width : i;
      // Average the two frames for the spatial gradient (symmetric derivative).
      gx[i] = 0.5 * ((next[xp]! - next[xm]!) + (prev[xp]! - prev[xm]!)) * 0.5;
      gy[i] = 0.5 * ((next[yp]! - next[ym]!) + (prev[yp]! - prev[ym]!)) * 0.5;
      gt[i] = next[i]! - prev[i]!;
    }
  }

  const regions: RegionMotion[] = [];
  const cellW = width / regionCols;
  const cellH = height / regionRows;
  let dominant: RegionMotion | null = null;
  let dominantScore = -1;

  for (let r = 0; r < regionRows; r++) {
    for (let c = 0; c < regionCols; c++) {
      const x0 = Math.floor(c * cellW);
      const x1 = Math.max(x0 + 1, Math.floor((c + 1) * cellW));
      const y0 = Math.floor(r * cellH);
      const y1 = Math.max(y0 + 1, Math.floor((r + 1) * cellH));

      // Pool the structure-tensor entries + I_t energy over the region.
      let sxx = 0;
      let sxy = 0;
      let syy = 0;
      let sxt = 0;
      let syt = 0;
      let energy = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = y * width + x;
          const ix = gx[i]!;
          const iy = gy[i]!;
          const it = gt[i]!;
          sxx += ix * ix;
          sxy += ix * iy;
          syy += iy * iy;
          sxt += ix * it;
          syt += iy * it;
          energy += Math.abs(it);
          n++;
        }
      }
      energy = n > 0 ? energy / n : 0;

      // Solve the 2×2 normal equations by Cramer inversion. [MATH]
      const det = sxx * syy - sxy * sxy;
      let u = 0;
      let v = 0;
      let confidence = 0;
      if (det > MIN_STRUCTURE_DET && n > 0) {
        u = (-sxt * syy + sxy * syt) / det;
        v = (-sxx * syt + sxt * sxy) / det;
        // Confidence: how over-determined the system is. trace²/det is the
        // conditioning number; φ-decay maps it into [0,1). A corner (det large
        // relative to trace) → confident; an edge (det ~ 0) → not.
        const trace = sxx + syy;
        const cond = trace > 0 ? det / (trace * trace) : 0;
        confidence = 1 - Math.pow(PHI_INV, 4 * Math.min(1, cond * 16));
      }
      const magnitude = Math.hypot(u, v);
      const motion: RegionMotion = { row: r, col: c, u, v, magnitude, energy, confidence };
      regions.push(motion);

      // The dominant region is the most confident-mover: magnitude weighted by
      // confidence, so a confident small move outranks a textureless flicker.
      const score = magnitude * confidence;
      if (score > dominantScore) {
        dominantScore = score;
        dominant = motion;
      }
    }
  }

  return { regionRows, regionCols, regions, dominant: dominantScore > 0 ? dominant : null };
}

/**
 * The dominant motion ANCHOR: a compact descriptor of where the world moved most,
 * suitable for attaching to a frame as causal metadata. Returns null when no region
 * moved confidently (a static scene) — the honest "no antecedent here" signal the
 * correlator uses to refuse a spurious link. [MATH]
 */
export function motionAnchor(flow: FlowField): {
  row: number;
  col: number;
  magnitude: number;
  confidence: number;
} | null {
  const d = flow.dominant;
  if (!d) return null;
  return { row: d.row, col: d.col, magnitude: d.magnitude, confidence: d.confidence };
}
