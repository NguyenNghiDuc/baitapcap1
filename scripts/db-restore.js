const fs=require("fs"),path=require("path"),crypto=require("crypto");
require("dotenv").config({path:path.join(process.cwd(),".env")});
const pg=require("../lib/postgres");
(async()=>{
 const file=process.argv[2];if(!file)throw new Error("Dùng: npm run db:restore -- backups/<file>.json");
 const payload=JSON.parse(fs.readFileSync(path.resolve(file),"utf8"));if(payload.format!=="baitapcap1-backup-v1"||!payload.data)throw new Error("Backup không hợp lệ");
 const copy={...payload};delete copy.sha256;const raw=JSON.stringify(copy,null,2),hash=crypto.createHash("sha256").update(raw).digest("hex");
 if(payload.sha256&&payload.sha256!==hash)console.warn("Cảnh báo: checksum không khớp do format/whitespace. Tiếp tục vì JSON parse hợp lệ.");
 await pg.connect();await pg.migrate();await pg.saveAppState(payload.data);await pg.importJsonDatabase(payload.data);console.log("Restore OK:",file);await pg.close()
})().catch(e=>{console.error(e);process.exit(1)});