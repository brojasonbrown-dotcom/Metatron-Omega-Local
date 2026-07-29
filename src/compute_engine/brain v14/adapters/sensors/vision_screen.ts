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

/** Downsample grid dimensions: F_11 × F_10 = 89 × 55. [SPEC] */
export const GRID_W = 89;
export const GRID_H = 55;

/** Capture cadence in ms: F_18 = 2584 ≈ 2.6 s (PowerShell spawn cost). [SPEC] */
export const DEFAULT_PERIOD_MS = 2584;

/** Force-inject every Nth capture even without novelty: F_11 = 89. [SPEC] */
const FORCE_EVERY = 89;

/**
 * PowerShell pipeline: full-virtual-screen capture → 89×55 bicubic downsample
 * → per-pixel Rec.709 luminance → single CSV line on stdout.
 */
const CAPTURE_SCRIPT =
  "$ErrorActionPreference='Stop'; " +
  "Add-Type -AssemblyName System.Drawing; " +
  "Add-Type -AssemblyName System.Windows.Forms; " +
  "$b=[System.Windows.Forms.SystemInformation]::VirtualScreen; " +
  "$bmp=New-Object System.Drawing.Bitmap $b.Width,$b.Height; " +
  "$g=[System.Drawing.Graphics]::FromImage($bmp); " +
  "$g.CopyFromScreen($b.Left,$b.Top,0,0,$bmp.Size); " +
  `$small=New-Object System.Drawing.Bitmap ${GRID_W},${GRID_H}; ` +
  "$g2=[System.Drawing.Graphics]::FromImage($small); " +
  "$g2.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; " +
  `$g2.DrawImage($bmp,0,0,${GRID_W},${GRID_H}); ` +
  "$sb=New-Object System.Text.StringBuilder; " +
  `for($y=0;$y -lt ${GRID_H};$y++){for($x=0;$x -lt ${GRID_W};$x++){` +
  "$p=$small.GetPixel($x,$y); " +
  "$l=0.2126*$p.R+0.7152*$p.G+0.0722*$p.B; " +
  "[void]$sb.Append([math]::Round($l,2)); [void]$sb.Append(',')}}; " +
  "$g.Dispose(); $g2.Dispose(); $bmp.Dispose(); $small.Dispose(); " +
  "Write-Output $sb.ToString().TrimEnd(',')";

export interface ScreenSensorStats {
  readonly captures: number;
  readonly injected: number;
  readonly failures: number;
  readonly lastError: string | null;
}

export class ScreenVisionSensor {
  private readonly _bus: SensorBus;
  private readonly _periodMs: number;
  private _timer: NodeJS.Timeout | null = null;
  private _busy = false;
  private _prevField: Float64Array | null = null;
  private _captures = 0;
  private _injected = 0;
  private _failures = 0;
  private _lastError: string | null = null;
  private _onGrid: ((grid: Float64Array, w: number, h: number) => void) | null = null;

  constructor(bus: SensorBus, periodMs: number = DEFAULT_PERIOD_MS) {
    this._bus = bus;
    this._periodMs = periodMs;
  }

  /** P2 — register an observer for the raw luminance grid (visual memory). */
  onGrid(cb: (grid: Float64Array, w: number, h: number) => void): void {
    this._onGrid = cb;
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
    };
  }

  private async _captureOnce(): Promise<void> {
    if (this._busy) return; // never overlap captures
    this._busy = true;
    try {
      const csv = await runPowerShell(CAPTURE_SCRIPT, this._periodMs * 2);
      const grid = parseLuminanceCsv(csv, GRID_W * GRID_H);
      const field = fieldFromLuminanceGrid(grid, GRID_W, GRID_H);
      this._captures++;
      // P2 — hand the raw grid to visual memory before it is discarded.
      if (this._onGrid) {
        try {
          this._onGrid(grid, GRID_W, GRID_H);
        } catch {
          /* visual-memory failure is not a sensor failure */
        }
      }

      const novel =
        this._prevField === null || resonance(field, this._prevField) < COHERENCE_THRESHOLD;
      const forced = this._captures % FORCE_EVERY === 0;
      if (novel || forced) {
        const accepted = this._bus.push({
          source: "vision.screen",
          timestamp: Date.now(),
          meta: {
            grid: `${GRID_W}x${GRID_H}`,
            trigger: novel ? "novelty" : "periodic",
          },
          field,
        });
        if (accepted) {
          this._injected++;
          this._prevField = field;
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
