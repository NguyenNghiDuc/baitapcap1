const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const app=fs.readFileSync(path.join(__dirname,"../js/app.js"),"utf8");
test("ordinary practice does not activate formal exam lock",()=>{
 assert.match(app,/if\(z\.examId\)window\.ExamLock\?\.enter/);
 assert.match(app,/else window\.ExamLock\?\.exit\(\)/);
});
test("stale exam lock can be released by normal navigation",()=>{
 assert.match(app,/function nav\(r\)\{if\(window\.ExamLock\?\.isActive\?\.\(\)&&!state\.quiz\)window\.ExamLock\.exit\(\)/);
});
test("home and subject library still bind exercise-start buttons",()=>{
 assert.match(app,/\[data-start\]/);assert.match(app,/function subjects\(\)/);assert.match(app,/function startQuiz\(/);
});
