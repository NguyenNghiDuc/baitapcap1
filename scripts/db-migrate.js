const fs=require("fs"),path=require("path");
require("dotenv").config({path:path.join(process.cwd(),".env")});
const {Pool}=require("pg");
async function main(){
 if(!process.env.DATABASE_URL)throw new Error("Thiếu DATABASE_URL trong .env");
 const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.PGSSL==="0"?false:{rejectUnauthorized:false}});
 try{
  await pool.query("SELECT 1");
  const sql=fs.readFileSync(path.join(process.cwd(),"db","schema.sql"),"utf8");
  await pool.query(sql);
  await pool.query("INSERT INTO schema_migrations(version) VALUES($1) ON CONFLICT(version) DO NOTHING",["001_initial"]);
  const tables=(await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(x=>x.tablename);
  console.log("Migration OK. Tables:",tables.join(", "));
 }finally{await pool.end()}
}
main().catch(e=>{console.error(e);process.exit(1)});
