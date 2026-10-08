const engine=require("./math-engine"),skills=require("./math-skills");
function nums(s){return (String(s).match(/-?\\d+(?:[.,]\\d+)?/g)||[]).map(x=>Number(x.replace(",",".")))}
function solve(prompt=""){
 const p=String(prompt).trim();
 const direct=engine.deterministic(p);if(direct)return direct;
 const skill=skills.solveWordProblem(p);if(skill)return {kind:"word-skill",...skill};
 let m=p.match(/(?:ucln|ước chung lớn nhất|gcd)\\s*(?:của|of)?\\s*[:：]?\\s*([0-9,;\\s]+)/i);
 if(m){const a=nums(m[1]);if(a.length>=2)return {kind:"gcd",values:a,value:String(engine.gcd(a))}}
 m=p.match(/(?:bcnn|bội chung nhỏ nhất|lcm)\\s*(?:của|of)?\\s*[:：]?\\s*([0-9,;\\s]+)/i);
 if(m){const a=nums(m[1]);if(a.length>=2)return {kind:"lcm",values:a,value:String(engine.lcm(a))}}
 m=p.match(/(?:hệ phương trình|system of equations?)\\s*[:：]?\\s*(.+)/i);
 if(m){const equations=m[1].split(/[;\\n]+/).map(x=>x.trim()).filter(x=>x.includes("="));if(equations.length>=2)return {kind:"system",...engine.solveSystem(equations)}}
 m=p.match(/(?:tổ hợp|combination|chọn)\\s*(\\d+)\\s*(?:từ|from)\\s*(\\d+)/i);
 if(m){const rr=Number(m[1]),nn=Number(m[2]);return {kind:"combination",n:nn,r:rr,value:engine.combination(nn,rr)}}
 m=p.match(/(?:chỉnh hợp|permutation)\\s*(\\d+)\\s*(?:từ|from)\\s*(\\d+)/i);
 if(m){const rr=Number(m[1]),nn=Number(m[2]);return {kind:"permutation",n:nn,r:rr,value:engine.permutation(nn,rr)}}
 m=p.match(/(?:thống kê|statistics|trung vị|median).*?([0-9.,;\\s-]+)$/i);
 if(m){const a=nums(m[1]);if(a.length)return {kind:"stats",...engine.stats(a)}}
 return null
}
function answer(result){
 if(!result)return null;
 if(result.kind==="calculation")return "Kết quả: "+result.value;
 if(result.kind==="equation")return "Nghiệm: "+result.variable+" = "+result.solutions.join(", ");
 if(result.kind==="word-skill")return result.explain.join("\\n")+"\\nĐáp số: "+result.answer;
 if(result.kind==="gcd")return "UCLN("+result.values.join(", ")+") = "+result.value;
 if(result.kind==="lcm")return "BCNN("+result.values.join(", ")+") = "+result.value;
 if(result.kind==="system")return "Nghiệm hệ: "+Object.entries(result.solutions).map(([k,v])=>k+" = "+v).join(", ");
 if(result.kind==="combination")return "C("+result.n+", "+result.r+") = "+result.value;
 if(result.kind==="permutation")return "A("+result.n+", "+result.r+") = "+result.value;
 if(result.kind==="stats")return "Số phần tử: "+result.count+"; tổng: "+result.sum+"; trung bình: "+result.mean+"; trung vị: "+result.median+"; min: "+result.min+"; max: "+result.max+".";
 return result.value?"Kết quả: "+result.value:null
}
module.exports={solve,answer};