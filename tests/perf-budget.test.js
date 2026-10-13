"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {scan,validate}=require("../scripts/check-performance-budget");
test("initial markup honors request and transfer size budgets",()=>{
 const v=validate();
 assert.equal(v.ok,true,v.failures.join("; "));
 assert.ok(v.initial.scripts<=v.limits.scripts);
 assert.ok(v.initial.styles<=v.limits.styles);
 assert.ok(v.initial.estimatedBrotliBytes<=v.limits.brotliEstimatedBytes);
});
test("Admin-only CSS is absent from guest critical styles but lazy-loaded per role",()=>{
 const root=path.join(__dirname,".."),h=fs.readFileSync(path.join(root,"index.html"),"utf8");
 const loader=fs.readFileSync(path.join(root,"js/perf/loader.js"),"utf8");
 const initial=scan(h).stylePaths;
 for(const name of ["admin-users","admin-results","admin-console","admin-audit"]){
  assert.equal(initial.includes("css/"+name+".css"),false);
  assert.ok(loader.includes('"/css/'+name+'.css"'),"No lazy CSS for "+name);
 }
 assert.ok(loader.includes('isAdmin||(isStaff&&["classInsights","gradeReviews","submissions"].includes(route))'),"Staff CSS must not be loaded for guests");
 assert.ok(loader.includes('classInsights:["/css/class-insights.css"]'));
 assert.equal(initial.includes("css/class-insights.css"),false);
 assert.ok(loader.includes("Promise.all([cssReady,scriptsReady])"));
});
test("production build references only existing assets, including lazy CSS",()=>{
 const root=path.join(__dirname,"..");
 const dist=path.join(root,"dist");
 if(!fs.existsSync(path.join(dist,"index.html")))return;
 const result=validate();
 assert.equal(result.ok,true,result.failures.join("; "));
 assert.ok(result.lazyAssets>20);
});
