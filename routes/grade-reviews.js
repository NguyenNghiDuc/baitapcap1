"use strict";
const crypto=require("node:crypto");
const {URL}=require("node:url");
const MAX_REQUESTS=5000,PER_PAGE=20;
function scored(s){return s&&s.score!==null&&s.score!==undefined&&s.score!==""&&Number.isFinite(Number(s.score))}
function cleanText(value,max=500){return String(value??"").trim().slice(0,max+1)}
function publicReview(r,db){
 const sub=(db.submissions||[]).find(s=>String(s.id)===String(r.submissionId));
 const a=(db.assignments||[]).find(x=>String(x.id)===String(sub?.assignmentId));
 const student=(db.users||[]).find(x=>String(x.id)===String(sub?.studentId));
 const teacher=(db.users||[]).find(x=>String(x.id)===String(r.requesterId));
 return {id:r.id,submissionId:r.submissionId,assignmentTitle:String(a?.title||"Bài tập").slice(0,100),
  studentName:String(student?.name||"Học sinh").slice(0,80),requesterName:String(teacher?.name||"Giáo viên").slice(0,80),
  oldScore:r.oldScore,newScore:r.newScore,reason:r.reason,feedback:r.feedback,
  status:r.status,createdAt:r.createdAt,decidedAt:r.decidedAt||null,decisionReason:r.decisionReason||null};
}
function canRequest(db,user,submission){
 if(user.role!=="teacher")return false;
 const a=(db.assignments||[]).find(x=>String(x.id)===String(submission.assignmentId));
 return !!a&&String(a.teacherId)===String(user.id);
}
const {execute,readLatest}=require("../lib/grade-mutation");
async function handle(req,res,p,ctx){
 if(p!=="/api/grade-reviews"&&!/^\/api\/grade-reviews\/[^/]+\/decision$/.test(p))return false;
 const {send,requireUser,parseBody}=ctx,headers={"Cache-Control":"private, no-store"};
 const user=await requireUser(req,res,["teacher","admin"]);if(!user)return true;
 if(req.method==="GET"&&p==="/api/grade-reviews"){
  const q=new URL(req.url,"http://localhost").searchParams,page=Number(q.get("page")||1),status=q.get("status")||"pending";
  if(!Number.isSafeInteger(page)||page<1||page>1000||!["pending","approved","rejected","all"].includes(status)){
   send(res,400,{error:"Bộ lọc không hợp lệ"},headers);return true;
  }
  try{
   const db=await readLatest(ctx),list=Array.isArray(db.gradeReviews)?db.gradeReviews:[];
   const rows=list.filter(r=>(user.role==="admin"||String(r.requesterId)===String(user.id))&&
      (status==="all"||r.status===status)).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
   send(res,200,{reviews:rows.slice((page-1)*PER_PAGE,page*PER_PAGE).map(r=>publicReview(r,db)),
    pagination:{page,limit:PER_PAGE,total:rows.length,pages:Math.ceil(rows.length/PER_PAGE)},
    note:"Yêu cầu sửa điểm được xử lý dưới khóa hàng PostgreSQL (khi được cấu hình)."},headers);
  }catch{
   send(res,503,{error:"Không đọc được dữ liệu duyệt điểm mới nhất."},headers);
  }
  return true;
 }
 if(req.method==="POST"&&p==="/api/grade-reviews"){
  if(user.role!=="teacher"){send(res,403,{error:"Chỉ giáo viên phụ trách được tạo yêu cầu chỉnh điểm."},headers);return true}
  if(process.env.VERCEL==="1"&&!process.env.DATABASE_URL){
   send(res,503,{error:"Cần cấu hình PostgreSQL để lưu yêu cầu duyệt điểm bền vững."},headers);return true;
  }
  let d;try{d=await parseBody(req)}catch{send(res,400,{error:"Dữ liệu yêu cầu không hợp lệ"},headers);return true}
  const id=cleanText(d.submissionId,128),newScore=d.newScore,reason=cleanText(d.reason,500),feedback=cleanText(d.feedback,1000);
  if(newScore===null||newScore===undefined||newScore===""||!Number.isFinite(Number(newScore))||
    Number(newScore)<0||Number(newScore)>100||reason.length<10||reason.length>500||feedback.length>1000){
   send(res,400,{error:"Điểm phải từ 0–100, lý do từ 10–500 ký tự."},headers);return true;
  }
  try{
   const result=await execute(ctx,(db,audit)=>{
    db.gradeReviews=Array.isArray(db.gradeReviews)?db.gradeReviews:[];
    const s=(db.submissions||[]).find(x=>String(x.id)===id);
    if(!s)return {status:404,data:{error:"Không tìm thấy bài nộp"}};
    if(!canRequest(db,user,s))return {status:403,data:{error:"Không được chỉnh điểm của lớp khác"}};
    if(!scored(s))return {status:409,data:{error:"Bài chưa chấm lần đầu. Hãy chấm bài trước khi đề nghị sửa."}};
    if(Number(newScore)===Number(s.score))return {status:400,data:{error:"Điểm đề nghị phải khác điểm hiện tại."}};
    if(db.gradeReviews.some(r=>r.status==="pending"&&String(r.submissionId)===id))
     return {status:409,data:{error:"Bài nộp đang có yêu cầu chờ duyệt."}};
    if(db.gradeReviews.length>=MAX_REQUESTS)
     return {status:409,data:{error:"Kho yêu cầu đã đầy; cần lưu trữ lịch sử trước khi tiếp tục."}};
    const review={id:crypto.randomUUID(),submissionId:id,requesterId:user.id,
     oldScore:Number(s.score),oldGradedAt:s.gradedAt||null,newScore:Number(newScore),
     reason,feedback,status:"pending",createdAt:new Date().toISOString()};
    db.gradeReviews.unshift(review);
    const entry=audit(db,user,"grade_change_requested",{reviewId:review.id,submissionId:id});
    return {status:201,data:{review:publicReview(review,db)},changed:true,audit:entry};
   });
   send(res,result.status,result.data,headers);
  }catch{
   send(res,503,{error:"Không lưu được yêu cầu an toàn. Vui lòng thử lại."},headers);
  }
  return true;
 }
 const match=p.match(/^\/api\/grade-reviews\/([^/]+)\/decision$/);
 if(req.method==="POST"&&match){
  if(user.role!=="admin"){send(res,403,{error:"Chỉ Admin được quyết định yêu cầu sửa điểm."},headers);return true}
  if(process.env.VERCEL==="1"&&!process.env.DATABASE_URL){
   send(res,503,{error:"Cần cấu hình PostgreSQL để lưu quyết định duyệt điểm."},headers);return true;
  }
  let d;try{d=await parseBody(req)}catch{send(res,400,{error:"Dữ liệu quyết định không hợp lệ"},headers);return true}
  const decision=String(d.decision||""),decisionReason=cleanText(d.reason,500);
  if(!["approve","reject"].includes(decision)||
      (decision==="reject"&&(decisionReason.length<8||decisionReason.length>500))){
   send(res,400,{error:"Quyết định không hợp lệ. Từ chối cần lý do tối thiểu 8 ký tự."},headers);return true;
  }
  try{
   const output=await execute(ctx,(db,audit)=>{
    db.gradeReviews=Array.isArray(db.gradeReviews)?db.gradeReviews:[];
    const review=db.gradeReviews.find(r=>String(r.id)===match[1]);
    if(!review)return {status:404,data:{error:"Không tìm thấy yêu cầu"}};
    if(review.status!=="pending")return {status:409,data:{error:"Yêu cầu đã được xử lý."}};
    if(String(review.requesterId)===String(user.id))return {status:403,data:{error:"Không được tự duyệt yêu cầu của mình."}};
    const submission=(db.submissions||[]).find(s=>String(s.id)===String(review.submissionId));
    if(!submission||!scored(submission))return {status:409,data:{error:"Bài nộp không còn hợp lệ; không thể duyệt."}};
    if(decision==="approve"&&(Number(submission.score)!==Number(review.oldScore)||
     (submission.gradedAt||null)!==(review.oldGradedAt||null))){
     return {status:409,data:{error:"Điểm gốc đã thay đổi. Hãy kiểm tra bài nộp và tạo yêu cầu mới."}};
    }
    if(decision==="approve"){
     submission.score=review.newScore;submission.gradingStatus="teacher_graded";
     submission.feedback=review.feedback||submission.feedback||"";
     submission.gradedAt=new Date().toISOString();
    }
    review.status=decision==="approve"?"approved":"rejected";
    review.decidedAt=new Date().toISOString();review.deciderId=user.id;review.decisionReason=decisionReason;
    const entry=audit(db,user,decision==="approve"?"grade_change_approved":"grade_change_rejected",
     {reviewId:review.id,submissionId:review.submissionId});
    return {status:200,data:{review:publicReview(review,db)},changed:true,audit:entry};
   });
   send(res,output.status,output.data,headers);
  }catch{
   send(res,503,{error:"Không lưu được quyết định an toàn. Vui lòng thử lại."},headers);
  }
  return true;
 }
 send(res,405,{error:"Phương thức không hỗ trợ"},{"Allow":p==="/api/grade-reviews"?"GET, POST":"POST",...headers});
 return true;
}
module.exports=handle;module.exports.scored=scored;module.exports.canRequest=canRequest;
