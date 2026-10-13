"use strict";
// Owner-only, read-only backup readiness. Does not download private student data
// or initiate backup/restore on a serverless web request.
async function bounded(task,ms=2000){
 let timer;
 try{return await Promise.race([Promise.resolve().then(task),new Promise((_,reject)=>{
  timer=setTimeout(()=>reject(new Error("timeout")),ms);
 })])}
 finally{clearTimeout(timer)}
}
function statusFrom({databaseConfigured,databaseHealthy,encryptionConfigured,isVercel,storageMode}){
 return {
  database:{configured:!!databaseConfigured,healthy:!!databaseHealthy},
  snapshotEncryption:{configured:!!encryptionConfigured,algorithm:"AES-256-GCM"},
  environment:{serverless:!!isVercel,storageMode:String(storageMode||"unknown")},
  manualBackupReady:!!databaseConfigured&&!!databaseHealthy&&!!encryptionConfigured&&!isVercel,
  fullBackupVerified:false,
  lastBackupAt:null,
  scope:"app_state_only",
  notice:"Chưa thể xác nhận có bản backup bên ngoài. Snapshot CLI chỉ chứa app_state, KHÔNG phải bản sao đầy đủ bảng PostgreSQL, Supabase Auth hoặc Storage."
 };
}
async function handler(req,res,p,{send,requireUser,pg,storage}){
 if(p!=="/api/admin/backup/status")return false;
 const user=await requireUser(req,res,["admin"]);if(!user)return true;
 const noStore={"Cache-Control":"private, no-store"};
 const ownerUid=String(process.env.ADMIN_SUPABASE_UID||"").trim();
 if(!ownerUid||user.authUserId!==ownerUid){
  send(res,403,{error:"Chỉ Admin chính được xem trạng thái sao lưu. Cần cấu hình ADMIN_SUPABASE_UID."},noStore);return true;
 }
 if(req.method!=="GET"){
  send(res,405,{error:"Chỉ hỗ trợ xem trạng thái sao lưu"},{"Allow":"GET",...noStore});return true;
 }
 const databaseConfigured=!!process.env.DATABASE_URL;
 let databaseHealthy=false;
 if(databaseConfigured){
  try{
   const result=await bounded(()=>pg.health());
   databaseHealthy=!!result.enabled&&!result.error;
  }catch{databaseHealthy=false}
 }
 const status=statusFrom({
  databaseConfigured,databaseHealthy,
  encryptionConfigured:typeof process.env.BACKUP_PASSPHRASE==="string"&&process.env.BACKUP_PASSPHRASE.length>=16,
  isVercel:process.env.VERCEL==="1",storageMode:storage.status().mode
 });
 send(res,200,{...status,generatedAt:new Date().toISOString()},noStore);
 return true;
}
module.exports=handler;module.exports.statusFrom=statusFrom;
