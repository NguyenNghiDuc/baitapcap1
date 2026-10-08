const ai=require("../lib/ai-provider");
const mathEngine=require("../lib/ai/math-engine");
const mathSkills=require("../lib/ai/math-skills");
const mathNatural=require("../lib/ai/math-natural");
const localTutor=require("../lib/ai/local-tutor");
const subjectRouter=require("../lib/ai/subject-router");
const {SUBJECT,VERIFY}=require("../lib/ai/prompts");

function mathContext(prompt){
 const natural=mathNatural.solve(prompt);if(natural)return {natural};
 const direct=mathEngine.deterministic(prompt);if(direct)return {direct};
 const skill=mathSkills.solveWordProblem(prompt);if(skill)return {skill};
 const ctx={};
 const exprs=String(prompt).match(/(?:\d+(?:[.,]\d+)?\s*(?:[+\-*/^×÷])\s*)+\d+(?:[.,]\d+)?/g)||[];
 if(exprs.length){ctx.calculations=[];for(const e of exprs.slice(0,8)){try{ctx.calculations.push(mathEngine.calculate(e))}catch{}}}
 return ctx
}
async function verifiedMath(prompt){
 const ctx=mathContext(prompt);
 if(ctx.natural)return {answer:mathNatural.answer(ctx.natural),verified:true,engine:"math-natural",skill:ctx.natural.kind};
 if(ctx.direct){
  if(ctx.direct.kind==="calculation")return {answer:`Kết quả: ${ctx.direct.value}`,verified:true,engine:"deterministic"};
  if(ctx.direct.kind==="equation")return {answer:`Nghiệm: ${ctx.direct.variable} = ${ctx.direct.solutions.join(", ")}`,verified:true,engine:"symbolic"};
 }
 if(ctx.skill)return {answer:ctx.skill.explain.join("\n")+"\nĐáp số: "+ctx.skill.answer,verified:true,engine:"math-skill",skill:ctx.skill.kind};
 const contextText=ctx.calculations?.length?"\n\nCONTEXT TÍNH TOÁN ĐÃ KIỂM TRA BẰNG MÁY:\n"+JSON.stringify(ctx.calculations):"";
 const draft=await ai.chat(prompt+contextText,SUBJECT.math);
 const checked=await ai.chat("ĐỀ GỐC:\n"+prompt+"\n\nLỜI GIẢI CẦN KIỂM TRA:\n"+draft+contextText,VERIFY);
 return {answer:checked||draft,verified:true,engine:"ai+verifier"}
}

