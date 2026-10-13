"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
test("Admin results warns on 1 through 29 filtered submissions without treating them as unique students",()=>{
 const src=read("js/admin/results.js");
 assert.match(src,/total>0&&total<30/);
 assert.match(src,/một học sinh có thể nộp nhiều lượt/);
 assert.match(src,/sampleNotice\+/);
 assert.match(read("css/admin-results.css"),/\.admin-results-sample-warning/);
});
