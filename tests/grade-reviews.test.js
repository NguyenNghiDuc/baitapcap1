"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const handle=require("../routes/grade-reviews");
function fixture(){
 const db={users:[{id:"teacher1",name:"Cô A"},{id:"teacher2",name:"Thầy B"},{id:"student1",name:"Học sinh"}],
  classes:[{id:"class1",teacherId:"teacher1",studentIds:["student1"]}],
  assignments:[{id:"a1",classId:"class1",teacherId:"teacher1",title:"Bài Toán"}],
  submissions:[{id:"sub1",assignmentId:"a1",studentId:"student1",score:70,gradedAt:"2026-10-10T00:00:00Z"}],gradeReviews:[],audit:[]};
 return db;
}
async function invoke(db,opts={}){
 let response,saveCount=0;
 const actor=Object.hasOwn(opts,"actor")?opts.actor:{id:"teacher1",role:"teacher"},route=opts.route||"/api/grade-reviews",method=opts.method||"GET";
 const context={
  send:(_res,status,data,headers)=>{response={status,data,headers}},
  requireUser:async(_req,_res,roles)=>{
   if(!actor){response={status:401};return null}
   if(!roles.includes(actor.role)){response={status:403};return null}return actor;
  },
  load:()=>db,save:()=>{saveCount++},parseBody:async()=>opts.body||{},
  audit:(data,user,action,meta)=>{data.audit.push({action,user:user.id,meta})}
 };
 const old=process.env.DATABASE_URL,wasVercel=process.env.VERCEL;
 try{
  delete process.env.VERCEL;delete process.env.DATABASE_URL;
  const handled=await handle({url:route,method},{},route.split("?")[0],context);
  return {handled,...response,saveCount};
 }finally{
  if(old===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=old;
  if(wasVercel===undefined)delete process.env.VERCEL;else process.env.VERCEL=wasVercel;
 }
}
test("only a teacher responsible for the assigned submission may request a grade change",async()=>{
 const db=fixture();
 const unauthed=await invoke(db,{actor:null});assert.equal(unauthed.status,401);
 const outsider=await invoke(db,{actor:{id:"teacher2",role:"teacher"},method:"POST",body:{submissionId:"sub1",newScore:85,reason:"Sai cách cộng điểm"}});
 assert.equal(outsider.status,403);assert.equal(outsider.saveCount,0);
 const student=await invoke(db,{actor:{id:"student1",role:"student"}});assert.equal(student.status,403);
 const admin=await invoke(db,{actor:{id:"admin",role:"admin"},method:"POST",body:{submissionId:"sub1",newScore:85,reason:"Sai cách cộng điểm"}});
 assert.equal(admin.status,403);
});
test("grade request requires valid score and explanatory reason, preserves original score",async()=>{
 const db=fixture();
 for(const body of [{submissionId:"sub1",newScore:"",reason:"Sai cách cộng điểm"}, {submissionId:"sub1",newScore:120,reason:"Sai cách cộng điểm"},{submissionId:"sub1",newScore:71,reason:"ngắn"},{submissionId:"sub1",newScore:70,reason:"Không thay đổi"}]){
  const r=await invoke(db,{method:"POST",body});
  assert.equal(r.status,400);assert.equal(r.saveCount,0);
 }
 const ok=await invoke(db,{method:"POST",body:{submissionId:"sub1",newScore:85,reason:"Tính nhầm hai câu cuối"}});
 assert.equal(ok.status,201);assert.equal(ok.saveCount,1);
 assert.equal(db.submissions[0].score,70);
 assert.equal(db.gradeReviews[0].status,"pending");
 assert.equal(db.audit[0].action,"grade_change_requested");
 const duplicate=await invoke(db,{method:"POST",body:{submissionId:"sub1",newScore:90,reason:"Sửa trùng yêu cầu"}});
 assert.equal(duplicate.status,409);
});
test("Admin approval applies the requested score once and records an audit event",async()=>{
 const db=fixture();
 const submit=await invoke(db,{method:"POST",body:{submissionId:"sub1",newScore:85,reason:"Tính nhầm hai câu cuối",feedback:"Đã tính lại"}});const id=submit.data.review.id;
 const approved=await invoke(db,{actor:{id:"admin1",role:"admin"},route:"/api/grade-reviews/"+id+"/decision",method:"POST",body:{decision:"approve"}});
 assert.equal(approved.status,200);assert.equal(approved.data.review.status,"approved");assert.equal(db.submissions[0].score,85);
 assert.equal(db.submissions[0].feedback,"Đã tính lại");
 assert.equal(db.audit.at(-1).action,"grade_change_approved");
 const replay=await invoke(db,{actor:{id:"admin1",role:"admin"},route:"/api/grade-reviews/"+id+"/decision",method:"POST",body:{decision:"approve"}});
 assert.equal(replay.status,409);assert.equal(db.submissions[0].score,85);
});
test("Admin rejection requires a reason and never changes the grade",async()=>{
 const db=fixture(),r=await invoke(db,{method:"POST",body:{submissionId:"sub1",newScore:90,reason:"Đáp án đã kiểm tra"}});
 const route="/api/grade-reviews/"+r.data.review.id+"/decision";
 const bad=await invoke(db,{actor:{id:"admin1",role:"admin"},route,method:"POST",body:{decision:"reject",reason:"No"}});
 assert.equal(bad.status,400);
 const ok=await invoke(db,{actor:{id:"admin1",role:"admin"},route,method:"POST",body:{decision:"reject",reason:"Chưa đủ bằng chứng"}});
 assert.equal(ok.status,200);assert.equal(db.submissions[0].score,70);
 assert.equal(db.audit.at(-1).action,"grade_change_rejected");
});
test("stale original grade or changed gradedAt never gets overwritten",async()=>{
 const db=fixture(),r=await invoke(db,{method:"POST",body:{submissionId:"sub1",newScore:90,reason:"Có đáp án bổ sung"}});
 const route="/api/grade-reviews/"+r.data.review.id+"/decision";
 db.submissions[0].gradedAt="2026-10-13T00:00:00Z";
 const stale=await invoke(db,{actor:{id:"admin1",role:"admin"},route,method:"POST",body:{decision:"approve"}});
 assert.equal(stale.status,409);assert.equal(db.submissions[0].score,70);
 assert.equal(db.gradeReviews[0].status,"pending");
});
test("teachers only see own requests; Admin pagination and history remain bounded",async()=>{
 const db=fixture();await invoke(db,{method:"POST",body:{submissionId:"sub1",newScore:85,reason:"Có đáp án bổ sung"}});
 db.gradeReviews.push({id:"other",submissionId:"sub2",requesterId:"teacher2",oldScore:2,newScore:10,reason:"Other",feedback:"",status:"pending",createdAt:"2026-10-13"});
 const teacher=await invoke(db,{route:"/api/grade-reviews?status=all"});
 assert.equal(teacher.data.reviews.length,1);
 const admin=await invoke(db,{actor:{id:"admin1",role:"admin"},route:"/api/grade-reviews?status=all"});
 assert.equal(admin.data.reviews.length,2);
 assert.equal(admin.headers["Cache-Control"],"private, no-store");
 assert.equal((await invoke(db,{route:"/api/grade-reviews?page=invalid"})).status,400);
 assert.equal((await invoke(db,{method:"DELETE"})).status,405);
});
test("server blocks direct regrading after an initial score; teacher UI binds the form",()=>{
 const fs=require("node:fs"),path=require("node:path"),root=path.join(__dirname,"..");
 const server=fs.readFileSync(path.join(root,"server.js"),"utf8");
 const app=fs.readFileSync(path.join(root,"js/app.js"),"utf8");
 assert.ok(server.includes("Bài đã chấm điểm. Muốn sửa điểm phải gửi yêu cầu"));
 assert.ok(server.includes("handleGradeReviews(req,res,p,"));
 assert.ok(app.includes('data-grade-form="'));
 assert.ok(app.includes('API.post("/api/grade-reviews"'));
});
