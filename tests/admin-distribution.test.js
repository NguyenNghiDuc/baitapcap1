"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const handler=require("../routes/admin-results");
function request({url="/api/admin/results",db={users:[],results:[]},admin=true,pg}={}){
 let response;return handler({url,method:"GET"},{}, "/api/admin/results",{
  send:(_res,status,payload)=>{response={status,payload}},
  requireUser:async()=>admin?{id:"admin",role:"admin"}:null,
  load:()=>db,pg
 }).then(()=>response);
}
test("distribution assigns boundary scores and excludes invalid or missing scores",()=>{
 const result=handler.distribution([0,49.9,50,69.9,70,89.9,90,100,null,undefined,-1,101,"bad"]);
 assert.deepEqual(result.bands.map(x=>x.count),[2,2,2,2]);
 assert.equal(result.valid,8);assert.equal(result.excluded,5);
 assert.equal(result.unit,"submission");assert.equal(result.verified,false);
});
test("Admin grade distribution covers all filtered records, not just current page",async()=>{
 const db={users:[{id:"student",name:"Học sinh",email:"test@example.test"}],
 results:Array.from({length:30},(_,i)=>({id:String(i),userId:"student",title:"Bài Toán",subject:"math",grade:4,score:i<10?40:i<20?60:90,createdAt:"2026-10-13"}))
 .concat({id:"excluded",userId:"student",title:"Bài Anh",subject:"english",grade:5,score:100})};
 const r=await request({url:"/api/admin/results?page=2&limit=10&subject=math&grade=4",db});
 assert.equal(r.status,200);assert.equal(r.payload.results.length,10);
 assert.equal(r.payload.pagination.total,30);
 assert.deepEqual(r.payload.distribution.bands.map(x=>x.count),[10,10,0,10]);
});
test("Postgres distribution uses same bound filters and no student records in aggregate",async()=>{
 const original=process.env.DATABASE_URL;process.env.DATABASE_URL="postgres://test.invalid";
 const queries=[];
 try{
 const pg={query:async(sql,args)=>{queries.push({sql,args});return queries.length===1?{rows:[{total:4}]}:queries.length===2?{rows:[]}: {rows:[{b0:"1",b1:"1",b2:"1",b3:"1",excluded:"0"}]}}};
 const r=await request({url:"/api/admin/results?subject=math&grade=4&search=Test",pg});
 assert.equal(r.status,200);
 assert.equal(queries.length,3);
 assert.deepEqual(queries[2].args,["","math",4,"Test"]);
 assert.equal(r.payload.distribution.valid,4);
 assert.match(queries[2].sql,/COUNT\(\*\) FILTER/);
 }finally{if(original===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=original}
});
