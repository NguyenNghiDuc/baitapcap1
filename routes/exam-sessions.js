"use strict";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
module.exports=async function examSessions(req,res,p,ctx){
 const studentPath="/api/real/me/exam-sessions/";
 const adminPath="/api/real/admin/exam-sessions";
 if(!p.startsWith(studentPath)&&p!==adminPath)return false;
 const {send,parseBody,requireUser,pg}=ctx;
 const actor=await requireUser(req,res,p===adminPath?["admin"]:["student"]);
 if(!actor)return true;
 if(!process.env.DATABASE_URL)return send(res,503,{error:"Cần kết nối Supabase PostgreSQL để theo dõi bài làm. Không dùng số liệu giả."}),true;
 try{
  if(p===adminPath&&req.method==="GET"){
   const q=new URL(req.url||p,"https://app.local").searchParams;
   const grade=q.get("grade")||"",status=q.get("status")||"",search=(q.get("search")||"").trim(),page=q.get("page")||"1";
   if((grade&&!/^[1-5]$/.test(grade))||(status&&!["active","disconnected","expired","submitted"].includes(status))||search.length>80||!/^[1-9][0-9]{0,4}$/.test(page))
    return send(res,400,{error:"Bộ lọc giám sát không hợp lệ"}),true;
   return send(res,200,{source:"postgres",...(await pg.adminExamSessions({grade:grade?Number(grade):null,search:search||null,status:status||null,page:Number(page)}))}),true;
  }
  const operation=p.slice(studentPath.length);
  if(req.method!=="POST"||!["start","heartbeat","submit"].includes(operation))return send(res,405,{error:"Phương thức không hỗ trợ"}),true;
  let body;try{body=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu yêu cầu không hợp lệ"}),true}
  const id=String(body?.id||"");
  if(!uuid.test(id))return send(res,400,{error:"Mã phiên làm bài không hợp lệ"}),true;
  let session;
  if(operation==="start"){
   const duration=Number(body.durationMinutes),total=Number(body.totalQuestions),grade=Number(body.grade);
   const examId=String(body.examId||"").trim(),title=String(body.title||"").trim(),subject=String(body.subject||"").trim();
   if(!Number.isInteger(duration)||duration<5||duration>180||!Number.isInteger(total)||total<1||total>200||!Number.isInteger(grade)||grade<1||grade>5||examId.length<1||examId.length>120||title.length<1||title.length>180||!["math","vietnamese","english","science","nature","history","mixed"].includes(subject))
    return send(res,400,{error:"Thông tin bài kiểm tra không hợp lệ"}),true;
   session=await pg.startExamSession(actor.id,{id,examId,title,subject,grade,durationMinutes:duration,totalQuestions:total});
  }else{
   const answeredCount=Number(body.answeredCount);
   if(!Number.isInteger(answeredCount)||answeredCount<0||answeredCount>200)return send(res,400,{error:"Số câu đã làm không hợp lệ"}),true;
   session=operation==="heartbeat"?await pg.touchExamSession(actor.id,id,answeredCount):await pg.submitExamSession(actor.id,id,answeredCount);
  }
  if(!session)return send(res,404,{error:"Không tìm thấy phiên làm bài thuộc tài khoản này"}),true;
  return send(res,200,{source:"postgres",session,serverNow:new Date().toISOString()}),true;
 }catch(e){
  ctx.monitor?.warn?.("exam_session_failed",{operation:p,error:e.message});
  return send(res,503,{error:"Không lưu hoặc đọc được phiên làm bài trên PostgreSQL"}),true;
 }
};
