const fs=require("fs"),path=require("path");
let pool=null,connectPromise=null;
function cfg(){const max=Math.max(1,Math.min(20,Number(process.env.PG_POOL_MAX||5)));return {connectionString:process.env.DATABASE_URL,ssl:process.env.PGSSL==="0"?false:{rejectUnauthorized:false},max,idleTimeoutMillis:Number(process.env.PG_IDLE_TIMEOUT_MS||20000),connectionTimeoutMillis:Number(process.env.PG_CONNECT_TIMEOUT_MS||5000),query_timeout:Number(process.env.PG_QUERY_TIMEOUT_MS||10000),statement_timeout:Number(process.env.PG_STATEMENT_TIMEOUT_MS||10000),keepAlive:true,keepAliveInitialDelayMillis:10000,application_name:"baitapcap1"}}
async function connect(){
 if(!process.env.DATABASE_URL)return null;
 if(connectPromise)return connectPromise;
 if(pool)return pool;
 const {Pool}=require("pg"),created=new Pool(cfg());
 pool=created;
 created.on("error",e=>console.error("[postgres]",e.message));
 connectPromise=created.query("SELECT 1").then(()=>created).catch(async e=>{
  if(pool===created)pool=null;
  await created.end().catch(()=>{});
  throw e;
 }).finally(()=>{connectPromise=null});
 return connectPromise;
}
async function query(text,params=[]){
 const p=await connect();if(!p)throw new Error("DATABASE_URL chưa được cấu hình");
 const start=Date.now();
 try{return await p.query(text,params)}
 finally{
  const elapsed=Date.now()-start,threshold=Math.max(100,Number(process.env.PG_SLOW_QUERY_MS||800));
  if(elapsed>=threshold)console.warn("[postgres:slow]",elapsed+"ms",String(text).trim().replace(/\s+/g," ").slice(0,110));
 }
}
async function migrate(){
 const p=await connect();if(!p)return false;
 const root=path.join(__dirname,".."),sql=fs.readFileSync(path.join(root,"db","schema.sql"),"utf8");
 await p.query(sql);await p.query("INSERT INTO schema_migrations(version) VALUES($1) ON CONFLICT(version) DO NOTHING",["001_initial"]);
 const dir=path.join(root,"db","migrations"),files=fs.existsSync(dir)?fs.readdirSync(dir).filter(x=>/^\d+_.*\.sql$/.test(x)).sort():[];
 for(const file of files){
  const version=file.replace(/\.sql$/,""),done=await p.query("SELECT 1 FROM schema_migrations WHERE version=$1",[version]);if(done.rowCount)continue;
  await p.query(fs.readFileSync(path.join(dir,file),"utf8"));await p.query("INSERT INTO schema_migrations(version) VALUES($1)",[version]);
 }
 return true
}
async function migrateIfNeeded(){
 if(!process.env.DATABASE_URL)return false;
 const dir=path.join(__dirname,"..","db","migrations");
 const files=fs.existsSync(dir)?fs.readdirSync(dir).filter(x=>/^\d+_.*\.sql$/.test(x)).sort():[];
 const latest=files.length?files[files.length-1].replace(/\.sql$/,""):"001_initial";
 try{
  const r=await query("SELECT 1 FROM schema_migrations WHERE version=$1",[latest]);
  if(r.rowCount)return false;
 }catch(e){
  // An empty database must still create the schema before it can be used.
  if(e.code!=="42P01")throw e;
 }
 await migrate();return true;
}
async function health(){if(!process.env.DATABASE_URL)return {enabled:false};try{const r=await query("SELECT now() now,current_database() db,version() version");return {enabled:true,now:r.rows[0].now,database:r.rows[0].db,version:r.rows[0].version}}catch(e){return {enabled:true,error:e.message}}}
async function upsertUser(u){if(!process.env.DATABASE_URL)return null;await query(`INSERT INTO users(id,auth_user_id,email,password_hash,name,role,grade,avatar,email_verified,locked,children,student_sync,student_sync_updated_at,created_at,updated_at)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,COALESCE($14,now()),now())
 ON CONFLICT(id) DO UPDATE SET auth_user_id=EXCLUDED.auth_user_id,email=EXCLUDED.email,password_hash=EXCLUDED.password_hash,name=EXCLUDED.name,role=EXCLUDED.role,grade=EXCLUDED.grade,avatar=EXCLUDED.avatar,email_verified=EXCLUDED.email_verified,locked=EXCLUDED.locked,children=EXCLUDED.children,student_sync=EXCLUDED.student_sync,student_sync_updated_at=EXCLUDED.student_sync_updated_at,updated_at=now()`,
 [String(u.id),u.authUserId||null,u.email,u.password||"",u.name,u.role,u.grade||null,u.avatar||null,!!u.emailVerified,!!u.locked,JSON.stringify(u.children||[]),JSON.stringify(u.studentSync||null),u.studentSyncUpdatedAt||null,u.createdAt||null]);return u}
