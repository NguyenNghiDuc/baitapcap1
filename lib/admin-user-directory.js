"use strict";
// Efficient Admin directory queries: PostgreSQL filters/paginates user rows
// before sending them to the API, rather than materializing every account.
const MAX_PAGE=100000,MAX_LIMIT=100,MAX_SEARCH=100;
function positive(value,fallback,max){
 if(value===undefined||value===null||value==="")return fallback;
 if(typeof value!=="string"||!/^\d+$/.test(value))throw Error("Trang hoặc kích thước trang không hợp lệ");
 const n=Number(value);
 if(!Number.isSafeInteger(n)||n<1||n>max)throw Error("Trang hoặc kích thước trang không hợp lệ");
 return n;
}
function readAdminUserPage(query={}){
 if(typeof query.search==="object")throw Error("Tìm kiếm tài khoản không hợp lệ");
 const search=String(query.search||"").trim();
 if(search.length>MAX_SEARCH)throw Error("Tìm kiếm tối đa 100 ký tự");
 return {page:positive(query.page,1,MAX_PAGE),limit:positive(query.limit,30,MAX_LIMIT),search};
}
function buildAdminUserQueries(filters,{page,limit,search}){
 const where="WHERE ($1::text='' OR u.role=$1) "+
  "AND ($2::text='' OR ($2='active' AND u.locked=false) OR ($2='locked' AND u.locked=true)) "+
  "AND ($3::text='' OR STRPOS(LOWER(u.name),LOWER($3))>0 OR STRPOS(LOWER(u.email),LOWER($3))>0 OR STRPOS(LOWER(u.role),LOWER($3))>0)";
 const params=[filters.role||"",filters.accountStatus||"",search];
 return {
  countSql:'SELECT COUNT(*)::int AS total,(SELECT COUNT(*)::int FROM users) AS "allUsersTotal" FROM users u '+where,
  rowsSql:'SELECT u.id,u.name,u.email,u.role,u.grade,u.locked FROM users u '+where+
   ' ORDER BY u.created_at DESC,u.id DESC LIMIT $4 OFFSET $5',
  params,rowsParams:[...params,limit,(page-1)*limit]
 };
}

const ROLES=["student","parent","teacher","admin"];
function aggregateSummary(groups){
 const roles={student:0,parent:0,teacher:0,admin:0};
 let unlocked=0,locked=0;
 for(const g of groups){
  const count=Number(g.total||0);
  if(!ROLES.includes(g.role)||!Number.isSafeInteger(count)||count<0)
   throw Error("Nhóm tài khoản không hợp lệ");
  roles[g.role]+=count;
  if(g.locked===true)locked+=count;
  else if(g.locked===false)unlocked+=count;
  else throw Error("Trạng thái tài khoản không hợp lệ");
 }
 return {roles,unlocked,locked,total:unlocked+locked};
}
function summarizeUsers(users){
 const groups=new Map();
 for(const u of users){
  const key=String(u.role)+"|"+String(!!u.locked);
  const item=groups.get(key)||{role:u.role,locked:!!u.locked,total:0};
  item.total++;
  groups.set(key,item);
 }
 return aggregateSummary([...groups.values()]);
}


const GROWTH_MONTHS=6;
function growthWindow(now=new Date()){
 const first=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-(GROWTH_MONTHS-1),1));
 const end=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1));
 const months=Array.from({length:GROWTH_MONTHS},(_,i)=>{
  const date=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+i,1));
  return date.toISOString().slice(0,7);
 });
 return {months,from:first.toISOString(),to:end.toISOString()};
}
function normalizeGrowth(rows,now=new Date()){
 const {months}=growthWindow(now),byMonth=new Map(months.map(m=>[m,0]));
 for(const row of rows||[]){
  const month=String(row.month||""),count=Number(row.total);
  if(byMonth.has(month)&&Number.isSafeInteger(count)&&count>=0)
   byMonth.set(month,byMonth.get(month)+count);
 }
 return months.map(month=>({month,total:byMonth.get(month)}));
}
function summarizeGrowth(users,now=new Date()){
 const rows=new Map();
 for(const user of users){
  const date=new Date(user.createdAt||user.created_at||"");
  if(!Number.isFinite(date.getTime()))continue;
  const month=date.toISOString().slice(0,7);
  rows.set(month,(rows.get(month)||0)+1);
 }
 return normalizeGrowth([...rows].map(([month,total])=>({month,total})),now);
}

async function loadAdminUserPage(pg,filters,options){
 const {page,limit}=options,q=buildAdminUserQueries(filters,options);
 const window=growthWindow();
 const [counts,results,summaryGroups,growthRows]=await Promise.all([
  pg.query(q.countSql,q.params),
  pg.query(q.rowsSql,q.rowsParams),
  pg.query("SELECT role,locked,COUNT(*)::int AS total FROM users GROUP BY role,locked"),
  pg.query("SELECT TO_CHAR(created_at AT TIME ZONE 'UTC','YYYY-MM') AS month, COUNT(*)::int AS total FROM users WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz GROUP BY 1 ORDER BY 1",[window.from,window.to])
 ]);
 const total=Number(counts.rows[0]?.total||0),allUsersTotal=Number(counts.rows[0]?.allUsersTotal||0);
 return {
  items:results.rows.map(u=>({...u,locked:!!u.locked})),
  allUsersTotal,
  accountSummary:aggregateSummary(summaryGroups.rows),
  accountGrowth:normalizeGrowth(growthRows.rows),
  pagination:{page,limit,total,pages:Math.ceil(total/limit),hasMore:page*limit<total}
 };
}
module.exports={readAdminUserPage,buildAdminUserQueries,loadAdminUserPage,aggregateSummary,summarizeUsers,growthWindow,normalizeGrowth,summarizeGrowth};
