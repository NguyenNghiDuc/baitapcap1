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
test("analytics shows the verified account name on each saved exam attempt",async()=>{
 const login=async(email,password)=>{
  const r=await fetch(base+"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
  assert.equal(r.status,200);
  return await r.json();
 };
 const student=await login("hocsinh@demo.vn","Demo1234!");
 const admin=await login("admin@demo.vn","27032006");
 const title="Analytics account attribution "+Date.now();
 const saved=await fetch(base+"/api/results",{method:"POST",
  headers:{"Content-Type":"application/json",Authorization:"Bearer "+student.token},
  body:JSON.stringify({clientSubmissionId:"analytics-"+Date.now(),title,subject:"english",grade:4,score:75,correct:3,total:4,
   accountName:"Fake account name",accountEmail:"fake@example.com"})});
 assert.equal(saved.status,201);
 const anon=await fetch(base+"/api/analytics");assert.equal(anon.status,401);
 const request=async(token)=>{
  const r=await fetch(base+"/api/analytics",{headers:{Authorization:"Bearer "+token}});
  assert.equal(r.status,200);return r.json();
 };
 const own=await request(student.token);
 const ownRow=own.recentResults.find(r=>r.title===title);
 assert.ok(ownRow);
 assert.equal(ownRow.studentName,student.user.name);
 assert.equal(ownRow.studentEmail,student.user.email);
 assert.notEqual(ownRow.studentName,"Fake account name");
 assert.equal(own.scope,"student");
 const all=await request(admin.token);
 assert.equal(all.scope,"all");
 assert.ok(all.recentResults.find(r=>r.title===title&&r.studentName===student.user.name));
});
test("admin-created accounts never grant administrator privileges by role input",async()=>{
 const login=await fetch(base+"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"admin@demo.vn",password:"27032006"})});
 assert.equal(login.status,200);
 const token=(await login.json()).token;
 const email="new-user-"+Date.now()+"@demo.vn";
 const created=await fetch(base+"/api/admin/users",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({name:"Kiểm thử phân quyền",email,password:"User1234!",role:"admin"})});
 assert.equal(created.status,201);
 const account=await created.json();
 assert.equal(account.user.role,"student");
 const signed=await fetch(base+"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password:"User1234!"})});
 assert.equal(signed.status,200);
 const userToken=(await signed.json()).token;
 const forbidden=await fetch(base+"/api/admin/users",{headers:{Authorization:"Bearer "+userToken}});
 assert.equal(forbidden.status,403);
});
test("online/offline presence requires authentication and stays admin-only",async()=>{
 const login=async(email,password)=>{
  const response=await fetch(base+"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
  assert.equal(response.status,200);
  return (await response.json()).token;
 };
 const student=await login("hocsinh@demo.vn","Demo1234!"),admin=await login("admin@demo.vn","27032006");
 const headers=token=>({"Authorization":"Bearer "+token,"Content-Type":"application/json"});
 const session="smoke_presence_session_123456789";
 const body=active=>JSON.stringify({sessionId:session,active});
 const anon=await fetch(base+"/api/presence",{method:"POST",headers:{"Content-Type":"application/json"},body:body(true)});
 assert.equal(anon.status,401);
 const invalid=await fetch(base+"/api/presence",{method:"POST",headers:headers(student),body:JSON.stringify({sessionId:"?",active:true})});
 assert.equal(invalid.status,400);
 const active=await fetch(base+"/api/presence",{method:"POST",headers:headers(student),body:body(true)});
 assert.equal(active.status,200);
 const blocked=await fetch(base+"/api/admin/presence",{headers:headers(student)});
 assert.equal(blocked.status,403);
 const denied=await fetch(base+"/api/admin/presence");assert.equal(denied.status,401);
 const list=await fetch(base+"/api/admin/users",{headers:headers(admin)});
 assert.equal(list.status,200);
 const users=(await list.json()).users;
 const target=users.find(x=>x.email==="hocsinh@demo.vn");
 assert.ok(target?.id);
 assert.equal(target.presence.online,true);
 const status=await fetch(base+"/api/admin/presence?ids="+encodeURIComponent(target.id),{headers:headers(admin)});
 assert.equal(status.status,200);
 const snapshot=await status.json();
 assert.equal(snapshot.available,true);
 assert.equal(snapshot.users[0].online,true);
 assert.ok(snapshot.users[0].lastSeenAt);
 const off=await fetch(base+"/api/presence",{method:"POST",headers:headers(student),body:body(false)});
 assert.equal(off.status,200);
 const offline=await fetch(base+"/api/admin/presence?ids="+encodeURIComponent(target.id),{headers:headers(admin)});
 assert.equal((await offline.json()).users[0].online,false);
});
test("admin lock blocks active user APIs until account is unlocked",async()=>{
 const adminLogin=await fetch(base+"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"admin@demo.vn",password:"27032006"})});
 assert.equal(adminLogin.status,200);
 const token=(await adminLogin.json()).token;
 const userLogin=await fetch(base+"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"hocsinh@demo.vn",password:"Demo1234!"})});
 assert.equal(userLogin.status,200);
 const studentToken=(await userLogin.json()).token;
 const list=await fetch(base+"/api/admin/users",{headers:{Authorization:"Bearer "+token}});
 const users=(await list.json()).users;
 const student=users.find(u=>u.email==="hocsinh@demo.vn");
 assert.ok(student?.id);
 const owner=users.find(u=>u.email==="admin@demo.vn");
 const selfLock=await fetch(base+"/api/admin/users/"+encodeURIComponent(owner.id),{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({locked:true})});
 assert.equal(selfLock.status,403);
 const lock=await fetch(base+"/api/admin/users/"+encodeURIComponent(student.id),{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({locked:true,reason:"Kiểm tra khóa"})});
 assert.equal(lock.status,200);
 const blocked=await fetch(base+"/api/classes",{headers:{Authorization:"Bearer "+studentToken}});
 assert.equal(blocked.status,423);
 const unlock=await fetch(base+"/api/admin/users/"+encodeURIComponent(student.id),{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({locked:false})});
 assert.equal(unlock.status,200);
 const again=await fetch(base+"/api/classes",{headers:{Authorization:"Bearer "+studentToken}});
 assert.equal(again.status,200);
});

test("Admin can see another account's submitted scores, but students cannot",async()=>{
 const headers={"Content-Type":"application/json"};
 const login=async(email,password)=>{
  const r=await fetch(base+"/api/login",{method:"POST",headers,body:JSON.stringify({email,password})});
  assert.equal(r.status,200);
  return (await r.json()).token;
 };
 const admin=await login("admin@demo.vn","27032006");
 const student=await login("hocsinh@demo.vn","Demo1234!");
 const uniq="Diem tu cham "+Date.now();
 const result=await fetch(base+"/api/results",{method:"POST",headers:{...headers,Authorization:"Bearer "+student},body:JSON.stringify({clientSubmissionId:"test-gradebook-"+Date.now(),title:uniq,subject:"english",grade:4,score:75,correct:3,total:4,durationSec:45})});
 assert.equal(result.status,201);
 const own=await result.json();assert.equal(own.result.verified,false);
 const anonymous=await fetch(base+"/api/admin/results");assert.equal(anonymous.status,401);
 const forbidden=await fetch(base+"/api/admin/results",{headers:{Authorization:"Bearer "+student}});assert.equal(forbidden.status,403);
 const adminResponse=await fetch(base+"/api/admin/results?search="+encodeURIComponent(uniq)+"&subject=english&grade=4",{headers:{Authorization:"Bearer "+admin}});
 assert.equal(adminResponse.status,200);const data=await adminResponse.json();
 assert.ok(data.results.find(x=>x.title===uniq&&x.owner.email==="hocsinh@demo.vn"&&x.score===75));
 assert.equal(data.results[0].verified,false);
 const hidden=await fetch(base+"/api/admin/results?search="+encodeURIComponent(uniq)+"&subject=math",{headers:{Authorization:"Bearer "+admin}});
 assert.equal((await hidden.json()).pagination.total,0);
});
test("admin user and storage APIs are protected and functional",async()=>{
  const login=await fetch(base+"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"admin@demo.vn",password:"27032006"})});
  const lj=await login.json(),token=lj.token;
  const users=await fetch(base+"/api/admin/users",{headers:{Authorization:"Bearer "+token}});
  assert.equal(users.status,200);assert.ok((await users.json()).users.length>=4);
  const health=await fetch(base+"/api/storage/health",{headers:{Authorization:"Bearer "+token}});
  assert.equal(health.status,200);const h=await health.json();assert.equal(h.postgres.enabled,false);assert.equal(h.redis.enabled,false);
});

test("app version endpoint reports current release",async()=>{const r=await fetch(base+"/api/app/version");assert.equal(r.status,200);const j=await r.json();assert.equal(j.version,"4.1.3")});

test("teacher can configure student exam times",async()=>{
  const anon=await fetch(base+"/api/exam-settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dailyMin:25})});
  assert.equal(anon.status,401);
  const login=await fetch(base+"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"giaovien@demo.vn",password:"Demo1234!"})});
  const lj=await login.json(),token=lj.token;
  const set=await fetch(base+"/api/exam-settings",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({dailyMin:30,grade4Min:50,grade5Min:70})});
  assert.equal(set.status,200);const sj=await set.json();assert.equal(sj.settings.dailyMin,30);assert.equal(sj.settings.grade4Min,50);assert.equal(sj.settings.grade5Min,70);
  const over=await fetch(base+"/api/exam-settings",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({examId:"term-g4-s1-p1-math-v1",minutes:35})});
  assert.equal(over.status,200);assert.equal((await over.json()).settings.overrides["term-g4-s1-p1-math-v1"],35);
  const get=await fetch(base+"/api/exam-settings");assert.equal(get.status,200);const gj=await get.json();assert.equal(gj.settings.dailyMin,30);assert.equal(gj.settings.overrides["term-g4-s1-p1-math-v1"],35);
});
