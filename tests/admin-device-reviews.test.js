"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {activeObservations,findObservation,history,parseHistoryFilters,validateDecision,decide}=require("../lib/admin-device-reviews");
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

test("Admin journal combines status, type, account, time and stable paging",()=>{
 const now=Date.parse("2026-10-15T12:00:00.000Z"),DAY=86400000;
 const at=(days)=>new Date(now-days*DAY).toISOString();
 const db={users:[{id:"u1",name:"Minh Anh"},{id:"u2",name:"Lan"}],deviceSecurityReviews:[
  {id:"r1",userId:"u1",type:"new-device",status:"reviewed",reason:"Checked",
   reviewerId:"admin",reviewedAt:at(0.5)},
  {id:"r2",userId:"u1",type:"ip-change",status:"dismissed",reason:"Roaming",
   reviewerId:"admin",reviewedAt:at(7)},
  {id:"r3",userId:"u1",type:"ip-change",status:"reviewed",reason:"Checked",
   reviewerId:"admin",reviewedAt:at(30)},
  {id:"r4",userId:"u2",type:"new-device",status:"dismissed",reason:"Known",
   reviewerId:"admin",reviewedAt:at(91)},
  {id:"r5",userId:"u2",type:"new-device",status:"reviewed",reason:"No timestamp",
   reviewerId:"admin",reviewedAt:null},
  {id:"r6",userId:"u1",type:"new-device",status:"reviewed",reason:"Future",
   reviewerId:"admin",reviewedAt:at(-1)}
 ]};
 const scoped=history(db,{userId:"u1",status:"reviewed",type:"ip-change",period:"30d"},now);
 assert.deepEqual(scoped.reviews.map(r=>r.id),["r3"]);
 assert.equal(scoped.pagination.total,1);
 assert.equal(scoped.summary.total,4);
 assert.equal(scoped.summary.reviewed,3);
 assert.equal(scoped.summary.dismissed,1);
 assert.equal(scoped.summary.newDevice,2);
 assert.equal(scoped.summary.ipChange,2);
 assert.equal(scoped.summary.last30d,3);
 assert.deepEqual(history(db,{userId:"u1",period:"7d"},now).reviews.map(r=>r.id),["r1","r2"]);
 assert.equal(history(db,{period:"24h"},now).pagination.total,1);
 assert.equal(history(db,{period:"90d",status:"dismissed"},now).pagination.total,1);
 assert.equal(history(db,{type:"new-device",userId:"u2"},now).pagination.total,2);
 assert.equal(history(db,{userId:"u1",page:2},now).reviews.length,0);
});
test("Journal page limits, unsupported intervals and parameter injection are rejected",()=>{
 for(const query of [
  {page:"0"},{page:"-1"},{page:"2.5"},{page:"1abc"},
  {page:["1","2"]},{page:"10001"},{page:1.2},
  {status:"unknown"},{status:["reviewed","dismissed"]},
  {type:"hacking"},{type:["new-device","ip-change"]},
  {period:"365d"},{period:""},{period:["all","7d"]},
  {period:null},{userId:["u1","u2"]},{userId:"x".repeat(129)}
 ])assert.throws(()=>parseHistoryFilters(query),/Invalid device review filters/);
 assert.deepEqual(parseHistoryFilters({}),{
  page:1,status:"all",userId:"",period:"all",type:"all"
 });
});
test("Admin journal GET rejects repeated and invalid query filters before querying PostgreSQL",async()=>{
 const old=process.env.DATABASE_URL;process.env.DATABASE_URL="postgres://mock.invalid/db";
 let reads=0,reply,allowed=true;
 const ctx={requireUser:async()=>allowed?{id:"admin",role:"admin"}:null,
  pg:{loadAppState:async()=>{reads++;return {users:[],deviceSecurityReviews:[]}}},
  send:(_res,status,data)=>{reply={status,data}}};
 try{
  for(const query of ["status=reviewed&status=dismissed","type=ip-change&type=new-device",
   "period=24h&period=7d","period=365d","page=1abc","userId="+("a".repeat(129))]){
   await route({method:"GET",url:"/api/admin/device-reviews?"+query},{},
    "/api/admin/device-reviews",ctx);
   assert.equal(reply.status,400,query);
  }
  assert.equal(reads,0);
  await route({method:"GET",url:"/api/admin/device-reviews?period=7d&type=ip-change"},{},
   "/api/admin/device-reviews",ctx);
  assert.equal(reply.status,200);
  assert.equal(reply.data.filters.period,"7d");
  assert.equal(reads,1);
 }finally{if(old===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=old}
});
