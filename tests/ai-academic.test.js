const test=require("node:test"),assert=require("node:assert/strict");
const math=require("../lib/ai/math-engine"),router=require("../lib/ai/subject-router"),prompts=require("../lib/ai/prompts");

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
