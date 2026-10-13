"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const handler=require("../routes/admin-results-export");
async function request(opts={}){
 let sent,headers,body,authChecked=false,loaded=false;
 const res={writeHead:(status,h)=>{headers={status,...h}},end:data=>{body=data}};
 const ctx={
  send:(response,code,payload,h)=>{sent={code,payload,headers:h}},
  requireUser:async(req,response,roles)=>{authChecked=true;assert.deepEqual(roles,["admin"]);if(!opts.authorized){sent={code:401,payload:{error:"Login"}};return null}return {id:"admin",role:"admin"}},
  load:()=>{loaded=true;return opts.db||{users:[],results:[]}},pg:opts.pg||{query:async()=>({rows:[]})}
 };
 const handled=await handler({method:opts.method||"GET",url:opts.path||"/api/admin/results/export"},res,(opts.path||"/api/admin/results/export").split("?")[0],ctx);
 return {handled,sent,headers,body:body?.toString("utf8"),authChecked,loaded};
}
test("no export for anonymous users or unsupported write methods",async()=>{
 const r=await request();assert.equal(r.handled,true);assert.equal(r.authChecked,true);assert.equal(r.sent.code,401);assert.equal(r.loaded,false);
 const write=await request({authorized:true,method:"POST"});assert.equal(write.sent.code,405);
});
test("CSV sanitizes formulas, newlines, commas and quote characters",()=>{
 const raw=handler.makeCsv([{ownerName:'=HYPERLINK("bad")',ownerEmail:"user@example.test",
  title:'Bài "khó",\r\n=cmd',subject:"math",grade:4,score:90,correct:9,total:10,createdAt:"2026-10-13"}]);
 assert.ok(raw.startsWith("\ufeff"));assert.ok(raw.includes('"\'=HYPERLINK(""bad"")"'));
 assert.ok(raw.includes('"Bài ""khó"",  =cmd"'));assert.equal(raw.includes("\r\n=cmd"),false);
 assert.ok(raw.includes('"90"'));assert.ok(raw.includes("chưa được giáo viên xác minh"));
});
test("CSV respects grade/subject/search filters and never includes unrelated students",async()=>{
 const db={users:[{id:"a",name:"A",email:"a@example.test"},{id:"b",name:"B",email:"b@example.test"}],results:[
  {id:"r1",userId:"a",title:"Toán",subject:"math",grade:4,score:90,correct:9,total:10,createdAt:"2026-10-13"},
  {id:"r2",userId:"b",title:"Tiếng Anh",subject:"english",grade:5,score:85,createdAt:"2026-10-12"}]};
 const r=await request({authorized:true,db,path:"/api/admin/results/export?grade=4&subject=math&search=A"});
 assert.equal(r.headers.status,200);assert.match(r.headers["Content-Type"],/text\/csv/);
 assert.equal(r.headers["Cache-Control"],"private, no-store");
 assert.ok(r.body.includes("a@example.test"));assert.ok(!r.body.includes("b@example.test"));
 assert.ok(r.headers["Content-Disposition"].includes("attachment"));
});
test("large reports are rejected instead of silently truncated",async()=>{
 const db={users:[],results:Array.from({length:2001},(_,i)=>({id:String(i),title:"Bài",score:80}))};
 const r=await request({authorized:true,db});
 assert.equal(r.sent.code,413);assert.equal(r.body,undefined);
});
test("PostgreSQL export uses bound parameters and is capped at 2,000 rows",async()=>{
 const prior=process.env.DATABASE_URL;process.env.DATABASE_URL="postgresql://test.invalid/db";
 const calls=[];try{
  const pg={query:async(sql,params)=>{calls.push({sql,params});return calls.length===1?{rows:[{total:1}]}:{rows:[{ownerName:"Student",ownerEmail:"s@example.test",title:"Test",score:100}]}}};
  const r=await request({authorized:true,pg,path:"/api/admin/results/export?subject=math&grade=5&search=Student"});
  assert.equal(r.headers.status,200);assert.equal(calls.length,2);
  assert.deepEqual(calls[0].params,["","math",5,"Student"]);
  assert.deepEqual(calls[1].params,["","math",5,"Student",2000]);
  assert.ok(!calls[1].sql.includes("s@example.test"));
 }finally{if(prior===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=prior}
});
