const test=require("node:test"),assert=require("node:assert/strict"),{spawn}=require("node:child_process");
const PORT=34567,base="http://127.0.0.1:"+PORT;
let child;
test.before(async()=>{child=spawn(process.execPath,["server.js"],{env:{...process.env,PORT:String(PORT),SEED_DEMO:"1"},stdio:"ignore"});for(let i=0;i<30;i++){try{const r=await fetch(base+"/");if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw new Error("server did not start")});
test.after(()=>child?.kill());
test("serves homepage",async()=>{const r=await fetch(base+"/");assert.equal(r.status,200);assert.match(await r.text(),/Bài Tập Cấp 1/)});
test("integration status is public and JSON",async()=>{const r=await fetch(base+"/api/integrations");assert.equal(r.status,200);const j=await r.json();assert.equal(typeof j.google,"boolean");assert.equal(typeof j.ai,"boolean")});
test("protected API rejects anonymous user",async()=>{const r=await fetch(base+"/api/classes");assert.equal(r.status,401)});
test("demo login works when seeded",async()=>{const r=await fetch(base+"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"hocsinh@demo.vn",password:"Demo1234!"})});assert.equal(r.status,200);const j=await r.json();assert.ok(j.token);assert.equal(j.user.role,"student")});
