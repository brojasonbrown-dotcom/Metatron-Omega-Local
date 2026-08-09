import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
import { FIELD_SIZE, ROW_SIZE } from "../parallel/layout.ts";
function strip(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);for(const n of o){n._memoryComputes=[];n._frameworkComputes=[];}}
function build(D){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);return r;}
function sb(n){for(const c of n.children)sb(c);n.compute();}
function idx(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}

const D=7;
const rootS=build(D),rootP=build(D);
strip(rootS);strip(rootP);
const nodesS=idx(rootS);
const pe=new ParallelEngine({targetScale:292,maxDepth:D,poolSize:12});
// capture dbg messages
const dbgLog=[];
const origOn = pe; // hook into workers after initialize
await pe.initialize(rootP);
for (const w of pe._workers) {
  w.on("message",(m)=>{ if(m?.type==="dbg" && (m.index<=2)) dbgLog.push(m); });
}
for(let t=0;t<3;t++){ sb(rootS); await pe.computeTick();
  const sf=nodesS[2].state.field_state; const base=2*ROW_SIZE;
  let md=0; for(let k=0;k<FIELD_SIZE;k++)md=Math.max(md,Math.abs(sf[k]-pe._flat.fields[base+k]));
  console.log(`tick ${t}: node2 maxDiff=${md}  serial node2[0]=${sf[0].toFixed(5)} sab=${pe._flat.fields[base].toFixed(5)}`);
}
console.log("--- worker dbg for nodes 0..2 ---");
for(const m of dbgLog) console.log(`  idx=${m.index} depth=${m.depth} prev0=${m.prev0===null?'null':m.prev0.toFixed(5)} out0=${m.out0.toFixed(5)}`);
await pe.shutdown();
