import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
import { FIELD_SIZE, ROW_SIZE } from "../parallel/layout.ts";
function strip(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);for(const n of o){n._memoryComputes=[];n._frameworkComputes=[];}}
function build(D){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);return r;}
function idx(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}
const D=6;
const rootP=build(D); strip(rootP);
const nodesP=idx(rootP);
const pe=new ParallelEngine({targetScale:292,maxDepth:D,poolSize:12});
await pe.initialize(rootP);
console.log(`isParallel=${pe.isParallel} (expect false for depth 6)`);
let worst=0;
for(let t=0;t<3;t++){
  await pe.computeTick();
  let md=0;
  for(let i=0;i<nodesP.length;i++){
    const live=nodesP[i].state.field_state; const base=i*ROW_SIZE;
    for(let k=0;k<FIELD_SIZE;k++){const d=Math.abs(live[k]-pe._flat.fields[base+k]); if(d>md)md=d;}
  }
  worst=Math.max(worst,md);
  console.log(`tick ${t}: max |live - SAB| = ${md}`);
}
console.log(worst===0 ? "PASS: SAB mirrors live nodes in serial fallback" : "FAIL");
await pe.shutdown();
