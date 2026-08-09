import { FractalNodeEngine } from "../fractal_node_engine.ts";
function mk(parallel){ const e=new FractalNodeEngine({ target_scale:292, max_depth:7, hardware_adaptive:false, parallel }); e.initialize(); return e; }
function nodes(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}
function fDiff(ra,rb){const a=nodes(ra),b=nodes(rb);let md=0;for(let i=0;i<a.length;i++){const fa=a[i].state.field_state,fb=b[i].state.field_state;for(let k=0;k<fa.length;k++){const d=Math.abs(fa[k]-fb[k]);if(d>md)md=d;}}return md;}
for(const CALL_ADVANCE of [false,true]){
  const a=mk(false), b=mk(true);
  let worst=0;
  for(let t=0;t<4;t++){
    a._tick_count++; b._tick_count++;
    if(CALL_ADVANCE){ a.interdimensional_flow.advance_iteration(); b.interdimensional_flow.advance_iteration(); }
    await a._computeAll(); await b._computeAll();
    worst=Math.max(worst,fDiff(a._root_node,b._root_node));
  }
  console.log(`CALL_ADVANCE=${CALL_ADVANCE}: worst field diff after compute = ${worst}`);
  if(b._parallel) await b._parallel.shutdown();
}
