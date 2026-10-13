"use strict";
// Teacher/Admin only aggregate overview: no child names, emails or join codes.
const {URL}=require("node:url");
function safePage(query){
 const p=Number(query.get("page")||1),l=Number(query.get("limit")||12);
 if(!Number.isInteger(p)||p<1||p>10000||!Number.isInteger(l)||l<1||l>20)return null;
 return {page:p,limit:l};
}
function collect(db,user,{page=1,limit=12}={}){
 const classes=(Array.isArray(db?.classes)?db.classes:[]).filter(c=>
  user.role==="admin"||String(c.teacherId||"")===String(user.id));
 const assignments=Array.isArray(db?.assignments)?db.assignments:[];
 const submissions=Array.isArray(db?.submissions)?db.submissions:[];
 const all=new Map(),entries=new Map();
 for(const c of classes){all.set(String(c.id),[])}
 for(const a of assignments){
  const group=all.get(String(a.classId));if(group)group.push(a);
  entries.set(String(a.id),String(a.classId));
 }
 const submissionsByClass=new Map();
 for(const s of submissions){
  const classId=entries.get(String(s.assignmentId));
  if(!classId||!all.has(classId))continue;
  const list=submissionsByClass.get(classId)||[];
  list.push(s);submissionsByClass.set(classId,list);
 }
 const sorted=classes.slice().sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"vi")||String(a.id).localeCompare(String(b.id)));
 const records=sorted.slice((page-1)*limit,page*limit).map(c=>{
  const members=new Set((Array.isArray(c.studentIds)?c.studentIds:[]).map(String)),tasks=all.get(String(c.id))||[];
  const validAssignments=new Set(tasks.map(a=>String(a.id)));
  const submitted=new Set();let attempts=0,pending=0,graded=0;
  for(const s of submissionsByClass.get(String(c.id))||[]){
   if(!members.has(String(s.studentId))||!validAssignments.has(String(s.assignmentId)))continue;
   attempts++;
   submitted.add(JSON.stringify([String(s.assignmentId),String(s.studentId)]));
   if(s.score===null||s.score===undefined||s.gradingStatus==="pending")pending++;
   else graded++;
  }
  const opportunities=members.size*tasks.length;
  return {id:String(c.id),name:String(c.name||"Lớp học").slice(0,80),grade:Number(c.grade)||null,
   studentCount:members.size,assignmentCount:tasks.length,submissionAttempts:attempts,
   uniqueSubmitted:submitted.size,pendingReview:pending,gradedAttempts:graded,
   completionRate:opportunities?Math.round(100*submitted.size/opportunities):null,
   coverageDefinition:"Tỷ lệ cặp học sinh hiện trong lớp × bài được giao có ít nhất một lượt nộp.",
   lastAssignmentAt:tasks.reduce((v,a)=>String(a.createdAt||"")>v?String(a.createdAt):v,"")||null};
 });
 return {classes:records,pagination:{page,limit,total:classes.length,pages:Math.max(1,Math.ceil(classes.length/limit))},
  scope:"current-class-membership",generatedAt:new Date().toISOString(),
  note:"Thống kê dựa trên dữ liệu lớp, bài giao và bài nộp hiện có; không xác minh điểm hoặc phản ánh tiến bộ dài hạn."};
}
async function handle(req,res,p,{send,requireUser,load}){
 if(p!=="/api/teacher/class-insights")return false;
 const user=await requireUser(req,res,["teacher","admin"]);if(!user)return true;
 const headers={"Cache-Control":"private, no-store"};
 if(req.method!=="GET"){send(res,405,{error:"Chỉ hỗ trợ GET"},{"Allow":"GET",...headers});return true}
 const query=new URL(req.url,"http://localhost").searchParams,page=safePage(query);
 if(!page){send(res,400,{error:"Trang hoặc giới hạn kết quả không hợp lệ"},headers);return true}
 try{
  send(res,200,collect(load(),user,page),headers);
 }catch{
  send(res,503,{error:"Không tải được thống kê lớp học. Vui lòng thử lại."},headers);
 }
 return true;
}
module.exports=handle;module.exports.collect=collect;module.exports.safePage=safePage;
