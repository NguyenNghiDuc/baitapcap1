"use strict";
const crypto=require("node:crypto");
const {execute,readLatest}=require("./grade-mutation");
const WINDOW=7*86400000;
const TYPES=new Set(["new-device","ip-change"]);
const DECISIONS=new Set(["reviewed","dismissed"]);
const clean=(v,n)=>String(v??"").slice(0,n);
function recently(value,now=Date.now()){
 const t=Date.parse(value||"");
 return Number.isFinite(t)&&t<=now&&now-t<=WINDOW;
}
// Stable opaque ID. Never expose deviceId or embed raw IP in journal entries.
function observationId(d,type){
 if(!TYPES.has(type))throw Error("Unsupported observation");
 const at=type==="new-device"?d.firstSeenAt:d.ipChangedAt;
 return crypto.createHash("sha256").update(JSON.stringify([
  "security-observation-v1",String(d.userId||""),String(d.deviceId||""),
  type,String(at||""),String(d.device||""),String(d.browser||"")
 ])).digest("hex");
}
function activeObservations(d,now=Date.now()){
 const result=[];
 if(recently(d.firstSeenAt,now))result.push({id:observationId(d,"new-device"),type:"new-device",observedAt:d.firstSeenAt});
 if(recently(d.ipChangedAt,now))result.push({id:observationId(d,"ip-change"),type:"ip-change",observedAt:d.ipChangedAt});
 return result;
}
function findObservation(db,id,now=Date.now()){
 for(const d of db.loginDevices||[]){
  if(!(db.users||[]).some(u=>String(u.id)===String(d.userId)))continue;
  for(const observation of activeObservations(d,now)){
   if(observation.id===id)return {userId:String(d.userId),...observation};
  }
 }
 return null;
}
function publicReview(r,db){
 const user=(db.users||[]).find(u=>String(u.id)===String(r.userId));
 return {id:r.id,observationId:r.observationId,userId:r.userId,
  accountName:clean(user?.name||"Tài khoản đã xóa",80),
  type:r.type,status:r.status,reason:r.reason,
  reviewerId:r.reviewerId,reviewedAt:r.reviewedAt,observedAt:r.observedAt};
}
function history(db,query={}){
 const page=Number(query.page??1),status=query.status??"all",userId=query.userId??"";
 if(!Number.isSafeInteger(page)||page<1||page>10000||
  typeof status!=="string"||!["all","reviewed","dismissed"].includes(status)||
  typeof userId!=="string"||userId.length>128||(userId.length>0&&!userId.trim()))
  throw Error("Invalid device review filters");
 const items=(db.deviceSecurityReviews||[]).filter(x=>
  (!userId||String(x.userId)===userId)&&(status==="all"||x.status===status)
 ).sort((a,b)=>String(b.reviewedAt).localeCompare(String(a.reviewedAt)));
 const total=items.length,limit=10;
 return {reviews:items.slice((page-1)*limit,page*limit).map(x=>publicReview(x,db)),
  pagination:{page,limit,total,pages:Math.ceil(total/limit),hasMore:page*limit<total}};
}
function validateDecision(body){
 const observationId=String(body?.observationId??"").trim().toLowerCase();
 const status=body?.status,reason=body?.reason;
 if(!/^[a-f0-9]{64}$/.test(observationId)||!DECISIONS.has(status)||
    typeof reason!=="string"||reason.trim().length<10||reason.trim().length>500)
  throw Error("Chọn kết luận và nhập lý do từ 10 đến 500 ký tự.");
 return {observationId,status,reason:reason.trim()};
}
function decide(db,actor,decision,audit,now=Date.now()){
 const observation=findObservation(db,decision.observationId,now);
 if(!observation)return {status:409,data:{error:"Dấu hiệu không còn tồn tại hoặc đã quá 7 ngày. Tải lại danh sách."}};
 db.deviceSecurityReviews=Array.isArray(db.deviceSecurityReviews)?db.deviceSecurityReviews:[];
 if(db.deviceSecurityReviews.some(r=>r.observationId===decision.observationId))
  return {status:409,data:{error:"Dấu hiệu này đã có quyết định. Vui lòng tải lại."}};
 const record={id:crypto.randomUUID(),observationId:decision.observationId,
  userId:observation.userId,type:observation.type,observedAt:observation.observedAt,
  status:decision.status,reason:decision.reason,reviewerId:String(actor.id),
  reviewedAt:new Date(now).toISOString()};
 db.deviceSecurityReviews.unshift(record);
 const event=audit(db,actor,"device_observation_review_decided",{
  reviewId:record.id,userId:record.userId,type:record.type,status:record.status
 });
 return {status:201,data:{review:publicReview(record,db)},changed:true,audit:event};
}
module.exports={activeObservations,observationId,findObservation,history,validateDecision,decide,recently};
