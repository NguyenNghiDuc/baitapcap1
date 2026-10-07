const fs=require("fs"),path=require("path");
let pool=null;
function cfg(){return {connectionString:process.env.DATABASE_URL,ssl:process.env.PGSSL==="0"?false:{rejectUnauthorized:false},max:Number(process.env.PG_POOL_MAX||10),idleTimeoutMillis:30000,connectionTimeoutMillis:5000}}
async function connect(){
 if(!process.env.DATABASE_URL)return null;
 if(pool)return pool;
 const {Pool}=require("pg");pool=new Pool(cfg());
 pool.on("error",e=>console.error("[postgres]",e.message));
 await pool.query("SELECT 1");return pool;
}
async function query(text,params=[]){const p=await connect();if(!p)throw new Error("DATABASE_URL chưa được cấu hình");return p.query(text,params)}
async function migrate(){const p=await connect();if(!p)return false;const sql=fs.readFileSync(path.join(__dirname,"..","db","schema.sql"),"utf8");await p.query(sql);await p.query("INSERT INTO schema_migrations(version) VALUES($1) ON CONFLICT(version) DO NOTHING",["001_initial"]);return true}
async function health(){if(!process.env.DATABASE_URL)return {enabled:false};try{const r=await query("SELECT now() now,current_database() db,version() version");return {enabled:true,now:r.rows[0].now,database:r.rows[0].db,version:r.rows[0].version}}catch(e){return {enabled:true,error:e.message}}}
async function upsertUser(u){if(!process.env.DATABASE_URL)return null;await query(`INSERT INTO users(id,email,password_hash,name,role,grade,avatar,email_verified,locked,children,student_sync,student_sync_updated_at,created_at,updated_at)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,COALESCE($13,now()),now())
 ON CONFLICT(id) DO UPDATE SET email=EXCLUDED.email,password_hash=EXCLUDED.password_hash,name=EXCLUDED.name,role=EXCLUDED.role,grade=EXCLUDED.grade,avatar=EXCLUDED.avatar,email_verified=EXCLUDED.email_verified,locked=EXCLUDED.locked,children=EXCLUDED.children,student_sync=EXCLUDED.student_sync,student_sync_updated_at=EXCLUDED.student_sync_updated_at,updated_at=now()`,
 [String(u.id),u.email,u.password,u.name,u.role,u.grade||null,u.avatar||null,!!u.emailVerified,!!u.locked,JSON.stringify(u.children||[]),JSON.stringify(u.studentSync||null),u.studentSyncUpdatedAt||null,u.createdAt||null]);return u}
async function saveResult(r){if(!process.env.DATABASE_URL)return null;await query(`INSERT INTO results(id,user_id,subject,grade,title,score,correct,total,wrong_question_ids,duration_sec,proctor,created_at)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11::jsonb,COALESCE($12,now())) ON CONFLICT(id) DO NOTHING`,
 [String(r.id),String(r.userId),r.subject||null,r.grade||null,r.title||null,r.score||0,r.correct||0,r.total||0,JSON.stringify(r.wrongQuestionIds||[]),r.durationSec||0,JSON.stringify(r.proctor||null),r.createdAt||r.isoDate||null]);return r}
