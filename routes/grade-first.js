"use strict";
const {execute}=require("../lib/grade-mutation");
// Preserve the old first-grade endpoint while serializing grading against
// grade-review creation and decisions in PostgreSQL.
async function handle(req,res,p,ctx){
 const match=p.match(/^\/api\/submissions\/([^/]+)\/grade$/);
 if(!match)return false;
 const {send,requireUser,parseBody}=ctx;
 const user=await requireUser(req,res,["teacher","admin"]);if(!user)return true;
 if(req.method!=="PATCH"){
  send(res,405,{error:"Chỉ hỗ trợ PATCH"},{"Allow":"PATCH","Cache-Control":"private, no-store"});return true;
 }
 let input;
 try{input=await parseBody(req)}
 catch{send(res,400,{error:"Dữ liệu không hợp lệ"},{"Cache-Control":"private, no-store"});return true}
 if(input.score===null||input.score===undefined||input.score===""||!Number.isFinite(Number(input.score))||
    Number(input.score)<0||Number(input.score)>100){
  send(res,400,{error:"Điểm phải nằm trong khoảng 0–100"},{"Cache-Control":"private, no-store"});return true;
 }
 const score=Number(input.score),feedback=String(input.feedback||"").trim().slice(0,500);
 try{
  const out=await execute(ctx,(db,audit)=>{
   const submission=(db.submissions||[]).find(s=>String(s.id)===decodeURIComponent(match[1]));
   if(!submission)return {status:404,data:{error:"Không tìm thấy bài nộp"}};
   if(user.role==="teacher"&&!(db.assignments||[]).some(a=>String(a.id)===String(submission.assignmentId)&&String(a.teacherId)===String(user.id)))
    return {status:403,data:{error:"Không được chấm bài giáo viên khác"}};
   if(submission.score!==null&&submission.score!==undefined&&submission.score!=="")
    return {status:409,data:{error:"Bài đã chấm điểm. Muốn sửa điểm phải gửi yêu cầu để Admin duyệt."}};
   submission.score=score;submission.feedback=feedback;submission.gradingStatus="teacher_graded";
   submission.gradedAt=new Date().toISOString();
   const event=audit(db,user,"submission_graded",{submissionId:submission.id,score});
   return {status:200,data:{submission},changed:true,audit:event};
  });
  send(res,out.status,out.data,{"Cache-Control":"private, no-store"});
 }catch{
  send(res,503,{error:"Chưa thể lưu điểm an toàn. Vui lòng thử lại."},{"Cache-Control":"private, no-store"});
 }
 return true;
}
module.exports=handle;
