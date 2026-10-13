"use strict";
// Read-only smoke checks; safe to run against a freshly deployed Vercel URL.
const assert=require("node:assert/strict");
const base=process.env.POST_DEPLOY_URL||process.argv[2]||"http://127.0.0.1:3000";
let origin;
try{origin=new URL(base);assert.ok(["https:","http:"].includes(origin.protocol));}
catch{console.error("POST_DEPLOY_URL phải là URL HTTP(S) hợp lệ.");process.exit(1)}
const timeout=Number(process.env.SMOKE_TIMEOUT_MS||8000);
async function get(path){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
 try{const r=await fetch(new URL(path,origin),{signal:ctrl.signal,redirect:"follow",headers:{"Accept":"text/html,application/json,*/*","Cache-Control":"no-cache"}});
  return {status:r.status,body:await r.text(),type:r.headers.get("content-type")||""}}
 finally{clearTimeout(timer)}
}
(async()=>{
 const checks=[
  {path:"/",check:r=>r.status===200&&r.body.includes("Bài Tập Cấp 1")},
  {path:"/api/app/version",check:r=>r.status===200&&JSON.parse(r.body).version},
  {path:"/api/health",check:r=>r.status===200&&JSON.parse(r.body).ok===true},
  {path:"/js/app.js",check:r=>r.status===200&&r.body.includes("AppAuthBridge")},
  {path:"/css/style.css",check:r=>r.status===200&&r.body.includes("sidebar")}
 ];
 let failed=0;
 for(const c of checks){try{const r=await get(c.path),ok=!!c.check(r);console.log((ok?"PASS ":"FAIL ")+c.path+" (HTTP "+r.status+")");if(!ok)failed++}
 catch(e){failed++;console.error("FAIL "+c.path+": "+e.message)}}
 if(failed)process.exitCode=2;
 else console.log("Smoke test: tất cả "+checks.length+" bước đều thành công.");
})().catch(e=>{console.error(e);process.exitCode=2});
