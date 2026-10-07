const fs=require("fs"),path=require("path");
require("dotenv").config({path:path.join(process.cwd(),".env")});
const {Pool}=require("pg");
async function main(){
 if(!process.env.DATABASE_URL)throw new Error("Thiếu DATABASE_URL trong .env");
 const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.PGSSL==="0"?false:{rejectUnauthorized:false}});
 try{
  await pool.query("SELECT 1");
  const base=fs.readFileSync(path.join(process.cwd(),"db","schema.sql"),"utf8");
  await pool.query(base);
  await pool.query("INSERT INTO schema_migrations(version) VALUES($1) ON CONFLICT(version) DO NOTHING",["001_initial"]);
  const dir=path.join(process.cwd(),"db","migrations");
  const files=fs.existsSync(dir)?fs.readdirSync(dir).filter(x=>/^\d+_.*\.sql$/.test(x)).sort():[];
  for(const file of files){
   const version=file.replace(/\.sql$/,"");
   const done=await pool.query("SELECT 1 FROM schema_migrations WHERE version=$1",[version]);
   if(done.rowCount){console.log("skip",version);continue}
   const sql=fs.readFileSync(path.join(dir,file),"utf8");
   console.log("apply",version);await pool.query(sql);
   await pool.query("INSERT INTO schema_migrations(version) VALUES($1)",[version]);
  }
  const rows=await pool.query("SELECT version,applied_at FROM schema_migrations ORDER BY version");
  console.log("Migration OK:",rows.rows.map(x=>x.version).join(", "));
 }finally{await pool.end()}
}
main().catch(e=>{console.error(e);process.exit(1)});