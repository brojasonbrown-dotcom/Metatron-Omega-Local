import { FractalNodeEngine } from "../fractal_node_engine.ts";
async function run(parallel, ticks){
  const e=new FractalNodeEngine({ target_scale:292, max_depth:7, hardware_adaptive:false, parallel });
  e.initialize();
  const snaps=[];
  for(let t=0;t<ticks;t++){ await e.tick(); snaps.push({depth:e._treeDepth, nodes:count(e._root_node)}); }
  return {e,snaps};
}
function count(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o.length;}
function fields(e){const out=[];const o=[e._root_node];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);
  for(const n of o){out.push(...n.state.field_state,n.state.coherence,n.state.energy_density);}return out;}
const a=await run(false,5), b=await run(true,5);
console.log("serial snaps:", JSON.stringify(a.snaps));
console.log("parallel snaps:", JSON.stringify(b.snaps));
const fs=fields(a.e), fp=fields(b.e);
if(fs.length!==fp.length){console.log(`LENGTH MISMATCH serial=${fs.length} parallel=${fp.length} -> trees diverged in depth`);}
let md=0,mi=-1; for(let i=0;i<Math.min(fs.length,fp.length);i++){const d=Math.abs(fs[i]-fp[i]); if(d>md){md=d;mi=i;}}
console.log(`maxDiff=${md} at flat index ${mi}`);
if(b.e._parallel) await b.e._parallel.shutdown();
