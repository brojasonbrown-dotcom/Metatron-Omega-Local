import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
import { FIELD_SIZE, ROW_SIZE } from "../parallel/layout.ts";
function strip(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);for(const n of o){n._memoryComputes=[];n._frameworkComputes=[];}}
function build(D){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);return r;}
function sb(n){for(const c of n.children)sb(c);n.compute();}
function idx(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}

for (const D of [3,4,5,6,7]) {
  const rootS=build(D),rootP=build(D);
  strip(rootS);strip(rootP);
  const nodesS=idx(rootS);
  const pe=new ParallelEngine({targetScale:292,maxDepth:D,poolSize:12});
  await pe.initialize(rootP);
  let maxDiff=0;
  const TICKS=5;
  for(let t=0;t<TICKS;t++){
    sb(rootS); await pe.computeTick();
    for(let i=0;i<nodesS.length;i++){
      const sf=nodesS[i].state.field_state; const base=i*ROW_SIZE;
      for(let k=0;k<FIELD_SIZE;k++){const d=Math.abs(sf[k]-pe._flat.fields[base+k]); if(d>maxDiff)maxDiff=d;}
    }
  }
  console.log(`depth ${D}: nodes=${nodesS.length} maxDiff over ${TICKS} ticks = ${maxDiff}`);
  await pe.shutdown();
}
