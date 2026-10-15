"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {readAdminUserPage,buildAdminUserQueries,loadAdminUserPage,aggregateSummary,summarizeUsers}=require("../lib/admin-user-directory");
test("Admin account paging validates query values before querying PostgreSQL",()=>{
 assert.deepEqual(readAdminUserPage({page:"2",limit:"25",search:"  minh anh  "}),
  {page:2,limit:25,search:"minh anh"});
 assert.deepEqual(readAdminUserPage({}),{page:1,limit:30,search:""});
 for(const q of [
  {page:"-1"},{page:"1.1"},{page:"1abc"},{page:["1","2"]},
  {page:"100001"},{limit:"101"},{limit:"0"},{limit:"not-a-number"},
  {search:["a","b"]},{search:"a".repeat(101)}
 ])assert.throws(()=>readAdminUserPage(q),/không hợp lệ|100 ký tự/);
});
test("Postgres query uses parameterized role/status/search and stable LIMIT/OFFSET",()=>{
 const malicious="' OR 1=1 -- %_";
 const queries=buildAdminUserQueries({role:"teacher",accountStatus:"locked"},
  {page:3,limit:20,search:malicious});
 assert.deepEqual(queries.params,["teacher","locked",malicious]);
 assert.deepEqual(queries.rowsParams,["teacher","locked",malicious,20,40]);
 assert.match(queries.countSql,/COUNT\(\*\).*allUsersTotal/);
 assert.match(queries.rowsSql,/ORDER BY u.created_at DESC,u.id DESC LIMIT \$4 OFFSET \$5/);
 assert.doesNotMatch(queries.rowsSql,/SELECT \*/);
 assert.ok(!queries.rowsSql.includes(malicious));
 assert.ok(!queries.countSql.includes(malicious));
});
test("Postgres directory returns only requested page and separate full/filtered counts",async()=>{
 const calls=[];
 const fakePg={query:async(sql,params)=>{
  calls.push({sql,params});
  if(sql.includes("GROUP BY role,locked"))return {rows:[
   {role:"teacher",locked:true,total:30},{role:"student",locked:false,total:1700},
   {role:"parent",locked:false,total:70}
  ]};
  if(sql.includes("COUNT(*)"))return {rows:[{total:51,allUsersTotal:1800}]};
  return {rows:[{id:"u41",name:"Cô An",email:"an@example.test",role:"teacher",
   grade:null,locked:true},{id:"u42",name:"Cô Bình",email:"binh@example.test",role:"teacher",locked:true}]};
 }};
 const p=await loadAdminUserPage(fakePg,{role:"teacher",accountStatus:"locked"},
  {page:3,limit:20,search:"co"});
 assert.equal(calls.length,3);
 assert.deepEqual(p.items.map(x=>x.id),["u41","u42"]);
 assert.equal(p.items[0].locked,true);
 assert.equal(p.allUsersTotal,1800);
 assert.deepEqual(p.accountSummary,{roles:{student:1700,parent:70,teacher:30,admin:0},
  unlocked:1770,locked:30,total:1800});
 assert.deepEqual(p.pagination,{page:3,limit:20,total:51,pages:3,hasMore:false});
 assert.deepEqual(calls.find(x=>x.sql.includes("LIMIT $4")).params,
  ["teacher","locked","co",20,40]);
});
test("Admin user listing no longer fetches every PostgreSQL user into Node",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const server=fs.readFileSync(path.join(__dirname,"../server.js"),"utf8");
 assert.match(server,/loadAdminUserPage\(pgStore,filters,paging\)/);
 assert.match(server,/applyUserFilters\(list,filters\)/); // Local fallback remains available.
 assert.doesNotMatch(server,/SELECT id,name,email,role,grade,locked FROM users ORDER BY created_at DESC/);
});

test("Account summary uses all users independent of page, role or lock filter",()=>{
 const rows=[
  {role:"student",locked:false},{role:"student",locked:true},
  {role:"teacher",locked:false},{role:"parent",locked:false},
  {role:"admin",locked:true}
 ];
 const summary=summarizeUsers(rows);
 assert.deepEqual(summary,{roles:{student:2,parent:1,teacher:1,admin:1},
  unlocked:3,locked:2,total:5});
 assert.deepEqual(aggregateSummary([
  {role:"student",locked:false,total:1},{role:"student",locked:true,total:1},
  {role:"teacher",locked:false,total:1},{role:"parent",locked:false,total:1},
  {role:"admin",locked:true,total:1}
 ]),summary);
 assert.throws(()=>aggregateSummary([{role:"hacker",locked:false,total:12}]),/không hợp lệ/);
 assert.throws(()=>aggregateSummary([{role:"student",locked:false,total:-2}]),/không hợp lệ/);
});
test("Admin account summary UI includes 6 shortcut cards and accessible pressed states",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const app=fs.readFileSync(path.join(__dirname,"../js/app.js"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"../css/admin-users.css"),"utf8");
 for(const key of ["student","teacher","parent","admin","active","locked"])assert.ok(app.includes('key:"'+key+'"'));
 for(const name of ["data-users-summary-role","data-users-summary-status",'aria-pressed','adminUserStats(j.accountSummary)'])
  assert.ok(app.includes(name),name);
 assert.ok(css.includes(".admin-users-role-grid"));
 assert.ok(css.includes("@media(max-width:590px)"));
});
