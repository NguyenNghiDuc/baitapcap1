"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const handler=require("../routes/admin-backup");
const {statusFrom}=handler;
async function invoke(options={}){
 let result=null,roles=null,queryCalled=false;
 const user=options.user??null;
 const ctx={
  send:(_res,status,body,headers)=>{result={status,body,headers}},
  requireUser:async(_req,_res,allowed)=>{
   roles=allowed;
   if(!user){result={status:401,body:{error:"login"}};return null}
   if(user.role!=="admin"){result={status:403,body:{error:"forbidden"}};return null}
   return user;
  },
  pg:{health:async()=>{queryCalled=true;return {enabled:true}}},
  storage:{status:()=>({mode:"supabase"})}
 };
 const handled=await handler({method:options.method||"GET"},{},options.path||"/api/admin/backup/status",ctx);
 return {handled,result,roles,queryCalled};
}
test("backup API is invisible to guests and non-admin users",async()=>{
 const none=await invoke();
 assert.equal(none.result.status,401);
 const student=await invoke({user:{id:"student",role:"student"}});
 assert.equal(student.result.status,403);
 const other=await invoke({path:"/api/admin/other"});
 assert.equal(other.handled,false);
});
test("even an Admin cannot view backup readiness without matching root Auth UID",async()=>{
 const old=process.env.ADMIN_SUPABASE_UID;process.env.ADMIN_SUPABASE_UID="auth-owner-uid";
 try{
  const denied=await invoke({user:{id:"admin-other",role:"admin",authUserId:"other-uid"}});
  assert.equal(denied.result.status,403);
  assert.equal(denied.queryCalled,false);
  assert.equal(denied.result.headers["Cache-Control"],"private, no-store");
 }finally{if(old===undefined)delete process.env.ADMIN_SUPABASE_UID;else process.env.ADMIN_SUPABASE_UID=old}
});
test("owner sees only readiness booleans, no passphrase, URLs or student data",async()=>{
 const keys=["ADMIN_SUPABASE_UID","DATABASE_URL","BACKUP_PASSPHRASE","VERCEL"];
 const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{
  process.env.ADMIN_SUPABASE_UID="auth-owner-uid";process.env.DATABASE_URL="postgres://private-token:password@example.invalid/app";
  process.env.BACKUP_PASSPHRASE="not-for-user-visible-output";process.env.VERCEL="1";
  const owner={id:"owner",role:"admin",authUserId:"auth-owner-uid"};
  const r=await invoke({user:owner});
  assert.equal(r.result.status,200);assert.deepEqual(r.roles,["admin"]);
  assert.equal(r.result.body.manualBackupReady,false);
  assert.equal(r.result.body.environment.serverless,true);
  assert.equal(r.result.body.database.healthy,true);
  assert.equal(r.result.body.snapshotEncryption.configured,true);
  assert.equal(r.result.headers["Cache-Control"],"private, no-store");
  const text=JSON.stringify(r.result.body);
  assert.equal(text.includes("not-for-user-visible-output"),false);
  assert.equal(text.includes("private-token"),false);
  assert.equal(text.includes("example.invalid"),false);
  const invalid=await invoke({user:owner,method:"POST"});
  assert.equal(invalid.result.status,405);assert.equal(invalid.result.headers.Allow,"GET");
 }finally{
  for(const k of keys)if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];
 }
});
test("readiness does not claim a full offsite backup exists",()=>{
 const s=statusFrom({databaseConfigured:true,databaseHealthy:true,encryptionConfigured:true,isVercel:false,storageMode:"supabase"});
 assert.equal(s.manualBackupReady,true);
 assert.equal(s.scope,"app_state_only");assert.equal(s.fullBackupVerified,false);
 assert.equal(s.lastBackupAt,null);
});
