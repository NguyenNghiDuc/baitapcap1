"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const handler=require("../routes/admin-result-reviews");
test("Two Admin decisions serialize and only first is recorded in PostgreSQL app state",async()=>{
 const beforeDb=process.env.DATABASE_URL;
 process.env.DATABASE_URL="postgresql://test.invalid/db";
 const state={users:[],resultReviewDecisions:[],audit:[]};
 const result={id:"exam1",score:105,correct:10,total:10,durationSec:60};
 let chain=Promise.resolve();
 const pg={
  query:async()=>({rows:[result]}),
  mutateAppState:fn=>{
   const pending=chain.then(async()=>{
    const client={query:async()=>({rows:[result]})};
    const out=await fn(state,client);
    return {...out,state};
   });
   chain=pending.then(()=>undefined,()=>undefined);
   return pending;
  }
 };
 const storage={flush:async()=>{},adopt:()=>{}};
 const run=id=>new Promise(resolve=>{
  const ctx={pg,storage,requireUser:async()=>({id,role:"admin"}),parseBody:async()=>({resultId:"exam1",status:"reviewed",reason:"Đã xác minh số liệu đầu vào"}),
   send:(_res,status,payload)=>resolve({status,payload})};
  handler({method:"POST",url:"/api/admin/result-reviews/decision"},{}, "/api/admin/result-reviews/decision",ctx).catch(resolve);
 });
 try{
  const out=await Promise.all([run("admin-a"),run("admin-b")]);
  assert.deepEqual(out.map(x=>x.status).sort(),[201,409]);
  assert.equal(state.resultReviewDecisions.length,1);
  assert.equal(state.resultReviewDecisions[0].scoreAtReview,105);
  assert.equal(state.audit.length,1);
 }finally{if(beforeDb===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=beforeDb}
});
test("Changed result data blocks saving a stale review",async()=>{
 const beforeDb=process.env.DATABASE_URL;process.env.DATABASE_URL="postgresql://test.invalid/db";
 const state={users:[],resultReviewDecisions:[],audit:[]};
 let reads=0,out;
 const pg={query:async()=>({rows:[{id:"exam1",score:++reads===1?105:106,correct:10,total:10,durationSec:50}]}),
  mutateAppState:async fn=>({...await fn(state,{query:async()=>({rows:[{id:"exam1",score:106,correct:10,total:10,durationSec:50}]})}),state})};
 try{
  await handler({method:"POST",url:"/api/admin/result-reviews/decision"},{}, "/api/admin/result-reviews/decision",{
   pg,storage:{flush:async()=>{},adopt:()=>{}},requireUser:async()=>({id:"admin",role:"admin"}),
   parseBody:async()=>({resultId:"exam1",status:"reviewed",reason:"Cần kiểm tra thêm dữ liệu"}),send:(_r,status,payload)=>{out={status,payload}}
  });
  assert.equal(out.status,409);assert.equal(state.resultReviewDecisions.length,0);
 }finally{if(beforeDb===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=beforeDb}
});
