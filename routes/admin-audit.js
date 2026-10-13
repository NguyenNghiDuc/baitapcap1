"use strict";
const {URL}=require("node:url");
const MAX_LIMIT=50;
function publicEntry(x){
 return {
  id:String(x.id||""),
  userId:x.userId?String(x.userId):null,
  actorName:String(x.actorName||"Không rõ"),
  action:String(x.action||""),
  at:x.at||null
 };
}
// Privacy: never return audit.meta; it may contain internal identifiers,
// email addresses or security-related details.
module.exports=async function handleAdminAudit(req,res,p,ctx){
 if(p!=="/api/admin/audit")return false;
 const {send,requireUser,load,pg}=ctx;
 const admin=await requireUser(req,res,["admin"]);if(!admin)return true;
 if(req.method!=="GET")return send(res,405,{error:"Chỉ hỗ trợ xem nhật ký"},{"Allow":"GET","Cache-Control":"private, no-store"}),true;
 const q=new URL(req.url,"http://localhost").searchParams;
 const page=Math.max(1,Math.min(10000,Number.parseInt(q.get("page"),10)||1));
 const limit=Math.max(1,Math.min(MAX_LIMIT,Number.parseInt(q.get("limit"),10)||20));
 const search=String(q.get("search")||"").trim().slice(0,100);
 try{
  let rows=[],total=0;
  if(process.env.DATABASE_URL){
   const params=[search];
   const where="WHERE ($1::text='' OR a.action ILIKE '%'||$1||'%' OR COALESCE(u.name,'') ILIKE '%'||$1||'%')";
   const [counter,records]=await Promise.all([
    pg.query("SELECT count(*)::int AS total FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id "+where,params),
    pg.query('SELECT a.id,a.user_id AS "userId",a.action,a.created_at AS at,u.name AS "actorName" FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id '+where+' ORDER BY a.created_at DESC,a.id DESC LIMIT $2 OFFSET $3',[search,limit,(page-1)*limit])
   ]);
   total=Number(counter.rows[0]?.total||0);rows=records.rows.map(publicEntry);
  }else{
   const db=load(),names=new Map((db.users||[]).map(u=>[String(u.id),String(u.name||"Không rõ")]));
   const normalized=String(search).toLocaleLowerCase("vi-VN");
   const records=(db.audit||[]).map(a=>publicEntry({
    ...a,actorName:names.get(String(a.userId))||"Hệ thống"
   })).filter(a=>!normalized||(a.action+" "+a.actorName).toLocaleLowerCase("vi-VN").includes(normalized));
   records.sort((a,b)=>Date.parse(b.at||0)-Date.parse(a.at||0));
   total=records.length;rows=records.slice((page-1)*limit,page*limit);
  }
  return send(res,200,{events:rows,pagination:{page,limit,total,pages:Math.ceil(total/limit),hasMore:page*limit<total},
   scope:process.env.DATABASE_URL?"database":"instance",note:"Chỉ hiển thị các trường an toàn, không trả về metadata nội bộ."},{"Cache-Control":"private, no-store"}),true;
 }catch(e){
  console.error("[admin-audit]",String(e?.message||e).slice(0,180));
  return send(res,503,{error:"Không thể đọc nhật ký. Vui lòng kiểm tra kết nối cơ sở dữ liệu."},{"Cache-Control":"private, no-store"}),true;
 }
};
