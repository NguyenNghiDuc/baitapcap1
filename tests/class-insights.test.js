"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const handler=require("../routes/class-insights");
const {collect,safePage}=handler;
const db={
 classes:[
  {id:"cA",name:"4A",grade:4,teacherId:"tA",studentIds:["s1","s2","s2"]},
  {id:"cB",name:"4B",grade:4,teacherId:"tB",studentIds:["s3"]},
  {id:"c0",name:"4C",grade:4,teacherId:"tA",studentIds:[]}
 ],
 assignments:[
  {id:"a1",classId:"cA",title:"Bài Toán",createdAt:"2026-10-13T00:00:00Z"},
  {id:"a2",classId:"cA",title:"Bài Tiếng Việt",createdAt:"2026-10-12T00:00:00Z"},
  {id:"a3",classId:"cB",title:"Bài riêng",createdAt:"2026-10-13T00:00:00Z"}
 ],
 submissions:[
  {id:"v1",assignmentId:"a1",studentId:"s1",score:null,gradingStatus:"pending"},
  {id:"v2",assignmentId:"a1",studentId:"s1",score:95,gradingStatus:"teacher_graded"},
  {id:"v3",assignmentId:"a2",studentId:"s1",score:90,gradingStatus:"teacher_graded"},
  {id:"v4",assignmentId:"a2",studentId:"s2",score:null,gradingStatus:"pending"},
  {id:"foreign",assignmentId:"a3",studentId:"s3",score:100,gradingStatus:"teacher_graded"},
  {id:"removed",assignmentId:"a1",studentId:"no-longer-enrolled",score:80}
 ]
};
test("teacher sees own classes and no identifiers, emails or invitation codes for children",()=>{
 const r=collect(db,{id:"tA",role:"teacher"});
 assert.equal(r.pagination.total,2);
 assert.deepEqual(r.classes.map(x=>x.id),["cA","c0"]);
 assert.equal(JSON.stringify(r).includes("s1"),false);
 assert.equal(JSON.stringify(r).includes("s2"),false);
 assert.equal(JSON.stringify(r).includes("s3"),false);
 assert.equal(JSON.stringify(r).includes("a1"),false);
 assert.equal(JSON.stringify(r).includes("studentEmail"),false);
});
test("unique student-assignment coverage prevents repeated submission inflation",()=>{
 const r=collect(db,{id:"tA",role:"teacher"});
 const a=r.classes.find(x=>x.id==="cA");
 assert.equal(a.studentCount,2);
 assert.equal(a.assignmentCount,2);
 assert.equal(a.submissionAttempts,4);
 assert.equal(a.uniqueSubmitted,3);
 assert.equal(a.completionRate,75);
 assert.equal(a.pendingReview,2);
 assert.equal(a.gradedAttempts,2);
 const empty=r.classes.find(x=>x.id==="c0");
 assert.equal(empty.completionRate,null);
 assert.equal(empty.uniqueSubmitted,0);
});
test("Admins see all classes but receive no student roster, join code or grades",()=>{
 const r=collect(db,{id:"admin",role:"admin"},{page:2,limit:1});
 assert.equal(r.pagination.total,3);
 assert.equal(r.classes.length,1);
 assert.deepEqual(Object.keys(r.classes[0]).includes("code"),false);
 assert.equal(JSON.stringify(r).includes("s3"),false);
});
test("reject invalid pagination including NaN, negative values and expensive page sizes",()=>{
 for(const s of ["page=-1","page=hi","page=2.5","page=10001","limit=99","limit=-1"]){
  assert.equal(safePage(new URLSearchParams(s)),null,s);
 }
 assert.deepEqual(safePage(new URLSearchParams("page=2&limit=20")),{page:2,limit:20});
});
async function invoke({user,method="GET",url="/api/teacher/class-insights",data=db}={}){
 let sent=null,access=null,read=false;
 const req={method,url};
 const ctx={send:(_r,status,payload,headers)=>{sent={status,payload,headers}},
  requireUser:async(_req,_res,roles)=>{
   access=roles;
   if(!user){sent={status:401};return null}
   if(!roles.includes(user.role)){sent={status:403};return null}
   return user;
  },
  load:()=>{read=true;return data}
 };
 const handled=await handler(req,{},url.split("?")[0],ctx);
 return {handled,sent,access,read};
}
test("private aggregate API denies anonymous/student users before loading data",async()=>{
 const a=await invoke(),b=await invoke({user:{id:"s1",role:"student"}});
 assert.equal(a.sent.status,401);
 assert.equal(b.sent.status,403);
 assert.equal(a.read,false);assert.equal(b.read,false);
 assert.deepEqual(a.access,["teacher","admin"]);
 const other=await invoke({user:{role:"teacher",id:"tA"},url:"/api/other"});
 assert.equal(other.handled,false);
});
test("API enforces only GET, validates pagination, and prevents caching",async()=>{
 const who={id:"tA",role:"teacher"};
 const denied=await invoke({user:who,method:"POST"});
 assert.equal(denied.sent.status,405);assert.equal(denied.sent.headers.Allow,"GET");assert.equal(denied.read,false);
 const bad=await invoke({user:who,url:"/api/teacher/class-insights?limit=1000"});
 assert.equal(bad.sent.status,400);assert.equal(bad.read,false);
 const ok=await invoke({user:who,url:"/api/teacher/class-insights?page=1&limit=12"});
 assert.equal(ok.sent.status,200);
 assert.equal(ok.sent.headers["Cache-Control"],"private, no-store");
 assert.equal(ok.sent.payload.pagination.total,2);
});
