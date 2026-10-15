"use strict";
// Only call from authenticated Admin routes. This is a device observation log,
// not a list of live sessions or evidence of account compromise.
const {activeObservations}=require("./admin-device-reviews");
const LIMIT=20,MAX_PAGE=10000,DAY=86400000,WEEK=7*DAY;
const STATUSES=new Set(["all","recent","new-device","ip-change"]);
const PERIODS=Object.freeze({"all":null,"24h":DAY,"7d":WEEK,"30d":30*DAY});
function filters(query={}){
 const page=Number(query.page??1),search=String(query.search??"").trim();
 const status=query.status??"all",userId=query.userId??"",period=query.period===undefined?"all":query.period;
 if(!Number.isSafeInteger(page)||page<1||page>MAX_PAGE||
    typeof query.search!=="string"&&query.search!==undefined||
    typeof status!=="string"||!STATUSES.has(status)||search.length>100||
    typeof userId!=="string"||userId.length>128||(userId.length>0&&!userId.trim())||
    typeof period!=="string"||!Object.hasOwn(PERIODS,period))
  throw Error("Bộ lọc lịch sử thiết bị không hợp lệ");
 return {page,search,status,userId,period,limit:LIMIT};
}
function clean(x,len=100){return String(x??"").slice(0,len)}
function normalize(x){return String(x??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").toLowerCase()}
function within(value,ms,now){
 const stamp=Date.parse(value||"");
 return Number.isFinite(stamp)&&stamp<=now&&now-stamp<=ms;
}
function list(db,query={},now=Date.now()){
 const {page,search,status,userId,period,limit}=filters(query);
 const users=new Map((db.users||[]).map(u=>[String(u.id),u]));
 const needle=normalize(search),selectedAccount=userId?users.get(userId):null;
 const decisionMap=new Map((db.deviceSecurityReviews||[]).map(r=>[r.observationId,r]));
 const records=(db.loginDevices||[]).filter(d=>users.has(String(d.userId))&&(!userId||String(d.userId)===userId))
  .map(d=>{
   const user=users.get(String(d.userId));
   return {userId:String(d.userId),name:clean(user.name||"Chưa có tên",80),
    email:clean(user.email,150),role:clean(user.role,20),
    device:clean(d.device||"Không xác định",80),browser:clean(d.browser||"Không xác định",80),
    ip:clean(d.ip||"Không xác định",80),firstSeenAt:d.firstSeenAt||null,
    lastSeenAt:d.lastSeenAt||null,ipChangedAt:d.ipChangedAt||null,
    recent24h:within(d.lastSeenAt,DAY,now),
    newDevice7d:within(d.firstSeenAt,WEEK,now),
    changedIp7d:within(d.ipChangedAt,WEEK,now),
    observations:activeObservations(d,now).map(o=>({...o,reviewStatus:decisionMap.get(o.id)?.status||null}))};
  });
 // Summary covers the selected account when supplied; otherwise all retained devices.
 // Search, status, period and pagination do not change the summary for that scope.
 const summary={
  totalDevices:records.length,
  uniqueAccounts:new Set(records.map(r=>r.userId)).size,
  recent24h:records.filter(r=>r.recent24h).length,
  newDevices7d:records.filter(r=>r.newDevice7d).length,
  changedIp7d:records.filter(r=>r.changedIp7d).length
 };
 const matched=records.filter(r=>
  (status==="all"||status==="recent"&&r.recent24h||
   status==="new-device"&&r.newDevice7d||status==="ip-change"&&r.changedIp7d)&&
  (period==="all"||within(r.lastSeenAt,PERIODS[period],now))&&
  (!needle||[r.name,r.email,r.ip,r.device,r.browser].some(v=>normalize(v).includes(needle)))
 ).sort((a,b)=>(Date.parse(b.lastSeenAt||"")||0)-(Date.parse(a.lastSeenAt||"")||0));
 const total=matched.length,pages=Math.ceil(total/limit);
 return {devices:matched.slice((page-1)*limit,page*limit),
  pagination:{page,limit,total,pages,hasMore:page<pages},search,status,period,summary,
  account:userId&&selectedAccount?{userId,name:clean(selectedAccount.name||"Chưa có tên",80),email:clean(selectedAccount.email,150)}:null,
  userId};
}
module.exports={list,filters};
