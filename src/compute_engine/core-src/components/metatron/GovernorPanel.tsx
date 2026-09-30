import { useEffect, useState } from "react";
import { getGovernor } from "@/core/runtime/governorSingleton";
import type { GovernorSettings, PrecisionMode } from "@/core/runtime/ResourceGovernor";
import { CARRIER_CEILING_HZ, type HardwareEnvelope } from "@/core/runtime/HardwareEnvelope";

const PRECISION_OPTS: PrecisionMode[] = ["auto", "f64", "dec50", "dec500", "mpfr"];

export function GovernorPanel() {
  const [settings, setSettings] = useState<GovernorSettings | null>(null);
  const [hw, setHw] = useState<HardwareEnvelope | null>(null);
  const [maxM, setMaxM] = useState<number>(0);
  const [govRef, setGovRef] = useState<Awaited<ReturnType<typeof getGovernor>>["gov"] | null>(null);
  const [ramOverrideGB, setRamOverrideGB] = useState<number | null>(null);

  useEffect(() => {
    let off: (() => void) | undefined;
    getGovernor().then(({ hw, gov }) => {
      setHw(hw);
      setGovRef(gov);
      setSettings(gov.settings);
      setMaxM(gov.computeMaxM());
      off = gov.subscribe((s) => {
        setSettings(s);
        setMaxM(gov.computeMaxM());
      });
    });
    return () => { off?.(); };
  }, []);

  if (!settings || !hw || !govRef) {
    return <div className="rounded-md border border-border bg-card p-4 text-xs text-muted-foreground">probing hardware…</div>;
  }

  const ramCeilingBytes = Math.max(hw.ramBytes, (ramOverrideGB ?? 0) * 1024 * 1024 * 1024);
  const ramGB = settings.ramBytes / (1024 ** 3);
  const cores = hw.cpuCores;
  const update = (patch: Partial<GovernorSettings>) => govRef.update(patch);

  return (
    <section className="mb-8 rounded-md border border-primary/40 bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Resource Governor — sovereign local</h2>
        <span className="text-xs text-muted-foreground">M_max = <strong className="text-foreground">{maxM.toLocaleString()}</strong></span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* RAM */}
        <div>
          <label className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
            <span>RAM budget</span>
            <span className="tabular-nums text-foreground">{ramGB.toFixed(2)} GB</span>
          </label>
          <input
            type="range"
            min={0.25}
            max={ramCeilingBytes / (1024 ** 3)}
            step={0.25}
            value={ramGB}
            onChange={(e) => update({ ramBytes: Number(e.target.value) * (1024 ** 3) })}
            className="mt-2 w-full accent-primary"
          />
          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>host floor: {(hw.ramBytes / (1024 ** 3)).toFixed(1)} GB</span>
            <input
              type="number"
              placeholder="override GB (24, 64, 128…)"
              className="ml-auto w-32 rounded border border-border bg-background px-1 py-0.5 text-[10px]"
              onChange={(e) => {
                const v = Number(e.target.value);
                setRamOverrideGB(Number.isFinite(v) && v > 0 ? v : null);
                if (Number.isFinite(v) && v > 0) update({ ramCeilingBytes: v * (1024 ** 3), ramBytes: Math.min(v * (1024 ** 3), settings.ramBytes) });
              }}
            />
          </div>
        </div>

        {/* CPU */}
        <div>
          <label className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
            <span>CPU threads</span>
            <span className="tabular-nums text-foreground">{settings.cpuThreads} / {cores}</span>
          </label>
          <input
            type="range"
            min={1}
            max={cores}
            step={1}
            value={settings.cpuThreads}
            onChange={(e) => update({ cpuThreads: Number(e.target.value) })}
            className="mt-2 w-full accent-primary"
          />
          <label className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
            <input type="checkbox" checked={settings.coupling} onChange={(e) => update({ coupling: e.target.checked })} />
            ρ* coupling (RAM ↔ cores @ {(settings.rhoBytesPerCore / (1024 ** 3)).toFixed(1)} GB/core)
          </label>
        </div>

        {/* Compute pressure */}
        <div>
          <label className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
            <span>Compute pressure</span>
            <span className="tabular-nums text-foreground">{settings.computePressure.toLocaleString()}×</span>
          </label>
          <input
            type="range"
            min={0}
            max={13}
            step={1}
            value={Math.round(Math.log2(settings.computePressure))}
            onChange={(e) => update({ computePressure: 2 ** Number(e.target.value) })}
            className="mt-2 w-full accent-primary"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">Raises real per-node relaxation work; push this up to make the machine work.</p>
        </div>

        {/* Precision */}
        <div>
          <label className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
            <span>Precision</span>
            <span className="tabular-nums text-foreground">{settings.precision}</span>
          </label>
          <select
            value={settings.precision}
            onChange={(e) => update({ precision: e.target.value as PrecisionMode })}
            className="mt-2 w-full rounded border border-border bg-background px-2 py-1 text-xs"
          >
            {PRECISION_OPTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <p className="mt-1 text-[10px] text-muted-foreground">auto = grow digits as M climbs · f64 = fastest · mpfr = unbounded</p>
        </div>

        {/* Carrier */}
        <div>
          <label className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
            <span>Carrier f₀</span>
            <span className="tabular-nums text-foreground">{settings.carrierHz < 1e6 ? settings.carrierHz.toFixed(2) + " Hz" : settings.carrierHz.toExponential(2) + " Hz"}</span>
          </label>
          <input
            type="range"
            min={1}
            max={Math.log10(CARRIER_CEILING_HZ)}
            step={0.01}
            value={Math.log10(Math.max(1, settings.carrierHz))}
            onChange={(e) => update({ carrierHz: Math.pow(10, Number(e.target.value)) })}
            className="mt-2 w-full accent-primary"
          />
          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
            <button onClick={() => update({ carrierHz: 144 })} className="rounded border border-border px-1.5 py-0.5 hover:bg-muted">144 Hz</button>
            <button onClick={() => update({ carrierHz: 432 })} className="rounded border border-border px-1.5 py-0.5 hover:bg-muted">432</button>
            <button onClick={() => update({ carrierHz: 1e6 })} className="rounded border border-border px-1.5 py-0.5 hover:bg-muted">1 MHz</button>
            <button onClick={() => update({ carrierHz: CARRIER_CEILING_HZ })} className="ml-auto rounded border border-primary px-1.5 py-0.5 text-primary hover:bg-primary/10">Planck max</button>
          </div>
        </div>
      </div>

      <p className="mt-4 text-[10px] text-muted-foreground">
        All settings persist locally (localStorage). No network. Move a slider → engine rebuilds the field at the new ceiling on the next tick.
      </p>
    </section>
  );
}
