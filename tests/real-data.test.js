const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const route=require("../routes/real-data");
function request({url,method="GET",role="student"}){
 let output=null,called=[];
 const ctx={
  send:(_,status,payload)=>{output={status,payload}},
  requireUser:async(_,__,roles)=>roles&&!roles.includes(role)?null:{id:"user-verified",role},
  monitor:{error:()=>{}},
  pg:{
   accountActivity:async id=>{called.push(["activity",id]);return {total:{attempts:3,average:80},subjects:[],days:[],recent:[],submissions:2,unreadNotifications:1}},
   listNotifications:async id=>{called.push(["notices",id]);return [{id:"notice-owned",title:"Bài mới"}]},
   markNotification:async(id,item)=>{called.push(["read",id,item]);return item==="notice-owned"},
   listDevices:async id=>{called.push(["devices",id]);return [{device_id:"btdev_1234567890123",device:"iPhone",browser:"Safari",ip:"203.0.113.4",first_seen_at:"2026-10-10",last_seen_at:"2026-10-10"}]},
   adminGrades:async filters=>{called.push(["grades",filters]);return {results:[{id:"real-db-result",student_name:"Học sinh thật",score:82,verified:false}],summary:{total:1,verified:0,unverified:1},pagination:{page:filters.page,limit:25,total:1,pages:1}}},
   adminLive:async()=>({users:{total:9,locked:2},roles:[],results:{total:3},submissions:7}),
   adminAudit:async()=>[],recentClientErrors:async()=>[]
  }
 };
 return {req:{method:method,url,headers:{"x-client-device-id":"btdev_1234567890123"}},res:{},url,ctx,get result(){return output},called};
}
async function run(x){
 const before=process.env.DATABASE_URL;process.env.DATABASE_URL="postgresql://test-invalid/never-connected";
 try{await route(x.req,x.res,x.url,x.ctx);return x.result}
 finally{if(before===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=before}
}
test("all personal insights use verified user ID, no client-supplied user IDs",async()=>{
 const x=request({url:"/api/real/me/activity"});
 const v=await run(x);
 assert.equal(v.status,200);assert.equal(v.payload.source,"postgres");assert.equal(v.payload.activity.total.attempts,3);
 assert.deepEqual(x.called,[["activity","user-verified"]]);
});
test("notifications and private devices are scoped to signed-in owner",async()=>{
 const x=request({url:"/api/real/me/devices"});const v=await run(x);
 assert.equal(v.status,200);assert.equal(v.payload.devices[0].current,true);assert.deepEqual(x.called,[["devices","user-verified"]]);
 const y=request({url:"/api/real/me/notifications/notice-owned/read",method:"PATCH"});assert.equal((await run(y)).status,200);
 const z=request({url:"/api/real/me/notifications/someone-elses/read",method:"PATCH"});assert.equal((await run(z)).status,404);
});
test("Admin monitoring requires Admin role and real database",async()=>{
 const x=request({url:"/api/real/admin/dashboard",role:"admin"});
 assert.equal((await run(x)).payload.stats.users.locked,2);
 const y=request({url:"/api/real/admin/dashboard",role:"student"});
 assert.equal((await run(y))===null,true);assert.equal(y.result,null);
 const noDb=request({url:"/api/real/me/activity"});
 const old=process.env.DATABASE_URL;delete process.env.DATABASE_URL;
 try{await route(noDb.req,noDb.res,noDb.url,noDb.ctx);assert.equal(noDb.result.status,503)}
 finally{if(old!==undefined)process.env.DATABASE_URL=old}
});
test("real-data migration revokes client privileges and blocks locked Supabase actors",()=>{
 const root=path.join(__dirname,"..");
 const m=fs.readFileSync(path.join(root,"db/migrations/007_real_account_data.sql"),"utf8");
 const rls=fs.readFileSync(path.join(root,"db/migrations/008_locked_accounts_rls.sql"),"utf8");
 const pg=fs.readFileSync(path.join(root,"lib/postgres.js"),"utf8");
 assert.match(m,/CREATE TABLE IF NOT EXISTS login_devices/);
 assert.match(m,/CREATE TABLE IF NOT EXISTS client_error_events/);
 assert.match(rls,/app_actor_active/);
 assert.match(rls,/REVOKE UPDATE ON public.users FROM authenticated/);
 assert.match(rls,/REVOKE INSERT,UPDATE ON public.results FROM authenticated/);
 assert.doesNotMatch(pg,/role=EXCLUDED.role,grade=EXCLUDED.grade/);
 for(const f of ["pg-public-backup.js","pg-public-restore.js"])assert.ok(fs.existsSync(path.join(root,"scripts",f)));
});

test("Admin can browse real result scores with safe filtering",async()=>{
 const a=request({url:"/api/real/admin/grades?grade=4&subject=math&status=unverified&search=An&page=2",role:"admin"});
 const result=await run(a);
 assert.equal(result.status,200);assert.equal(result.payload.source,"postgres");
 assert.equal(result.payload.results[0].score,82);
 assert.deepEqual(a.called,[["grades",{grade:4,subject:"math",status:"unverified",search:"An",page:2}]]);
});
test("Grade records cannot be listed by a non-admin role",async()=>{
 const x=request({url:"/api/real/admin/grades",role:"student"});
 await run(x);assert.deepEqual(x.called,[]);
 assert.equal(x.result,null);
});
test("Grade filters reject invalid grade, subject and large search inputs",async()=>{
 for(const url of ["/api/real/admin/grades?grade=9","/api/real/admin/grades?subject=unknown","/api/real/admin/grades?status=official","/api/real/admin/grades?page=-1","/api/real/admin/grades?search="+("x".repeat(81))]){
  const x=request({url,role:"admin"});
  const result=await run(x);
  assert.equal(result.status,400,url);
  assert.deepEqual(x.called,[],url);
 }
});
