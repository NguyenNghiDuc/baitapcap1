const test=require("node:test"),assert=require("node:assert/strict");
const math=require("../lib/ai/math-engine"),skills=require("../lib/ai/math-skills"),natural=require("../lib/ai/math-natural");

const calc=[
 ["1+2*3","7"],["(1+2)*3","9"],["1000/8","125"],["2^16","65536"],["sqrt(625)","25"],
 ["0.1+0.2","0.3"],["12.5*0.8","10"],["7/8+1/8","1"],["3/4*8","6"],["5^3-25","100"],
 ["999*999","998001"],["144/12+7*6","54"],["10% of 250".replace("% of","/100*"),"25"]
];
test("calculation benchmark",()=>{for(const [expr,expected] of calc)assert.equal(math.calculate(expr).value,expected,expr)});

test("number theory benchmark",()=>{
 assert.equal(math.gcd(84,126),"42"*1);assert.equal(math.lcm(12,18),"36"*1);
 assert.equal(math.gcd([48,64,80]),16);assert.equal(math.lcm([4,6,10]),60);
});

test("statistics benchmark",()=>{
 const s=math.stats([2,4,4,6,8]);assert.equal(s.mean,"4.8");assert.equal(s.median,"4");assert.equal(s.min,"2");assert.equal(s.max,"8");
});

test("algebra benchmark",()=>{
 assert.ok(math.solve("5*x-10=40","x").solutions.includes("10"));
 assert.ok(math.solve("x/4+3=8","x").solutions.includes("20"));
 assert.equal(math.equivalent("(x+1)^2","x^2+2*x+1"),true);
 assert.equal(math.factor("x^2-9").value.includes("x"),true);
});

test("system equation benchmark",()=>{
 const s=math.solveSystem(["x+y=10","x-y=2"],["x","y"]);
 assert.equal(s.solutions.x,"6");assert.equal(s.solutions.y,"4");
});

test("combinatorics benchmark",()=>{
 assert.equal(math.combination(10,2),"45");assert.equal(math.combination(5,5),"1");
 assert.equal(math.permutation(5,2),"20");
});

test("word problem benchmark",()=>{
 const cases=[
  ["Tính 15% của 800","120"],
  ["Trung bình cộng của 5, 7, 9, 11","8"],
  ["Tính chu vi hình chữ nhật dài 12 cm rộng 5 cm","34 cm"],
  ["Tính diện tích hình vuông cạnh 9 cm","81 cm²"],
  ["Tính diện tích tam giác đáy 10 cm cao 6 cm","30 cm²"],
  ["Tính diện tích hình thang đáy lớn 12 cm đáy bé 8 cm cao 5 cm","50 cm²"],
  ["Tính diện tích hình tròn bán kính 5 cm","78.5 cm²"],
  ["Tính thể tích hình hộp chữ nhật dài 4 cm rộng 3 cm cao 5 cm","60 cm³"],
  ["Tìm quãng đường khi vận tốc 60 km/h thời gian 2.5 giờ","150 km"],
  ["3 quyển 45 nghìn, 8 quyển hết bao nhiêu","120"]
 ];
 for(const [q,a] of cases){const out=skills.solveWordProblem(q);assert.ok(out,q);assert.equal(out.answer,a,q)}
});

test("natural math commands use deterministic advanced solvers",()=>{
 assert.equal(natural.answer(natural.solve("UCLN của 84, 126")),"UCLN(84, 126) = 42");
 assert.equal(natural.answer(natural.solve("BCNN của 12, 18")),"BCNN(12, 18) = 36");
 const sys=natural.solve("Hệ phương trình: x+y=10; x-y=2");assert.equal(sys.solutions.x,"6");assert.equal(sys.solutions.y,"4");
 assert.equal(natural.answer(natural.solve("Tổ hợp 2 từ 10")),"C(10, 2) = 45");
});

test("extended percentage geometry and conversion benchmark",()=>{
 assert.equal(skills.solveWordProblem("50 là 20% của số bao nhiêu").answer,"250");
 assert.equal(skills.solveWordProblem("25 trên 200 là bao nhiêu phần trăm").answer,"12.5%");
 assert.equal(skills.solveWordProblem("Tính thể tích hình lập phương cạnh 4 cm").answer,"64 cm³");
 assert.equal(skills.solveWordProblem("Tính diện tích hình tròn đường kính 10 cm").answer,"78.5 cm²");
 assert.equal(skills.solveWordProblem("2.5 km bằng bao nhiêu m").answer,"2500 m");
 assert.equal(skills.solveWordProblem("750 g bằng bao nhiêu kg").answer,"0.75 kg");
});
