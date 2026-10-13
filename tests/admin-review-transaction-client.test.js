"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const pg=require("../lib/postgres");
const handler=require("../routes/admin-result-reviews");
test("Locked app-state transaction passes its SQL client to mutator and commits audit",async()=>{
 const calls=[];const state={users:[],audit:[],resultReviewDecisions:[]};
 const client={query:async(sql)=>{
  calls.push(sql);
  if(sql.startsWith("SELECT data FROM app_state"))return {rows:[{data:state}]};
  return {rows:[],rowCount:1};
 }};
 const out=await pg.runLockedMutation(client,async(db,tx)=>{
  assert.equal(tx,client);
  const locked=await tx.query('SELECT id FROM results WHERE id=$1 FOR SHARE',["r1"]);
  assert.ok(locked);
  db.resultReviewDecisions.push({resultId:"r1"});
  return {status:201,changed:true};
 });
 assert.equal(out.status,201);
 assert.deepEqual(calls.map(s=>s.split(" ")[0]),["BEGIN","SELECT","SELECT","UPDATE","COMMIT"]);
 assert.ok(calls[2].endsWith("FOR SHARE"));
});
test("Decision API checks result within the existing PostgreSQL transaction client",async()=>{
 const prior=process.env.DATABASE_URL;process.env.DATABASE_URL="postgres://test.invalid/db";
 const queries=[];const state={users:[],resultReviewDecisions:[],audit:[]};
 const result={id:"r1",score:101,correct:10,total:10,durationSec:40};
 const client={query:async(sql)=>{queries.push({via:"client",sql});return {rows:[result]}}};
 const pgMock={query:async(sql)=>{queries.push({via:"pool",sql});return {rows:[result]}},
  mutateAppState:async fn=>({...await fn(state,client),state})};
 let response;
 try{
  await handler({method:"POST",url:"/api/admin/result-reviews/decision"},{}, "/api/admin/result-reviews/decision",{
   pg:pgMock,storage:{flush:async()=>{},adopt:()=>{}},
   requireUser:async()=>({id:"admin",role:"admin"}),
   parseBody:async()=>({resultId:"r1",status:"reviewed",reason:"Đã xác nhận cần kiểm tra lại"}),
   send:(_res,status,data)=>{response={status,data}}
  });
  assert.equal(response.status,201);
  assert.ok(queries.some(x=>x.via==="client"&&x.sql.endsWith("FOR SHARE")));
  assert.equal(queries.filter(x=>x.via==="pool").length,1);
 }finally{if(prior===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=prior}
});

test("Review refuses to save when PostgreSQL mutator omits transaction client",async()=>{
 const prior=process.env.DATABASE_URL;process.env.DATABASE_URL="postgres://test.invalid/db";
 let output;const state={users:[],resultReviewDecisions:[],audit:[]};
 try{
  await handler({method:"POST",url:"/api/admin/result-reviews/decision"},{}, "/api/admin/result-reviews/decision",{
   pg:{query:async()=>({rows:[{id:"r1",score:101,correct:10,total:10,durationSec:40}]}),
    mutateAppState:async fn=>({...await fn(state),state})},
   storage:{flush:async()=>{},adopt:()=>{}},
   requireUser:async()=>({id:"admin",role:"admin"}),
   parseBody:async()=>({resultId:"r1",status:"reviewed",reason:"Đã kiểm tra tính nhất quán"}),
   send:(_r,status)=>{output=status}
  });
  assert.equal(output,503);
  assert.equal(state.resultReviewDecisions.length,0);
 }finally{if(prior===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=prior}
});
