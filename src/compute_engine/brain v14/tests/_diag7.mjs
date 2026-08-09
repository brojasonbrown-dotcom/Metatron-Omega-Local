import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
import { FIELD_SIZE, ROW_SIZE } from "../parallel/layout.ts";
function strip(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);for(const n of o){n._memoryComputes=[];n._frameworkComputes=[];}}
function build(D){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);return r;}
function sb(n){for(const c of n.children)sb(c);n.compute();}
function idx(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}

for (const D of [1,3,7]) {
  const rootS=build(D),rootP=build(D);
  strip(rootS);strip(rootP);
  const nodesS=idx(rootS);
  const pe=new ParallelEngine({targetScale:292,maxDepth:D,poolSize:1});
  await pe.initialize(rootP);
  for(let t=0;t<8;t++){ sb(rootS); await pe.computeTick(); }
  let maxF=0,wi=-1;
  for(let i=0;i<nodesS.length;i++){const sf=nodesS[i].state.field_state;const base=i*ROW_SIZE;
    for(let k=0;k<FIELD_SIZE;k++){const d=Math.abs(sf[k]-pe._flat.fields[base+k]);if(d>maxF){maxF=d;wi=i;}}}
  console.log(`depth ${D} (pool=1, FORCED parallel): nodes=${nodesS.length} isParallel=${pe.isParallel} maxDiff=${maxF} at ${wi}`);
  await pe.shutdown();
}
