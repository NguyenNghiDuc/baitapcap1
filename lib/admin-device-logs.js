"use strict";
// Only call from authenticated Admin routes. Never expose device IDs or tokens.
const LIMIT=20,MAX_PAGE=10000;
function filters(query={}){
 const page=Number(query.page??1),search=String(query.search??"").trim();
 if(!Number.isSafeInteger(page)||page<1||page>MAX_PAGE||
    typeof query.search==="object"||search.length>100)
  throw Error("Bộ lọc lịch sử thiết bị không hợp lệ");
 return {page,search,limit:LIMIT};
}
function clean(x,len=100){return String(x??"").slice(0,len)}
function normalize(x){return String(x??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").toLowerCase()}
function list(db,query={}){
 const {page,search,limit}=filters(query);
 const users=new Map((db.users||[]).map(u=>[String(u.id),u]));
 const needle=normalize(search);
 const records=(db.loginDevices||[]).filter(d=>users.has(String(d.userId)))
  .map(d=>{
   const user=users.get(String(d.userId));
   return {userId:String(d.userId),name:clean(user.name||"Chưa có tên",80),
    email:clean(user.email,150),role:clean(user.role,20),
    device:clean(d.device||"Không xác định",80),browser:clean(d.browser||"Không xác định",80),
    ip:clean(d.ip||"Không xác định",80),firstSeenAt:d.firstSeenAt||null,lastSeenAt:d.lastSeenAt||null};
  })
  .filter(r=>!needle||[r.name,r.email,r.ip,r.device,r.browser].some(v=>normalize(v).includes(needle)))
  .sort((a,b)=>Date.parse(b.lastSeenAt||0)-Date.parse(a.lastSeenAt||0));
 const total=records.length,pages=Math.ceil(total/limit);
 return {devices:records.slice((page-1)*limit,page*limit),
  pagination:{page,limit,total,pages,hasMore:page<pages},search};
}
module.exports={list,filters};
