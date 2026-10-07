const fs=require("fs"),path=require("path");
require("dotenv").config({path:path.join(process.cwd(),".env")});
const pg=require("../lib/postgres");
async function main(){
 if(!process.env.DATABASE_URL)throw new Error("Thiếu DATABASE_URL");
 const file=path.join(process.cwd(),"data","db.json");const db=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,"utf8")):{};
 await pg.connect();await pg.migrate();
 const counts=await pg.importJsonDatabase(db);await pg.saveAppState(db);
 console.log("Import JSON -> PostgreSQL OK",counts);
 process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});
