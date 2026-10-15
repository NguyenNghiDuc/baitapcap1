"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
test("Admin users stylesheet is loaded and its rules are isolated",()=>{
 const html=read("index.html"),css=read("css/admin-users.css"),loader=read("js/perf/loader.js");
 assert.equal(html.includes('href="css/admin-users.css"'),false);
 assert.ok(loader.includes('adminUsers:["/css/admin-console.css","/css/admin-users.css"]'));
 assert.ok(css.includes(".admin-users-page .admin-users-table-card"));
 assert.ok(css.includes(".admin-users-page .admin-user-role-select"));
 assert.ok(css.includes('@media(max-width:590px)'));
 assert.ok(css.includes(':root[data-theme="dark"]'));
});
test("Admin user controls keep stable endpoints, values and event handlers",()=>{
 const app=read("js/app.js"),start=app.indexOf("async function adminUsers(){"),end=app.indexOf("async function storageHealth()",start);
 assert.ok(start>0&&end>start);
 const markup=app.slice(start,end);
 for(const marker of ['id="grantAdminForm"','data-user-role=','data-user-save=','data-user-lock=','id="adminPresenceSummary"','admin-users-page']){
  assert.ok(markup.includes(marker),"Missing UI hook: "+marker);
 }
 for(const role of ['student','parent','teacher','admin'])assert.ok(markup.includes('["'+role+'",'));
 assert.ok(markup.includes('<option value="\${r}"'),"Role option values must retain stable backend IDs");
 assert.ok(app.includes('$("#grantAdminForm")?.addEventListener("submit"'));
 assert.ok(app.includes('API.patch("/api/admin/users/"'));
 assert.ok(app.includes('API.post("/api/admin/grant-admin"'));
});
test("Admin user UI remains admin-only with no shared global table overrides",()=>{
 const app=read("js/app.js"),css=read("css/admin-users.css");
 const part=app.slice(app.indexOf("async function adminUsers(){"),app.indexOf("async function storageHealth()"));
 assert.ok(part.includes('state.user?.role!=="admin"'));
 assert.ok(css.includes(".admin-users-page .admin-users-table-card table"));
});

test("Account cards and growth chart are visibly styled in the Admin route",()=>{
 const css=read("css/admin-users.css"),loader=read("js/perf/loader.js"),sw=read("sw.js");
 for(const marker of ['#content[data-admin-view="adminUsers"] .admin-users-role-grid',
  '#content[data-admin-view="adminUsers"] button.admin-users-role-card',
  '#content[data-admin-view="adminUsers"] .admin-users-growth-bars',
  '#content[data-admin-view="adminUsers"] .admin-users-growth-track',
  'grid-template-columns:repeat(6,minmax(0,1fr))!important',
  ':root[data-theme="dark"] #content[data-admin-view="adminUsers"]',
  '@media(max-width:620px)']){
  assert.ok(css.includes(marker),marker);
 }
 assert.ok(loader.includes('fetch("/asset-hashes.json",{cache:"no-store"})'));
 assert.ok(sw.includes('u.pathname==="/asset-hashes.json"'));
 assert.ok(sw.includes('networkFirst(req,{fallback:null,timeout:2200})'));
});
