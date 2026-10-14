"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {readAdminUserPage,buildAdminUserQueries,loadAdminUserPage}=require("../lib/admin-user-directory");
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
  if(sql.includes("COUNT(*)"))return {rows:[{total:51,allUsersTotal:1800}]};
  return {rows:[{id:"u41",name:"Cô An",email:"an@example.test",role:"teacher",
   grade:null,locked:true},{id:"u42",name:"Cô Bình",email:"binh@example.test",role:"teacher",locked:true}]};
 }};
 const p=await loadAdminUserPage(fakePg,{role:"teacher",accountStatus:"locked"},
  {page:3,limit:20,search:"co"});
 assert.equal(calls.length,2);
 assert.deepEqual(p.items.map(x=>x.id),["u41","u42"]);
 assert.equal(p.items[0].locked,true);
 assert.equal(p.allUsersTotal,1800);
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
