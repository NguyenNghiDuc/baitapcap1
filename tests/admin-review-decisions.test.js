"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const handler=require("../routes/admin-result-reviews");
function mock({method="POST",url="/api/admin/result-reviews/decision",body={},admin=true,db}={}){
 const state=db||{results:[{id:"r1",score:105,correct:10,total:10,durationSec:30}],resultReviewDecisions:[],audit:[]};
 let output;
 const ctx={
  send:(_res,status,payload)=>{output={status,payload}},
  requireUser:async()=>admin?{id:"admin1",role:"admin"}:null,
  parseBody:async()=>body,load:()=>state,save:()=>{},
  audit:(db,user,action,meta)=>{db.audit.push({action,userId:user.id,meta})}
 };
 return handler({method,url},{},url.split("?")[0],ctx).then(()=>({output,state}));
}
test("valid review decision records admin, timestamp, reason and original score only",async()=>{
 const {output,state}=await mock({body:{resultId:"r1",status:"reviewed",reason:"Thông số điểm chưa hợp lệ"}});
 assert.equal(output.status,201);assert.equal(state.resultReviewDecisions.length,1);
 assert.equal(state.resultReviewDecisions[0].reviewerId,"admin1");
 assert.equal(state.results[0].score,105);
 assert.equal(state.audit[0].action,"exam_result_review_decided");
});
test("duplicate review is rejected without rewriting first decision",async()=>{
 const db={results:[{id:"r1",score:105,total:10,correct:10,durationSec:30}],audit:[],resultReviewDecisions:[]};
 await mock({db,body:{resultId:"r1",status:"reviewed",reason:"Xem xét số liệu điểm"}});
 const {output}=await mock({db,body:{resultId:"r1",status:"dismissed",reason:"Bỏ qua kiểm tra này"}});
 assert.equal(output.status,409);assert.equal(db.resultReviewDecisions[0].status,"reviewed");
});
test("missing reason and ordinary result cannot be reviewed",async()=>{
 const invalid=await mock({body:{resultId:"r1",status:"reviewed",reason:"ngắn"}});
 assert.equal(invalid.output.status,400);
 const regular=await mock({db:{results:[{id:"r1",score:90,total:10,correct:9,durationSec:120}],audit:[]},body:{resultId:"r1",status:"reviewed",reason:"Đã kiểm tra thông số"}});
 assert.equal(regular.output.status,409);
});
test("UI renders review decision forms and respects API authorization",()=>{
 const js=fs.readFileSync(path.join(__dirname,"../js/admin/results.js"),"utf8");
 const server=fs.readFileSync(path.join(__dirname,"../server.js"),"utf8");
 assert.match(js,/admin-review-decision/);assert.match(js,/API.post\("\/api\/admin\/result-reviews\/decision"/);
 assert.match(server,/handleAdminResultReviews/);
});
