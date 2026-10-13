"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const handle=require("../routes/admin-audit");
async function request(pathname,opts={}){
 let sent=null,required=null;
 const req={method:opts.method||"GET",url:pathname};
 const send=(res,code,payload,headers)=>{sent={code,payload,headers};};
 const requireUser=async(req,res,roles)=>{
  required=roles;
  if(!opts.authorized){send(res,401,{error:"Bạn cần đăng nhập"});return null}
  return {id:"test-admin",role:"admin"};
 };
 const ctx={send,requireUser,load:()=>opts.db||{users:[],audit:[]},pg:opts.pg||{query:async()=>({rows:[]})}};
 const handled=await handle(req,{},pathname.split("?")[0],ctx);
 return {handled,sent,required};
}
test("Admin audit API rejects unauthenticated access before touching the database",async()=>{
 const r=await request("/api/admin/audit");
 assert.equal(r.handled,true);assert.equal(r.sent.code,401);assert.deepEqual(r.required,["admin"]);
});
test("Admin audit API is read-only and keeps metadata private",async()=>{
 const db={users:[{id:"u1",name:"Giáo viên"}],
  audit:[{id:"1",userId:"u1",action:"user_updated",at:"2026-10-13T04:00:00Z",meta:{secret:"NEVER_SEND"}},{id:"2",userId:"u2",action:"admin_granted",at:"2026-10-12T04:00:00Z",meta:{email:"private@example.com"}}]};
 const r=await request("/api/admin/audit?page=1&limit=1&search=user",{authorized:true,db});
 assert.equal(r.sent.code,200);assert.equal(r.sent.payload.pagination.total,1);
 assert.equal(r.sent.payload.events.length,1);
 assert.equal(r.sent.payload.events[0].action,"user_updated");
 assert.equal(r.sent.payload.events[0].actorName,"Giáo viên");
 assert.equal(JSON.stringify(r.sent.payload).includes("NEVER_SEND"),false);
 assert.equal(JSON.stringify(r.sent.payload).includes("private@example.com"),false);
 assert.equal(r.sent.headers["Cache-Control"],"private, no-store");
 const write=await request("/api/admin/audit",{authorized:true,method:"POST",db});
 assert.equal(write.sent.code,405);
});
test("PostgreSQL audit search uses parameterized bounded pagination",async()=>{
 const original=process.env.DATABASE_URL;process.env.DATABASE_URL="postgresql://unit-test.invalid/db";
 const queries=[];
 try{
  const r=await request("/api/admin/audit?page=999999&limit=9999&search=admin",{authorized:true,pg:{
   async query(sql,params){
    queries.push({sql,params});
    return /count\(\*\)/.test(sql)?{rows:[{total:1}]}:{rows:[{id:"a",action:"admin_granted",userId:"uid",actorName:"Admin",at:"2026-10-12T04:00:00Z",meta:{secret:"no"}}]};
   }
  }});
  assert.equal(r.sent.code,200);
  assert.equal(r.sent.payload.events.length,1);
  assert.equal(r.sent.payload.pagination.limit,50);
  assert.equal(r.sent.payload.pagination.page,10000);
  assert.equal(queries.length,2);
  assert.equal(queries[0].params[0],"admin");
  assert.equal(queries[1].params[1],50);
  assert.equal(queries[1].params[2],(10000-1)*50);
  assert.equal(JSON.stringify(r.sent.payload).includes("secret"),false);
 }finally{if(original===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=original}
});
test("Admin audit frontend is lazy, role-restricted and independently styled",()=>{
 const base=path.join(__dirname,"..");
 const read=p=>fs.readFileSync(path.join(base,p),"utf8");
 const app=read("js/app.js"),loader=read("js/perf/loader.js"),html=read("index.html"),server=read("server.js"),js=read("js/admin/audit-log.js");
 for(const marker of ['adminAudit:["/js/admin/audit-log.js"]'])assert.ok(loader.includes(marker));
 assert.ok(app.includes('adminAudit:async()=>window.AdminAudit?.render(state.user)'));
 assert.ok(app.includes('window.AdminAudit?.bind(toast,render)'));
 assert.ok(html.includes('class="admin-only" href="#adminAudit"'));
 assert.ok(loader.includes('adminAudit:["/css/admin-console.css","/css/admin-audit.css"]'));
 assert.equal(html.includes('href="css/admin-audit.css"'),false);
 assert.ok(server.includes('handleAdminAudit(req,res,p,{send,requireUser,load,pg:pgStore})'));
 assert.ok(js.includes('if(user?.role!=="admin")'));
});
