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
async function loadAdminUserPage(pg,filters,options){
 const {page,limit}=options,q=buildAdminUserQueries(filters,options);
 const [counts,results]=await Promise.all([
  pg.query(q.countSql,q.params),
  pg.query(q.rowsSql,q.rowsParams)
 ]);
 const total=Number(counts.rows[0]?.total||0),allUsersTotal=Number(counts.rows[0]?.allUsersTotal||0);
 return {
  items:results.rows.map(u=>({...u,locked:!!u.locked})),
  allUsersTotal,
  pagination:{page,limit,total,pages:Math.ceil(total/limit),hasMore:page*limit<total}
 };
}
module.exports={readAdminUserPage,buildAdminUserQueries,loadAdminUserPage};
