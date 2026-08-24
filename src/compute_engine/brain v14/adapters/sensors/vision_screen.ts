/**
 * RHUFT Mind — Screen Vision Sensor: the mind's default eye
 *
 * Epistemic Status: [SPEC] — Adapter-layer sensor, Windows host.
 *
 * Captures the FULL virtual screen at native resolution via PowerShell +
 * System.Drawing (no native npm deps), downsamples with high-quality bicubic
 * interpolation to an 89×55 luminance grid (Fibonacci F_11 × F_10 [SPEC]),
 * then projects onto 14 φ-spaced spatial-frequency modes → 28-field.
 *
 * Novelty gating [SPEC]: a frame is injected into the SensorBus only when its
 * field's resonance with the previously injected field drops below
 * COHERENCE_THRESHOLD = 1/φ² (real change), OR every 89th capture regardless
 * (periodic grounding so a static world is still sensed).
 *
 * TRUTH_SOURCES: capture failures are counted and surfaced via stats() —
 * never papered over with synthetic frames.
 */

import { execFile } from "node:child_process";
import { COHERENCE_THRESHOLD } from "./../../core/constants.ts";
import { resonance } from "./../language_codec.ts";
import type { SensorBus } from "./sensor_bus.ts";
import { fieldFromLuminanceGrid } from "./signal_codec.ts";
import { visionSpectralEnrichment } from "./spectral_enrichment.ts";
import { opticalFlowRegions, motionAnchor } from "./optical_flow.ts";
import {
  resolveSensoryDepth,
  SENSORY_OCTAVES_MAX,
  type SensoryDepthTelemetry,
} from "./sensory_depth.ts";
import type { MotionAnchor } from "./../../schemas/validate.ts";

/** Downsample grid dimensions: F_11 × F_10 = 89 × 55. [SPEC] */
export const GRID_W = 89;
export const GRID_H = 55;

/** Capture cadence in ms: F_18 = 2584 ≈ 2.6 s (PowerShell spawn cost). [SPEC] */
export const DEFAULT_PERIOD_MS = 2584;

/** Force-inject every Nth capture even without novelty: F_11 = 89. [SPEC] */
const FORCE_EVERY = 89;

/**
 * ADR-002 M4 — region grid for the movement-anchor: the 89×55 frame tiled into
 * 5×8 regions (F_5 × F_6 [SPEC]), each ~11×18 px — fine enough to separate a dog
 * from a passing car, coarse enough to stay noise-robust. [SPEC]
 */
const FLOW_REGION_ROWS = 5;
const FLOW_REGION_COLS = 8;

/**
 * High-resolution capture grid (detail channel): F_13 × F_12 = 233 × 144. [SPEC]
 * ~6.9× the pixels of the 89×55 fast grid — enough spatial support for the
 * multi-scale descriptor to resolve fine structure the fast grid blurs away.
 */
export const HIRES_GRID_W = 233;
export const HIRES_GRID_H = 144;

/**
 * PowerShell pipeline: full-virtual-screen capture → bicubic downsample to the
 * requested grid → per-pixel Rec.709 luminance → single CSV line on stdout.
 * Parameterised on (w, h) so the same capture serves the fast and hi-res grids.
 */
function captureScript(gridW: number, gridH: number): string {
  return (
    "$ErrorActionPreference='Stop'; " +
    // Force invariant culture: on comma-decimal locales (e.g. en-ZA) [math]::Round
    // stringifies 4.01 as "4,01", colliding with the ',' CSV delimiter and
    // corrupting every value. Pin the culture so the decimal point is always '.'.
    "[System.Threading.Thread]::CurrentThread.CurrentCulture=[System.Globalization.CultureInfo]::InvariantCulture; " +
    "Add-Type -AssemblyName System.Drawing; " +
    "Add-Type -AssemblyName System.Windows.Forms; " +
    "$b=[System.Windows.Forms.SystemInformation]::VirtualScreen; " +
    "$bmp=New-Object System.Drawing.Bitmap $b.Width,$b.Height; " +
    "$g=[System.Drawing.Graphics]::FromImage($bmp); " +
    "$g.CopyFromScreen($b.Left,$b.Top,0,0,$bmp.Size); " +
    `$small=New-Object System.Drawing.Bitmap ${gridW},${gridH}; ` +
    "$g2=[System.Drawing.Graphics]::FromImage($small); " +
    "$g2.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; " +
    `$g2.DrawImage($bmp,0,0,${gridW},${gridH}); ` +
    "$sb=New-Object System.Text.StringBuilder; " +
    `for($y=0;$y -lt ${gridH};$y++){for($x=0;$x -lt ${gridW};$x++){` +
    "$p=$small.GetPixel($x,$y); " +
    "$l=0.2126*$p.R+0.7152*$p.G+0.0722*$p.B; " +
    "[void]$sb.Append([math]::Round($l,2)); [void]$sb.Append(',')}}; " +
    "$g.Dispose(); $g2.Dispose(); $bmp.Dispose(); $small.Dispose(); " +
    "Write-Output $sb.ToString().TrimEnd(',')"
  );
}

