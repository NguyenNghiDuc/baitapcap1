const fs=require("fs"),path=require("path"),crypto=require("crypto");
require("dotenv").config({path:path.join(process.cwd(),".env")});
const pg=require("../lib/postgres");
(async()=>{
 if(!process.env.DATABASE_URL)throw new Error("Thiếu DATABASE_URL");
 await pg.connect();const data=await pg.loadAppState();if(!data)throw new Error("Không có app_state để backup");
 const payload={format:"baitapcap1-backup-v1",createdAt:new Date().toISOString(),appVersion:require("../package.json").version,data};
 const raw=JSON.stringify(payload,null,2),hash=crypto.createHash("sha256").update(raw).digest("hex"),out={...payload,sha256:hash};
 const dir=path.resolve(process.env.BACKUP_DIR||"./backups");fs.mkdirSync(dir,{recursive:true});
 const file=path.join(dir,`baitapcap1-${new Date().toISOString().replace(/[:.]/g,"-")}.json`);fs.writeFileSync(file,JSON.stringify(out,null,2));console.log("Backup OK:",file);await pg.close()
})().catch(e=>{console.error(e);process.exit(1)});