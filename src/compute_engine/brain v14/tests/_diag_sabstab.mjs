import { FractalNodeEngine } from "../fractal_node_engine.ts";
import { FIELD_SIZE, ROW_SIZE } from "../parallel/layout.ts";
function mk(parallel){ const e=new FractalNodeEngine({ target_scale:292, max_depth:7, hardware_adaptive:false, parallel }); e.initialize(); return e; }
function nodes(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}
const a=mk(false), b=mk(true);
const an=nodes(a._root_node), bn=nodes(b._root_node);
for(let t=0;t<2;t++){
  a._tick_count++; b._tick_count++;
  a.interdimensional_flow.advance_iteration(); b.interdimensional_flow.advance_iteration();
  await a._computeAll(); await b._computeAll();       // parallel: workers write SAB + commitToNodes
  a._stabilizeAll(a._root_node); b._stabilizeAll(b._root_node);  // serial relaxes field in place
  // After stabilize: does the SAB still hold the PRE-stabilize field for the parallel engine?
  let sabVsLive=0;
  for(let i=0;i<bn.length;i++){
    const live=bn[i].state.field_state; const base=i*ROW_SIZE;
    for(let k=0;k<FIELD_SIZE;k++){const d=Math.abs(live[k]-b._parallel._flat.fields[base+k]); if(d>sabVsLive)sabVsLive=d;}
  }
  console.log(`tick ${t}: parallel SAB vs live node field (post-stabilize) maxDiff = ${sabVsLive}`);
}
if(b._parallel) await b._parallel.shutdown();