/** The fast (default) capture script — 89×55, identical to the legacy path. */
const CAPTURE_SCRIPT = captureScript(GRID_W, GRID_H);

export interface ScreenSensorStats {
  readonly captures: number;
  readonly injected: number;
  readonly failures: number;
  readonly lastError: string | null;
  /** ADR-007 — resolved sensory octave depth this capture (0 = legacy/unset). */
  readonly octaves: number;
}

export class ScreenVisionSensor {
  private readonly _bus: SensorBus;
  private readonly _periodMs: number;
  private readonly _hiRes: boolean;
  private _timer: NodeJS.Timeout | null = null;
  private _busy = false;
  private _prevField: Float64Array | null = null;
  private _captures = 0;
  private _injected = 0;
  private _failures = 0;
  private _lastError: string | null = null;
  private _onGrid: ((grid: Float64Array, w: number, h: number) => void) | null = null;
  private _onHiRes: ((grid: Float64Array, w: number, h: number) => void) | null = null;
  /** ADR-002 M4 — previous capture's grid, for optical-flow region motion. */
  private _prevGrid: Float64Array | null = null;
  /** ADR-002 M4 — when true, compute the movement-anchor per frame (config-gated). */
  private readonly _motionEnabled: boolean;
  /** ADR-007 — live governor telemetry supplier for the sensory-depth dial (opt-in). */
  private _depthTelemetry: (() => SensoryDepthTelemetry) | null = null;
  /** ADR-007 — the last resolved octave depth (observable via stats). */
  private _lastOctaves = 0;

  /**
   * @param hiRes  When true, each capture also grabs a detail grid and hands it to
   *               `onHiRes` (multi-scale perception). Default false → byte-identical
   *               to the legacy fast path. [P3, config-gated]
   * @param motionEnabled  ADR-002 M4: when true, each injected frame carries a
   *               movement-anchor (the region that moved, by real optical flow).
   *               Default false → no anchor, today's behaviour. [config-gated]
   */
  constructor(bus: SensorBus, periodMs: number = DEFAULT_PERIOD_MS, hiRes: boolean = false, motionEnabled: boolean = false) {
    this._bus = bus;
    this._periodMs = periodMs;
    this._hiRes = hiRes;
    this._motionEnabled = motionEnabled;
  }

  /** P2 — register an observer for the raw luminance grid (visual memory). */
  onGrid(cb: (grid: Float64Array, w: number, h: number) => void): void {
    this._onGrid = cb;
  }

  /** P3 — register an observer for the high-resolution detail grid. */
  onHiRes(cb: (grid: Float64Array, w: number, h: number) => void): void {
    this._onHiRes = cb;
  }

  /**
   * ADR-007 — supply live governor telemetry so the hi-res detail grid + octave
   * depth SCALE with what this hardware can handle (hardware-relative, futureproof:
   * on a machine with more RAM the governor's maxDepth rises and the same dial
   * resolves proportionally deeper — no retuning). Opt-in: unset → the legacy fixed
   * 233×144 grid and the consumer's own default octaves (today's behaviour). [SPEC]
   */
  setSensoryDepthSource(supplier: () => SensoryDepthTelemetry): void {
    this._depthTelemetry = supplier;
  }

  start(): void {
    if (this._timer) return;
    this._timer = setInterval(() => {
      void this._captureOnce();
    }, this._periodMs);
    this._timer.unref();
    void this._captureOnce(); // first sight immediately
  }