// Admin operations read the same authoritative PostgreSQL rows as /api/admin/users.
// Do not derive a target account from a possibly stale serverless app_state snapshot.
function publicAdminUser(row){
 if(!row)return null;
 return {id:String(row.id),authUserId:row.authUserId?String(row.authUserId):null,
  email:row.email,name:row.name,role:row.role,grade:row.grade,avatar:row.avatar,
  emailVerified:!!row.emailVerified,locked:!!row.locked};
}
async function findAdminUserById(id){
 if(!process.env.DATABASE_URL)return null;
 const r=await query('SELECT id,auth_user_id AS "authUserId",email,name,role,grade,avatar,email_verified AS "emailVerified",locked FROM users WHERE id=$1 LIMIT 1',[String(id)]);
 return publicAdminUser(r.rows[0]);
}
async function findAdminUserByEmail(email){
 if(!process.env.DATABASE_URL)return null;
 const r=await query('SELECT id,auth_user_id AS "authUserId",email,name,role,grade,avatar,email_verified AS "emailVerified",locked FROM users WHERE lower(email)=lower($1) LIMIT 1',[String(email).trim()]);
 return publicAdminUser(r.rows[0]);
}
async function getUserAccess(id){
 if(!process.env.DATABASE_URL)return null;
 const r=await query("SELECT role,locked FROM users WHERE id=$1",[String(id)]);
 return r.rows[0]||null;
}
async function setUserAccess(id,{role,locked}){
 if(!process.env.DATABASE_URL)return false;
 const r=await query("UPDATE users SET role=$2,locked=$3,updated_at=now() WHERE id=$1 RETURNING id",[String(id),role,!!locked]);
 return r.rowCount===1;
}
async function saveResult(r){
 if(!process.env.DATABASE_URL)return {duplicate:false,result:r};
 const saved=await query(`INSERT INTO results(id,client_submission_id,user_id,subject,grade,title,score,correct,total,wrong_question_ids,duration_sec,proctor,created_at)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12::jsonb,COALESCE($13,now()))
 ON CONFLICT DO NOTHING RETURNING id`,
 [String(r.id),r.clientSubmissionId||null,String(r.userId),r.subject||null,r.grade||null,r.title||null,r.score||0,r.correct||0,r.total||0,JSON.stringify(r.wrongQuestionIds||[]),r.durationSec||0,JSON.stringify(r.proctor||null),r.createdAt||r.isoDate||null]);
 if(saved.rowCount)return {duplicate:false,result:r};
 if(r.clientSubmissionId){
  const prior=await query("SELECT id,user_id AS \"userId\",client_submission_id AS \"clientSubmissionId\",score,correct,total,title,subject,grade,created_at AS \"createdAt\" FROM results WHERE client_submission_id=$1",[r.clientSubmissionId]);
  const row=prior.rows[0];
  if(row){if(String(row.userId)!==String(r.userId))throw new Error("Mã lần nộp đã được sử dụng bởi tài khoản khác");return {duplicate:true,result:row}}
 }
 return {duplicate:true,result:r};
}
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
// Serialize only the grading workflows against the current app_state row.
// Other legacy endpoints still use snapshot writes and require separate migration.
async function runLockedMutation(client,mutator){
 let began=false;
 try{
  await client.query("BEGIN");began=true;
  const locked=await client.query("SELECT data FROM app_state WHERE id=1 FOR UPDATE");
  if(!locked.rows?.length||!locked.rows[0].data||!Array.isArray(locked.rows[0].data.users))
   throw new Error("app_state chưa sẵn sàng; không thể sửa điểm");
  const state=locked.rows[0].data;
  const output=await mutator(state);
  if(output?.changed){
   await client.query("UPDATE app_state SET data=$1::jsonb,updated_at=now() WHERE id=1",
    [JSON.stringify(state)]);
   if(output.audit){
    const a=output.audit;
    await client.query("INSERT INTO audit_logs(id,user_id,action,meta,created_at) VALUES($1,$2,$3,$4::jsonb,$5) ON CONFLICT(id) DO NOTHING",
     [a.id,a.userId,a.action,JSON.stringify(a.meta||{}),a.at]);
   }
  }
  await client.query("COMMIT");began=false;
  return {...output,state};
 }catch(error){
  if(began)await client.query("ROLLBACK").catch(()=>{});
  throw error;
 }
}
async function mutateAppState(mutator){
 const p=await connect();if(!p)throw new Error("PostgreSQL unavailable");
 const client=await p.connect();
 try{return await runLockedMutation(client,mutator)}
 finally{client.release()}
}
// Merge one legacy snapshot as a field-level delta against the locked latest
// app_state row. Grade-specific writes use mutateAppState instead.
async function saveLegacyAppState(before,next){
 const {mergeAppState,validateLegacy}=require("./app-state-merge");
 const {isDeepStrictEqual}=require("node:util");
 validateLegacy(before,next);
 if(isDeepStrictEqual(before,next))return false;
 const output=await mutateAppState(current=>{
  const merged=mergeAppState(before,next,current);
  const changed=!isDeepStrictEqual(current,merged);
  if(changed){
   for(const key of Object.keys(current))if(!Object.prototype.hasOwnProperty.call(merged,key))delete current[key];
   Object.assign(current,merged);
  }
  return {changed};
 });
 return !!output.changed;
}
async function loadAppState(){if(!process.env.DATABASE_URL)return null;const r=await query("SELECT data FROM app_state WHERE id=1");return r.rows[0]?.data||null}
async function saveAppState(data){if(!process.env.DATABASE_URL)return false;await query("INSERT INTO app_state(id,data,updated_at) VALUES(1,$1::jsonb,now()) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()",[JSON.stringify(data||{})]);return true}
async function close(){if(pool){await pool.end();pool=null}}
module.exports={connect,query,migrate,migrateIfNeeded,health,upsertUser,findAdminUserById,findAdminUserByEmail,getUserAccess,setUserAccess,saveResult,listResults,importJsonDatabase,loadAppState,saveAppState,saveLegacyAppState,mutateAppState,runLockedMutation,close,get pool(){return pool}};