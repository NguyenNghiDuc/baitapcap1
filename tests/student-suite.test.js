const test=require("node:test"),assert=require("node:assert/strict"),fs=require("fs"),path=require("path");
const root=path.join(__dirname,".."),html=fs.readFileSync(path.join(root,"index.html"),"utf8"),app=fs.readFileSync(path.join(root,"js","app.js"),"utf8");
const modules=["dashboard","goals","formulas","vocab","accessibility","notes","review","quick-practice","study-path","language","quiz-tools","adaptive","speech","schedule","worksheet","profile-stats","missions","leaderboard","bookmarks","prep-plan","writing","handwriting","sync","target-score","topics","math-work"];
test("student modules are split into separate files",()=>{for(const m of modules)assert.ok(fs.existsSync(path.join(root,"js","student",m+".js")),m)});
test("API client and student modules load before app.js",()=>{const api=html.indexOf('js/api.js'),appIndex=html.indexOf('js/app.js');assert.ok(api>0&&api<appIndex);for(const m of modules){const i=html.indexOf("js/student/"+m+".js");assert.ok(i>api&&i<appIndex,m)}});
test("index has no literal escaped newline artifacts",()=>assert.equal(html.includes("\\n  <"),false));
test("student CSS is loaded",()=>assert.match(html,/css\/student\.css/));
test("app uses collection selectors for forEach",()=>{assert.equal(/(^|[^$])\$\("[^"]+"\)\.forEach/m.test(app),false)});
test("quiz integrates navigator, wrong-bank, similar practice and autosave timestamp",()=>{assert.match(app,/StudentQuizTools/);assert.match(app,/StudentReview\?\.add/);assert.match(app,/similarWrong/);assert.match(app,/isoDate:new Date\(\)\.toISOString/);});

test("student backend is modularized",()=>{assert.ok(fs.existsSync(path.join(root,"routes","student.js")));const server=fs.readFileSync(path.join(root,"server.js"),"utf8");assert.match(server,/handleStudent/);assert.equal(server.includes("{\\\\n if(await handleStudent"),false)});
