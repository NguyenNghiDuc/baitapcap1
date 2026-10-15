"use strict";
const devices=require("../lib/login-devices");
const adminDeviceLogs=require("../lib/admin-device-logs");

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
module.exports=async function handleSecurity(req,res,p,{send,requireUser,load,storage,pg}){
 if(p!=="/api/account/devices"&&p!=="/api/admin/security"&&p!=="/api/admin/device-logs")return false;
 const isAdminRoute=p!=="/api/account/devices";
 const u=await requireUser(req,res,isAdminRoute?["admin"]:undefined);
 if(!u)return true;
 const extra={"Cache-Control":"private, no-store"};
 if(req.method!=="GET"){send(res,405,{error:"Chỉ hỗ trợ xem thông tin bảo mật"},{"Allow":"GET",...extra});return true}
 try{
  if(p==="/api/admin/device-logs"){
   const {URL}=require("node:url");
   const q=new URL(req.url,"http://localhost").searchParams;
   const query={page:q.getAll("page"),search:q.getAll("search"),status:q.getAll("status")};
   if(Object.values(query).some(values=>values.length>1)){
    send(res,400,{error:"Bộ lọc không hợp lệ"},extra);return true;
   }
   query.page=query.page[0]??"1";
   query.search=query.search[0]??"";
   query.status=query.status[0]??"all";
   let parsed;try{parsed=adminDeviceLogs.filters(query)}
   catch{send(res,400,{error:"Bộ lọc không hợp lệ"},extra);return true}
   // PostgreSQL shared state, not a potentially stale serverless instance cache.
   const db=process.env.DATABASE_URL?await pg.loadAppState():load();
   if(!db||!Array.isArray(db.users))throw Error("Device database unavailable");
   const out=adminDeviceLogs.list(db,parsed);
   send(res,200,{...out,source:process.env.DATABASE_URL?"postgres":"local",
    note:"Số liệu dựa trên thiết bị đã ghi nhận, không phải số lần đăng nhập hay phiên đang online. Đổi IP có thể do mạng di động hoặc VPN, không khẳng định tài khoản bị xâm nhập."},extra);
   return true;
  }
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
