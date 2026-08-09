import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { computeNodeShared } from "../parallel/node_compute.ts";
import { FIELD_SIZE } from "../parallel/layout.ts";
function strip(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);for(const n of o){n._memoryComputes=[];n._frameworkComputes=[];}}
function build(D){const m=new ScaleMapper();const r=FractalNode.createAtScale(292,null,m);const b=(n)=>{if(n.get_depth()>=D)return;n.create_children();for(const c of n.children)b(c);};b(r);return r;}
function idx(root){const o=[root];for(let h=0;h<o.length;h++)for(const c of o[h].children)o.push(c);return o;}
const D=7;
const root=build(D); strip(root);
const nodes=idx(root);
// Compute the WHOLE tree bottom-up via computeNodeShared (SAB-free), feeding
// child fields from a local map — emulate exactly what a single worker does.
const committed = new Map(); // index -> field array
for (const n of nodes) committed.set(n, new Float64Array(n.state.field_state)); // seed
function refFor(n){
  return { scale: n.scale, _membrane: n._membrane, _previousField: n._previousField,
    _frameworkComputes: n._frameworkComputes, _memoryComputes: n._memoryComputes,
    currentField: committed.get(n) };
}
// bottom-up: process deepest first
const byDepth=[...nodes].sort((a,b)=>b.get_depth()-a.get_depth());
const prevFields=new Map();
for(const n of nodes) prevFields.set(n, n._previousField? new Float64Array(n._previousField):null);
for(const n of byDepth){
  const childFields = n.children.map(c=>committed.get(c));
  const out = computeNodeShared(refFor(n), childFields);
  // emulate worker commit: prevField <- old row, row <- new field
  prevFields.set(n, new Float64Array(committed.get(n)));
  committed.set(n, out.field);
  n._previousField = prevFields.get(n); // so refFor reads updated prev next tick
}
// Now compare against a fresh serial build
const rootS=build(D); strip(rootS);
function sb(n){for(const c of n.children)sb(c);n.compute();}
sb(rootS);
const nodesS=idx(rootS);
let maxDiff=0, wi=-1;
for(let i=0;i<nodesS.length;i++){
  const sf=nodesS[i].state.field_state; const pf=committed.get(nodes[i]);
  for(let k=0;k<FIELD_SIZE;k++){const d=Math.abs(sf[k]-pf[k]); if(d>maxDiff){maxDiff=d;wi=i;}}
}
console.log(`tick0 single-threaded emulation: maxDiff=${maxDiff} worstNode=${wi} depth=${wi>=0?nodes[wi].get_depth():-1}`);
