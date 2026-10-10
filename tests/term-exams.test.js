const test=require("node:test"),assert=require("node:assert/strict");
global.window={};
require("../js/data.js");
require("../js/math-bank.js");
require("../js/exam-bank.js");
require("../js/advanced-bank.js");
require("../js/exams/term-exams.js");
const B=window.TermExamBank;

test("contains 1080 term exams plus 180 daily sets",()=>assert.equal(B.exams.length,1260));

test("term exams cover every grade semester stage subject and 30 variants",()=>{
 for(const grade of [4,5])for(const semester of [1,2])for(const stage of [0,1,2])for(const subject of ["math","vietnamese","english"]){
  const a=B.exams.filter(e=>e.grade===grade&&e.semester===semester&&e.stage===stage&&e.subject===subject);
  assert.equal(a.length,30,grade+"-"+semester+"-"+stage+"-"+subject);
 }
});

test("every term exam has 30 questions from exactly one subject",()=>{
 for(const e of B.exams){
  const qs=B.questions(e.id);
  assert.equal(qs.length,30,e.id);
  assert.ok(qs.every(q=>q.subject===e.subject),e.id+" contains mixed subjects");
  const types=new Set(qs.map(q=>q.examType||"mcq"));
  for(const t of ["mcq","truefalse","fill","matching"])assert.ok(types.has(t),e.id+" missing "+t);
  if(e.subject==="math"&&B.scopes[`${e.grade}-${e.semester}-${e.stage}`]?.some(t=>["geometry","perimeter","chart"].includes(t)))assert.ok(qs.some(q=>["geometry","perimeter","chart"].includes(q.type)),e.id+" needs geometry in scope");
 }
});

test("daily reviews are stable and subject-specific",()=>{
 const d=new Date("2026-10-08T08:00:00Z");
 for(const grade of [4,5])for(const subject of ["math","vietnamese","english"]){
  const a=B.daily(grade,subject,d),b=B.daily(grade,subject,d);
  assert.equal(a.questions.length,30);
  assert.equal(a.subject,subject);
  assert.ok(a.questions.every(q=>q.subject===subject),grade+"-"+subject+" daily mixed subjects");
  assert.deepEqual(a.questions.map(q=>q.q),b.questions.map(q=>q.q));
  assert.match(a.title,/Ôn .* hằng ngày/);
 }
});

test("math exams have geometry but language exams never inject math geometry",()=>{
 for(const e of B.exams){
  const qs=B.questions(e.id);
  if(e.subject==="math"){
   if(B.scopes[`${e.grade}-${e.semester}-${e.stage}`]?.some(t=>["geometry","perimeter","chart"].includes(t)))assert.ok(qs.some(q=>["geometry","perimeter","chart"].includes(q.type)),e.id);
  }else assert.equal(qs.some(q=>q.subject==="math"),false,e.id);
 }
});

test("later stages have cumulative scope",()=>{
 assert.ok(B.scopes["4-1-2"].length>=B.scopes["4-1-0"].length);
 assert.ok(B.scopes["5-2-2"].length>=B.scopes["5-2-0"].length);
});

test("short-answer questions only ask for the final answer and have a checkable key",()=>{
 for(const grade of [4,5])for(const subject of ["math","vietnamese","english"]){
  const exam=B.daily(grade,subject,new Date("2026-10-10T08:00:00Z"));
  const short=exam.questions.filter(q=>q.examType==="shortanswer");
  assert.equal(short.length,3,subject+" grade "+grade);
  assert.ok(exam.questions.every(q=>q.examType!=="essay"));
  assert.ok(short.every(q=>typeof q.answerText==="string"&&q.answerText.trim()));
  assert.ok(short.every(q=>!q.q.includes("Trình bày cách làm")));
 }
});
test("typed final answers can be graded without working steps",()=>{
 require("../js/exams/interaction.js");
 const I=window.ExamInteraction;
 const q={examType:"shortanswer",answerText:"73"};
 assert.equal(I.isCorrect(q,"73"),true);
 assert.equal(I.isCorrect(q," 073. "),true);
 assert.equal(I.isCorrect(q,"52 + 7 × 3 = 73"),false);
 assert.equal(I.isCorrect(q,"72"),false);
 assert.equal(I.isCorrect(q,""),false);
 assert.equal(I.correctText(q),"73");
 assert.ok(I.render(q,"73").includes('type="text"'));
 assert.ok(!I.render(q,"73").includes("<textarea"));
});
