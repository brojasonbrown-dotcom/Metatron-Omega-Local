import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
import { FIELD_SIZE } from "../parallel/layout.ts";
function strip(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);for(const n of o){n._memoryComputes=[];n._frameworkComputes=[];}}
function build(D){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);return r;}
function sb(n){for(const c of n.children)sb(c);n.compute();}
function idx(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}
const D=7;
const rootS=build(D),rootP=build(D);
strip(rootS);strip(rootP);
const nodesS=idx(rootS), nodesP=idx(rootP);
const pe=new ParallelEngine({targetScale:292,maxDepth:D,poolSize:12});
await pe.initialize(rootP);
for(let t=0;t<2;t++){
  sb(rootS); await pe.computeTick(); pe.commitToNodes();
  console.log(`--- tick ${t} ---`);
  let shown=0;
  for(let i=0;i<nodesS.length && shown<8;i++){
    const sf=nodesS[i].state.field_state,pf=nodesP[i].state.field_state;
    let md=0; for(let k=0;k<FIELD_SIZE;k++){const d=Math.abs(sf[k]-pf[k]); if(d>md)md=d;}
    if(md>0){console.log(` node${i} d=${nodesS[i].get_depth()} nchild=${nodesS[i].children.length} serial[0]=${sf[0].toFixed(5)} par[0]=${pf[0].toFixed(5)} maxDiff=${md.toFixed(5)}`); shown++;}
  }
  if(shown===0) console.log(" (no divergence this tick)");
}
await pe.shutdown();
