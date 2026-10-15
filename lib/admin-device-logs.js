"use strict";
// Only call from authenticated Admin routes. This is a device observation log,
// not a list of live sessions or evidence of account compromise.
const LIMIT=20,MAX_PAGE=10000,DAY=86400000,WEEK=7*DAY;
const STATUSES=new Set(["all","recent","new-device","ip-change"]);
function filters(query={}){
 const page=Number(query.page??1),search=String(query.search??"").trim();
 const status=query.status??"all";
 if(!Number.isSafeInteger(page)||page<1||page>MAX_PAGE||
    typeof query.search!=="string"&&query.search!==undefined||
    typeof status!=="string"||!STATUSES.has(status)||search.length>100)
  throw Error("Bộ lọc lịch sử thiết bị không hợp lệ");
 return {page,search,status,limit:LIMIT};
}
function clean(x,len=100){return String(x??"").slice(0,len)}
function normalize(x){return String(x??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").toLowerCase()}
function within(value,ms,now){
 const stamp=Date.parse(value||"");
 return Number.isFinite(stamp)&&stamp<=now&&now-stamp<=ms;
}
function list(db,query={},now=Date.now()){
 const {page,search,status,limit}=filters(query);
 const users=new Map((db.users||[]).map(u=>[String(u.id),u]));
 const needle=normalize(search);
 const records=(db.loginDevices||[]).filter(d=>users.has(String(d.userId)))
  .map(d=>{
   const user=users.get(String(d.userId));
   return {userId:String(d.userId),name:clean(user.name||"Chưa có tên",80),
    email:clean(user.email,150),role:clean(user.role,20),
    device:clean(d.device||"Không xác định",80),browser:clean(d.browser||"Không xác định",80),
    ip:clean(d.ip||"Không xác định",80),firstSeenAt:d.firstSeenAt||null,
    lastSeenAt:d.lastSeenAt||null,ipChangedAt:d.ipChangedAt||null,
    recent24h:within(d.lastSeenAt,DAY,now),
    newDevice7d:within(d.firstSeenAt,WEEK,now),
    changedIp7d:within(d.ipChangedAt,WEEK,now)};
  });
 // Summary covers all retained devices, regardless of search or pagination.
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
  (!needle||[r.name,r.email,r.ip,r.device,r.browser].some(v=>normalize(v).includes(needle)))
 ).sort((a,b)=>(Date.parse(b.lastSeenAt||"")||0)-(Date.parse(a.lastSeenAt||"")||0));
 const total=matched.length,pages=Math.ceil(total/limit);
 return {devices:matched.slice((page-1)*limit,page*limit),
  pagination:{page,limit,total,pages,hasMore:page<pages},search,status,summary};
}
module.exports={list,filters};
