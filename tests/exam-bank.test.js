const test=require("node:test"),assert=require("node:assert/strict");
global.window={};
require("../js/data.js");
require("../js/math-bank.js");
require("../js/exam-bank.js");
const D=window.APP_DATA,exams=D.examSets||[];

test("has exactly 40 mixed exams",()=>{
  assert.equal(exams.length,40);
  assert.equal(exams.filter(x=>x.grade===4).length,20);
  assert.equal(exams.filter(x=>x.grade===5).length,20);
});
test("each exam has exactly 30 questions split 10/10/10",()=>{
  for(const exam of exams){
    const qs=D.questions.filter(q=>q.examId===exam.examId);
    assert.equal(qs.length,30,exam.examId+" total");
    for(const subject of ["math","vietnamese","english"]){
      assert.equal(qs.filter(q=>q.subject===subject).length,10,exam.examId+" "+subject);
    }
    for(const q of qs){
      assert.equal(q.options.length,4,q.id+" options");
      assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4,q.id+" answer");
      assert.ok(String(q.explain||"").length>=15,q.id+" explanation");
      assert.ok(String(q.type||"").length>0,q.id+" type");
    }
  }
});
test("mixed exam bank totals exactly 1200 questions",()=>{
  assert.equal(D.questions.filter(q=>q.examId).length,1200);
});
test("exam bank covers broad forms in all three subjects",()=>{
  const by=s=>new Set(D.questions.filter(q=>q.examId&&q.subject===s).map(q=>q.type));
  assert.ok(by("math").size>=10,"math forms");
  assert.ok(by("vietnamese").size>=9,"vietnamese forms");
  assert.ok(by("english").size>=10,"english forms");
});
