import { FractalNodeEngine } from "../fractal_node_engine.ts";
function mk(parallel){ const e=new FractalNodeEngine({ target_scale:292, max_depth:7, hardware_adaptive:false, parallel }); e.initialize(); return e; }
function nodes(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}
function fDiff(ra,rb){const a=nodes(ra),b=nodes(rb);let md=0;for(let i=0;i<a.length;i++){const fa=a[i].state.field_state,fb=b[i].state.field_state;for(let k=0;k<fa.length;k++){const d=Math.abs(fa[k]-fb[k]);if(d>md)md=d;}}return md;}
const a=mk(false), b=mk(true);
// initial (post-initialize, before any tick)
console.log(`after initialize: field diff = ${fDiff(a._root_node,b._root_node)}`);
for(let t=0;t<4;t++){
  // Manually replicate tick() stages, checking field after each.
  a._tick_count++; b._tick_count++;
  a.interdimensional_flow.advance_iteration(); b.interdimensional_flow.advance_iteration();
  await a._computeAll(); await b._computeAll();
  const c1=fDiff(a._root_node,b._root_node);
  a._stabilizeAll(a._root_node); b._stabilizeAll(b._root_node);
  const c2=fDiff(a._root_node,b._root_node);
  a._propagateFlows(); b._propagateFlows();
  const c3=fDiff(a._root_node,b._root_node);
  a.interdimensional_flow.prune(1); b.interdimensional_flow.prune(1);
  const res_a=a.resonance_finder.find_resonance(a._root_node), res_b=b.resonance_finder.find_resonance(b._root_node);
  const c4=fDiff(a._root_node,b._root_node);
  console.log(`tick ${t}: compute=${c1} stabilize=${c2} flows=${c3} resonance=${c4}`);
}
if(b._parallel) await b._parallel.shutdown();
