const path=require("path");require("dotenv").config({path:path.join(process.cwd(),".env")});const pg=require("../lib/postgres");
(async()=>{const h=await pg.health();console.log(JSON.stringify(h,null,2));if(!h.enabled||h.error)process.exitCode=1;await pg.close()})().catch(e=>{console.error(e);process.exit(1)});
