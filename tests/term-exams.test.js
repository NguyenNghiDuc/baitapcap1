const test=require("node:test"),assert=require("node:assert/strict");
global.window={};
require("../js/data.js");
require("../js/math-bank.js");
require("../js/exam-bank.js");
require("../js/advanced-bank.js");
require("../js/exams/term-exams.js");
const B=window.TermExamBank;

test("has 72 fixed term exams",()=>assert.equal(B.exams.length,72));
test("term exams cover grades semesters stages and 6 variants",()=>{
 for(const grade of [4,5])for(const semester of [1,2])for(const stage of [0,1,2]){
  const a=B.exams.filter(e=>e.grade===grade&&e.semester===semester&&e.stage===stage);
  assert.equal(a.length,6,grade+"-"+semester+"-"+stage);
 }
});
test("every term exam has 30 mixed-format questions including geometry",()=>{
 for(const e of B.exams){
  const qs=B.questions(e.id);
  assert.equal(qs.length,30,e.id);
  const types=new Set(qs.map(q=>q.examType||"mcq"));
  for(const t of ["mcq","truefalse","fill","matching"])assert.ok(types.has(t),e.id+" missing "+t);
  assert.ok(qs.some(q=>q.subject==="math"&&["geometry","perimeter","chart"].includes(q.type)),e.id+" needs geometry");
 }
});
test("daily review is stable for the same day and has 30 questions",()=>{
 const d=new Date("2026-10-08T08:00:00Z"),a=B.daily(4,d),b=B.daily(4,d);
 assert.equal(a.questions.length,30);
 assert.deepEqual(a.questions.map(q=>q.q),b.questions.map(q=>q.q));
 assert.match(a.title,/Ôn tập hằng ngày/);
});
test("later stages have cumulative scope",()=>{
 assert.ok(B.scopes["4-1-2"].length>=B.scopes["4-1-0"].length);
 assert.ok(B.scopes["5-2-2"].length>=B.scopes["5-2-0"].length);
});
