import { FractalNodeEngine } from "../fractal_node_engine.ts";
function mk(parallel,depth){ const e=new FractalNodeEngine({ target_scale:292, max_depth:depth, hardware_adaptive:false, parallel }); e.initialize(); return e; }
function fields(root){const out=[];const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);
  for(const n of o){out.push(...n.state.field_state,n.state.coherence,n.state.energy_density);}return out;}
function diff(ra,rb){const a=fields(ra),b=fields(rb);let md=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d>md)md=d;}return md;}
let allPass=true;
for(const depth of [6,7]){
  const a=mk(false,depth), b=mk(true,depth);
  let worst=0;
  // Replicate tick() compute+stabilize (the field-mutating stages), NO governor rescale.
  for(let t=0;t<15;t++){
    a._tick_count++; b._tick_count++;
    a.interdimensional_flow.advance_iteration(); b.interdimensional_flow.advance_iteration();
    await a._computeAll(); await b._computeAll();
    a._stabilizeAll(a._root_node); b._stabilizeAll(b._root_node);
    if(b._parallel && b._parallel.isParallel) b._parallel.syncSabFromNodes();
    worst=Math.max(worst,diff(a._root_node,b._root_node));
  }
  const pass=worst===0; allPass=allPass&&pass;
  console.log(`depth ${depth} PINNED (15 ticks, no governor): worst maxDiff=${worst}  ${pass?'PASS':'FAIL'}`);
  if(b._parallel) await b._parallel.shutdown();
}
console.log(allPass?"PINNED EQUIVALENCE: ALL PASS":"FAIL");
