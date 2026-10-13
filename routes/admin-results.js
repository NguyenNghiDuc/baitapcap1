"use strict";
const {URL}=require("node:url");
const MAX_LIMIT=50;
const BANDS=[{label:"0–<50%",min:0,max:50},{label:"50–<70%",min:50,max:70},{label:"70–<90%",min:70,max:90},{label:"90–100%",min:90,max:101}];
function distribution(scores){const bands=BANDS.map(b=>({label:b.label,count:0}));let excluded=0;for(const raw of scores){if(raw===null||raw===undefined||raw===""){excluded++;continue}const n=Number(raw);if(!Number.isFinite(n)||n<0||n>100){excluded++;continue}const i=BANDS.findIndex(b=>n>=b.min&&n<b.max);if(i>=0)bands[i].count++;else excluded++}return {bands,valid:scores.length-excluded,excluded,unit:"submission",verified:false};}
function reviewSignals(r){
 const reasons=[];
 const score=r.score===null||r.score===undefined||r.score===""?null:Number(r.score);
 const correct=r.correct===null||r.correct===undefined||r.correct===""?null:Number(r.correct);
 const total=r.total===null||r.total===undefined||r.total===""?null:Number(r.total);
 const duration=r.durationSec===null||r.durationSec===undefined||r.durationSec===""?null:Number(r.durationSec);
 if(score!==null&&(!Number.isFinite(score)||score<0||score>100))reasons.push("Điểm ngoài khoảng 0–100");
 if(total!==null&&correct!==null&&Number.isFinite(total)&&Number.isFinite(correct)&&total>0&&(correct<0||correct>total))reasons.push("Số câu đúng không hợp lệ");
 if(duration!==null&&Number.isFinite(duration)&&duration>0&&duration<5&&total!==null&&Number.isFinite(total)&&total>=10)reasons.push("Thời gian làm bài dưới 5 giây với ít nhất 10 câu");
 return reasons;
}
const selectUser=r=>({name:r.ownerName||"Tài khoản chưa xác định",email:r.ownerEmail||"",id:r.userId});
function row(r){return {
 id:String(r.id),userId:String(r.userId||""),owner:selectUser(r),
 title:String(r.title||"Bài kiểm tra"),subject:String(r.subject||""),grade:r.grade||null,
 score:r.score===null||r.score===undefined||r.score===""?null:Number(r.score),correct:Number(r.correct),total:Number(r.total),
 durationSec:Number(r.durationSec||0),createdAt:r.createdAt||null,
 review:{needsReview:reviewSignals(r).length>0,reasons:reviewSignals(r)},
 gradingStatus:r.verified?"verified":"self_reported",verified:!!r.verified
};}
module.exports=async function adminResults(req,res,p,ctx){
 if(p!=="/api/admin/results")return false;
 const {send,requireUser,load,pg}=ctx;
 const admin=await requireUser(req,res,["admin"]);if(!admin)return true;
 if(req.method!=="GET")return send(res,405,{error:"Phương thức không được hỗ trợ"}),true;
 const q=new URL(req.url,"http://localhost").searchParams;
 const page=Math.max(1,Math.min(100000,Number.parseInt(q.get("page"),10)||1));
 const limit=Math.max(1,Math.min(MAX_LIMIT,Number.parseInt(q.get("limit"),10)||20));
 const search=String(q.get("search")||"").trim().slice(0,100);
 const userId=String(q.get("userId")||"").trim().slice(0,128);
 const subject=String(q.get("subject")||"").trim().slice(0,40);
 const grade=Number(q.get("grade"))||0;
 const flagged=q.get("review")==="flagged";
 if(grade&&(!Number.isInteger(grade)||grade<1||grade>5))return send(res,400,{error:"Lớp không hợp lệ"}),true;
 try{
  let total,items,stats;
  if(process.env.DATABASE_URL){
   const reviewWhere=flagged?` AND ((r.score IS NOT NULL AND (r.score < 0 OR r.score > 100)) OR (r.total > 0 AND (r.correct < 0 OR r.correct > r.total)) OR (r.duration_sec > 0 AND r.duration_sec < 5 AND r.total >= 10))`:"";
   const where=`WHERE ($1::text='' OR r.user_id=$1)
     AND ($2::text='' OR r.subject=$2)
     AND ($3::int=0 OR r.grade=$3)
     AND ($4::text='' OR r.title ILIKE '%'||$4||'%' OR u.name ILIKE '%'||$4||'%' OR u.email ILIKE '%'||$4||'%')${reviewWhere}`;
   const params=[userId,subject,grade,search];
   // Use pooled connections concurrently for independent read-only queries.
   const [count,result,aggregate]=await Promise.all([
    pg.query(`SELECT count(*)::int AS total FROM results r LEFT JOIN users u ON u.id=r.user_id ${where}`,params),
    pg.query(`SELECT r.id,r.user_id AS "userId",r.title,r.subject,r.grade,r.score,r.correct,r.total,r.duration_sec AS "durationSec",r.created_at AS "createdAt",u.name AS "ownerName",u.email AS "ownerEmail"
     FROM results r LEFT JOIN users u ON u.id=r.user_id ${where}
     ORDER BY r.created_at DESC,r.id DESC LIMIT $5 OFFSET $6`,[...params,limit,(page-1)*limit]),
    pg.query(`SELECT COUNT(*) FILTER (WHERE r.score >= 0 AND r.score < 50) AS b0, COUNT(*) FILTER (WHERE r.score >= 50 AND r.score < 70) AS b1, COUNT(*) FILTER (WHERE r.score >= 70 AND r.score < 90) AS b2, COUNT(*) FILTER (WHERE r.score >= 90 AND r.score <= 100) AS b3, COUNT(*) FILTER (WHERE r.score IS NULL OR r.score < 0 OR r.score > 100) AS excluded FROM results r LEFT JOIN users u ON u.id=r.user_id ${where}`,params)
   ]);
   total=Number(count.rows[0]?.total||0);
   items=result.rows.map(row);
   const a=aggregate.rows[0]||{};const counts=[a.b0,a.b1,a.b2,a.b3].map(n=>Number(n||0));stats={bands:BANDS.map((b,i)=>({label:b.label,count:counts[i]})),valid:counts.reduce((a,b)=>a+b,0),excluded:Number(a.excluded||0),unit:"submission",verified:false};
  }else{
   const db=load(),users=new Map((db.users||[]).map(u=>[String(u.id),u]));
   const normalize=x=>{const owner=users.get(String(x.userId))||{};return row({...x,ownerName:owner.name,ownerEmail:owner.email})};
   const filtered=(db.results||[]).map(normalize).filter(r=>
     (!userId||r.userId===userId)&&(!subject||r.subject===subject)&&(!grade||Number(r.grade)===grade)&&
     (!search||[r.title,r.owner.name,r.owner.email].some(v=>String(v||"").toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))))
   ).filter(r=>!flagged||r.review.needsReview).sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0));
   total=filtered.length;stats=distribution(filtered.map(x=>x.score));items=filtered.slice((page-1)*limit,page*limit);
  }
  return send(res,200,{results:items,pagination:{page,limit,total,pages:Math.ceil(total/limit),hasMore:page*limit<total},
    reviewFilter:flagged?"flagged":"all",distribution:stats,source:process.env.DATABASE_URL?"postgres":"local",note:"Điểm bài kiểm tra được gửi từ thiết bị học sinh, chưa được xác minh bởi giáo viên."}),true;
 }catch(e){console.error("[admin-results]",e.message);return send(res,503,{error:"Chưa đọc được dữ liệu kết quả trên máy chủ. Vui lòng kiểm tra PostgreSQL."}),true}
};
module.exports.distribution=distribution;

module.exports.reviewSignals=reviewSignals;
