"use strict";
// Real PostgreSQL public-schema backup. Run from a trusted admin machine with pg_dump installed.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto");
const {spawnSync}=require("node:child_process");
require("dotenv").config();
const pg=require("../lib/postgres");
function connectionEnv(){
 if(!process.env.DATABASE_URL)throw new Error("Thiếu DATABASE_URL");
 const u=new URL(process.env.DATABASE_URL);
 if(!["postgresql:","postgres:"].includes(u.protocol))throw new Error("DATABASE_URL phải là PostgreSQL");
 return {...process.env,PGHOST:u.hostname,PGPORT:u.port||"5432",PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password),PGDATABASE:decodeURIComponent(u.pathname.slice(1)),PGSSLMODE:process.env.PGSSLMODE||"require"};
}
(async()=>{
 const env=connectionEnv();
 const dir=path.resolve(process.env.BACKUP_DIR||path.join(os.homedir(),"baitapcap1-private-backups"));
 fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const stamp=new Date().toISOString().replace(/[:.]/g,"-"),file=path.join(dir,"public-"+stamp+".dump");
 const options=["--format=custom","--schema=public","--no-owner","--no-privileges","--file",file];
 const result=spawnSync("pg_dump",options,{env,encoding:"utf8",timeout:180000,maxBuffer:1024*1024});
 if(result.error||result.status!==0){try{fs.unlinkSync(file)}catch{}throw new Error("pg_dump không thành công. Kiểm tra quyền database hoặc cài PostgreSQL client.");}
 fs.chmodSync(file,0o600);
 const bytes=fs.statSync(file).size;
 if(bytes<100){fs.unlinkSync(file);throw new Error("Tệp sao lưu trống hoặc bị hỏng");}
 const hash=crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
 const manifest={type:"baitapcap1-public-postgresql-backup",createdAt:new Date().toISOString(),sha256:hash,bytes,scope:"public schema only",file:path.basename(file)};
 fs.writeFileSync(file+".json",JSON.stringify(manifest,null,2),{mode:0o600});
 try{await pg.registerBackup(hash,bytes)}catch(e){console.warn("Đã tạo backup nhưng chưa ghi được metadata:",e.message)}
 console.log("BACKUP_PUBLIC_SCHEMA_OK",JSON.stringify({file,sha256:hash,bytes,scope:"public schema only"}));
 await pg.close();
})().catch(e=>{console.error("BACKUP_FAILED:",e.message);process.exitCode=1});
