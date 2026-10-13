"use strict";
const fs=require("node:fs"),path=require("node:path");
require("dotenv").config({path:path.join(process.cwd(),".env")});
const pg=require("../lib/postgres"),backup=require("./backup-crypto");
const CONFIRM="I_UNDERSTAND_RESTORE_MAY_OVERWRITE_DATA";
async function main(args=process.argv.slice(2)){
 const filename=args.find(x=>!x.startsWith("--"));
 if(!filename)throw new Error("Dùng: npm run db:restore -- backups/file.enc.json --verify (hoặc --confirm-restore với RESTORE_CONFIRMATION)");
 const verify=args.includes("--verify"),restore=args.includes("--confirm-restore");
 if(verify===restore)throw new Error("Chọn chính xác một chế độ --verify HOẶC --confirm-restore");
 const selected=path.resolve(filename),raw=fs.readFileSync(selected,"utf8");
 if(Buffer.byteLength(raw)>80*1024*1024)throw new Error("File backup vượt giới hạn 80 MiB.");
 const envelope=JSON.parse(raw);
 const payload=backup.inspect(envelope,{passphrase:process.env.BACKUP_PASSPHRASE,allowLegacy:args.includes("--allow-legacy")});
 if(verify){
  console.log("Backup hợp lệ. Định dạng:",envelope.format,"| phạm vi: app_state | ngày:",payload.createdAt);
  console.log("Không có thao tác ghi database.");
  return;
 }
 if(process.env.VERCEL==="1")throw new Error("Không cho phép chạy restore trên Vercel.");
 if(process.env.RESTORE_CONFIRMATION!==CONFIRM)throw new Error("Thiếu RESTORE_CONFIRMATION="+CONFIRM);
 if(!process.env.DATABASE_URL)throw new Error("Thiếu DATABASE_URL");
 let connected=false;
 try{
  await pg.connect();connected=true;
  // Existing PostgreSQL import is not transactional; an independent pg_dump and a
  // maintenance window are required before using this CLI on real data.
  await pg.migrate();
  await pg.importJsonDatabase(payload.data);
  await pg.saveAppState(payload.data);
  console.log("Đã khôi phục snapshot app_state và nhập dữ liệu tương ứng từ:",selected);
  console.warn("LƯU Ý: không phục hồi toàn bộ bảng PostgreSQL/Auth/Storage. Kiểm tra dữ liệu sau thao tác.");
 }finally{if(connected)await pg.close()}
}
if(require.main===module)main().catch(e=>{console.error("Khôi phục thất bại:",e.message);process.exitCode=1});
module.exports={main};
