"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const ROOT=path.join(__dirname,".."),read=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const {generate}=require("../scripts/sync-admin-catalog");
test("Admin Center catalog exactly matches the eight 20-feature roadmap files",()=>{
 const actual=read("assets/admin-feature-catalog.json"),expected=generate();
 assert.equal(actual,expected,"Run npm run admin:catalog:sync after editing roadmap entries");
 const data=JSON.parse(actual);
 assert.equal(data.groups.length,8);
 assert.equal(data.features.length,160);
 assert.deepEqual(data.features.map(x=>x.id),Array.from({length:160},(_,i)=>i+1));
 assert.ok(data.features.every(f=>typeof f.name==="string"&&f.name.length>5));
 assert.equal(data.features.filter(x=>x.assessment==="partial").length,6);
 assert.equal(data.features.filter(x=>x.assessment==="verified").length,0);
 assert.equal(data.features.filter(x=>x.assessment==="not-verified").length,154);
 for(const item of data.features){
  assert.equal("email" in item,false);
  assert.equal("tests" in item,false);
  assert.equal("evidence" in item,false);
 }
});
test("Admin menu shows eight searchable sections and only existing page routes",()=>{
 const html=read("index.html"),nav=read("js/sidebar-nav.js"),app=read("js/app.js"),center=read("js/admin/center.js");
 const a=html.indexOf('data-nav-group="admin"'),b=html.indexOf('data-nav-group="account"',a);
 const admin=html.slice(a,b);
 const sections=[...admin.matchAll(/data-admin-section="([^"]+)"/g)].map(m=>m[1]);
 const urls=[...admin.matchAll(/class="admin-only" href="#([^"]+)"/g)].map(m=>m[1]);
 assert.equal(sections.length,8);assert.equal(urls.length,19);
 assert.equal(new Set(sections).size,8);assert.equal(new Set(urls).size,19);
 for(const link of urls){
  assert.match(link,/^[A-Za-z][A-Za-z0-9]*$/);
  assert.ok(center.includes('["'+link+'","'),"Admin Center missing working UI route: "+link);
 }
 assert.ok(nav.includes('sidebar.querySelectorAll("[data-admin-section]")'));
 assert.ok(nav.includes("section.hidden="));
 assert.ok(app.includes('adminCenter:async()=>window.AdminCenter?.render(state.user)'));
 assert.ok(app.includes('"adminCenter","admin"'));
});
test("Admin Center scripts and styles load only for a verified Admin route",()=>{
 const html=read("index.html"),loader=read("js/perf/loader.js"),app=read("js/app.js"),css=read("css/admin-center.css");
 assert.ok(loader.includes('adminCenter:["/js/admin/center.js"]'));
 assert.ok(loader.includes('adminCenter:["/css/admin-console.css","/css/admin-center.css"]'));
 assert.ok(app.includes('if(adminOnly.has(route)&&state.user?.role!=="admin")'));
 assert.ok(app.includes('window.AdminCenter?.bind(render)'));
 assert.ok(!html.includes('href="css/admin-center.css"'));
 assert.ok(!html.includes('src="js/admin/center.js"'));
 for(const mark of ["admin-center-grid","admin-center-filters","prefers-reduced-motion",'[data-theme="dark"]'])assert.ok(css.includes(mark),mark);
});
