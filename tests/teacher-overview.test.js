"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {makeTeacherOverview}=require("../lib/teacher-overview");
const handler=require("../routes/teacher-overview");
const sample=()=>({
 classes:[
  {id:"class-a",teacherId:"teacher-a",name:"Lớp 4A",studentIds:["s1","s2","s2"]},
  {id:"class-b",teacherId:"teacher-a",name:"Lớp 5B",studentIds:["s2","s3"]},
  {id:"class-c",teacherId:"teacher-b",name:"Lớp khác",studentIds:["private-student"]}
 ],
 assignments:[
  {id:"assignment-1",teacherId:"teacher-a",classId:"class-a",title:"Toán tuần 1",createdAt:"2026-10-15T08:00:00Z"},
  {id:"assignment-2",teacherId:"teacher-a",classId:"class-b",title:"Toán tuần 2",createdAt:"2026-10-16T08:00:00Z",deadline:"2026-10-20T10:00:00Z"},
  {id:"assignment-leak",teacherId:"teacher-b",classId:"class-c",title:"Không được thấy",createdAt:"2026-10-20T08:00:00Z"},
  {id:"assignment-cross",teacherId:"teacher-a",classId:"class-c",title:"Không thuộc lớp của tôi"}
 ],
 submissions:[
  {id:"sub-a",assignmentId:"assignment-1",score:null},
  {id:"sub-b",assignmentId:"assignment-2",score:0,gradingStatus:"graded"},
  {id:"sub-c",assignmentId:"assignment-2",score:90,gradingStatus:"graded"},
  {id:"sub-other",assignmentId:"assignment-leak",score:null},
  {id:"sub-stray",assignmentId:"assignment-cross",score:null}
 ]
});
test("Teacher totals are owner-scoped; deduplicate students and preserve valid score zero",()=>{
 const db=sample(),a=makeTeacherOverview(db,{id:"teacher-a",role:"teacher"});
 assert.deepEqual(a.counts,{classes:2,students:3,assignments:2,pendingGrading:1});
 assert.deepEqual(a.recentAssignments.map(x=>x.id),["assignment-2","assignment-1"]);
 assert.deepEqual(a.recentAssignments.map(x=>x.className),["Lớp 5B","Lớp 4A"]);
 assert.equal(a.recentAssignments[0].deadline,"2026-10-20T10:00:00Z");
 assert.ok(!JSON.stringify(a).includes("private-student"));
 assert.ok(!JSON.stringify(a).includes("Không được thấy"));
 assert.ok(!JSON.stringify(a).includes("assignment-leak"));
 assert.deepEqual(makeTeacherOverview(db,{id:"teacher-b",role:"teacher"}).counts,
  {classes:1,students:1,assignments:1,pendingGrading:1});
 assert.deepEqual(makeTeacherOverview(db,{id:"teacher-a",role:"admin"}).counts,a.counts);
});
test("Empty teacher account has honest zero counts without revealing other teachers",()=>{
 assert.deepEqual(makeTeacherOverview(sample(),{id:"missing",role:"admin"}),{
  counts:{classes:0,students:0,assignments:0,pendingGrading:0},recentAssignments:[]
 });
});
test("Private summary API enforces teacher/admin permissions and a no-store response",async()=>{
 const db=sample();let response=null,dbReads=0,seenRoles,actor={id:"teacher-a",role:"teacher"};
 const ctx={requireUser:async(req,res,roles)=>{
  seenRoles=roles;
  if(!roles.includes(actor.role)){response={status:403,body:{error:"Forbidden"}};return null}
  return actor;
 },load:()=>{dbReads++;return db},
 pg:{loadAppState:async()=>{dbReads++;return db}},
 send:(res,status,body,headers)=>{response={status,body,headers}}};
 const req={method:"GET"};
 const called=await handler(req,{},"/api/teacher/overview",ctx);
 assert.equal(called,true);
 assert.deepEqual(seenRoles,["teacher","admin"]);
 assert.equal(response.status,200);
 assert.equal(response.headers["Cache-Control"],"private, no-store");
 assert.equal(response.body.counts.students,3);
 assert.equal(dbReads,1);
 actor={id:"student",role:"student"};
 await handler(req,{},"/api/teacher/overview",ctx);
 assert.equal(response.status,403);
 assert.equal(dbReads,1);
 actor={id:"teacher-a",role:"teacher"};
 await handler({method:"POST"},{}, "/api/teacher/overview",ctx);
 assert.equal(response.status,405);
 assert.equal(dbReads,1);
 assert.equal(await handler(req,{},"/api/other",ctx),false);
});
test("Teacher overview handles PostgreSQL snapshots and returns 503, not fake zero, on failure",async()=>{
 const db=sample();let output;
 const original=process.env.DATABASE_URL;process.env.DATABASE_URL="postgres://fake.invalid/db";
 try{
  const ctx={requireUser:async()=>({id:"teacher-a",role:"teacher"}),
   load:()=>{throw Error("fallback must never run")},
   pg:{loadAppState:async()=>db},
   send:(_res,status,body)=>{output={status,body}}};
  await handler({method:"GET"},{}, "/api/teacher/overview",ctx);
  assert.equal(output.status,200);
  assert.equal(output.body.counts.pendingGrading,1);
  ctx.pg.loadAppState=async()=>{throw Error("database unavailable")};
  await handler({method:"GET"},{}, "/api/teacher/overview",ctx);
  assert.equal(output.status,503);
  assert.equal(output.body.counts,undefined);
 }finally{
  if(original===undefined)delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL=original;
 }
});
test("Dashboard summary remains lazy-loaded and accessible in responsive CSS",()=>{
 const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
 const app=read("js/app.js"),loader=read("js/perf/loader.js"),css=read("css/teacher-dashboard.css");
 const client=read("js/teacher/overview.js");
 for(const marker of [
  'teacher-overview-stats','data-teacher-count=','id="teacherRecentAssignments"',
  'id="teacherOverviewRefresh"','window.TeacherOverview?.bind?.()'
 ])assert.ok(app.includes(marker),marker);
 assert.ok(loader.includes('teacher:["/js/teacher/overview.js"]'));
 assert.ok(client.includes('API.get("/api/teacher/overview"'));
 assert.ok(client.includes("!root.isConnected"));
 for(const marker of [".teacher-overview-stats",
  "grid-template-columns:repeat(4,minmax(0,1fr))",
  "grid-template-columns:repeat(2,minmax(0,1fr))",
  ':root[data-theme="dark"]', "prefers-reduced-motion"])assert.ok(css.includes(marker),marker);
});
