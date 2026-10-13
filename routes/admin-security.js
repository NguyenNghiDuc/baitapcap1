"use strict";
const devices=require("../lib/login-devices");

// Device history is an observation log, not proof of active sessions.
// Never return device identifiers, tokens, session IDs, or other users' devices.
function safeDevices(db,user,req){
 return devices.list(db,user,req).map(d=>({
  device:String(d.device||"Không xác định").slice(0,80),
  browser:String(d.browser||"Không xác định").slice(0,80),
  ip:String(d.ip||"Không xác định").slice(0,80),
  firstSeenAt:d.firstSeenAt||null,
  lastSeenAt:d.lastSeenAt||null,
  current:!!d.current
 }));
}
function privileges(user){
 const ownerUid=String(process.env.ADMIN_SUPABASE_UID||"").trim();
 const owner=!!ownerUid&&String(user.authUserId||"")===ownerUid;
 return {
  title:owner?"Admin chính":"Admin được cấp quyền",
  ownerConfigured:!!ownerUid,
  isOwner:owner,
  capabilities:{
   viewUsers:true,manageRegularUsers:true,viewAudit:true,exportGrades:true,
   grantAdmin:owner,editOtherAdmins:owner,protectOwner:true
  }
 };
}
module.exports=async function handleSecurity(req,res,p,{send,requireUser,load,storage}){
 if(p!=="/api/account/devices"&&p!=="/api/admin/security")return false;
 const isAdminRoute=p==="/api/admin/security";
 const u=await requireUser(req,res,isAdminRoute?["admin"]:undefined);
 if(!u)return true;
 const extra={"Cache-Control":"private, no-store"};
 if(req.method!=="GET"){send(res,405,{error:"Chỉ hỗ trợ xem thông tin bảo mật"},{"Allow":"GET",...extra});return true}
 try{
  const db=load();
  const rows=safeDevices(db,u,req);
  const common={
   devices:rows,
   scope:storage?.status?.().mode==="supabase"?"shared-app-state":"instance-or-local",
   deviceLimit:25,
   notice:"Đây là lịch sử thiết bị đã ghi nhận, không phải danh sách phiên đăng nhập đang hoạt động. Chưa hỗ trợ đăng xuất từ xa theo từng thiết bị.",
   generatedAt:new Date().toISOString()
  };
  send(res,200,isAdminRoute?{...common,permissions:privileges(u)}:common,extra);
 }catch{
  send(res,503,{error:"Không đọc được lịch sử thiết bị. Vui lòng thử lại."},extra);
 }
 return true;
};
module.exports.privileges=privileges;
module.exports.safeDevices=safeDevices;
