"use strict";
const crypto=require("node:crypto");
const {execute,readLatest}=require("./grade-mutation");
const WINDOW=7*86400000;
const TYPES=new Set(["new-device","ip-change"]);
const DECISIONS=new Set(["reviewed","dismissed"]);
const PERIODS=Object.freeze({all:null,"24h":86400000,"7d":7*86400000,"30d":30*86400000,"90d":90*86400000});
const HISTORY_TYPES=new Set(["all",...TYPES]);
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
function parseHistoryFilters(query={}){
 const pageRaw=query.page===undefined?"1":query.page,
  status=query.status===undefined?"all":query.status,
  userId=query.userId===undefined?"":query.userId,
  period=query.period===undefined?"all":query.period,
  type=query.type===undefined?"all":query.type;
 if((typeof pageRaw!=="string"&&typeof pageRaw!=="number")||
    !/^[1-9]\d*$/.test(String(pageRaw))||
    typeof status!=="string"||!["all",...DECISIONS].includes(status)||
    typeof period!=="string"||!Object.hasOwn(PERIODS,period)||
    typeof type!=="string"||!HISTORY_TYPES.has(type)||
    typeof userId!=="string"||userId.length>128||(userId.length>0&&!userId.trim()))
  throw Error("Invalid device review filters");
 const page=Number(pageRaw);
 if(!Number.isSafeInteger(page)||page>10000)throw Error("Invalid device review filters");
 return {page,status,userId,period,type};
}
function history(db,query={},now=Date.now()){
 const {page,status,userId,period,type}=parseHistoryFilters(query);
 const all=(Array.isArray(db.deviceSecurityReviews)?db.deviceSecurityReviews:[])
  .filter(x=>x&&(!userId||String(x.userId)===userId));
 // Summary is for the selected account (or all accounts), independent of all
 // status/type/time filters and pagination. No IP or raw device IDs in results.
 const summary={total:all.length,reviewed:0,dismissed:0,newDevice:0,ipChange:0,last30d:0};
 for(const item of all){
  if(item.status==="reviewed")summary.reviewed++;
  if(item.status==="dismissed")summary.dismissed++;
  if(item.type==="new-device")summary.newDevice++;
  if(item.type==="ip-change")summary.ipChange++;
  const t=Date.parse(item.reviewedAt||"");
  if(Number.isFinite(t)&&t<=now&&now-t<=PERIODS["30d"])summary.last30d++;
 }
 const records=all.filter(x=>
  (status==="all"||x.status===status)&&
  (type==="all"||x.type===type)&&
  (period==="all"||(()=>{
   const t=Date.parse(x.reviewedAt||"");
   return Number.isFinite(t)&&t<=now&&now-t<=PERIODS[period];
  })())
 ).sort((a,b)=>{
  const diff=(Date.parse(b.reviewedAt||"")||0)-(Date.parse(a.reviewedAt||"")||0);
  return diff||String(b.id||"").localeCompare(String(a.id||""));
 });
 const total=records.length,limit=10;
 return {reviews:records.slice((page-1)*limit,page*limit).map(x=>publicReview(x,db)),
  summary,filters:{status,type,period,userId},
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
module.exports={activeObservations,observationId,findObservation,history,parseHistoryFilters,validateDecision,decide,recently};
