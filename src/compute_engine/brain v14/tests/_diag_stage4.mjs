import { FractalNodeEngine } from "../fractal_node_engine.ts";
function mk(parallel){ const e=new FractalNodeEngine({ target_scale:292, max_depth:7, hardware_adaptive:false, parallel }); e.initialize(); return e; }
function fields(root){const out=[];const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);
  for(const n of o){out.push(...n.state.field_state);}return out;}
function diff(ra,rb){const a=fields(ra),b=fields(rb);let md=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d>md)md=d;}return md;}
const a=mk(false), b=mk(true);
for(let t=0;t<5;t++){
  a._tick_count++; b._tick_count++;
  a.interdimensional_flow.advance_iteration(); b.interdimensional_flow.advance_iteration();
  await a._computeAll(); await b._computeAll();
  const afterCompute=diff(a._root_node,b._root_node);
  a._stabilizeAll(a._root_node); b._stabilizeAll(b._root_node);
  const afterStab=diff(a._root_node,b._root_node);
  a._propagateFlows(); b._propagateFlows();
  const afterFlows=diff(a._root_node,b._root_node);
  console.log(`tick ${t}: compute=${afterCompute} stabilize=${afterStab} flows=${afterFlows}`);
}
if(b._parallel) await b._parallel.shutdown();
