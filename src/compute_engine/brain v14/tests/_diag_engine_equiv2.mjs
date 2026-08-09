import { FractalNodeEngine } from "../fractal_node_engine.ts";
async function run(parallel, ticks){
  const e=new FractalNodeEngine({ target_scale:292, max_depth:7, hardware_adaptive:false, parallel });
  e.initialize();
  for(let t=0;t<ticks;t++) await e.tick();
  return e;
}
function fields(e){
  const out=[]; const o=[e._root_node];
  for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);
  for(const n of o){out.push(...n.state.field_state, n.state.coherence, n.state.energy_density);}
  return out;
}
const es=await run(false,5);
const ep=await run(true,5);
const nS=(()=>{const o=[es._root_node];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o.length;})();
const par = ep._parallel ? ep._parallel.isParallel : "n/a";
const fs=fields(es), fp=fields(ep);
let md=0; for(let i=0;i<fs.length;i++){const d=Math.abs(fs[i]-fp[i]); if(d>md)md=d;}
console.log(`nodes=${nS} parallelEngaged=${par} values=${fs.length}`);
console.log(`FractalNodeEngine serial vs parallel, 5 ticks, depth 7: maxDiff = ${md}`);
console.log(md===0 ? "PRODUCTION PATH PASS" : "PRODUCTION PATH FAIL");
if(ep._parallel) await ep._parallel.shutdown();
