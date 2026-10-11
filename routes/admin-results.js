"use strict";
const {URL}=require("node:url");
const MAX_LIMIT=50;
const selectUser=r=>({name:r.ownerName||"Tài khoản chưa xác định",email:r.ownerEmail||"",id:r.userId});
function row(r){return {
 id:String(r.id),userId:String(r.userId||""),owner:selectUser(r),
 title:String(r.title||"Bài kiểm tra"),subject:String(r.subject||""),grade:r.grade||null,
 score:Number(r.score),correct:Number(r.correct),total:Number(r.total),
 durationSec:Number(r.durationSec||0),createdAt:r.createdAt||null,
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
 if(grade&&(!Number.isInteger(grade)||grade<1||grade>5))return send(res,400,{error:"Lớp không hợp lệ"}),true;
 try{
  let total,items;
  if(process.env.DATABASE_URL){
   const where=`WHERE ($1::text='' OR r.user_id=$1)
     AND ($2::text='' OR r.subject=$2)
     AND ($3::int=0 OR r.grade=$3)
     AND ($4::text='' OR r.title ILIKE '%'||$4||'%' OR u.name ILIKE '%'||$4||'%' OR u.email ILIKE '%'||$4||'%')`;
   const params=[userId,subject,grade,search];
   const count=await pg.query(`SELECT count(*)::int AS total FROM results r LEFT JOIN users u ON u.id=r.user_id ${where}`,params);
   total=Number(count.rows[0]?.total||0);
   const result=await pg.query(`SELECT r.id,r.user_id AS "userId",r.title,r.subject,r.grade,r.score,r.correct,r.total,r.duration_sec AS "durationSec",r.created_at AS "createdAt",u.name AS "ownerName",u.email AS "ownerEmail"
     FROM results r LEFT JOIN users u ON u.id=r.user_id ${where}
     ORDER BY r.created_at DESC,r.id DESC LIMIT $5 OFFSET $6`,[...params,limit,(page-1)*limit]);
   items=result.rows.map(row);
  }else{
   const db=load(),users=new Map((db.users||[]).map(u=>[String(u.id),u]));
   const normalize=x=>{const owner=users.get(String(x.userId))||{};return row({...x,ownerName:owner.name,ownerEmail:owner.email})};
   const filtered=(db.results||[]).map(normalize).filter(r=>
     (!userId||r.userId===userId)&&(!subject||r.subject===subject)&&(!grade||Number(r.grade)===grade)&&
     (!search||[r.title,r.owner.name,r.owner.email].some(v=>String(v||"").toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))))
   ).sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0));
   total=filtered.length;items=filtered.slice((page-1)*limit,page*limit);
  }
  return send(res,200,{results:items,pagination:{page,limit,total,pages:Math.ceil(total/limit),hasMore:page*limit<total},
    source:process.env.DATABASE_URL?"postgres":"local",note:"Điểm bài kiểm tra được gửi từ thiết bị học sinh, chưa được xác minh bởi giáo viên."}),true;
 }catch(e){console.error("[admin-results]",e.message);return send(res,503,{error:"Chưa đọc được dữ liệu kết quả trên máy chủ. Vui lòng kiểm tra PostgreSQL."}),true}
};