  stop(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  stats(): ScreenSensorStats {
    return {
      captures: this._captures,
      injected: this._injected,
      failures: this._failures,
      lastError: this._lastError,
      // ADR-007 — the resolved sensory depth (0 = no governor source registered).
      octaves: this._lastOctaves,
    };
  }

  private async _captureOnce(): Promise<void> {
    if (this._busy) return; // never overlap captures
    this._busy = true;
    try {
      const csv = await runPowerShell(CAPTURE_SCRIPT, this._periodMs * 2);
      const grid = parseLuminanceCsv(csv, GRID_W * GRID_H);
      const field = fieldFromLuminanceGrid(grid, GRID_W, GRID_H);
      // Certified spectral enrichment (additive — the 28-field above is the locked bus
      // contract). Full 2-D FFT whitened identity signature + measured complexity +
      // Parseval certificate, so the loop reasons over measured modal occupancy. [SPEC]
      const spectral = visionSpectralEnrichment(grid, GRID_W, GRID_H);
      this._captures++;
      // P2 — hand the raw grid to visual memory before it is discarded.
      if (this._onGrid) {
        try {
          this._onGrid(grid, GRID_W, GRID_H);
        } catch {
          /* visual-memory failure is not a sensor failure */
        }
      }

      // P3 — capture the high-resolution detail grid (config-gated, default off).
      // A second PowerShell spawn; only when enabled AND observed.
      // ADR-007 — the sensory-depth dial: when a governor telemetry source is
      // registered, the detail-grid resolution + live-overload throttle SCALE with
      // what this hardware can handle (hardware-relative: bigger hardware raises
      // maxDepth, so the same dial resolves deeper — futureproof). Unset → the
      // legacy fixed 233×144 grid (today's behaviour, byte-identical). [SPEC]
      if (this._hiRes && this._onHiRes) {
        const tele = this._depthTelemetry ? this._depthTelemetry() : null;
        // Live overload: skip the expensive second spawn entirely this capture —
        // perception never competes with the engine for the tick (E5/E7).
        const overloaded = tele !== null && tele.emaTickMs > tele.budgetMs;
        if (!overloaded) {
          try {
            // Hardware-relative detail grid: deep headroom resolves a φ⁻¹-finer
            // grid on capable machines; standard/coarse keep the legacy 233×144.
            const octaves = tele ? resolveSensoryDepth(tele).octaves : 0;
            this._lastOctaves = octaves;
            const deep = tele !== null && octaves >= SENSORY_OCTAVES_MAX;
            const W = deep ? Math.round(HIRES_GRID_W * 1.6180339887498949) : HIRES_GRID_W;
            const H = deep ? Math.round(HIRES_GRID_H * 1.6180339887498949) : HIRES_GRID_H;
            const hiCsv = await runPowerShell(
              captureScript(W, H),
              this._periodMs * 2
            );
            const hiGrid = parseLuminanceCsv(hiCsv, W * H);
            this._onHiRes(hiGrid, W, H);
          } catch {
            /* hi-res failure never blocks the fast path */
          }
        }
      }

      const novel =
        this._prevField === null || resonance(field, this._prevField) < COHERENCE_THRESHOLD;
      const forced = this._captures % FORCE_EVERY === 0;
      if (novel || forced) {
        // ADR-002 M4 — the movement-anchor: real optical flow between the previous
        // and current grid, so a concurrent sound can be attributed to the REGION
        // that moved (the car) rather than to the whole frame (which would smear
        // it onto the static dog). Null when no region moved confidently — the
        // honest "no antecedent here" signal. Additive; the 28-field is untouched.
        let motion: MotionAnchor | undefined;
        if (this._motionEnabled && this._prevGrid !== null) {
          const flow = opticalFlowRegions(this._prevGrid, grid, GRID_W, GRID_H, FLOW_REGION_ROWS, FLOW_REGION_COLS);
          const anchor = motionAnchor(flow);
          if (anchor !== null) motion = anchor;
        }
        const accepted = this._bus.push({
          source: "vision.screen",
          timestamp: Date.now(),
          meta: {
            grid: `${GRID_W}x${GRID_H}`,
            trigger: novel ? "novelty" : "periodic",
          },
          field,
          spectral,
          ...(motion !== undefined ? { motion } : {}),
        });
        if (accepted) {
          this._injected++;
          this._prevField = field;
          this._prevGrid = grid;
        }
      }
    } catch (err) {
      this._failures++;
      this._lastError = String(err instanceof Error ? err.message : err);
    } finally {
      this._busy = false;
    }
  }
}

/** Run a PowerShell one-liner, resolve stdout. Shared with vision_files. */
export function runPowerShell(script: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`powershell: ${error.message}${stderr ? ` | ${stderr.slice(0, 300)}` : ""}`));
          return;
        }
        resolve(stdout);
      }
    );
  });
}

/** Parse a CSV line of luminance values; enforce exact expected count. */
export function parseLuminanceCsv(csv: string, expected: number): Float64Array {
  const parts = csv.trim().split(",");
  if (parts.length !== expected) {
    throw new Error(`luminance csv: got ${parts.length} values, expected ${expected}`);
  }
  const grid = new Float64Array(expected);
  for (let i = 0; i < expected; i++) {
    const v = Number(parts[i]);
    if (!Number.isFinite(v)) {
      throw new Error(`luminance csv: value[${i}] "${parts[i]}" is not finite`);
    }
    grid[i] = v;
  }
  return grid;
}
