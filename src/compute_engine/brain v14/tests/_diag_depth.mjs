import { FractalNodeEngine } from "../fractal_node_engine.ts";
async function run(parallel, depth, ticks){
  const e=new FractalNodeEngine({ target_scale:292, max_depth:depth, hardware_adaptive:false, parallel });
  e.initialize();
  const track=[];
  for(let t=0;t<ticks;t++){ await e.tick(); track.push(`${e._treeDepth}/${e._parallel?e._parallel.isParallel:'-'}`); }
  return {e,track};
}
for(const parallel of [false,true]){
  const {e,track}=await run(parallel,7,12);
  console.log(`parallel=${parallel}: depth/isParallel per tick: ${track.join(' ')}`);
  if(e._parallel) await e._parallel.shutdown();
}
