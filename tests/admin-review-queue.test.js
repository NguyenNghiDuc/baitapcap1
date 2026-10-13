"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const results=require("../routes/admin-results");
const exportHandler=require("../routes/admin-results-export");
const db={users:[{id:"u",name:"Example"}],results:[
 {id:"normal",userId:"u",title:"Toán",subject:"math",grade:4,score:80,correct:8,total:10,durationSec:90},
 {id:"flag",userId:"u",title:"Toán",subject:"math",grade:4,score:101,correct:10,total:10,durationSec:90},
 {id:"other",userId:"u",title:"Anh",subject:"english",grade:5,score:105,correct:10,total:10,durationSec:90}
]};
test("Admin flagged list uses same filtered rows for totals, chart and pagination",async()=>{
 const original=process.env.DATABASE_URL;delete process.env.DATABASE_URL;
 let payload;try{
 await results({method:"GET",url:"/api/admin/results?review=flagged&subject=math"},{},"/api/admin/results",{
  send:(_r,_code,data)=>payload=data,requireUser:async()=>({role:"admin"}),load:()=>db
 });
 assert.equal(payload.pagination.total,1);
 assert.equal(payload.results[0].id,"flag");
 assert.equal(payload.distribution.excluded,1);
 assert.equal(payload.reviewFilter,"flagged");
 }finally{if(original!==undefined)process.env.DATABASE_URL=original}
});
test("Export honors flagged filter and excludes normal and unrelated records",async()=>{
 const original=process.env.DATABASE_URL;delete process.env.DATABASE_URL;let csv="";
 try{
 await exportHandler({method:"GET",url:"/api/admin/results/export?review=flagged&subject=math"},
 {writeHead:()=>{},end:x=>{csv=x.toString("utf8")}},"/api/admin/results/export",{
 send:()=>{throw Error("Unexpected error")},requireUser:async()=>({role:"admin"}),load:()=>db
 });
 assert.ok(csv.includes("101"));
 assert.ok(!csv.includes('"80"'));
 assert.ok(!csv.includes('"105"'));
 }finally{if(original!==undefined)process.env.DATABASE_URL=original}
});
test("Filter available in Admin interface",()=>{
 const js=fs.readFileSync(path.join(__dirname,"../js/admin/results.js"),"utf8");
 assert.match(js,/name="review"/);
 assert.match(js,/params\.set\("review","flagged"\)/);
});
