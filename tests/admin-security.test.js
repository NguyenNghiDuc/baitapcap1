"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const route=require("../routes/admin-security");
const {privileges}=route;
function req(path,opts={}){
 let output=null,calledRoles=null;
 const u=opts.user||null,db=opts.db||{loginDevices:[]};
 const ctx={
  requireUser:async(_req,_res,roles)=>{
   calledRoles=roles;
   if(!u){output={status:401,body:{error:"Cần đăng nhập"}};return null}
   if(roles&&!roles.includes(u.role)){output={status:403,body:{error:"Không có quyền"}};return null}
   return u
  },
  send:(_res,status,body,headers)=>{output={status,body,headers}},
  load:()=>db,storage:{status:()=>({mode:"supabase"})}
 };
 const request={url:path,method:opts.method||"GET",headers:{"x-client-device-id":opts.deviceId||"btdev_current123456789","user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0"},socket:{remoteAddress:"127.0.0.1"}};
 return route(request,{},path,ctx).then(handled=>({handled,output,calledRoles}));
}
test("security routes reject anonymous callers and non-Admin roles",async()=>{
 const a=await req("/api/account/devices");assert.equal(a.output.status,401);
 const b=await req("/api/admin/security",{user:{id:"student",role:"student"}});
 assert.equal(b.output.status,403);assert.deepEqual(b.calledRoles,["admin"]);
 const c=await req("/api/public-config",{user:{id:"student",role:"student"}});
 assert.equal(c.handled,false);
});
test("owner sees only own devices; no device IDs or session tokens are returned",async()=>{
 const db={loginDevices:[
  {userId:"owner",deviceId:"btdev_current123456789",device:"iPhone",browser:"Safari",ip:"203.0.113.5",firstSeenAt:"2026-01-01T00:00:00Z",lastSeenAt:"2026-01-02T00:00:00Z",token:"PRIVATE"},
  {userId:"other",deviceId:"btdev_other1234567890",device:"Windows",browser:"Chrome",ip:"198.51.100.10",firstSeenAt:"2026-01-01T00:00:00Z",lastSeenAt:"2026-01-02T00:00:00Z"}
 ]};
 const r=await req("/api/account/devices",{user:{id:"owner",role:"student"},db});
 assert.equal(r.output.status,200);assert.equal(r.output.body.devices.length,1);
 assert.equal(r.output.body.devices[0].current,true);
 assert.equal(r.output.body.devices[0].device,"iPhone");assert.equal(r.output.body.devices[0].ip,"203.0.113.5");
 assert.equal(r.output.body.devices[0].deviceId,undefined);
 assert.equal(JSON.stringify(r.output.body).includes("198.51.100.10"),false);
 assert.equal(JSON.stringify(r.output.body).includes("PRIVATE"),false);
 assert.equal(r.output.headers["Cache-Control"],"private, no-store");
});
test("Admin rights depend on matching configured Supabase owner UID, not email",async()=>{
 const old=process.env.ADMIN_SUPABASE_UID;process.env.ADMIN_SUPABASE_UID="auth-real-owner";
 try{
  const a=privileges({id:"u1",role:"admin",authUserId:"auth-real-owner"});
  const b=privileges({id:"u2",role:"admin",authUserId:"auth-other",email:"owner@example.test"});
  assert.equal(a.isOwner,true);assert.equal(a.capabilities.grantAdmin,true);
  assert.equal(b.isOwner,false);assert.equal(b.capabilities.grantAdmin,false);
  assert.equal(b.capabilities.editOtherAdmins,false);
  const res=await req("/api/admin/security",{user:{id:"u2",role:"admin",authUserId:"auth-other"}});
  assert.equal(res.output.status,200);assert.equal(res.output.body.permissions.title,"Admin được cấp quyền");
  assert.equal(res.output.body.permissions.capabilities.viewAudit,true);
  assert.equal(res.output.body.permissions.capabilities.grantAdmin,false);
 }finally{if(old===undefined)delete process.env.ADMIN_SUPABASE_UID;else process.env.ADMIN_SUPABASE_UID=old}
});
test("device and security endpoints are GET only and return no-store",async()=>{
 const r=await req("/api/admin/security",{user:{id:"u",role:"admin"},method:"DELETE"});
 assert.equal(r.output.status,405);assert.equal(r.output.headers["Allow"],"GET");
 assert.equal(r.output.headers["Cache-Control"],"private, no-store");
});
