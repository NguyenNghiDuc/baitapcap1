"use strict";
const loginDevices=require("../lib/login-devices");
const allowed=new Set([
 "/api/real/me/activity","/api/real/me/notifications","/api/real/me/devices",
 "/api/real/admin/dashboard","/api/real/admin/audit","/api/real/admin/errors"
]);
module.exports=async function realData(req,res,p,ctx){
 const pathMatch=/^\/api\/real\/me\/notifications\/([a-zA-Z0-9_-]{1,100})\/read$/.exec(p);
 if(!allowed.has(p)&&!pathMatch)return false;
 const {pg,send,requireUser}=ctx;
 if(!process.env.DATABASE_URL)return send(res,503,{error:"Chưa cấu hình DATABASE_URL. Không tạo dữ liệu giả hoặc đọc bộ nhớ tạm."}),true;
 const admin=p.startsWith("/api/real/admin/");
 const u=await requireUser(req,res,admin?["admin"]:undefined);
 if(!u)return true;
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
  if(p==="/api/real/admin/dashboard"&&req.method==="GET")return send(res,200,{source:"postgres",stats:await pg.adminLive()}),true;
  if(p==="/api/real/admin/audit"&&req.method==="GET")return send(res,200,{source:"postgres",events:await pg.adminAudit()}),true;
  if(p==="/api/real/admin/errors"&&req.method==="GET")return send(res,200,{source:"postgres",errors:await pg.recentClientErrors()}),true;
  return send(res,405,{error:"Phương thức không hỗ trợ"}),true;
 }catch(e){
  ctx.monitor?.error?.("real_data_query_failed",{path:p,error:e.message});
  return send(res,503,{error:"Không đọc được dữ liệu PostgreSQL. Vui lòng kiểm tra database và migration."}),true;
 }
};
