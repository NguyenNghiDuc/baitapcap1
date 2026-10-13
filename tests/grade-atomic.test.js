"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const postgres=require("../lib/postgres"),reviews=require("../routes/grade-reviews"),first=require("../routes/grade-first");

const cloned=x=>JSON.parse(JSON.stringify(x));
function fixture(score=70){
 return {users:[{id:"teacher",role:"teacher",name:"Giáo viên"},{id:"admin1",role:"admin",name:"Admin 1"},
   {id:"admin2",role:"admin",name:"Admin 2"},{id:"student",role:"student",name:"Học sinh"}],
  classes:[{id:"class",teacherId:"teacher",studentIds:["student"]}],
  assignments:[{id:"assignment",classId:"class",teacherId:"teacher",title:"Bài tập"}],
  submissions:[{id:"submission",assignmentId:"assignment",studentId:"student",score,
   gradedAt:score===null?null:"2026-10-13T00:00:00Z",feedback:""}],
  gradeReviews:[],audit:[]};
}
function database(initial){
 const state={data:cloned(initial),audits:[],commands:[],failUpdate:false};
 let next=Promise.resolve();
 class Client{
  constructor(){this.unlock=null;this.work=null}
  async query(sql,params=[]){
   state.commands.push(sql);
   if(sql==="BEGIN"){
    let release;const barrier=new Promise(resolve=>{release=resolve}),prior=next;
    next=barrier;await prior;this.unlock=release;return {rows:[]};
   }
   if(sql==="SELECT data FROM app_state WHERE id=1 FOR UPDATE")return {rows:[{data:cloned(state.data)}]};
   if(sql.startsWith("UPDATE app_state SET data")){
    if(state.failUpdate)throw Error("Simulated database write failure");
    this.work=JSON.parse(params[0]);return {rowCount:1};
   }
   if(sql.startsWith("INSERT INTO audit_logs")){
    this.auditEvent=params;return {rowCount:1};
   }
   if(sql==="COMMIT"){
    if(this.work)state.data=this.work;
    if(this.auditEvent)state.audits.push(this.auditEvent);
    this.unlock?.();return {rowCount:0};
   }
   if(sql==="ROLLBACK"){this.unlock?.();return {rowCount:0}}
   throw Error("Unexpected SQL: "+sql);
  }
 }
 state.pg={
  loadAppState:async()=>cloned(state.data),
  mutateAppState:fn=>postgres.runLockedMutation(new Client(),fn)
 };
 state.storage={flush:async()=>{},adopt:db=>{state.cache=cloned(db)}};
 return state;
}
async function invoke(db,{path="/api/grade-reviews",method="GET",user={id:"teacher",role:"teacher"},body={}}={}){
 const prev=process.env.DATABASE_URL;process.env.DATABASE_URL="postgresql://fake.invalid/snapshot";
 let response;
 const ctx={
  pg:db.pg,storage:db.storage,load:()=>db.cache||db.data,save:()=>{throw Error("Snapshot save must not run")},
  audit:()=>{throw Error("Nontransactional audit must not run")},
  parseBody:async()=>body,
  requireUser:async(_req,_res,roles)=>{
   if(!user||!roles.includes(user.role)){response={status:user?403:401};return null}return user;
  },
  send:(_res,status,data,headers)=>{response={status,data,headers}}
 };
 try{
  const route=path.startsWith("/api/submissions/")?first:reviews;
  const handled=await route({url:path,method},{},path.split("?")[0],ctx);
  return {handled,...response};
 }finally{
  if(prev===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=prev;
 }
}
test("two simultaneous Admin approvals commit once under row locks, including audit",async()=>{
 const db=database(fixture());
 const submitted=await invoke(db,{method:"POST",body:{submissionId:"submission",newScore:85,reason:"Tính lại bài học sinh"}});
 assert.equal(submitted.status,201);
 const path="/api/grade-reviews/"+submitted.data.review.id+"/decision";
 const [a,b]=await Promise.all([
  invoke(db,{path,method:"POST",user:{id:"admin1",role:"admin"},body:{decision:"approve"}}),
  invoke(db,{path,method:"POST",user:{id:"admin2",role:"admin"},body:{decision:"approve"}})
 ]);
 assert.deepEqual([a.status,b.status].sort(),[200,409]);
 assert.equal(db.data.submissions[0].score,85);
 assert.equal(db.data.gradeReviews[0].status,"approved");
 assert.equal(db.data.audit.filter(x=>x.action==="grade_change_approved").length,1);
 assert.equal(db.audits.filter(x=>x[2]==="grade_change_approved").length,1);
 const latest=await invoke(db,{user:{id:"admin1",role:"admin"},path:"/api/grade-reviews?status=approved"});
 assert.equal(latest.status,200);assert.equal(latest.data.reviews.length,1);
});
test("two concurrent first grades do not overwrite the winning score",async()=>{
 const db=database(fixture(null));
 const path="/api/submissions/submission/grade";
 const [a,b]=await Promise.all([
  invoke(db,{path,method:"PATCH",body:{score:80,feedback:"Làm tốt"}}),
  invoke(db,{path,method:"PATCH",body:{score:90,feedback:"Làm tốt"}})
 ]);
 assert.deepEqual([a.status,b.status].sort(),[200,409]);
 assert.equal(db.data.submissions[0].score,80);
 assert.equal(db.data.audit.filter(x=>x.action==="submission_graded").length,1);
});
test("a pending change cannot be applied if the original gradedAt changed",async()=>{
 const db=database(fixture());
 const created=await invoke(db,{method:"POST",body:{submissionId:"submission",newScore:90,reason:"Chấm nhầm câu trả lời"}});
 db.data.submissions[0].gradedAt="2026-10-13T01:00:00Z";
 const result=await invoke(db,{path:"/api/grade-reviews/"+created.data.review.id+"/decision",method:"POST",
  user:{id:"admin1",role:"admin"},body:{decision:"approve"}});
 assert.equal(result.status,409);assert.equal(db.data.submissions[0].score,70);
 assert.equal(db.data.gradeReviews[0].status,"pending");
});
test("if Postgres UPDATE fails, full grade mutation and audit roll back",async()=>{
 const db=database(fixture());db.failUpdate=true;
 const result=await invoke(db,{method:"POST",body:{submissionId:"submission",newScore:90,reason:"Chấm nhầm câu trả lời"}});
 assert.equal(result.status,503);assert.deepEqual(db.data.gradeReviews,[]);
 assert.equal(db.data.audit.length,0);assert.equal(db.audits.length,0);
 assert.ok(db.commands.includes("ROLLBACK"));assert.equal(db.commands.includes("COMMIT"),false);
});
test("an unmodified rejected request commits no new snapshot or audit",async()=>{
 const db=database(fixture());
 const bad=await invoke(db,{method:"POST",body:{submissionId:"submission",newScore:70,reason:"Điểm vẫn giống hiện tại"}});
 assert.equal(bad.status,400);
 assert.equal(db.commands.filter(x=>x.startsWith("UPDATE app_state")).length,0);
 assert.equal(db.audits.length,0);
});
