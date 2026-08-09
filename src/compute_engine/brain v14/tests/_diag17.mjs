import { Worker } from "node:worker_threads";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const sab = new SharedArrayBuffer(8*4);
const f = new Float64Array(sab);
f[0]=111.111; f[1]=222.222;
const workerPath = join(dirname(fileURLToPath(import.meta.url)), "../parallel/node_worker.ts");
// We can't easily reuse node_worker (it runs its own loop). Instead spawn a tiny inline worker via eval.
const w = new Worker(`const {parentPort,workerData}=require("node:worker_threads"); const arr=new Float64Array(workerData.sab); parentPort.postMessage({a:arr[0],b:arr[1],isShared:workerData.sab instanceof SharedArrayBuffer}); arr[0]=999.999;`, {eval:true, workerData:{sab}});
await new Promise(r=>w.once("message",(m)=>{console.log("worker saw:",m); r();}));
await new Promise(r=>setTimeout(r,50));
console.log("main sees f[0] after worker write:", f[0], "(999.999 => truly shared; 111.111 => copied)");
await w.terminate();
