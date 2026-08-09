import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { computeNodeShared } from "../parallel/node_compute.ts";
import { FIELD_SIZE } from "../parallel/layout.ts";
function strip(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);for(const n of o){n._memoryComputes=[];n._frameworkComputes=[];}}
function build(D,doStrip){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);if(doStrip)strip(r);return r;}
function idx(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}
function sb(n){for(const c of n.children)sb(c);n.compute();}
const D=7;
// Serial: stripped (matches the test serial tree).
const rootS=build(D,true);
sb(rootS);
const nodesS=idx(rootS);
// Worker emulation: buildAndOwnTree does NOT strip. Emulate its compute over a SAB map.
const rootW=build(D,false);
const nodesW=idx(rootW);
const committed=new Map();
for(const n of nodesW) committed.set(n,new Float64Array(n.state.field_state));
const byDepth=[...nodesW].sort((a,b)=>b.get_depth()-a.get_depth());
for(const n of byDepth){
  const childFields=n.children.map(c=>committed.get(c));
  const ref={scale:n.scale,_membrane:n._membrane,_previousField:n._previousField,
    _frameworkComputes:n._frameworkComputes,_memoryComputes:n._memoryComputes,currentField:committed.get(n)};
  const out=computeNodeShared(ref,childFields);
  n._previousField=new Float64Array(committed.get(n));
  committed.set(n,out.field);
}
// Check framework/memory counts on a node
console.log(`worker node0: fw=${nodesW[0]._frameworkComputes.length} mem=${nodesW[0]._memoryComputes.length}`);
console.log(`serial node0: fw=${nodesS[0]._frameworkComputes.length} mem=${nodesS[0]._memoryComputes.length}`);
let maxDiff=0,wi=-1;
for(let i=0;i<nodesS.length;i++){
  const sf=nodesS[i].state.field_state,pf=committed.get(nodesW[i]);
  for(let k=0;k<FIELD_SIZE;k++){const d=Math.abs(sf[k]-pf[k]); if(d>maxDiff){maxDiff=d;wi=i;}}
}
console.log(`worker-emulation(no strip) vs serial(strip): maxDiff=${maxDiff} worstNode=${wi}`);
