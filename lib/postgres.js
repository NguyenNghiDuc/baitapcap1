const fs=require("fs"),path=require("path");
let pool=null;
function cfg(){const max=Math.max(1,Math.min(20,Number(process.env.PG_POOL_MAX||5)));return {connectionString:process.env.DATABASE_URL,ssl:process.env.PGSSL==="0"?false:{rejectUnauthorized:false},max,idleTimeoutMillis:Number(process.env.PG_IDLE_TIMEOUT_MS||20000),connectionTimeoutMillis:Number(process.env.PG_CONNECT_TIMEOUT_MS||5000),query_timeout:Number(process.env.PG_QUERY_TIMEOUT_MS||10000),statement_timeout:Number(process.env.PG_STATEMENT_TIMEOUT_MS||10000),keepAlive:true,keepAliveInitialDelayMillis:10000,application_name:"baitapcap1"}}
async function connect(){
 if(!process.env.DATABASE_URL)return null;
 if(pool)return pool;
 const {Pool}=require("pg");pool=new Pool(cfg());
 pool.on("error",e=>console.error("[postgres]",e.message));
 await pool.query("SELECT 1");return pool;
}
async function query(text,params=[]){const p=await connect();if(!p)throw new Error("DATABASE_URL chưa được cấu hình");return p.query(text,params)}
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
async function health(){if(!process.env.DATABASE_URL)return {enabled:false};try{const r=await query("SELECT now() now,current_database() db,version() version");return {enabled:true,now:r.rows[0].now,database:r.rows[0].db,version:r.rows[0].version}}catch(e){return {enabled:true,error:e.message}}}
async function upsertUser(u){if(!process.env.DATABASE_URL)return null;await query(`INSERT INTO users(id,auth_user_id,email,password_hash,name,role,grade,avatar,email_verified,locked,children,student_sync,student_sync_updated_at,created_at,updated_at)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,COALESCE($14,now()),now())
 ON CONFLICT(id) DO UPDATE SET auth_user_id=COALESCE(users.auth_user_id,EXCLUDED.auth_user_id),email=EXCLUDED.email,password_hash=CASE WHEN EXCLUDED.password_hash<>'' THEN EXCLUDED.password_hash ELSE users.password_hash END,email_verified=EXCLUDED.email_verified,updated_at=now()`,
 [String(u.id),u.authUserId||null,u.email,u.password||"",u.name,u.role,u.grade||null,u.avatar||null,!!u.emailVerified,!!u.locked,JSON.stringify(u.children||[]),JSON.stringify(u.studentSync||null),u.studentSyncUpdatedAt||null,u.createdAt||null]);return u}
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

