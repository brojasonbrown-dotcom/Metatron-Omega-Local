import { FractalNodeEngine } from "../fractal_node_engine.ts";
async function run(parallel, depth, ticks){
  const e=new FractalNodeEngine({ target_scale:292, max_depth:depth, hardware_adaptive:false, parallel });
  e.initialize();
  for(let t=0;t<ticks;t++) await e.tick();
  return e;
}
function fields(e){const out=[];const o=[e._root_node];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);
  for(const n of o){out.push(...n.state.field_state,n.state.coherence,n.state.energy_density);}return out;}
let allPass=true;
for(const [depth,ticks] of [[6,12],[7,12]]){
  const a=await run(false,depth,ticks), b=await run(true,depth,ticks);
  const fs=fields(a), fp=fields(b);
  let md=0; for(let i=0;i<fs.length;i++){const d=Math.abs(fs[i]-fp[i]); if(d>md)md=d;}
  const pass = md===0; allPass=allPass&&pass;
  console.log(`depth ${depth}, ${ticks} ticks (parallel=${b._parallel?b._parallel.isParallel:'n/a'}): maxDiff=${md}  ${pass?'PASS':'FAIL'}`);
  if(b._parallel) await b._parallel.shutdown();
}
console.log(allPass?"ALL GATES PASS":"SOME GATE FAILED");
