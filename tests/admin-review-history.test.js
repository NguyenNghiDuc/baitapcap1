"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const handler=require("../routes/admin-result-reviews");
const records=[
 {resultId:"r1",status:"reviewed",reason:"Dữ liệu đã kiểm tra",reviewerId:"a",reviewedAt:"2026-10-14T02:00:00Z"},
 {resultId:"r2",status:"dismissed",reason:"Không còn bất thường",reviewerId:"b",reviewedAt:"2026-10-14T03:00:00Z"},
 {resultId:"r3",status:"reviewed",reason:"Đã kiểm tra thủ công",reviewerId:"a",reviewedAt:"2026-10-14T01:00:00Z"}
];
async function call(url,admin=true){
 let response;
 await handler({method:"GET",url},{}, "/api/admin/result-reviews",{
  send:(r,code,payload)=>{response={code,payload}},
  requireUser:async()=>admin?{id:"a",role:"admin"}:null,
  load:()=>({users:[],resultReviewDecisions:records})
 });
 return response;
}
test("Admin decision history filters status and orders newest first",async()=>{
 const r=await call("/api/admin/result-reviews?status=reviewed&page=1");
 assert.equal(r.code,200);assert.equal(r.payload.pagination.total,2);
 assert.deepEqual(r.payload.reviews.map(x=>x.resultId),["r1","r3"]);
 assert.ok(r.payload.reviews.every(x=>!Object.hasOwn(x,"password")));
});
test("Individual row history remains scoped to supplied result IDs",async()=>{
 const r=await call("/api/admin/result-reviews?resultId=r2");
 assert.deepEqual(r.payload.reviews.map(x=>x.resultId),["r2"]);
});
test("Reject invalid history page and status",async()=>{
 assert.equal((await call("/api/admin/result-reviews?page=-1")).code,400);
 assert.equal((await call("/api/admin/result-reviews?status=unknown")).code,400);
});
test("History UI exposes status filter and pager",()=>{
 const js=fs.readFileSync(path.join(__dirname,"../js/admin/results.js"),"utf8");
 assert.match(js,/adminHistoryStatus/);assert.match(js,/adminHistoryNext/);
 assert.match(js,/historyHtml/);
});

test("Invalid result IDs do not silently expand a scoped review query",async()=>{
 assert.equal((await call("/api/admin/result-reviews?resultId=")).code,400);
 const many=new URLSearchParams();for(let i=0;i<51;i++)many.append("resultId","r"+i);
 assert.equal((await call("/api/admin/result-reviews?"+many.toString())).code,400);
 assert.equal((await call("/api/admin/result-reviews?resultId="+("x".repeat(129)))).code,400);
});
