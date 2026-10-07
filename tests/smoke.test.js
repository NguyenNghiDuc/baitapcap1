const test=require("node:test"),assert=require("node:assert/strict"),{spawn}=require("node:child_process");
const PORT=34567,base="http://127.0.0.1:"+PORT;
let child,stderr="";
test.before(async()=>{child=spawn(process.execPath,["server.js"],{env:{...process.env,PORT:String(PORT),SEED_DEMO:"1"},stdio:["ignore","pipe","pipe"]});child.stderr?.on("data",d=>stderr+=d.toString());for(let i=0;i<50;i++){try{const r=await fetch(base+"/");if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw new Error("server did not start\n"+stderr)});
test.after(()=>child?.kill());
test("serves homepage",async()=>{const r=await fetch(base+"/");assert.equal(r.status,200);assert.match(await r.text(),/Bài Tập Cấp 1/)});
test("integration status is public and JSON",async()=>{const r=await fetch(base+"/api/integrations");assert.equal(r.status,200);const j=await r.json();assert.equal(typeof j.google,"boolean");assert.equal(typeof j.ai,"boolean")});
test("protected API rejects anonymous user",async()=>{const r=await fetch(base+"/api/classes");assert.equal(r.status,401)});
test("demo login works when seeded",async()=>{const r=await fetch(base+"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"hocsinh@demo.vn",password:"Demo1234!"})});assert.equal(r.status,200);const j=await r.json();assert.ok(j.token);assert.equal(j.user.role,"student")});

test("teacher can import question CSV and create exam room",async()=>{
  const login=await fetch(base+"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"giaovien@demo.vn",password:"Demo1234!"})});
  assert.equal(login.status,200);const lj=await login.json(),token=lj.token;
  const csv="grade,lessonId,level,q,A,B,C,D,answer,explain\n4,g4-mul,Dễ,12 x 5 bang bao nhieu?,50,60,70,80,B,12 x 5 = 60";
  const imp=await fetch(base+"/api/questions/import-excel",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({filename:"questions.csv",dataUrl:"data:text/csv;base64,"+Buffer.from(csv).toString("base64")})});
  assert.equal(imp.status,201);assert.equal((await imp.json()).count,1);
  const room=await fetch(base+"/api/exam-rooms",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({title:"Thi Toan 4",grade:4,lessonId:"g4-mul",durationMin:45})});
  assert.equal(room.status,201);const rj=await room.json();assert.match(rj.room.code,/^[A-F0-9]{6}$/);
});
test("student result can be exported to xlsx",async()=>{
  const login=await fetch(base+"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"hocsinh@demo.vn",password:"Demo1234!"})});
  const lj=await login.json(),token=lj.token;
  const saved=await fetch(base+"/api/results",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({subject:"math",grade:4,title:"Nhan so tu nhien",score:90,correct:27,total:30,durationSec:1200,wrongQuestionIds:[1,2,3]})});
  assert.equal(saved.status,201);
  const out=await fetch(base+"/api/export/results.xlsx",{headers:{Authorization:"Bearer "+token}});
  assert.equal(out.status,200);assert.match(out.headers.get("content-type"),/spreadsheetml/);assert.ok((await out.arrayBuffer()).byteLength>100);
});
test("admin user and storage APIs are protected and functional",async()=>{
  const login=await fetch(base+"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"admin@demo.vn",password:"Demo1234!"})});
  const lj=await login.json(),token=lj.token;
  const users=await fetch(base+"/api/admin/users",{headers:{Authorization:"Bearer "+token}});
  assert.equal(users.status,200);assert.ok((await users.json()).users.length>=4);
  const health=await fetch(base+"/api/storage/health",{headers:{Authorization:"Bearer "+token}});
  assert.equal(health.status,200);const h=await health.json();assert.equal(h.postgres.enabled,false);assert.equal(h.redis.enabled,false);
});

test("app version endpoint reports 3.0.0",async()=>{const r=await fetch(base+"/api/app/version");assert.equal(r.status,200);const j=await r.json();assert.equal(j.version,"3.1.1")});

test("teacher can configure student exam times",async()=>{
  const anon=await fetch(base+"/api/exam-settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dailyMin:25})});
  assert.equal(anon.status,401);
  const login=await fetch(base+"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"giaovien@demo.vn",password:"Demo1234!"})});
  const lj=await login.json(),token=lj.token;
  const set=await fetch(base+"/api/exam-settings",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({dailyMin:30,grade4Min:50,grade5Min:70})});
  assert.equal(set.status,200);const sj=await set.json();assert.equal(sj.settings.dailyMin,30);assert.equal(sj.settings.grade4Min,50);assert.equal(sj.settings.grade5Min,70);
  const over=await fetch(base+"/api/exam-settings",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({examId:"term-g4-s1-p1-v1",minutes:35})});
  assert.equal(over.status,200);assert.equal((await over.json()).settings.overrides["term-g4-s1-p1-v1"],35);
  const get=await fetch(base+"/api/exam-settings");assert.equal(get.status,200);const gj=await get.json();assert.equal(gj.settings.dailyMin,30);assert.equal(gj.settings.overrides["term-g4-s1-p1-v1"],35);
});
