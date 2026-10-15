"use strict";
// The teacher dashboard is a personal summary: even when an Admin opens the
// teacher workspace, count only classes and assignments owned by that account.
function makeTeacherOverview(db,actor){
 const classes=(Array.isArray(db?.classes)?db.classes:[])
  .filter(c=>c&&String(c.teacherId)===String(actor.id));
 const classIds=new Set(classes.map(c=>String(c.id)));
 const assignments=(Array.isArray(db?.assignments)?db.assignments:[])
  .filter(a=>a&&String(a.teacherId)===String(actor.id)&&classIds.has(String(a.classId)));
 const assignedIds=new Set(assignments.map(a=>String(a.id)));
 const submissions=(Array.isArray(db?.submissions)?db.submissions:[])
  .filter(s=>s&&assignedIds.has(String(s.assignmentId)));
 const students=new Set();
 for(const c of classes)for(const studentId of Array.isArray(c.studentIds)?c.studentIds:[])
  if(studentId!==null&&studentId!==undefined&&String(studentId))students.add(String(studentId));
 const pending=submissions.filter(s=>s.score===null||s.score===undefined||s.score===""||s.gradingStatus==="pending").length;
 const byClass=new Map(classes.map(c=>[String(c.id),String(c.name||"Lớp chưa đặt tên").slice(0,80)]));
 const recentAssignments=assignments.slice().sort((a,b)=>{
  const time=value=>{const n=Date.parse(value||"");return Number.isFinite(n)?n:0};
  return time(b.createdAt)-time(a.createdAt)||String(b.id).localeCompare(String(a.id));
 }).slice(0,4).map(a=>({
  id:String(a.id),title:String(a.title||"Bài chưa đặt tên").slice(0,120),
  className:byClass.get(String(a.classId))||"Lớp không xác định",
  deadline:typeof a.deadline==="string"&&Number.isFinite(Date.parse(a.deadline))?a.deadline:null
 }));
 return {
  counts:{classes:classes.length,students:students.size,assignments:assignments.length,
   pendingGrading:pending},
  recentAssignments
 };
}
module.exports={makeTeacherOverview};
