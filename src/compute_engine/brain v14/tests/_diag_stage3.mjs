import { FractalNodeEngine } from "../fractal_node_engine.ts";
function mk(parallel){ const e=new FractalNodeEngine({ target_scale:292, max_depth:7, hardware_adaptive:false, parallel }); e.initialize(); return e; }
function fields(root){const out=[];const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);
  for(const n of o){out.push(...n.state.field_state);}return out;}
const a=mk(false), b=mk(true);
for(let t=0;t<5;t++){
  // Drive ONLY the compute stage (no stabilize/flows/resonance/governor).
  a._tick_count++; await a._computeAll();
  b._tick_count++; await b._computeAll();
  const fs=fields(a._root_node), fp=fields(b._root_node);
  let md=0; for(let i=0;i<fs.length;i++){const d=Math.abs(fs[i]-fp[i]); if(d>md)md=d;}
  console.log(`tick ${t} after _computeAll only: maxDiff(field)=${md}`);
}
if(b._parallel) await b._parallel.shutdown();
