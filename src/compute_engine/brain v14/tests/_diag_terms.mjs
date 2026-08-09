import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
import { FIELD_SIZE, ROW_SIZE } from "../parallel/layout.ts";
function strip(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);for(const n of o){n._memoryComputes=[];n._frameworkComputes=[];}}
function build(D){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);return r;}
function sb(n){for(const c of n.children)sb(c);n.compute();}
function idx(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}
const D=3;
const rootS=build(D),rootP=build(D);
strip(rootS);strip(rootP);
const nodesS=idx(rootS);
const pe=new ParallelEngine({targetScale:292,maxDepth:D,poolSize:12});
await pe.initialize(rootP);
for(let t=0;t<3;t++){
  sb(rootS); await pe.computeTick();
  console.log(`--- tick ${t} ---`);
  for(let i=0;i<nodesS.length;i++){
    const sf=nodesS[i].state.field_state; const base=i*ROW_SIZE;
    let md=0,mi=0; for(let k=0;k<FIELD_SIZE;k++){const d=Math.abs(sf[k]-pe._flat.fields[base+k]); if(d>md){md=d;mi=k;}}
    console.log(` node${i} d=${nodesS[i].get_depth()} prev=${nodesS[i]._previousField?('Y '+nodesS[i]._previousField[0].toFixed(4)):'null'} serial[0]=${sf[0].toFixed(4)} sab[0]=${pe._flat.fields[base].toFixed(4)} maxDiff=${md.toFixed(5)}@k${mi}`);
  }
}
await pe.shutdown();
