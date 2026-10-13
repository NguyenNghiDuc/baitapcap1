"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const handler=require("../routes/admin-integrity");
const {scan,summary,expectedMigrations}=handler;
const REQUIRED=["users","results","submissions","classes","app_state","schema_migrations","question_bank"];
function simulatedQuery({missing=[],bad=[],pending=[],failed=[]}={}){
 const calls=[];
 async function query(sql){
  calls.push(sql);
  if(failed.some(f=>sql.includes(f)))throw Error("private SQL error includes credentials");
  if(sql.startsWith("SELECT to_regclass")){
   const row=Object.fromEntries(REQUIRED.map(t=>[t,!missing.includes(t)]));
   return {rows:[row]};
  }
  if(sql.includes("SELECT version FROM schema_migrations")){
   const versions=expectedMigrations().filter(x=>!pending.includes(x));
   return {rows:[{version:"001_initial"},...versions.map(version=>({version}))]};
  }
  if(sql.startsWith("SELECT id FROM app_state"))return {rows:[{id:1}]};
  if(sql.includes("AS detected")){
   return {rows:[{detected:bad.some(x=>sql.includes(x))}]};
  }
  throw Error("Unexpected query");
 }
 return {query,calls};
}
test("without PostgreSQL, do not claim checks passed or make any queries",async()=>{
 let touched=false;
 const r=await scan({databaseConfigured:false,query:async()=>{touched=true;throw Error("should not run")}});
 assert.equal(touched,false);assert.equal(r.healthy,false);assert.equal(r.complete,false);
 assert.equal(r.counts.unavailable,1);assert.equal(r.checks[0].id,"database");
});
test("valid metadata and values produce readonly, sanitized diagnostic summary",async()=>{
 const db=simulatedQuery(),r=await scan({databaseConfigured:true,query:db.query});
 assert.equal(r.healthy,true);assert.equal(r.complete,true);
 assert.equal(r.counts.problem,0);assert.equal(r.counts.warning,0);assert.equal(r.counts.unavailable,0);
 assert.equal(r.migrations.pending,0);assert.equal(r.checks.length,REQUIRED.length+1+4+1);
 assert.ok(db.calls.every(sql=>/^(SELECT)/.test(sql)),db.calls.join(";"));
 assert.equal(JSON.stringify(r).includes("private SQL"),false);
});
test("missing tables skip dependent queries instead of reporting fake passes",async()=>{
 const db=simulatedQuery({missing:["results","schema_migrations","app_state"]});
 const r=await scan({databaseConfigured:true,query:db.query});
 assert.equal(r.complete,false);assert.equal(r.healthy,false);assert.equal(r.counts.problem,3);
 assert.ok(r.checks.some(x=>x.id==="result_ranges"&&x.state==="unavailable"));
 assert.ok(r.checks.some(x=>x.id==="orphan_results"&&x.state==="unavailable"));
 assert.ok(r.checks.some(x=>x.id==="migration_status"&&x.state==="unavailable"));
 assert.equal(db.calls.some(sql=>sql.includes("FROM results")),false);
});
test("invalid scores and migration drift are marked as problems and warnings",async()=>{
 const first=expectedMigrations()[0];
 const db=simulatedQuery({bad:["FROM results WHERE","FROM submissions WHERE"],pending:first?[first]:[]});
 const r=await scan({databaseConfigured:true,query:db.query});
 assert.equal(r.healthy,false);
 assert.ok(r.checks.some(x=>x.id==="result_ranges"&&x.state==="problem"));
 assert.ok(r.checks.some(x=>x.id==="submission_ranges"&&x.state==="problem"));
 if(first)assert.ok(r.checks.some(x=>x.id==="migration_status"&&x.state==="warning"));
});
test("failed SQL query cannot leak error strings or be classified as healthy",async()=>{
 const db=simulatedQuery({failed:["FROM submissions WHERE"]});
 const r=await scan({databaseConfigured:true,query:db.query});
 assert.equal(r.healthy,false);assert.equal(r.complete,false);
 assert.ok(r.checks.some(x=>x.id==="submission_ranges"&&x.state==="unavailable"));
 assert.equal(JSON.stringify(r).includes("private SQL error"),false);
});
async function invoke({user,method="GET",database=false,pg}={}){
 let output=null,accessChecked=null;
 const req={method,url:"/api/admin/integrity"};
 const ctx={
  send:(_res,status,payload,headers)=>{output={status,payload,headers}},
  requireUser:async(_req,_res,roles)=>{
   accessChecked=roles;
   if(!user){output={status:401,payload:{error:"unauthorized"}};return null}
   if(user.role!=="admin"){output={status:403,payload:{error:"forbidden"}};return null}
   return user;
  },pg:pg||{query:async()=>{throw Error("should not query")}}
 };
 const previous=process.env.DATABASE_URL;
 try{
  if(database)process.env.DATABASE_URL="postgres://mocked.invalid/db";else delete process.env.DATABASE_URL;
  const handled=await handler(req,{},req.url,ctx);
  return {handled,output,accessChecked};
 }finally{if(previous===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previous}
}
test("Admin API requires server-side role, allows only GET and is never cacheable",async()=>{
 const guest=await invoke();
 assert.equal(guest.output.status,401);assert.deepEqual(guest.accessChecked,["admin"]);
 const student=await invoke({user:{id:"student",role:"student"}});
 assert.equal(student.output.status,403);
 const admin=await invoke({user:{id:"admin",role:"admin"}});
 assert.equal(admin.output.status,200);
 assert.equal(admin.output.headers["Cache-Control"],"private, no-store");
 const denied=await invoke({user:{id:"admin",role:"admin"},method:"DELETE"});
 assert.equal(denied.output.status,405);
 assert.equal(denied.output.headers.Allow,"GET");
});
