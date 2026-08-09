import { FractalNodeEngine } from "../fractal_node_engine.ts";
function mk(parallel){ const e=new FractalNodeEngine({ target_scale:292, max_depth:7, hardware_adaptive:false, parallel }); e.initialize(); return e; }
function nodes(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}
function maxDiffField(ra,rb,pick){const a=nodes(ra),b=nodes(rb);let md=0;for(let i=0;i<a.length;i++){const fa=pick(a[i]),fb=pick(b[i]);if(!fa||!fb)continue;for(let k=0;k<fa.length;k++){const d=Math.abs(fa[k]-fb[k]);if(d>md)md=d;}}return md;}
const a=mk(false), b=mk(true);
for(let t=0;t<3;t++){
  a._tick_count++; b._tick_count++;
  await a._computeAll(); await b._computeAll();
  const fDiff=maxDiffField(a._root_node,b._root_node,n=>n.state.field_state);
  const pDiff=maxDiffField(a._root_node,b._root_node,n=>n._previousField);
  console.log(`tick ${t} after compute: field=${fDiff} prevField=${pDiff}`);
}
if(b._parallel) await b._parallel.shutdown();