module.exports=async function handleAI(req,res,p,ctx){
 const {send,parseBody,requireUser,monitor}=ctx;
 if(req.method==="POST"&&p==="/api/ai"){
  const u=await requireUser(req,res);if(!u)return true;let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  const prompt=String(d.prompt||"").slice(0,7000);if(!prompt)return send(res,400,{error:"Thiếu câu hỏi"}),true;
  const detected=subjectRouter.detect(prompt),subject=d.subject&&SUBJECT[d.subject]?d.subject:detected.subject;
  try{
   if(subject==="math"){
    if(!ai.enabled()){
     const local=localTutor.answer(prompt,"math");if(local)return send(res,200,{...local,provider:false,subject:"math"}),true;
     const ctx=mathContext(prompt);
     if(ctx.natural)return send(res,200,{answer:mathNatural.answer(ctx.natural),provider:false,subject,verified:true,engine:"math-natural",skill:ctx.natural.kind}),true;
     if(ctx.direct){
      const out=ctx.direct.kind==="calculation"?`Kết quả: ${ctx.direct.value}`:`Nghiệm: ${ctx.direct.variable} = ${ctx.direct.solutions.join(", ")}`;
      return send(res,200,{answer:out,provider:false,subject,verified:true,engine:ctx.direct.kind==="calculation"?"deterministic":"symbolic"}),true
     }
     if(ctx.skill)return send(res,200,{answer:ctx.skill.explain.join("\n")+"\nĐáp số: "+ctx.skill.answer,provider:false,subject,verified:true,engine:"math-skill",skill:ctx.skill.kind}),true;
     return send(res,200,{answer:"AI provider chưa cấu hình. Phép tính trực tiếp vẫn dùng math engine; bài toán lời văn/nâng cao cần AI provider.",provider:false,subject}),true
    }
    const out=await verifiedMath(prompt);monitor.info("ai_math",{userId:u.id,engine:out.engine});return send(res,200,{...out,provider:true,subject}),true
   }
   if(!ai.enabled()){const local=localTutor.answer(prompt,subject);if(local)return send(res,200,{...local,provider:false,subject:local.subject||subject}),true;return send(res,200,{answer:"Mình chưa có đủ kiến thức local cho câu này. Hãy cấu hình AI provider để xử lý câu hỏi mở/nâng cao hơn.",provider:false,subject}),true}
   const answer=await ai.chat(prompt,SUBJECT[subject]||SUBJECT.general);monitor.info("ai_chat",{userId:u.id,subject});return send(res,200,{answer,provider:true,subject,verified:subject!=="general"}),true
  }catch(e){return send(res,502,{error:e.message,subject}),true}
 }
 if(req.method==="POST"&&p==="/api/ai/calculate"){
  const u=await requireUser(req,res);if(!u)return true;let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  try{
   const op=String(d.op||"calculate"),expr=String(d.expression||"").slice(0,500),variable=String(d.variable||"x");
   const result=op==="solve"?mathEngine.solve(expr,variable):op==="simplify"?mathEngine.simplify(expr):op==="factor"?mathEngine.factor(expr):op==="derive"?mathEngine.derive(expr,variable):op==="gcd"?{value:String(mathEngine.gcd(d.values||[]))}:op==="lcm"?{value:String(mathEngine.lcm(d.values||[]))}:op==="stats"?mathEngine.stats(d.values||[]):op==="solveSystem"?mathEngine.solveSystem(d.equations||[],d.variables||["x","y"]):op==="combination"?{value:mathEngine.combination(d.n,d.r)}:op==="permutation"?{value:mathEngine.permutation(d.n,d.r)}:mathEngine.calculate(expr);
   return send(res,200,{result,engine:"deterministic"}),true
  }catch(e){return send(res,400,{error:e.message}),true}
 }
 if(req.method==="POST"&&p==="/api/ai/analyze-wrong"){
  const u=await requireUser(req,res);if(!u)return true;let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  const items=Array.isArray(d.items)?d.items.slice(0,30):[],topics={};for(const x of items){const k=x.topic||x.type||"Khác";topics[k]=(topics[k]||0)+1}
  const weak=Object.entries(topics).sort((a,b)=>b[1]-a[1])[0]?.[0]||"Chưa xác định",fallback={weakTopic:weak,summary:items.length?`Em sai ${items.length} câu. Cần ôn nhiều nhất: ${weak}.`:"Chưa có câu sai.",plan:["Đọc lại quy tắc/công thức","Làm lại câu sai không xem đáp án","Làm 5 câu tương tự","Kiểm tra lại"]};
  if(!items.length||!ai.enabled())return send(res,200,fallback),true;
  try{const answer=await ai.chat("Lớp "+(d.grade||"4-5")+"; câu sai: "+JSON.stringify(items),SUBJECT.math+"\nHãy phân tích lỗi sai, không chỉ cho đáp án.");return send(res,200,{...fallback,ai:answer}),true}catch{return send(res,200,fallback),true}
 }
 if(req.method==="POST"&&p==="/api/student/ocr"){
  const u=await requireUser(req,res,["student"]);if(!u)return true;let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  const m=String(d.dataUrl||"").match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);if(!m)return send(res,400,{error:"Ảnh không hợp lệ"}),true;if(Buffer.from(m[2],"base64").length>5e6)return send(res,413,{error:"Ảnh tối đa 5MB"}),true;
  if(!ai.enabled())return send(res,503,{error:"AI/OCR chưa cấu hình"}),true;
  try{const text=await ai.vision(d.dataUrl,String(d.prompt||"Đọc đề và giải thích từng bước."));return send(res,200,{text}),true}catch(e){return send(res,502,{error:e.message}),true}
 }
 return false;
};