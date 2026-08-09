import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
import { FIELD_SIZE } from "../parallel/layout.ts";
function build(D){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);return r;}
function idx(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}
function sb(n){for(const c of n.children)sb(c);n.compute();}
const D=7;
const rootS=build(D),rootP=build(D);
const nodesS=idx(rootS), nodesP=idx(rootP);
const pe=new ParallelEngine({targetScale:292,maxDepth:D,poolSize:12});
await pe.initialize(rootP);
let md=0;
for(let t=0;t<10;t++){
  sb(rootS); await pe.computeTick(); pe.commitToNodes();
  let d0=0;
  for(let i=0;i<nodesS.length;i++){
    const sf=nodesS[i].state.field_state,pf=nodesP[i].state.field_state;
    for(let k=0;k<FIELD_SIZE;k++){const dd=Math.abs(sf[k]-pf[k]); if(dd>d0)d0=dd;}
  }
  md=Math.max(md,d0);
}
console.log(`DIRECT ParallelEngine (no engine), 10 ticks, depth 7: maxDiff = ${md}`);
console.log(md===0 ? "PASS: parallel compute is exactly bit-identical" : `eps=${md}`);
await pe.shutdown();
