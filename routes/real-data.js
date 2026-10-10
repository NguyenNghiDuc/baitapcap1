"use strict";
const loginDevices=require("../lib/login-devices");
const allowed=new Set([
 "/api/real/me/activity","/api/real/me/notifications","/api/real/me/devices",
 "/api/real/admin/dashboard","/api/real/admin/audit","/api/real/admin/errors","/api/real/admin/grades"
]);
module.exports=async function realData(req,res,p,ctx){
 const pathMatch=/^\/api\/real\/me\/notifications\/([a-zA-Z0-9_-]{1,100})\/read$/.exec(p);
 if(!allowed.has(p)&&!pathMatch)return false;
 const {pg,send,requireUser}=ctx;
 const admin=p.startsWith("/api/real/admin/");
 const u=await requireUser(req,res,admin?["admin"]:undefined);
 if(!u)return true;
 if(!process.env.DATABASE_URL)return send(res,503,{error:"Chưa cấu hình DATABASE_URL. Không tạo dữ liệu giả hoặc đọc bộ nhớ tạm."}),true;
 try{
  if(p==="/api/real/me/activity"&&req.method==="GET")return send(res,200,{source:"postgres",activity:await pg.accountActivity(u.id)}),true;
  if(p==="/api/real/me/notifications"&&req.method==="GET")return send(res,200,{source:"postgres",items:await pg.listNotifications(u.id)}),true;
  if(pathMatch&&req.method==="PATCH"){
   const ok=await pg.markNotification(u.id,pathMatch[1]);
   return send(res,ok?200:404,ok?{ok:true}:{error:"Không tìm thấy thông báo của tài khoản"}),true;
  }
  if(p==="/api/real/me/devices"&&req.method==="GET"){
   const id=loginDevices.clientId(req);
   const rows=await pg.listDevices(u.id);
   return send(res,200,{source:"postgres",devices:rows.map(x=>({device:x.device,browser:x.browser,ip:x.ip||"Không xác định",firstSeenAt:x.first_seen_at,lastSeenAt:x.last_seen_at,current:x.device_id===id}))}),true;
  }
  if(p==="/api/real/admin/grades"&&req.method==="GET"){
   const params=new URL(req.url||p,"https://app.local").searchParams;
   const grade=params.get("grade")||"";
   const subject=params.get("subject")||"";
   const status=params.get("status")||"";
   const search=(params.get("search")||"").trim();
   const pageText=params.get("page")||"1";
   if(grade&&!/^[1-5]$/.test(grade))return send(res,400,{error:"Lớp phải từ 1 đến 5"}),true;
   if(subject&&!["math","vietnamese","english","nature","science","history"].includes(subject))return send(res,400,{error:"Môn học không hợp lệ"}),true;
   if(status&&!["verified","unverified"].includes(status))return send(res,400,{error:"Trạng thái điểm không hợp lệ"}),true;
   if(!/^[1-9][0-9]{0,4}$/.test(pageText)||search.length>80)return send(res,400,{error:"Bộ lọc điểm không hợp lệ"}),true;
   const data=await pg.adminGrades({grade:grade?Number(grade):null,subject:subject||null,status:status||null,search:search||null,page:Number(pageText)});
   return send(res,200,{source:"postgres",...data}),true;
  }
  if(p==="/api/real/admin/dashboard"&&req.method==="GET")return send(res,200,{source:"postgres",stats:await pg.adminLive()}),true;
  if(p==="/api/real/admin/audit"&&req.method==="GET")return send(res,200,{source:"postgres",events:await pg.adminAudit()}),true;
  if(p==="/api/real/admin/errors"&&req.method==="GET")return send(res,200,{source:"postgres",errors:await pg.recentClientErrors()}),true;
  return send(res,405,{error:"Phương thức không hỗ trợ"}),true;
 }catch(e){
  ctx.monitor?.error?.("real_data_query_failed",{path:p,error:e.message});
  return send(res,503,{error:"Không đọc được dữ liệu PostgreSQL. Vui lòng kiểm tra database và migration."}),true;
 }
};
