const math=require("../lib/ai/math-engine"),skills=require("../lib/ai/math-skills");
const cases=[
 ["calc","125*48+360/9","6040"],["calc","sqrt(144)+2^5","44"],["calc","1/2+1/3","0.833333333333333333333333333333"],
 ["word","Tính 25% của 360","90"],["word","Trung bình cộng của 8, 10, 12","10"],["word","Tính diện tích hình chữ nhật dài 8 cm rộng 5 cm","40 cm²"],
 ["word","Tìm quãng đường khi vận tốc 45 km/h thời gian 2 giờ","90 km"],["word","3 quyển 45 nghìn, 5 quyển hết bao nhiêu","75"]
];
let pass=0;for(const [kind,input,expected] of cases){let got="";try{got=kind==="calc"?math.calculate(input).value:skills.solveWordProblem(input)?.answer||""}catch(e){got="ERR:"+e.message}const ok=got===expected;if(ok)pass++;console.log(ok?"PASS":"FAIL",input,"=>",got,"expected",expected)}
console.log(`Score: ${pass}/${cases.length}`);if(pass!==cases.length)process.exit(1);
