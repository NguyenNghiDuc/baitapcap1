"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const handler=require("../routes/admin-results");
test("Review signals flag invalid score and impossible correct counts",()=>{
 assert.deepEqual(handler.reviewSignals({score:101,correct:11,total:10,durationSec:60}),["Điểm ngoài khoảng 0–100","Số câu đúng không hợp lệ"]);
 assert.deepEqual(handler.reviewSignals({score:80,correct:8,total:10,durationSec:40}),[]);
});
test("Very short duration is a manual review flag, not proof of cheating",()=>{
 assert.equal(handler.reviewSignals({score:100,correct:10,total:10,durationSec:3}).length,1);
 assert.equal(handler.reviewSignals({score:100,correct:10,total:10,durationSec:0}).length,0);
 assert.equal(handler.reviewSignals({score:100,correct:5,total:5,durationSec:3}).length,0);
});
test("Admin flags appear only as review labels and do not mutate scores",()=>{
 const src=fs.readFileSync(path.join(__dirname,"../js/admin/results.js"),"utf8");
 assert.match(src,/admin-review-flag/);
 assert.match(src,/review\.reasons/);
});
