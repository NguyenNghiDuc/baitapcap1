const test=require("node:test"),assert=require("node:assert/strict");
global.window={};
require("../js/data.js");
require("../js/math-bank.js");
const D=window.APP_DATA;
const focus=D.lessons.filter(l=>l.subject==="math"&&[4,5].includes(l.grade)&&l.lessonId);
test("grade 4-5 math bank has 10 lessons",()=>assert.equal(focus.length,10));
test("every focused lesson has exactly 30 questions",()=>{
  for(const l of focus){
    const qs=D.questions.filter(q=>q.lessonId===l.lessonId);
    assert.equal(qs.length,30,l.lessonId+" must have 30 questions");
    for(const q of qs){
      assert.equal(q.options.length,4,"each question needs 4 options");
      assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4,"answer index");
      assert.ok(String(q.explain||"").length>=20,"step explanation required");
      assert.equal(q.subject,"math");
      assert.ok([4,5].includes(q.grade));
    }
  }
});
test("focused bank totals 300 questions",()=>assert.equal(D.questions.filter(q=>q.lessonId&&[4,5].includes(q.grade)&&q.subject==="math").length,300));
