"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
test("Teacher dashboard keeps all eight existing routes without affecting role access",()=>{
 const app=read("js/app.js");
 const marker=app.slice(app.indexOf("async function teacher(){"),app.indexOf("\nasync function admin(){"));
 assert.ok(marker.includes('["teacher","admin"].includes(state.user.role)'));
 const originalRoutes=["questionBank","examRooms","classes","classInsights","assignments","submissions","materials","notifications"];
 for(const name of originalRoutes)assert.ok(marker.includes('"'+name+'"'),"Missing teacher shortcut "+name);
 assert.match(marker,/data-route=/);
 assert.match(marker,/class="teacher-tool-card/);
 assert.match(marker,/class="teacher-dashboard-grid"/);
 assert.match(marker,/aria-label="Mở /);
});
test("Teacher dashboard CSS is lazily loaded for staff and Admin, but not public users",()=>{
 const loader=read("js/perf/loader.js"),html=read("index.html"),css=read("css/teacher-dashboard.css");
 assert.ok(loader.includes('teacher:["/css/teacher-dashboard.css"]'));
 assert.ok(loader.includes('isStaff&&["teacher","classInsights","gradeReviews","submissions"].includes(route)'));
 assert.ok(!html.includes("teacher-dashboard.css"));
 for(const hook of [".teacher-dashboard-grid",".teacher-tool-card",
  '.teacher-tool--green','[data-theme="dark"]',"@media(max-width:400px)",
  ":focus-visible","prefers-reduced-motion"])assert.ok(css.includes(hook),hook);
 assert.ok(css.includes("grid-template-columns:repeat(2,minmax(0,1fr))"));
 assert.ok(css.includes("grid-template-columns:1fr"));
 let nesting=0;for(const ch of css){if(ch==="{")nesting++;if(ch==="}")nesting--;assert.ok(nesting>=0)}
 assert.equal(nesting,0);
});
