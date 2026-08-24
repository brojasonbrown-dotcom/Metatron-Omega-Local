/**
 * RHUFT Mind — File Vision Sensor: images dropped into the mind's inbox
 *
 * Epistemic Status: [SPEC] — Adapter-layer sensor, Windows host.
 *
 * Watches <inbox>/vision/ for image files (.png .jpg .jpeg .bmp .gif .tif).
 * Each dropped image is decoded at FULL resolution via PowerShell +
 * System.Drawing, bicubic-downsampled to the same 89×55 luminance grid as the
 * screen eye, projected to a 28-field and pushed as source "vision.file".
 *
 * Processed files are moved to <inbox>/vision/processed/ so nothing is ever
 * sensed twice across restarts. Failures leave the file in place and are
 * surfaced via stats() — never silently discarded (TRUTH_SOURCES).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { SensorBus } from "./sensor_bus.ts";
import { fieldFromLuminanceGrid } from "./signal_codec.ts";
import { visionSpectralEnrichment } from "./spectral_enrichment.ts";
import { GRID_H, GRID_W, parseLuminanceCsv, runPowerShell } from "./vision_screen.ts";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".bmp", ".gif", ".tif", ".tiff"]);

/** Settle delay before reading a newly seen file (copy may be in flight). [SPEC] */
const SETTLE_MS = 987; // F_16

/** PowerShell: decode image file → 89×55 luminance CSV (same pipeline as screen). */
function decodeScript(imagePath: string): string {
  const escaped = imagePath.replace(/'/g, "''");
  return (
    "$ErrorActionPreference='Stop'; " +
    // Force invariant culture: on comma-decimal locales (e.g. en-ZA) [math]::Round
    // stringifies 4.01 as "4,01", colliding with the ',' CSV delimiter and
    // corrupting every value. Pin the culture so the decimal point is always '.'.
    "[System.Threading.Thread]::CurrentThread.CurrentCulture=[System.Globalization.CultureInfo]::InvariantCulture; " +
    "Add-Type -AssemblyName System.Drawing; " +
    `$bmp=[System.Drawing.Bitmap]::FromFile('${escaped}'); ` +
    `$small=New-Object System.Drawing.Bitmap ${GRID_W},${GRID_H}; ` +
    "$g2=[System.Drawing.Graphics]::FromImage($small); " +
    "$g2.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; " +
    `$g2.DrawImage($bmp,0,0,${GRID_W},${GRID_H}); ` +
    "$sb=New-Object System.Text.StringBuilder; " +
    `for($y=0;$y -lt ${GRID_H};$y++){for($x=0;$x -lt ${GRID_W};$x++){` +
    "$p=$small.GetPixel($x,$y); " +
    "$l=0.2126*$p.R+0.7152*$p.G+0.0722*$p.B; " +
    "[void]$sb.Append([math]::Round($l,2)); [void]$sb.Append(',')}}; " +
    "$g2.Dispose(); $bmp.Dispose(); $small.Dispose(); " +
    "Write-Output $sb.ToString().TrimEnd(',')"
  );
}

export interface FileVisionStats {
  readonly sensed: number;
  readonly failures: number;
  readonly lastError: string | null;
}

export class FileVisionSensor {
  readonly watchDir: string;
  readonly processedDir: string;

  private readonly _bus: SensorBus;
  private _watcher: fs.FSWatcher | null = null;
  private readonly _pending = new Set<string>();
  private _sensed = 0;
  private _failures = 0;
  private _lastError: string | null = null;
  private _onGrid: ((grid: Float64Array, w: number, h: number, file: string) => void) | null = null;

  constructor(bus: SensorBus, inboxDir: string) {
    this._bus = bus;
    this.watchDir = path.join(inboxDir, "vision");
    this.processedDir = path.join(this.watchDir, "processed");
  }

  /** P2 — register an observer for the raw luminance grid (visual memory). */
  onGrid(cb: (grid: Float64Array, w: number, h: number, file: string) => void): void {
    this._onGrid = cb;
  }

  start(): void {
    if (this._watcher) return;
    fs.mkdirSync(this.processedDir, { recursive: true });

    // Sense anything already waiting in the inbox.
    for (const name of fs.readdirSync(this.watchDir)) {
      this._enqueue(name);
    }

    this._watcher = fs.watch(this.watchDir, (_event, name) => {
      if (name) this._enqueue(name);
    });
  }

  stop(): void {
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
  }

  stats(): FileVisionStats {
    return { sensed: this._sensed, failures: this._failures, lastError: this._lastError };
  }

  private _enqueue(name: string): void {
    const ext = path.extname(name).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) return;
    const full = path.join(this.watchDir, name);
    if (this._pending.has(full)) return;
    this._pending.add(full);
    setTimeout(() => {
      void this._process(full);
    }, SETTLE_MS).unref();
  }

  private async _process(filePath: string): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) return; // vanished before settle
      const csv = await runPowerShell(decodeScript(filePath), 30_000);
      const grid = parseLuminanceCsv(csv, GRID_W * GRID_H);
      const field = fieldFromLuminanceGrid(grid, GRID_W, GRID_H);
      // Certified spectral enrichment (additive — the 28-field above is the locked bus
      // contract). Full 2-D FFT whitened identity signature + measured complexity +
      // Parseval certificate, so the loop reasons over measured modal occupancy. [SPEC]
      const spectral = visionSpectralEnrichment(grid, GRID_W, GRID_H);
      // P2 — hand the raw grid to visual memory before it is discarded.
      if (this._onGrid) {
        try {
          this._onGrid(grid, GRID_W, GRID_H, path.basename(filePath));
        } catch {
          /* visual-memory failure is not a sensor failure */
        }
      }

      const accepted = this._bus.push({
        source: "vision.file",
        timestamp: Date.now(),
        meta: { path: filePath, file: path.basename(filePath) },
        field,
        spectral,
      });
      if (accepted) {
        this._sensed++;
        this._archive(filePath);
      }
    } catch (err) {
      this._failures++;
      this._lastError = `${path.basename(filePath)}: ${String(err instanceof Error ? err.message : err)}`;
    } finally {
      this._pending.delete(filePath);
    }
  }

  private _archive(filePath: string): void {
    try {
      const target = path.join(this.processedDir, `${Date.now()}-${path.basename(filePath)}`);
      fs.renameSync(filePath, target);
    } catch {
      // Archive is best-effort; re-sensing a file is harmless (novelty gate in loop).
    }
  }
}
