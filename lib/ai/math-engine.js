const {create,all,fraction}=require("mathjs");
const nerdamer=require("nerdamer/all");
const math=create(all,{number:"BigNumber",precision:64,predictable:true});
function clean(input=""){
 return String(input)
  .replace(/,/g,".")
  .replace(/[×·]/g,"*")
  .replace(/÷/g,"/")
  .replace(/([0-9])[ ]*[xX][ ]*([0-9])/g,"$1*$2")
  .trim();
}
function format(v){
 try{
  if(v&&v.isFraction)return v.toFraction();
  if(v&&v.isBigNumber){if(v.isInteger&&v.isInteger())return v.toFixed(0);return math.format(v,{notation:"auto",precision:30,lowerExp:-30,upperExp:30})}
  if(typeof v==="number")return Number.isInteger(v)?String(v):String(Number(v.toPrecision(15)));
  if(v&&typeof v.toString==="function")return v.toString();
  return String(v)
 }catch{return String(v)}
}
function calculate(expression){
 const expr=clean(expression);if(!expr||expr.length>500)throw new Error("Biểu thức không hợp lệ");
 const value=math.evaluate(expr);return {expression:expr,value:format(value)}
}
function orderPolynomial(text){
 const t=String(text).replace(/\s+/g,"");if(!/^[0-9xX+\-*/^().]+$/.test(t)||/[()]/.test(t))return t;
 const terms=t.replace(/-/g,"+-").split("+").filter(Boolean),degree=term=>{const m=term.match(/[xX]\^(\d+)/);if(m)return Number(m[1]);return /[xX]/.test(term)?1:0};
 terms.sort((a,b)=>degree(b)-degree(a));return terms.join("+").replace(/\+\-/g,"-")
}
function simplify(expression){
 const expr=clean(expression),expanded=nerdamer(expr).expand().text();return {expression:expr,value:orderPolynomial(expanded)}
}
function solve(equation,variable="x"){
 const eq=clean(equation),v=String(variable||"x").replace(/[^a-zA-Z]/g,"")||"x";
 const result=nerdamer.solveEquations(eq,v);return {equation:eq,variable:v,solutions:Array.isArray(result)?result.map(String):[String(result)]}
}
function factor(expression){const expr=clean(expression);return {expression:expr,value:String(nerdamer(`factor(${expr})`))}}
function derive(expression,variable="x"){const expr=clean(expression);return {expression:expr,variable,value:String(nerdamer.diff(expr,variable))}}
function equivalent(a,b){try{return String(nerdamer(`simplify((${clean(a)})-(${clean(b)}))`))==="0"}catch{return false}}
function gcd(...values){const nums=values.flat().map(Number).filter(Number.isFinite).map(Math.trunc);if(!nums.length)throw new Error("Thiếu số");const g=(a,b)=>b?g(b,a%b):Math.abs(a);return nums.reduce(g)}
function lcm(...values){const nums=values.flat().map(Number).filter(Number.isFinite).map(Math.trunc);if(!nums.length)throw new Error("Thiếu số");const g=(a,b)=>b?g(b,a%b):Math.abs(a);return nums.reduce((a,b)=>Math.abs(a*b)/g(a,b))}
function stats(values){const a=values.map(Number).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)throw new Error("Thiếu dữ liệu");const sum=a.reduce((x,y)=>x+y,0),mean=sum/a.length,mid=Math.floor(a.length/2),median=a.length%2?a[mid]:(a[mid-1]+a[mid])/2;return {count:a.length,sum:format(sum),mean:format(mean),median:format(median),min:format(a[0]),max:format(a[a.length-1])}}
function solveSystem(equations,variables=["x","y"]){if(!Array.isArray(equations)||!equations.length)throw new Error("Thiếu hệ phương trình");const out=nerdamer.solveEquations(equations);const map={};for(const row of out||[])if(Array.isArray(row)&&row.length>=2)map[String(row[0])]=String(row[1]);return {equations,variables,solutions:map}}
function combination(n,r){n=Math.trunc(Number(n));r=Math.trunc(Number(r));if(n<0||r<0||r>n)throw new Error("n, r không hợp lệ");let v=1;for(let i=1;i<=r;i++)v=v*(n-r+i)/i;return String(Math.round(v))}
function permutation(n,r){n=Math.trunc(Number(n));r=Math.trunc(Number(r));if(n<0||r<0||r>n)throw new Error("n, r không hợp lệ");let v=1;for(let i=0;i<r;i++)v*=n-i;return String(v)}
function extractDirectExpression(prompt=""){
 const p=String(prompt).trim();
 const quoted=p.match(/(?:tính|calculate|compute|giá trị(?: của)?|value of)\s*[:：]?\s*([0-9().,+\-*/^×÷√\s]+)$/i);
 if(quoted&&quoted[1]){
  let e=quoted[1].trim().replace(/√\s*([0-9.]+)/g,"sqrt($1)");
  if(/^[0-9().,+\-*/^×÷sqrt\s]+$/i.test(e)&&/[0-9]/.test(e))return e
 }
 if(/^[0-9().,+\-*/^×÷\s]+$/.test(p)&&/[0-9]/.test(p))return p;
 return null
}
function extractEquation(prompt=""){
 const m=String(prompt).match(/(?:giải(?: phương trình)?|solve(?: equation)?)\s*[:：]?\s*([^?\n]+=[^?\n]+)/i);
 if(!m)return null;const eq=m[1].trim(),vars=(eq.match(/[a-zA-Z]/g)||[]);return {equation:eq,variable:vars[0]||"x"}
}
function deterministic(prompt){
 try{const ex=extractDirectExpression(prompt);if(ex)return {kind:"calculation",...calculate(ex)}}catch{}
 try{const eq=extractEquation(prompt);if(eq)return {kind:"equation",...solve(eq.equation,eq.variable)}}catch{}
 return null
}
module.exports={clean,format,calculate,simplify,solve,factor,derive,equivalent,gcd,lcm,stats,solveSystem,combination,permutation,deterministic};