async function listResults(userId){if(!process.env.DATABASE_URL)return null;const r=await query("SELECT * FROM results WHERE ($1::text IS NULL OR user_id=$1) ORDER BY created_at DESC",[userId?String(userId):null]);return r.rows}
async function importJsonDatabase(db={}){
 if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL chưa được cấu hình");await migrate();
 const counts={users:0,classes:0,assignments:0,submissions:0,results:0,notifications:0,materials:0,questionBank:0,examRooms:0,pushSubscriptions:0,feedback:0,studentWorks:0};
 for(const u of db.users||[]){await upsertUser(u);counts.users++}
 for(const c of db.classes||[]){await query(`INSERT INTO classes(id,name,grade,teacher_id,code,created_at,updated_at) VALUES($1,$2,$3,$4,$5,COALESCE($6,now()),now()) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,grade=EXCLUDED.grade,teacher_id=EXCLUDED.teacher_id,code=EXCLUDED.code,updated_at=now()`,[String(c.id),c.name,Number(c.grade)||1,c.teacherId||null,c.code,c.createdAt||null]);for(const sid of c.studentIds||[])await query("INSERT INTO class_students(class_id,student_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[String(c.id),String(sid)]);counts.classes++}
 for(const a of db.assignments||[]){await query(`INSERT INTO assignments(id,class_id,teacher_id,title,subject,lesson_id,grade,question_ids,deadline,max_attempts,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,COALESCE($11,now())) ON CONFLICT(id) DO NOTHING`,[String(a.id),a.classId||null,a.teacherId||null,a.title,a.subject||null,a.lessonId||null,a.grade||null,JSON.stringify(a.questionIds||[]),a.deadline||null,a.maxAttempts||1,a.createdAt||null]);counts.assignments++}
 for(const x of db.submissions||[]){await query(`INSERT INTO submissions(id,assignment_id,student_id,answers,score,feedback,attempt,submitted_at,graded_at) VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,COALESCE($8,now()),$9) ON CONFLICT(id) DO NOTHING`,[String(x.id),x.assignmentId||null,x.studentId||x.userId||null,JSON.stringify(x.answers||{}),x.score||null,x.feedback||null,x.attempt||1,x.submittedAt||x.createdAt||null,x.gradedAt||null]);counts.submissions++}
 for(const x of db.results||[]){await saveResult(x);counts.results++}
 for(const x of db.notifications||[]){await query(`INSERT INTO notifications(id,user_id,title,message,created_at) VALUES($1,$2,$3,$4,COALESCE($5,now())) ON CONFLICT(id) DO NOTHING`,[String(x.id),x.userId||null,x.title||"",x.message||x.body||"",x.createdAt||null]);counts.notifications++}
 for(const x of db.materials||[]){await query(`INSERT INTO materials(id,title,url,type,owner_id,created_at) VALUES($1,$2,$3,$4,$5,COALESCE($6,now())) ON CONFLICT(id) DO NOTHING`,[String(x.id),x.title||"",x.url||"",x.type||null,x.ownerId||null,x.createdAt||null]);counts.materials++}
 for(const x of db.questionBank||[]){await query(`INSERT INTO question_bank(id,subject,grade,lesson_id,level,question,options,answer,explanation,question_type,created_at) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,COALESCE($11,now())) ON CONFLICT(id) DO NOTHING`,[String(x.id),x.subject||"math",x.grade||4,x.lessonId||null,x.level||null,x.q||x.question||"",JSON.stringify(x.options||[]),JSON.stringify(x.answer),x.explain||x.explanation||"",x.type||"mcq",x.createdAt||null]);counts.questionBank++}
 for(const x of db.examRooms||[]){await query(`INSERT INTO exam_rooms(id,code,title,teacher_id,grade,lesson_id,duration_min,starts_at,ends_at,participants,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,COALESCE($11,now())) ON CONFLICT(id) DO NOTHING`,[String(x.id),x.code,x.title,x.teacherId||null,x.grade||null,x.lessonId||null,x.durationMin||45,x.startsAt||null,x.endsAt||null,JSON.stringify(x.participants||[]),x.createdAt||null]);counts.examRooms++}
 if(db.examSettings){await query(`UPDATE exam_settings SET daily_min=$1,grade4_min=$2,grade5_min=$3,overrides=$4::jsonb,updated_at=now() WHERE id=1`,[db.examSettings.dailyMin||45,db.examSettings.grade4Min||60,db.examSettings.grade5Min||60,JSON.stringify(db.examSettings.overrides||{})])}
 for(const x of db.pushSubscriptions||[]){await query(`INSERT INTO push_subscriptions(id,user_id,subscription,created_at) VALUES($1,$2,$3::jsonb,COALESCE($4,now())) ON CONFLICT(id) DO NOTHING`,[String(x.id),x.userId||null,JSON.stringify(x.subscription||{}),x.createdAt||null]);counts.pushSubscriptions++}
 for(const x of db.feedback||[]){await query(`INSERT INTO feedback(id,user_id,type,message,question_id,created_at) VALUES($1,$2,$3,$4,$5,COALESCE($6,now())) ON CONFLICT(id) DO NOTHING`,[String(x.id),x.userId||null,x.type||"general",x.message||"",x.questionId||null,x.createdAt||null]);counts.feedback++}
 for(const x of db.studentWorks||[]){await query(`INSERT INTO student_works(id,user_id,title,url,created_at) VALUES($1,$2,$3,$4,COALESCE($5,now())) ON CONFLICT(id) DO NOTHING`,[String(x.id),x.userId||null,x.title||"",x.url||"",x.createdAt||null]);counts.studentWorks++}
 return counts
}
async function loadAppState(){if(!process.env.DATABASE_URL)return null;const r=await query("SELECT data FROM app_state WHERE id=1");return r.rows[0]?.data||null}
async function saveAppState(data){if(!process.env.DATABASE_URL)return false;await query("INSERT INTO app_state(id,data,updated_at) VALUES(1,$1::jsonb,now()) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()",[JSON.stringify(data||{})]);return true}
async function close(){if(pool){await pool.end();pool=null}}
module.exports={connect,query,migrate,health,upsertUser,saveResult,listResults,importJsonDatabase,loadAppState,saveAppState,close,get pool(){return pool}};