async function getStudentSync(id){
 const r=await query("SELECT student_sync,student_sync_updated_at FROM users WHERE id=$1",[String(id)]);
 return r.rows[0]||null;
}
async function saveStudentSync(id,sync){
 const r=await query("UPDATE users SET student_sync=$2::jsonb,student_sync_updated_at=now(),updated_at=now() WHERE id=$1 RETURNING student_sync_updated_at",[String(id),JSON.stringify(sync)]);
 return r.rows[0]||null;
}
async function listAuthorizedResults(u,page,limit){
 const where="($2='admin' OR ($2='student' AND r.user_id=$1) OR ($2='parent' AND EXISTS(SELECT 1 FROM users p WHERE p.id=$1 AND p.children ? r.user_id)) OR ($2='teacher' AND EXISTS(SELECT 1 FROM classes c JOIN class_students cs ON cs.class_id=c.id WHERE c.teacher_id=$1 AND cs.student_id=r.user_id)))";
 const [total,rows]=await Promise.all([
  query("SELECT count(*)::int AS total FROM results r WHERE "+where,[u.id,u.role]),
  query("SELECT r.id,r.user_id AS \"userId\",r.subject,r.grade,r.title,r.score,r.correct,r.total,r.verified,r.grading_status AS \"gradingStatus\",r.wrong_question_ids AS \"wrongQuestionIds\",r.duration_sec AS \"durationSec\",r.created_at AS \"createdAt\" FROM results r WHERE "+where+" ORDER BY r.created_at DESC LIMIT $3 OFFSET $4",[u.id,u.role,limit,(page-1)*limit])
 ]);
 return {results:rows.rows,pagination:{page,limit,total:total.rows[0].total,pages:Math.ceil(total.rows[0].total/limit),hasMore:page*limit<total.rows[0].total}};
}
async function getByAuthUid(uid){
 const r=await query("SELECT id,auth_user_id,email,password_hash,name,role,grade,avatar,email_verified,locked,children,student_sync,student_sync_updated_at,created_at FROM users WHERE auth_user_id=$1",[String(uid)]);
 return r.rows[0]?normalizeUser(r.rows[0]):null;
}
async function getById(id){
 const r=await query("SELECT id,auth_user_id,email,password_hash,name,role,grade,avatar,email_verified,locked,children,student_sync,student_sync_updated_at,created_at FROM users WHERE id=$1",[String(id)]);
 return r.rows[0]?normalizeUser(r.rows[0]):null;
}
function normalizeUser(x){
 return {id:x.id,authUserId:x.auth_user_id,email:x.email,password:x.password_hash,name:x.name,role:x.role,grade:x.grade,avatar:x.avatar,emailVerified:x.email_verified,locked:!!x.locked,children:x.children||[],studentSync:x.student_sync,studentSyncUpdatedAt:x.student_sync_updated_at,createdAt:x.created_at};
}
async function getProfile(id){
 const r=await query("SELECT id,name,email,role,grade,avatar,email_verified,locked,phone,to_char(birthday,'YYYY-MM-DD') AS birthday,gender,school,address,avatar_path,notification_preferences FROM users WHERE id=$1",[String(id)]);
 return r.rows[0]||null;
}
async function updateProfile(id,fields){
 const current=await getProfile(id);if(!current)return null;
 const x={...current,...fields};
 const r=await query("UPDATE users SET name=$2,grade=$3,phone=$4,birthday=$5,gender=$6,school=$7,address=$8,updated_at=now() WHERE id=$1 RETURNING id",[String(id),x.name,x.grade,x.phone||null,x.birthday||null,x.gender||null,x.school||null,x.address||null]);
 return r.rowCount===1?getProfile(id):null;
}
async function updateAvatarPath(id,path){
 const r=await query("UPDATE users SET avatar_path=$2,updated_at=now() WHERE id=$1 RETURNING id",[String(id),path]);
 return r.rowCount===1;
}
async function updateNotificationPreferences(id,prefs){
 const r=await query("UPDATE users SET notification_preferences=COALESCE(notification_preferences,'{}'::jsonb)||$2::jsonb,updated_at=now() WHERE id=$1 RETURNING notification_preferences",[String(id),JSON.stringify(prefs)]);
 return r.rows[0]?.notification_preferences||null;
}
async function logDevice(userId,entry){
 if(!process.env.DATABASE_URL)return;
 await query("INSERT INTO login_devices(user_id,device_id,device,browser,ip) VALUES($1,$2,$3,$4,$5::inet) ON CONFLICT(user_id,device_id) DO UPDATE SET device=EXCLUDED.device,browser=EXCLUDED.browser,ip=EXCLUDED.ip,last_seen_at=now()",[String(userId),entry.deviceId,entry.device,entry.browser,entry.ip==="Không xác định"?null:entry.ip]);
 await query("DELETE FROM login_devices WHERE user_id=$1 AND device_id NOT IN (SELECT device_id FROM login_devices WHERE user_id=$1 ORDER BY last_seen_at DESC LIMIT 25)",[String(userId)]);
}
async function listDevices(userId){
 const r=await query("SELECT device_id,device,browser,host(ip) AS ip,first_seen_at,last_seen_at FROM login_devices WHERE user_id=$1 ORDER BY last_seen_at DESC LIMIT 25",[String(userId)]);
 return r.rows;
}
async function accountActivity(id){
 const [counts,subject,weekly,recent,submissions,notifications]=await Promise.all([
  query("SELECT count(*)::int AS attempts,count(*) FILTER (WHERE score IS NOT NULL)::int AS scored,round(avg(score) FILTER (WHERE score IS NOT NULL),1) AS average,count(*) FILTER (WHERE verified)::int AS verified,round(avg(score) FILTER (WHERE verified),1) AS verified_average FROM results WHERE user_id=$1",[id]),
  query("SELECT subject,count(*)::int AS attempts,round(avg(score) FILTER (WHERE score IS NOT NULL),1) AS average FROM results WHERE user_id=$1 GROUP BY subject ORDER BY attempts DESC",[id]),
  query("SELECT to_char(date_trunc('day',created_at),'YYYY-MM-DD') AS day,count(*)::int AS attempts FROM results WHERE user_id=$1 AND created_at >= now()-interval '30 days' GROUP BY 1 ORDER BY 1",[id]),
  query("SELECT id,subject,title,score,correct,total,created_at FROM results WHERE user_id=$1 ORDER BY created_at DESC LIMIT 12",[id]),
  query("SELECT count(*)::int AS total FROM submissions WHERE student_id=$1",[id]),
  query("SELECT count(*)::int AS unread FROM notifications WHERE user_id=$1 AND read_at IS NULL",[id])
 ]);
 return {total:counts.rows[0],subjects:subject.rows,days:weekly.rows,recent:recent.rows,submissions:submissions.rows[0].total,unreadNotifications:notifications.rows[0].unread};
}
async function exportOwnData(id){
 const [profile,results,submissions,notifications,works,devices,sync]=await Promise.all([
  getProfile(id),
  query("SELECT * FROM results WHERE user_id=$1 ORDER BY created_at DESC",[id]),
  query("SELECT * FROM submissions WHERE student_id=$1 ORDER BY submitted_at DESC",[id]),
  query("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC",[id]),
  query("SELECT * FROM student_works WHERE user_id=$1 ORDER BY created_at DESC",[id]),
  listDevices(id),
  getStudentSync(id)
 ]);
 if(!profile)return null;
 return {exportedAt:new Date().toISOString(),source:"postgres",profile,results:results.rows,submissions:submissions.rows,notifications:notifications.rows,studentWorks:works.rows,loginDevices:devices,studentSync:sync?.student_sync||null};
}
async function createNotification(actor,notice){
 const target=String(notice.userId||"");
 if(!notice.title||!notice.message)throw new Error("Thiếu nội dung thông báo");
 if(!target&&actor.role!=="admin")throw new Error("Chỉ Admin được gửi thông báo toàn hệ thống");
 if(target&&actor.role!=="admin"){
  const allowed=await query("SELECT EXISTS(SELECT 1 FROM classes c JOIN class_students cs ON cs.class_id=c.id WHERE c.teacher_id=$1 AND cs.student_id=$2) AS ok",[actor.id,target]);
  if(!allowed.rows[0]?.ok)throw new Error("Giáo viên không được gửi thông báo cho học sinh ngoài lớp");
 }
 if(target){
  const r=await query("INSERT INTO notifications(id,user_id,title,message) SELECT $1,id,$3,$4 FROM users WHERE id=$2 RETURNING id",[notice.id,target,notice.title,notice.message]);
  return r.rowCount;
 }
 // Genuine notification row for each registered student. No fake global item.
 const r=await query("INSERT INTO notifications(id,user_id,title,message) SELECT gen_random_uuid()::text,id,$1,$2 FROM users WHERE role='student' AND locked=false RETURNING id",[notice.title,notice.message]);
 return r.rowCount;
}
async function listNotifications(userId){
 const r=await query("SELECT id,title,message,read_at,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",[String(userId)]);
 return r.rows;
}
async function markNotification(userId,id){
 const r=await query("UPDATE notifications SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND user_id=$2 RETURNING id",[String(id),String(userId)]);
 return r.rowCount>0;
}

