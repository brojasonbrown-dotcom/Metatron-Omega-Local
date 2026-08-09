import { FractalNodeEngine } from "../fractal_node_engine.ts";
function mk(d,par){const e=new FractalNodeEngine({target_scale:292,hardware_adaptive:false,max_depth:d,target_resource_usage:0.9,governor_warmup_ticks:999,parallel:par,parallel_force_serial:!par});e.initialize();return e;}
function idx(r){const o=[r];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}
let lastP=null;
for (const depth of [6]) {
  const s=mk(depth,false), p=mk(depth,true); lastP=p;
  await s.tick(); await p.tick();
  const a=s.get_state().root_node, b=p.get_state().root_node;
  let d=0,wk=-1; for(let k=0;k<28;k++){const dd=Math.abs(a.state.field_state[k]-b.state.field_state[k]); if(dd>d){d=dd;wk=k;}}
  console.log(`depth ${depth} single tick: root maxDiff=${d.toExponential(3)} field[${wk}] coh diff=${Math.abs(a.state.coherence-b.state.coherence).toExponential(3)}`);
  const la=idx(a), lb=idx(b); let lm=0,li=-1;
  for(let i=0;i<la.length;i++) if(la[i].children.length===0){for(let k=0;k<28;k++){const dd=Math.abs(la[i].state.field_state[k]-lb[i].state.field_state[k]); if(dd>lm){lm=dd;li=i;}}}
  console.log(`  leaf maxDiff=${lm.toExponential(3)} at leaf-node ${li}`);
}
await lastP._parallel?.shutdown?.();
