"use strict";
const MAX_RECENT=30;
function allowedIds(user,db){
 if(user.role==="admin")return null;
 if(user.role==="student")return [String(user.id)];
 if(user.role==="parent")return [...new Set((user.children||[]).map(String))];
 if(user.role==="teacher"){
  return [...new Set((db.classes||[]).filter(c=>c.teacherId===user.id).flatMap(c=>(c.studentIds||[]).map(String)))];
 }
 return [];
}
function recent(r,owner){
 return {id:String(r.id||""),userId:String(r.userId||""),studentName:String(owner?.name||"Chưa xác định tài khoản").slice(0,120),
  studentEmail:String(owner?.email||"").slice(0,180),title:String(r.title||"Bài luyện tập").slice(0,200),
  subject:String(r.subject||"other"),grade:Number(r.grade)||null,
  score:Number(r.score)||0,correct:Number(r.correct)||0,total:Number(r.total)||0,
  createdAt:r.createdAt||r.isoDate||null,verified:r.verified===true};
}
function summarize(list){
 const groups=new Map();
 for(const r of list){
  const subject=String(r.subject||"other"),g=groups.get(subject)||{id:subject,attempts:0,totalScore:0,wrong:0};
  g.attempts++;g.totalScore+=Number(r.score)||0;
  g.wrong+=Math.max(0,(Number(r.total)||0)-(Number(r.correct)||0));
  groups.set(subject,g);
 }
 return [...groups.values()].map(g=>({id:g.id,attempts:g.attempts,avg:Math.round(g.totalScore/g.attempts),wrong:g.wrong}));
}
module.exports=async function handleAnalytics(req,res,p,ctx){
 if(p!=="/api/analytics")return false;
 const {send,requireUser,load,pg,subjectName,monitor}=ctx;
 if(req.method!=="GET")return send(res,405,{error:"Phương thức không được hỗ trợ"}),true;
 const user=await requireUser(req,res);if(!user)return true;
 const db=load(),ids=allowedIds(user,db);
 try{
  let groups,overall,latest;
  if(process.env.DATABASE_URL){
   const restricted=ids!==null;
   const where=restricted?"WHERE r.user_id=ANY($1::text[])":"";
   const params=restricted?[ids]:[];
   const [bySubject,totals,rows]=await Promise.all([
    pg.query(`SELECT r.subject,COUNT(*)::int AS attempts,AVG(r.score)::float8 AS average,
      SUM(GREATEST(0,COALESCE(r.total,0)-COALESCE(r.correct,0)))::int AS wrong
      FROM results r ${where} GROUP BY r.subject`,params),
    pg.query(`SELECT COUNT(*)::int AS attempts,AVG(r.score)::float8 AS average,
      SUM(COALESCE(r.duration_sec,0))::float8 AS seconds FROM results r ${where}`,params),
    pg.query(`SELECT r.id,r.user_id AS "userId",r.subject,r.grade,r.title,r.score,r.correct,r.total,
      r.created_at AS "createdAt",u.name AS "ownerName",u.email AS "ownerEmail"
      FROM results r LEFT JOIN users u ON u.id=r.user_id ${where}
      ORDER BY r.created_at DESC,r.id DESC LIMIT 30`,params)
   ]);
   groups=bySubject.rows.map(x=>({id:x.subject||"other",attempts:Number(x.attempts),avg:Math.round(Number(x.average)||0),wrong:Number(x.wrong)||0}));
   overall={attempts:Number(totals.rows[0]?.attempts||0),average:Math.round(Number(totals.rows[0]?.average)||0),seconds:Number(totals.rows[0]?.seconds||0)};
   latest=rows.rows.map(r=>recent(r,{name:r.ownerName,email:r.ownerEmail}));
  }else{
   const found=(db.results||[]).filter(r=>ids===null||ids.includes(String(r.userId)));
   const owners=new Map((db.users||[]).map(u=>[String(u.id),u]));
   groups=summarize(found);
   overall={attempts:found.length,average:found.length?Math.round(found.reduce((v,r)=>v+(Number(r.score)||0),0)/found.length):0,
    seconds:found.reduce((v,r)=>v+(Number(r.durationSec)||0),0)};
   latest=[...found].sort((a,b)=>Date.parse(b.createdAt||b.isoDate||0)-Date.parse(a.createdAt||a.isoDate||0))
    .slice(0,MAX_RECENT).map(r=>recent(r,owners.get(String(r.userId))));
  }
  const subjects=groups.map(g=>({id:g.id,name:subjectName(g.id),attempts:g.attempts,avg:g.avg,wrong:g.wrong}))
   .sort((a,b)=>a.avg-b.avg);
  return send(res,200,{totalAttempts:overall.attempts,average:overall.average,totalMinutes:Math.round(overall.seconds/60),
   subjects,weakest:subjects[0]||null,recentResults:latest,scope:user.role==="admin"?"all":user.role,
   source:process.env.DATABASE_URL?"postgres":"local"}),true;
 }catch(e){
  monitor?.warn?.("analytics_read_failed",{message:e.message});
  return send(res,503,{error:"Chưa lấy được phân tích từ dữ liệu đã lưu. Vui lòng thử lại."}),true;
 }
};