async function adminGrades(filters={}){
 const page=Number(filters.page)||1;
 const args=[filters.grade||null,filters.subject||null,filters.search||null,filters.status||null];
 const where="($1::int IS NULL OR COALESCE(r.grade,u.grade)=$1) AND ($2::text IS NULL OR r.subject=$2) AND ($3::text IS NULL OR position(lower($3) in lower(u.name))>0) AND ($4::text IS NULL OR ($4='verified' AND r.verified=true) OR ($4='unverified' AND r.verified=false))";
 const [count,rows]=await Promise.all([
  query("SELECT count(*)::int AS total,count(*) FILTER (WHERE r.verified)::int AS verified,count(*) FILTER (WHERE NOT r.verified)::int AS unverified FROM results r JOIN users u ON u.id=r.user_id WHERE "+where,args),
  query("SELECT r.id,u.name AS student_name,COALESCE(r.grade,u.grade) AS grade,r.subject,r.title,r.score,r.correct,r.total,r.verified,r.created_at FROM results r JOIN users u ON u.id=r.user_id WHERE "+where+" ORDER BY r.created_at DESC LIMIT 25 OFFSET $5",[...args,(page-1)*25])
 ]);
 const summary=count.rows[0];
 return {results:rows.rows,summary,pagination:{page,limit:25,total:summary.total,pages:Math.ceil(summary.total/25)}};
}
async function adminLive(){
 const [users,roles,results,submissions,activity,errors,backup]=await Promise.all([
  query("SELECT count(*)::int AS total,count(*) FILTER (WHERE locked)::int AS locked FROM users"),
  query("SELECT role,count(*)::int AS total FROM users GROUP BY role"),
  query("SELECT count(*)::int AS total,count(*) FILTER (WHERE created_at >= now()-interval '7 days')::int AS last7d FROM results"),
  query("SELECT count(*)::int AS total FROM submissions"),
  query("SELECT count(DISTINCT user_id)::int AS users FROM login_devices WHERE last_seen_at>=now()-interval '7 days'"),
  query("SELECT count(*)::int AS last24h FROM client_error_events WHERE created_at>=now()-interval '24 hours'"),
  query("SELECT sha256,bytes,created_at FROM database_backups ORDER BY created_at DESC LIMIT 1")
 ]);
 return {users:users.rows[0],roles:roles.rows,results:results.rows[0],submissions:submissions.rows[0].total,activeUsers7d:activity.rows[0].users,errors24h:errors.rows[0].last24h,lastBackup:backup.rows[0]||null};
}
async function adminAudit(){
 const r=await query("SELECT id,user_id,action,meta,created_at FROM audit_logs ORDER BY created_at DESC LIMIT 50");return r.rows;
}
async function clientError(route,message){
 await query("INSERT INTO client_error_events(route,message) VALUES($1,$2)",[String(route).slice(0,120),String(message).slice(0,240)]);
}
async function recentClientErrors(){
 const r=await query("SELECT route,message,created_at FROM client_error_events ORDER BY created_at DESC LIMIT 50");return r.rows;
}
async function registerBackup(sha,bytes){
 await query("INSERT INTO database_backups(sha256,bytes) VALUES($1,$2)",[sha,bytes]);
}

