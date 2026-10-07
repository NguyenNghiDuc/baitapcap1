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
  if(v&&v.isBigNumber)return math.format(v,{notation:"auto",precision:30});
  if(typeof v==="number")return Number.isInteger(v)?String(v):String(Number(v.toPrecision(15)));
  if(v&&typeof v.toString==="function")return v.toString();
  return String(v)
 }catch{return String(v)}
}
function calculate(expression){
 const expr=clean(expression);if(!expr||expr.length>500)throw new Error("Biểu thức không hợp lệ");
 const value=math.evaluate(expr);return {expression:expr,value:format(value)}
}
function simplify(expression){
 const expr=clean(expression);return {expression:expr,value:String(nerdamer(expr).expand().simplify())}
}
function solve(equation,variable="x"){
 const eq=clean(equation),v=String(variable||"x").replace(/[^a-zA-Z]/g,"")||"x";
 const result=nerdamer.solveEquations(eq,v);return {equation:eq,variable:v,solutions:Array.isArray(result)?result.map(String):[String(result)]}
}
function factor(expression){const expr=clean(expression);return {expression:expr,value:String(nerdamer(`factor(${expr})`))}}
function derive(expression,variable="x"){const expr=clean(expression);return {expression:expr,variable,value:String(nerdamer.diff(expr,variable))}}
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
module.exports={clean,format,calculate,simplify,solve,factor,derive,deterministic};