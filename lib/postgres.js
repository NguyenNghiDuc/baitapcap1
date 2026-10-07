const fs=require("fs"),path=require("path");
let pool=null;
async function connect(){
 if(!process.env.DATABASE_URL)return null;
 const {Pool}=require("pg");
 pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.PGSSL==="0"?false:{rejectUnauthorized:false}});
 await pool.query("SELECT 1");
 return pool;
}
async function migrate(){
 if(!pool)await connect();if(!pool)return false;
 const sql=fs.readFileSync(path.join(__dirname,"..","db","schema.sql"),"utf8");
 await pool.query(sql);return true;
}
async function health(){if(!pool)await connect();if(!pool)return {enabled:false};const r=await pool.query("SELECT now() now");return {enabled:true,now:r.rows[0].now}}
async function upsertUser(u){if(!pool)await connect();if(!pool)return null;await pool.query(`INSERT INTO users(id,email,password_hash,name,role,grade,email_verified,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,COALESCE($8,now())) ON CONFLICT(id) DO UPDATE SET email=EXCLUDED.email,password_hash=EXCLUDED.password_hash,name=EXCLUDED.name,role=EXCLUDED.role,grade=EXCLUDED.grade,email_verified=EXCLUDED.email_verified`,[u.id,u.email,u.password,u.name,u.role,u.grade||null,!!u.emailVerified,u.createdAt||null]);return u}
async function saveResult(r){if(!pool)await connect();if(!pool)return null;await pool.query(`INSERT INTO results(id,user_id,subject,grade,title,score,correct,total,wrong_question_ids,duration_sec,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11,now())) ON CONFLICT(id) DO NOTHING`,[r.id,r.userId,r.subject,r.grade,r.title,r.score,r.correct,r.total,JSON.stringify(r.wrongQuestionIds||[]),r.durationSec||0,r.createdAt||null]);return r}
async function listResults(userId){if(!pool)await connect();if(!pool)return null;const r=await pool.query("SELECT * FROM results WHERE ($1::uuid IS NULL OR user_id=$1) ORDER BY created_at DESC",[userId||null]);return r.rows}
module.exports={connect,migrate,health,upsertUser,saveResult,listResults,get pool(){return pool}};