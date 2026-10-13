"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {parseUserFilters,applyUserFilters}=require("../lib/admin-user-filters");
const users=[
 {id:"s",role:"student",locked:false},
 {id:"p",role:"parent",locked:true},
 {id:"t",role:"teacher",locked:false},
 {id:"a",role:"admin",locked:true},
 {id:"s2",role:"student",locked:true}
];
test("Admin account filters select role and lock state across all users",()=>{
 assert.deepEqual(applyUserFilters(users,parseUserFilters({role:"student",accountStatus:"locked"})).map(x=>x.id),["s2"]);
 assert.deepEqual(applyUserFilters(users,parseUserFilters({role:"",accountStatus:"active"})).map(x=>x.id),["s","t"]);
 assert.equal(applyUserFilters(users,parseUserFilters({role:"admin"})).length,1);
 assert.equal(applyUserFilters(users,parseUserFilters({})).length,users.length);
});
test("Account filters reject invalid or array parameters and never broaden results silently",()=>{
 for(const q of [{role:"superadmin"},{role:["student","admin"]},{accountStatus:"online"},{accountStatus:["locked","active"]},{role:"x".repeat(100)}]){
  assert.throws(()=>parseUserFilters(q),/Bộ lọc/);
 }
});
test("Admin filters are server-side and UI preserves pagination and role controls",()=>{
 const root=path.join(__dirname,"..");
 const server=fs.readFileSync(path.join(root,"server.js"),"utf8");
 const app=fs.readFileSync(path.join(root,"js/app.js"),"utf8");
 const css=fs.readFileSync(path.join(root,"css/admin-users.css"),"utf8");
 assert.ok(server.includes("applyUserFilters(list,filters)"));
 assert.ok(server.includes("allUsersTotal"));
 for(const item of ['id="adminUsersRoleFilter"','id="adminUsersStatusFilter"','id="adminUsersResetFilters"','data-user-save=','data-user-lock=']){
  assert.ok(app.includes(item),item);
 }
 assert.ok(app.includes('f.page=1;render()'));
 assert.ok(css.includes(".admin-users-page .admin-users-filterbar"));
 assert.ok(css.includes("@media(max-width:590px)"));
});
