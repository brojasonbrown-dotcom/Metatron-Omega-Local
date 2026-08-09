import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
import { FIELD_SIZE } from "../parallel/layout.ts";
function build(D){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);return r;}
function idx(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}
function sb(n){for(const c of n.children)sb(c);n.compute();}
let allPass=true;
for (const D of [6,7]) {
  // NO strip — both engines keep their active framework+memory computes,
  // exactly as the production engine runs them.
  const rootS=build(D),rootP=build(D);
  const nodesS=idx(rootS), nodesP=idx(rootP);
  const pe=new ParallelEngine({targetScale:292,maxDepth:D,poolSize:12});
  await pe.initialize(rootP);
  let maxDiff=0,maxCoh=0,maxEng=0;
  for(let t=0;t<5;t++){
    sb(rootS); await pe.computeTick(); pe.commitToNodes();
    for(let i=0;i<nodesS.length;i++){
      const sf=nodesS[i].state.field_state,pf=nodesP[i].state.field_state;
      for(let k=0;k<FIELD_SIZE;k++){const d=Math.abs(sf[k]-pf[k]); if(d>maxDiff)maxDiff=d;}
      maxCoh=Math.max(maxCoh,Math.abs(nodesS[i].state.coherence-nodesP[i].state.coherence));
      maxEng=Math.max(maxEng,Math.abs(nodesS[i].state.energy_density-nodesP[i].state.energy_density));
    }
  }
  const pass = maxDiff===0 && maxCoh===0 && maxEng===0;
  allPass = allPass && pass;
  console.log(`depth ${D} (parallel=${pe.isParallel}): field=${maxDiff} coherence=${maxCoh} energy=${maxEng}  ${pass?'PASS':'FAIL'}`);
  await pe.shutdown();
}
console.log(allPass ? "ALL PASS (true equivalence, frameworks active)" : "SOME FAIL");
