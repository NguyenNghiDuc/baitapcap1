"use strict";
const {URL}=require("node:url");
const MAX_ROWS=2000;
const {reviewSignals}=require("./admin-results");
function cell(x){
 let s=String(x??"").replace(/[\r\n\t\u0000-\u001f\u007f]/g," ").trim();
 if(/^[=+\-@]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
function makeCsv(rows){
 const header=["Tên học sinh","Email","Tên bài","Môn","Lớp","Điểm (%)","Số đúng","Tổng câu","Ngày nộp","Nguồn điểm"];
 const data=rows.map(r=>[
  r.ownerName||"Chưa xác định",r.ownerEmail||"",r.title||"Bài kiểm tra",r.subject||"",r.grade??"",
  Number.isFinite(Number(r.score))&&r.score!==null?Number(r.score):"",
  Number.isFinite(Number(r.correct))&&r.correct!==null?Number(r.correct):"",
  Number.isFinite(Number(r.total))&&r.total!==null?Number(r.total):"",
  r.createdAt||"","Tự gửi từ thiết bị, chưa được giáo viên xác minh"
 ]);
 return "\ufeff"+[header,...data].map(row=>row.map(cell).join(",")).join("\r\n")+"\r\n";
}
async function handler(req,res,p,{send,requireUser,load,pg}){
 if(p!=="/api/admin/results/export")return false;
 const admin=await requireUser(req,res,["admin"]);if(!admin)return true;
 if(req.method!=="GET"){send(res,405,{error:"Chỉ hỗ trợ GET"},{"Allow":"GET","Cache-Control":"private, no-store"});return true}
 const q=new URL(req.url,"http://localhost").searchParams;
 const search=String(q.get("search")||"").trim().slice(0,100),subject=String(q.get("subject")||"").trim().slice(0,40);
 const userId=String(q.get("userId")||"").trim().slice(0,128),rawGrade=q.get("grade"),grade=rawGrade?Number(rawGrade):0;
 const flagged=q.get("review")==="flagged";
 if(rawGrade&&(!Number.isInteger(grade)||grade<1||grade>5)){send(res,400,{error:"Lớp không hợp lệ"});return true}
 try{
  let rows=[];
  if(process.env.DATABASE_URL){
   const reviewWhere=flagged?" AND ((r.score IS NOT NULL AND (r.score < 0 OR r.score > 100)) OR (r.total > 0 AND (r.correct < 0 OR r.correct > r.total)) OR (r.duration_sec > 0 AND r.duration_sec < 5 AND r.total >= 10))":"";
   const where="WHERE ($1::text='' OR r.user_id=$1) AND ($2::text='' OR r.subject=$2) AND ($3::int=0 OR r.grade=$3) AND ($4::text='' OR r.title ILIKE '%'||$4||'%' OR u.name ILIKE '%'||$4||'%' OR u.email ILIKE '%'||$4||'%')"+reviewWhere;
   const params=[userId,subject,grade,search];
   const count=await pg.query("SELECT count(*)::int AS total FROM results r LEFT JOIN users u ON u.id=r.user_id "+where,params);
   if(Number(count.rows[0]?.total||0)>MAX_ROWS){send(res,413,{error:"Có hơn 2.000 kết quả. Hãy lọc theo lớp, môn hoặc tên trước khi xuất."});return true}
   const result=await pg.query('SELECT r.title,r.subject,r.grade,r.score,r.correct,r.total,r.created_at AS "createdAt",u.name AS "ownerName",u.email AS "ownerEmail" FROM results r LEFT JOIN users u ON u.id=r.user_id '+where+' ORDER BY r.created_at DESC,r.id DESC LIMIT $5',[...params,MAX_ROWS]);
   rows=result.rows;
  }else{
   const db=load(),users=new Map((db.users||[]).map(x=>[String(x.id),x]));
   const needle=search.toLocaleLowerCase("vi");
   rows=(db.results||[]).filter(r=>{
    const u=users.get(String(r.userId))||{};
    return (!userId||String(r.userId)===userId)&&(!subject||r.subject===subject)&&(!grade||Number(r.grade)===grade)&&
     (!needle||[r.title,u.name,u.email].some(t=>String(t||"").toLocaleLowerCase("vi").includes(needle)));
   }).filter(r=>!flagged||reviewSignals(r).length>0).sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0));
   if(rows.length>MAX_ROWS){send(res,413,{error:"Có hơn 2.000 kết quả. Hãy lọc trước khi xuất."});return true}
   rows=rows.map(r=>({...r,ownerName:users.get(String(r.userId))?.name,ownerEmail:users.get(String(r.userId))?.email}));
  }
  const csv=Buffer.from(makeCsv(rows),"utf8"),date=new Date().toISOString().slice(0,10);
  res.writeHead(200,{"Content-Type":"text/csv; charset=utf-8",
   "Content-Disposition":'attachment; filename="bang-diem-'+date+'.csv"',
   "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"});
  res.end(csv);
 }catch(e){
  console.error("[admin-export]",String(e?.message||"error").slice(0,150));
  send(res,503,{error:"Không xuất được bảng điểm. Hãy kiểm tra cơ sở dữ liệu."},{"Cache-Control":"private, no-store"});
 }
 return true;
}
module.exports=handler;
module.exports.makeCsv=makeCsv;
module.exports.cell=cell;
