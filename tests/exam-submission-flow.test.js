"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const route=require("../routes/exam-sessions");
const uuid="da1c7086-6c5d-45b4-a027-7cf6e913aa2b";
async function simulate(url,method="POST",body={},role="student"){
 const prev=process.env.DATABASE_URL;process.env.DATABASE_URL="postgresql://never-connected/testing";
 let response=null,called=[];
 const db={
  startExamSession:async(uid,data)=>{called.push(["start",uid,data]);return {id:uuid,startedAt:"2026-10-10T07:00:00Z",dueAt:"2026-10-10T07:45:00Z"}},
  touchExamSession:async(uid,id,count)=>{called.push(["heartbeat",uid,id,count]);return {id,answeredCount:count}},
  submitExamSession:async(uid,id,count)=>{called.push(["submit",uid,id,count]);return {id,submittedAt:"2026-10-10T07:40:00Z"}},
  adminExamSessions:async filters=>{called.push(["admin",filters]);return {items:[],pagination:{page:1,limit:25,total:0,pages:0},serverNow:"2026-10-10T07:00:00Z"}}
 };
 const req={method,url};
 const ctx={
  send:(_,status,value)=>{response={status,value}},
  parseBody:async()=>body,
  requireUser:async(_,__,roles)=>roles&&!roles.includes(role)?null:{id:"trusted-user",role},
  monitor:{warn:()=>{}},pg:db
 };
 try{const matched=await route(req,{},new URL(url,"https://app.local").pathname,ctx);return {matched,response,called}}
 finally{if(prev===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=prev}
}
test("Exam start records trusted user identity and timed metadata",async()=>{
 const r=await simulate("/api/real/me/exam-sessions/start","POST",{id:uuid,examId:"term-01",title:"Bài Toán",subject:"math",grade:4,durationMinutes:45,totalQuestions:30});
 assert.equal(r.response.status,200);
 assert.equal(r.response.value.source,"postgres");
 assert.deepEqual(r.called[0].slice(0,2),["start","trusted-user"]);
 assert.equal(r.called[0][2].durationMinutes,45);
});
test("Only owner-based server calls can report heartbeat and submission",async()=>{
 const r=await simulate("/api/real/me/exam-sessions/heartbeat","POST",{id:uuid,answeredCount:8});
 assert.equal(r.response.status,200);
 assert.deepEqual(r.called,[["heartbeat","trusted-user",uuid,8]]);
 const submitted=await simulate("/api/real/me/exam-sessions/submit","POST",{id:uuid,answeredCount:30});
 assert.deepEqual(submitted.called,[["submit","trusted-user",uuid,30]]);
});
test("Only Admin role may read exam monitoring",async()=>{
 const denied=await simulate("/api/real/admin/exam-sessions?page=1","GET",{},"student");
 assert.equal(denied.response,null);
 assert.deepEqual(denied.called,[]);
 const allowed=await simulate("/api/real/admin/exam-sessions?status=active&grade=4","GET",{},"admin");
 assert.equal(allowed.response.status,200);
 assert.equal(allowed.called[0][1].grade,4);
});
test("Rejected exam metadata and invalid monitor search cannot touch DB",async()=>{
 const bad=await simulate("/api/real/me/exam-sessions/start","POST",{id:uuid,examId:"demo",title:"Bài",subject:"math",grade:4,durationMinutes:400,totalQuestions:30});
 assert.equal(bad.response.status,400);
 assert.equal(bad.called.length,0);
 const badList=await simulate("/api/real/admin/exam-sessions?grade=9","GET",{},"admin");
 assert.equal(badList.response.status,400);
 assert.equal(badList.called.length,0);
});
test("Server does not confirm submission until the matching result exists",()=>{
 const root=path.join(__dirname,"..");
 const pg=fs.readFileSync(path.join(root,"lib/postgres.js"),"utf8");
 const section=pg.slice(pg.indexOf("async function submitExamSession"),pg.indexOf("async function adminExamSessions"));
 assert.match(section,/EXISTS \(SELECT 1 FROM results r/);
 assert.match(section,/r\.client_submission_id=\$1::text/);
 const html=fs.readFileSync(path.join(root,"js/exams/standalone.js"),"utf8");
 assert.match(html,/saveStandaloneResult\(done/);
 assert.match(html,/source!=="postgres"/);
 const app=fs.readFileSync(path.join(root,"js/app.js"),"utf8");
 assert.match(app,/saved\.source!=="postgres"/);
 assert.match(app,/Bài giáo viên giao/);
});