async function getResultBySubmission(userId,clientId){
 if(!clientId)return null;
 const r=await query("SELECT id,user_id,subject,grade,title,score,correct,total,verified,grading_status,created_at FROM results WHERE user_id=$1 AND client_submission_id=$2 LIMIT 1",[String(userId),String(clientId)]);
 return r.rows[0]||null;
}
async function saveResult(r){
 if(!process.env.DATABASE_URL)return null;
 const written=await query(`INSERT INTO results(id,client_submission_id,user_id,subject,grade,title,score,correct,total,wrong_question_ids,duration_sec,proctor,verified,grading_status,created_at)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12::jsonb,$13,$14,COALESCE($15,now())) ON CONFLICT DO NOTHING RETURNING id`,
 [String(r.id),r.clientSubmissionId||null,String(r.userId),r.subject||null,r.grade||null,r.title||null,r.score??null,r.correct??null,r.total??null,JSON.stringify(r.wrongQuestionIds||[]),r.durationSec||0,JSON.stringify(r.proctor||null),false,"self_reported",r.createdAt||r.isoDate||null]);
 return written.rows[0]||await getResultBySubmission(r.userId,r.clientSubmissionId);
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
async function loadAppState(){if(!process.env.DATABASE_URL)return null;const r=await query("SELECT data FROM app_state WHERE id=1");return r.rows[0]?.data||null}
async function saveAppState(data){if(!process.env.DATABASE_URL)return false;await query("INSERT INTO app_state(id,data,updated_at) VALUES(1,$1::jsonb,now()) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()",[JSON.stringify(data||{})]);return true}
async function close(){if(pool){await pool.end();pool=null}}
module.exports={connect,query,migrate,health,upsertUser,getUserAccess,setUserAccess,getStudentSync,saveStudentSync,listAuthorizedResults,getByAuthUid,getById,getProfile,updateProfile,updateAvatarPath,updateNotificationPreferences,logDevice,listDevices,accountActivity,exportOwnData,createNotification,listNotifications,markNotification,adminGrades,adminLive,adminAudit,clientError,recentClientErrors,registerBackup,getResultBySubmission,saveResult,listResults,importJsonDatabase,loadAppState,saveAppState,close,get pool(){return pool}};