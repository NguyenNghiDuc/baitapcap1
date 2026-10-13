"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
require("dotenv").config({path:path.join(process.cwd(),".env")});
const pg=require("../lib/postgres"),{seal,requirePassphrase}=require("./backup-crypto");
async function main(){
 if(process.env.VERCEL==="1")throw new Error("Vercel là môi trường tạm thời. Hãy chạy backup CLI trên máy chủ/laptop an toàn với DATABASE_URL.");
 if(!process.env.DATABASE_URL)throw new Error("Thiếu DATABASE_URL");
 const passphrase=requirePassphrase(process.env.BACKUP_PASSPHRASE);
 let connected=false;
 try{
  await pg.connect();connected=true;
  const data=await pg.loadAppState();
  if(!data||!Array.isArray(data.users))throw new Error("app_state chưa sẵn sàng để sao lưu.");
  const envelope=seal(data,passphrase,{appVersion:require("../package.json").version});
  const dir=path.resolve(process.env.BACKUP_DIR||"./backups");
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const name="baitapcap1-app-state-"+new Date().toISOString().replace(/[:.]/g,"-")+"-"+crypto.randomBytes(4).toString("hex")+".enc.json";
  const target=path.join(dir,name),temp=target+".tmp";
  try{
   fs.writeFileSync(temp,JSON.stringify(envelope,null,2),{flag:"wx",mode:0o600});
   fs.renameSync(temp,target);
  }catch(e){try{fs.unlinkSync(temp)}catch{}throw e}
  console.log("Đã lưu snapshot app_state được mã hóa tại:",target);
  console.log("LƯU Ý: không bao gồm PostgreSQL tables độc lập, Supabase Auth hoặc Storage buckets; cần backup chuyên dụng bổ sung.");
 }finally{if(connected)await pg.close()}
}
if(require.main===module)main().catch(e=>{console.error("Backup thất bại:",e.message);process.exitCode=1});
module.exports={main};
