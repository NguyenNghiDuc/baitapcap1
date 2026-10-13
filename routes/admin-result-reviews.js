"use strict";
const {URL}=require("node:url");
const {execute,readLatest}=require("../lib/grade-mutation");
const {reviewSignals}=require("./admin-results");
const HEADERS={"Cache-Control":"private, no-store"};
const STATUSES=new Set(["reviewed","dismissed"]);
function publicRecord(x){return {resultId:x.resultId,status:x.status,reason:x.reason,reviewerId:x.reviewerId,reviewedAt:x.reviewedAt,scoreAtReview:x.scoreAtReview,flagReasons:x.flagReasons};}
async function findResult(ctx,id,client){
 if(process.env.DATABASE_URL){
  const sql='SELECT id,score,correct,total,duration_sec AS "durationSec" FROM results WHERE id=$1'+(client?' FOR SHARE':'');
  const r=await (client||ctx.pg).query(sql,[id]);
  return r.rows[0]||null;
 }
 return (ctx.load().results||[]).find(x=>String(x.id)===id)||null;
}
async function handler(req,res,p,ctx){
 if(p!=="/api/admin/result-reviews"&&p!=="/api/admin/result-reviews/decision")return false;
 const {send,requireUser,parseBody}=ctx;
 const admin=await requireUser(req,res,["admin"]);if(!admin)return true;
 if(req.method==="GET"&&p==="/api/admin/result-reviews"){
  try{
   const q=new URL(req.url,"http://localhost").searchParams;
   const requestedIds=q.getAll("resultId");
   const ids=requestedIds.map(x=>x.trim());
   const page=Number(q.get("page")||1),limit=20,status=q.get("status")||"all";
   if(!Number.isSafeInteger(page)||page<1||page>10000||!["all","reviewed","dismissed"].includes(status)||
      ids.length>50||ids.some(x=>!x||x.length>128)){
    send(res,400,{error:"Bộ lọc lịch sử không hợp lệ"},HEADERS);return true;
   }
   const db=await readLatest(ctx);
   const all=Array.isArray(db.resultReviewDecisions)?db.resultReviewDecisions:[];
   const records=all.filter(x=>(!ids.length||ids.includes(String(x.resultId)))&&(status==="all"||x.status===status))
    .sort((a,b)=>String(b.reviewedAt||"").localeCompare(String(a.reviewedAt||"")));
   const pages=Math.ceil(records.length/limit);
   send(res,200,{reviews:records.slice((page-1)*limit,page*limit).map(publicRecord),pagination:{page,limit,total:records.length,pages,hasMore:page<pages}},HEADERS);
  }catch{send(res,503,{error:"Không đọc được lịch sử xem xét."},HEADERS)}
  return true;
 }
 if(req.method==="POST"&&p==="/api/admin/result-reviews/decision"){
  if(process.env.VERCEL==="1"&&!process.env.DATABASE_URL){send(res,503,{error:"Cần PostgreSQL để lưu quyết định bền vững."},HEADERS);return true}
  let d;try{d=await parseBody(req)}catch{send(res,400,{error:"Yêu cầu không hợp lệ"},HEADERS);return true}
  const resultId=String(d.resultId||"").trim(),status=String(d.status||"");
  const reason=String(d.reason||"").trim();
  if(!resultId||resultId.length>128||!STATUSES.has(status)||reason.length<10||reason.length>500){
   send(res,400,{error:"Chọn kết luận và nhập lý do từ 10–500 ký tự."},HEADERS);return true;
  }
  try{
   const found=await findResult(ctx,resultId);
   if(!found){send(res,404,{error:"Không tìm thấy bài kiểm tra"},HEADERS);return true}
   const signals=reviewSignals(found);
   if(!signals.length){send(res,409,{error:"Bài không còn dấu hiệu bất thường để xem xét."},HEADERS);return true}
   const out=await execute(ctx,async(db,audit,client)=>{
    // Recheck the authoritative result while holding the app_state transaction lock.
    if(process.env.DATABASE_URL&&!client)throw Error("Missing transaction client for review");
    const latest=await findResult(ctx,resultId,client);
    if(!latest)return {status:404,data:{error:"Bài kiểm tra không còn tồn tại."}};
    const currentSignals=reviewSignals(latest);
    if(!currentSignals.length)return {status:409,data:{error:"Dấu hiệu bất thường đã thay đổi. Tải lại dữ liệu."}};
    if(JSON.stringify({score:latest.score,correct:latest.correct,total:latest.total,durationSec:latest.durationSec})!==JSON.stringify({score:found.score,correct:found.correct,total:found.total,durationSec:found.durationSec}))
     return {status:409,data:{error:"Dữ liệu bài thi đã thay đổi. Vui lòng tải lại."}};
    db.resultReviewDecisions=Array.isArray(db.resultReviewDecisions)?db.resultReviewDecisions:[];
    if(db.resultReviewDecisions.some(x=>String(x.resultId)===resultId))
     return {status:409,data:{error:"Bài này đã có quyết định. Tải lại để xem."}};
    const record={resultId,status,reason,reviewerId:String(admin.id),reviewedAt:new Date().toISOString(),
     scoreAtReview:latest.score??null,flagReasons:currentSignals};
    db.resultReviewDecisions.unshift(record);
    const entry=audit(db,admin,"exam_result_review_decided",{resultId,status});
    return {status:201,data:{review:publicRecord(record)},changed:true,audit:entry};
   });
   send(res,out.status,out.data,HEADERS);
  }catch{send(res,503,{error:"Không lưu được quyết định. Vui lòng thử lại."},HEADERS)}
  return true;
 }
 send(res,405,{error:"Phương thức không được hỗ trợ"},{"Allow":p.endsWith("/decision")?"POST":"GET",...HEADERS});return true;
}
module.exports=handler;
