const test=require("node:test"),assert=require("node:assert/strict");
const math=require("../lib/ai/math-engine"),skills=require("../lib/ai/math-skills"),router=require("../lib/ai/subject-router"),prompts=require("../lib/ai/prompts");

test("math engine calculates arithmetic with high precision",()=>{
 assert.equal(math.calculate("125*48+360/9").value,"6040");
 assert.equal(math.calculate("2^10").value,"1024");
 assert.equal(math.calculate("sqrt(144)").value,"12");
});
test("math engine handles fractions and decimals",()=>{
 assert.equal(math.calculate("1/2+1/3").value,"0.833333333333333333333333333333");
 assert.equal(math.calculate("12.5*8").value,"100");
});
test("symbolic engine solves and simplifies",()=>{
 const s=math.solve("2*x+6=18","x");assert.ok(s.solutions.includes("6"));
 assert.equal(math.equivalent(math.simplify("(x+2)*(x+3)").value,"x^2+5*x+6"),true);
});
test("direct natural math detection is deterministic",()=>{
 assert.equal(math.deterministic("Tính 125 × 8 + 40").value,"1040");
 const eq=math.deterministic("Giải phương trình: 3*x + 6 = 21");assert.ok(eq.solutions.includes("5"));
});
test("subject router separates math english and vietnamese",()=>{
 assert.equal(router.detect("Tính diện tích hình chữ nhật dài 8 cm rộng 5 cm").subject,"math");
 assert.equal(router.detect("English grammar: choose the correct preposition").subject,"english");
 assert.equal(router.detect("Tiếng Việt: xác định chủ ngữ và vị ngữ trong câu").subject,"vietnamese");
});
test("specialized prompts require verification and explanations",()=>{
 assert.match(prompts.SUBJECT.math,/kiểm tra|thử lại/i);
 assert.match(prompts.SUBJECT.english,/giải thích/i);
 assert.match(prompts.SUBJECT.vietnamese,/bằng chứng|giải thích/i);
 assert.match(prompts.VERIFY,/kiểm tra/i);
});

test("math word skills solve percentage average geometry motion and proportion",()=>{
 assert.equal(skills.solveWordProblem("Tính 25% của 360").answer,"90");
 assert.equal(skills.solveWordProblem("Trung bình cộng của 8, 10, 12").answer,"10");
 assert.equal(skills.solveWordProblem("Tính diện tích hình chữ nhật dài 8 cm rộng 5 cm").answer,"40 cm²");
 assert.equal(skills.solveWordProblem("Tìm quãng đường khi vận tốc 45 km/h thời gian 2 giờ").answer,"90 km");
 assert.equal(skills.solveWordProblem("3 quyển 45 nghìn, 5 quyển hết bao nhiêu").answer,"75");
});

test("local tutor answers common school explanations without provider",()=>{
 const tutor=require("../lib/ai/local-tutor");
 for(const q of ["Giải thích phép nhân lớp 4 từng bước","Hướng dẫn phép chia lớp 4","Cách quy đồng hai phân số","Công thức hình tam giác","Thì hiện tại đơn","Chủ ngữ vị ngữ"]){
  const out=tutor.answer(q);assert.ok(out&&out.answer.length>30,q)
 }
 assert.match(tutor.answer("Giải thích phép nhân lớp 4 từng bước").answer,/324 × 6/);
 assert.match(tutor.answer("Cách quy đồng hai phân số").answer,/4\/12/);
});
