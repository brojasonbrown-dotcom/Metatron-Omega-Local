import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
import { FIELD_SIZE } from "../parallel/layout.ts";
function strip(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);for(const n of o){n._memoryComputes=[];n._frameworkComputes=[];}}
function build(D){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);return r;}
function sb(n){for(const c of n.children)sb(c);n.compute();}
function idx(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}
const D=7;
for (const pool of [1,2,4,12]) {
  const rootS=build(D),rootP=build(D);
  strip(rootS);strip(rootP);
  const nodesS=idx(rootS), nodesP=idx(rootP);
  const pe=new ParallelEngine({targetScale:292,maxDepth:D,poolSize:pool});
  await pe.initialize(rootP);
  let maxDiff=0;
  for(let t=0;t<3;t++){
    sb(rootS); await pe.computeTick(); pe.commitToNodes();
    for(let i=0;i<nodesS.length;i++){
      const sf=nodesS[i].state.field_state, pf=nodesP[i].state.field_state;
      for(let k=0;k<FIELD_SIZE;k++){const d=Math.abs(sf[k]-pf[k]); if(d>maxDiff)maxDiff=d;}
    }
  }
  console.log(`pool=${pool}: isParallel=${pe.isParallel} maxDiff=${maxDiff}`);
  await pe.shutdown();
}
