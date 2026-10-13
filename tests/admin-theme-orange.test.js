"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
test("Unified Admin theme remains lazy-loaded and includes all Admin module styles",()=>{
 const loader=read("js/perf/loader.js");
 for(const part of ["adminCenter","adminUsers","adminResults","adminAudit","adminSecurity","adminAlerts","adminBackup","adminIntegrity"]){
  assert.match(loader,new RegExp(part+':\\[[^\\]]*admin-console\\.css'));
 }
});
test("Admin orange navigation is scoped, dark-ready and accessible",()=>{
 const css=read("css/admin-console.css");
 assert.match(css,/#sidebar \.sidebar-nav-group\[data-nav-group="admin"\]:not\(\[hidden\]\)/);
 assert.match(css,/#ffad52/);
 assert.match(css,/a:is\(\.is-active,\[aria-current="page"\]\)/);
 assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/:root\[data-theme="dark"\] #sidebar/);
 assert.match(css,/@media\(max-width:900px\)/);
});
