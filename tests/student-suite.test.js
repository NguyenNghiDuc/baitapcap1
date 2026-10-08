const test=require("node:test"),assert=require("node:assert/strict"),fs=require("fs"),path=require("path");
const root=path.join(__dirname,".."),html=fs.readFileSync(path.join(root,"index.html"),"utf8"),app=fs.readFileSync(path.join(root,"js","app.js"),"utf8"),loader=fs.readFileSync(path.join(root,"js","perf","loader.js"),"utf8");
const modules=["dashboard","goals","formulas","vocab","accessibility","notes","review","quick-practice","study-path","language","quiz-tools","adaptive","speech","schedule","worksheet","profile-stats","missions","leaderboard","bookmarks","prep-plan","writing","handwriting","sync","target-score","topics","math-work","settings","update-center","offline-center","smart-notify","exam-proctor","rewards","game-map","friends","ai-question","ocr-scan","advanced-dashboard","parent-lock","certificate","help-feedback","i18n","personal-exam","mastery","interactive-exercises","feature-hub","registry","history-compare","performance-mode","chapter-achievements"];
const core=["quiz-tools","review","adaptive","bookmarks","exam-proctor","rewards","mastery","i18n","accessibility","parent-lock","registry"];
test("student modules are split into separate files",()=>{for(const m of modules)assert.ok(fs.existsSync(path.join(root,"js","student",m+".js")),m)});
test("core scripts load before app and advanced modules are lazy-loadable",()=>{
 const api=html.indexOf("js/api.js"),appIndex=html.indexOf("js/app.js");assert.ok(api>0&&api<appIndex);
 for(const m of core){const i=html.indexOf("js/student/"+m+".js");assert.ok(i>api&&i<appIndex,m)}
 for(const m of modules.filter(x=>!core.includes(x)))assert.ok(loader.includes("/js/student/"+m+".js"),m);
});
test("index has no literal escaped newline artifacts",()=>assert.equal(html.includes("\\n  <"),false));
test("student CSS is loaded",()=>assert.match(html,/css\/student\.css/));
test("app uses collection selectors for forEach",()=>{assert.equal(/(^|[^$])\$\("[^"]+"\)\.forEach/m.test(app),false)});
test("quiz integrates locked navigator, wrong-bank, similar practice and autosave timestamp",()=>{assert.match(app,/LockedExamUI\.render/);assert.match(app,/StudentReview\?\.add/);assert.match(app,/similarWrong/);assert.match(app,/isoDate:new Date\(\)\.toISOString/);});
test("student backend is modularized",()=>{assert.ok(fs.existsSync(path.join(root,"routes","student.js")));const server=fs.readFileSync(path.join(root,"server.js"),"utf8");assert.match(server,/handleStudent/)});
test("settings and update center are exposed",()=>{assert.match(html,/href="#settings"/);assert.match(html,/href="#updateCenter"/);assert.match(html,/href="#featureHub"/);});
test("advanced bank and registry load before app",()=>{assert.ok(html.indexOf("js/advanced-bank.js")>0&&html.indexOf("js/advanced-bank.js")<html.indexOf("js/app.js"));assert.ok(html.indexOf("js/student/registry.js")>0&&html.indexOf("js/student/registry.js")<html.indexOf("js/app.js"));});
test("offline manifest lists every student module",()=>{const m=JSON.parse(fs.readFileSync(path.join(root,"offline-manifest.json"),"utf8"));for(const x of modules)assert.ok(m.assets.includes("/js/student/"+x+".js"),x);assert.equal(m.version,"4.1.2");});
test("term exam modules are route-lazy-loadable",()=>{for(const x of ["interaction","term-exams","runner","catalog"])assert.ok(loader.includes("/js/exams/"+x+".js"),x)});

test("sync routes must not return Promise placeholders",()=>{
 const app=fs.readFileSync(path.join(root,"js","app.js"),"utf8");
 assert.equal(/async function ai\(/.test(app),false);
 assert.match(app,/function ai\(\)\{return pageHead/);
 assert.equal(app.includes("[object Promise]"),false);
});

test("locked exam mode blocks app navigation until submit",()=>{
 const lock=fs.readFileSync(path.join(root,"js","exams","exam-lock.js"),"utf8");
 const ui=fs.readFileSync(path.join(root,"js","exams","locked-ui.js"),"utf8");
 const runner=fs.readFileSync(path.join(root,"js","exams","runner.js"),"utf8");
 assert.match(lock,/exam-mode-active/);assert.match(lock,/beforeunload/);assert.match(lock,/hashchange/);
 assert.match(ui,/lockedSubmit/);assert.match(ui,/Danh sách câu hỏi/);assert.match(ui,/Thời gian còn lại/);
 assert.match(app,/ExamLock\?\.enter/);assert.match(app,/ExamLock\?\.exit/);assert.match(app,/LockedExamUI\.render/);
 assert.match(runner,/ExamLock\?\.enter/);assert.match(runner,/ExamLock\?\.exit/);assert.match(runner,/LockedExamUI\.render/);
});
