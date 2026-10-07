const path=require("path");require("dotenv").config({path:path.join(process.cwd(),".env")});
const {Pool}=require("pg");const sb=require("../lib/supabase-admin");
(async()=>{
 const required=["DATABASE_URL","SUPABASE_URL","SUPABASE_PUBLISHABLE_KEY"];for(const k of required)if(!process.env[k])throw new Error("Thiếu "+k);
 const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.PGSSL==="0"?false:{rejectUnauthorized:false}});
 try{
  const tables=await pool.query("SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  const rlsBad=tables.rows.filter(x=>["users","classes","submissions","results","student_works"].includes(x.tablename)&&!x.rowsecurity);
  const pub=await pool.query("SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime'");
  const migrations=await pool.query("SELECT version FROM schema_migrations ORDER BY version");
  const admin=sb.getAdmin();let buckets=[];if(admin){const {data,error}=await admin.storage.listBuckets();if(error)throw error;buckets=(data||[]).map(x=>x.id)}
  console.log(JSON.stringify({ok:!rlsBad.length,rlsMissing:rlsBad.map(x=>x.tablename),realtimeTables:pub.rows.map(x=>x.tablename),migrations:migrations.rows.map(x=>x.version),storageBuckets:buckets,serviceRoleConfigured:!!process.env.SUPABASE_SERVICE_ROLE_KEY},null,2));
  if(rlsBad.length)process.exitCode=2;
 }finally{await pool.end()}
})().catch(e=>{console.error(e);process.exit(1)});