"use strict";
// Destructive public-schema restore; never invoke automatically on deployment.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {spawnSync}=require("node:child_process");
require("dotenv").config();
function envFromDatabase(){
 const value=process.env.DATABASE_URL;if(!value)throw new Error("Thiếu DATABASE_URL");
 const u=new URL(value);if(!["postgres:","postgresql:"].includes(u.protocol))throw new Error("DATABASE_URL không hợp lệ");
 return {...process.env,PGHOST:u.hostname,PGPORT:u.port||"5432",PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password),PGDATABASE:decodeURIComponent(u.pathname.slice(1)),PGSSLMODE:process.env.PGSSLMODE||"require"};
}
(function(){
 try{
  const file=path.resolve(process.argv[2]||"");
  if(process.argv.length<4||process.argv[3]!=="--confirm"||process.env.RESTORE_ALLOW_DESTRUCTIVE!=="YES")throw new Error("Cần: RESTORE_ALLOW_DESTRUCTIVE=YES node scripts/pg-public-restore.js /path/backup.dump --confirm");
  if(!fs.existsSync(file)||!fs.existsSync(file+".json"))throw new Error("Không tìm thấy file sao lưu và manifest");
  const m=JSON.parse(fs.readFileSync(file+".json","utf8"));
  if(m.type!=="baitapcap1-public-postgresql-backup"||m.scope!=="public schema only")throw new Error("Backup không đúng định dạng");
  const digest=crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  if(digest!==m.sha256||fs.statSync(file).size!==m.bytes)throw new Error("Checksum hoặc kích thước không khớp. Hủy khôi phục.");
  const env=envFromDatabase();
  if(process.env.RESTORE_TARGET_DATABASE!==env.PGDATABASE)throw new Error("Thiếu RESTORE_TARGET_DATABASE trùng chính xác tên database đích");
  const valid=spawnSync("pg_restore",["--list",file],{env,encoding:"utf8",timeout:30000});
  if(valid.status!==0)throw new Error("Không đọc được file pg_restore");
  const result=spawnSync("pg_restore",["--clean","--if-exists","--no-owner","--no-privileges","--exit-on-error","--dbname",env.PGDATABASE,file],{env,encoding:"utf8",timeout:300000,maxBuffer:1024*1024});
  if(result.status!==0)throw new Error("Khôi phục thất bại; kiểm tra PostgreSQL và bản sao lưu an toàn khác");
  console.log("RESTORE_PUBLIC_SCHEMA_OK",JSON.stringify({database:env.PGDATABASE,sha256:digest,scope:m.scope}));
 }catch(e){console.error("RESTORE_ABORTED:",e.message);process.exitCode=1}
})();
