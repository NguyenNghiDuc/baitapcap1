"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {activeObservations,findObservation,history,validateDecision,decide}=require("../lib/admin-device-reviews");
const route=require("../routes/admin-device-reviews");
const user={id:"admin",role:"admin"};
const makeDb=()=>({users:[{id:"u1",name:"Minh Anh",role:"student"},{id:"u2",name:"Lan",role:"student"}],
 loginDevices:[
  {userId:"u1",deviceId:"device-private-1",device:"iPhone",browser:"Safari",ip:"203.0.113.7",
   firstSeenAt:new Date().toISOString(),lastSeenAt:new Date().toISOString()},
  {userId:"u2",deviceId:"device-private-2",device:"Windows",browser:"Chrome",ip:"198.51.100.9",
   firstSeenAt:new Date().toISOString(),lastSeenAt:new Date().toISOString()}
 ],deviceSecurityReviews:[],audit:[]});
function audit(db,u,action,meta){const entry={id:"audit-"+db.audit.length,userId:u.id,action,meta,at:new Date().toISOString()};db.audit.push(entry);return entry}
test("Observation IDs are opaque, stable and do not expose private device identifiers",()=>{
 const db=makeDb(),d=db.loginDevices[0],items=activeObservations(d);
 assert.equal(items.length,1);
 assert.match(items[0].id,/^[a-f0-9]{64}$/);
 assert.equal(activeObservations(d)[0].id,items[0].id);
 assert.ok(!JSON.stringify(items).includes("device-private-1"));
 assert.ok(!JSON.stringify(items).includes("203.0.113.7"));
 assert.equal(findObservation(db,items[0].id).userId,"u1");
});
test("Admin decision stores one immutable review with audit and no raw IP",()=>{
 const db=makeDb(),observationId=activeObservations(db.loginDevices[0])[0].id;
 const decision=validateDecision({observationId,status:"reviewed",reason:"Đã đối chiếu thông tin tài khoản"});
 const out=decide(db,user,decision,audit);
 assert.equal(out.status,201);
 assert.equal(db.deviceSecurityReviews.length,1);
 assert.equal(db.audit.length,1);
 assert.equal(db.audit[0].action,"device_observation_review_decided");
 assert.equal(db.audit[0].meta.type,"new-device");
 assert.equal(db.deviceSecurityReviews[0].reviewerId,"admin");
 assert.equal(db.deviceSecurityReviews[0].userId,"u1");
 assert.equal(JSON.stringify(db.deviceSecurityReviews).includes("203.0.113.7"),false);
 assert.equal(JSON.stringify(db.deviceSecurityReviews).includes("device-private-1"),false);
 const dupe=decide(db,user,decision,audit);
 assert.equal(dupe.status,409);
 assert.equal(db.deviceSecurityReviews.length,1);
 assert.equal(db.audit.length,1);
 assert.equal(history(db,{userId:"u1"}).reviews[0].reason,decision.reason);
 assert.equal(history(db,{userId:"u2"}).pagination.total,0);
});
test("Review refuses stale observations, invalid decisions and avoids automatic account locking",()=>{
 const db=makeDb(),id=activeObservations(db.loginDevices[0])[0].id;
 for(const body of [
  {observationId:id,status:"invalid",reason:"Long enough reason"},
  {observationId:id,status:"reviewed",reason:"short"},
  {observationId:"abc",status:"reviewed",reason:"Long enough reason"},
  {observationId:id,status:"reviewed",reason:"x".repeat(501)}
 ])assert.throws(()=>validateDecision(body));
 const gone=decide(db,user,{observationId:"f".repeat(64),status:"dismissed",reason:"Dấu hiệu không còn"},audit);
 assert.equal(gone.status,409);
 const old={...db.loginDevices[0],firstSeenAt:"2026-01-01T00:00:00.000Z"};
 const stale={...db,loginDevices:[old]};
 assert.equal(findObservation(stale,id),null);
 const done=decide(db,user,{observationId:id,status:"dismissed",reason:"Đã đối chiếu và bỏ qua"},audit);
 assert.equal(done.status,201);
 assert.equal(db.users[0].locked,undefined);
});
test("Journal validates paging/status and filters by scoped account",()=>{
 const db=makeDb(),id=activeObservations(db.loginDevices[0])[0].id;
 decide(db,user,{observationId:id,status:"reviewed",reason:"Đã kiểm tra kỹ thuật"},audit);
 assert.equal(history(db,{status:"reviewed"}).pagination.total,1);
 assert.equal(history(db,{status:"dismissed"}).pagination.total,0);
 for(const query of [{page:0},{page:10001},{userId:" "},{status:"other"},{status:["all","reviewed"]}])
  assert.throws(()=>history(db,query));
});
test("API denies students and protects records with PostgreSQL transaction client",async()=>{
 const db=makeDb(),id=activeObservations(db.loginDevices[0])[0].id;
 const prior=process.env.DATABASE_URL;process.env.DATABASE_URL="postgres://mock.invalid/db";
 let response,transactionCalls=0,readCalls=0;
 try{
  const ctx={requireUser:async(_req,res,roles)=>{if(res.block){response={status:403,body:{}};return null}return user},
   parseBody:async()=>({observationId:id,status:"reviewed",reason:"Đã kiểm tra địa chỉ truy cập"}),
   storage:{flush:async()=>{},adopt:()=>{}},
   pg:{loadAppState:async()=>{readCalls++;return db},
    mutateAppState:async fn=>{transactionCalls++;return {...await fn(db,{query:async()=>({rows:[]})}),state:db}}},
   send:(_r,status,body,headers)=>{response={status,body,headers}}};
  await route({url:"/api/admin/device-reviews",method:"POST"},{}, "/api/admin/device-reviews",ctx);
  assert.equal(response.status,201);
  assert.equal(response.headers["Cache-Control"],"private, no-store");
  assert.equal(transactionCalls,1);
  assert.equal(db.deviceSecurityReviews.length,1);
  await route({url:"/api/admin/device-reviews?userId=u2",method:"GET"},{}, "/api/admin/device-reviews",ctx);
  assert.equal(response.status,200);
  assert.equal(response.body.pagination.total,0);
  assert.equal(readCalls,1);
  await route({url:"/api/admin/device-reviews?userId=u1",method:"GET"},{}, "/api/admin/device-reviews",ctx);
  assert.equal(response.body.reviews.length,1);
  await route({url:"/api/admin/device-reviews",method:"POST"}, {block:true}, "/api/admin/device-reviews",ctx);
  assert.equal(response.status,403);
 }finally{if(prior===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=prior}
});
