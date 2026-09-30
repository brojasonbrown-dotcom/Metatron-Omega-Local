import type { FieldSnapshot } from "@/core/bus/protocol";

// Fibonacci shell boundaries (|k| ≤ Fₙ).
const SHELLS: { name: string; bound: number; tag: string }[] = [
  { name: "core",        bound: 13,   tag: "F₇ — 27-node Metatron core" },
  { name: "memory",      bound: 89,   tag: "F₁₁ — memory cortex" },
  { name: "superpos.",   bound: 144,  tag: "F₁₂ — V10 superposition shell" },
  { name: "honest f64",  bound: 233,  tag: "F₁₃ — f64 ULP wall" },
  { name: "extended",    bound: 610,  tag: "F₁₅ — 60-digit BigDecimal wall" },
  { name: "workstation", bound: 17711,tag: "F₂₂ — 24 GB target" },
  { name: "cluster",     bound: 832040,tag:"F₃₀ — distributed target" },
];

export function ShellsPanel({ snapshot }: { snapshot: FieldSnapshot }) {
  const kMax = snapshot.spiral?.kMax ?? snapshot.scaler.currentM;
  const ceiling = snapshot.scaler.honestCeiling;
  return (
    <section className="mb-8 rounded-md border border-border bg-card p-4">
      <h2 className="mb-3 text-sm uppercase tracking-widest text-muted-foreground">
        Fibonacci shells — RHUFT topology
      </h2>
      <div className="space-y-1.5">
        {SHELLS.map((s) => {
          const reached = kMax >= s.bound;
          const reachable = ceiling >= s.bound;
          const fillPct = Math.min(100, (kMax / s.bound) * 100);
          return (
            <div key={s.name} className="flex items-center gap-3 text-xs">
              <span className="w-24 shrink-0 text-muted-foreground">{s.name}</span>
              <span className="w-16 shrink-0 tabular-nums text-right">{s.bound.toLocaleString()}</span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-sm bg-muted">
                <div
                  className={"absolute inset-y-0 left-0 " + (reached ? "bg-primary" : reachable ? "bg-primary/40" : "bg-destructive/40")}
                  style={{ width: fillPct + "%" }}
                />
              </div>
              <span className="w-44 shrink-0 truncate text-[10px] text-muted-foreground">{s.tag}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground">
        Solid bar = currently active rungs reach this shell · faded = reachable at current M_max but not active · red = blocked by precision/RAM. Raise RAM or precision in the Governor to unlock farther shells.
      </p>
    </section>
  );
}
