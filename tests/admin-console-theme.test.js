"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
test("unified Admin theme loads after older feature styles",()=>{
 const h=read("index.html");
 const old=h.indexOf('href="css/admin-users.css"'),results=h.indexOf('href="css/admin-results.css"');
 const theme=h.indexOf('href="css/admin-console.css"');
 assert.ok(old>0&&results>0&&theme>old&&theme>results,"Admin CSS must win the cascade");
});
test("Admin CSS is isolated to verified Admin view and covers all five menu screens",()=>{
 const css=read("css/admin-console.css"),app=read("js/app.js");
 for(const route of ["admin","adminUsers","adminResults","performanceMonitor","storageHealth"]){
  assert.ok(css.includes('data-admin-view="'+route+'"'),"Missing theme: "+route);
  assert.ok(app.includes('"'+route+'"'),"Missing route: "+route);
 }
 assert.ok(app.includes('state.user?.role==="admin"'));
 assert.ok(app.includes("container.dataset.adminView=adminView"));
 assert.ok(app.includes("delete container.dataset.adminView"));
 assert.ok(css.includes('#sidebar .sidebar-nav-group[data-nav-group="admin"]:not([hidden])'));
});
test("Admin theme supports mobile, dark mode, keyboard accessibility and reduced motion",()=>{
 const css=read("css/admin-console.css");
 for(const mark of ["@media(max-width:590px)","@media(max-width:360px)",'[data-theme="dark"]',
  ":focus-visible","prefers-reduced-motion","#adminResultsFilter",".admin-users-grant",
  ".admin-dashboard-audit",".admin-storage-panel","adminPerfSampleCount"]){
  assert.ok(css.includes(mark),"Missing styling: "+mark);
 }
 let depth=0;
 for(const char of css){if(char==="{")depth++;if(char==="}")depth--;assert.ok(depth>=0,"Unexpected CSS closing brace")}
 assert.equal(depth,0,"Unbalanced CSS blocks");
});
test("Admin rendering still preserves grading, role management and monitoring controls",()=>{
 const app=read("js/app.js"),results=read("js/admin/results.js"),perf=read("js/admin/performance-monitor.js");
 for(const hook of ['data-user-save=','data-user-lock=','grantAdminForm','id="migrateDb"','id="setup2fa"']){
  assert.ok(app.includes(hook),hook);
 }
 for(const hook of ['id="adminResultsFilter"','id="adminScoresPrev"','id="adminScoresNext"'])assert.ok(results.includes(hook),hook);
 assert.ok(perf.includes('id="adminPerfRows"'));
});
