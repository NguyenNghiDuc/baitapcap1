const ai=require("../lib/ai-provider");
module.exports=async function handleAI(req,res,p,ctx){
 const {send,parseBody,requireUser,monitor}=ctx;
 if(req.method==="POST"&&p==="/api/ai"){
  const u=await requireUser(req,res);if(!u)return true;let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  const prompt=String(d.prompt||"").slice(0,5000);if(!prompt)return send(res,400,{error:"Thiếu câu hỏi"}),true;
  if(!ai.enabled())return send(res,200,{answer:"AI provider chưa được cấu hình.",provider:false}),true;
  try{const answer=await ai.chat(prompt,"Bạn là giáo viên tiểu học Việt Nam lớp 4-5. Giải thích từng bước, ưu tiên gợi ý trước đáp án. Với Toán phải nêu công thức/phép kiểm tra; với Tiếng Việt và Tiếng Anh phải giải thích vì sao.");monitor.info("ai_chat",{userId:u.id});return send(res,200,{answer,provider:true}),true}catch(e){return send(res,502,{error:e.message}),true}
 }
 if(req.method==="POST"&&p==="/api/ai/analyze-wrong"){
  const u=await requireUser(req,res);if(!u)return true;let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  const items=Array.isArray(d.items)?d.items.slice(0,30):[],topics={};for(const x of items){const k=x.topic||x.type||"Khác";topics[k]=(topics[k]||0)+1}
  const weak=Object.entries(topics).sort((a,b)=>b[1]-a[1])[0]?.[0]||"Chưa xác định",fallback={weakTopic:weak,summary:items.length?`Em sai ${items.length} câu. Cần ôn nhiều nhất: ${weak}.`:"Chưa có câu sai.",plan:["Đọc lại quy tắc/công thức","Làm lại câu sai không xem đáp án","Làm 5 câu tương tự","Kiểm tra lại"]};
  if(!items.length||!ai.enabled())return send(res,200,fallback),true;
  try{const answer=await ai.chat("Lớp "+(d.grade||"4-5")+"; câu sai: "+JSON.stringify(items),"Phân tích lỗi sai cho học sinh tiểu học. Chỉ ra kiểu lỗi, giải thích dễ hiểu, đề xuất 3-4 bước ôn.");return send(res,200,{...fallback,ai:answer}),true}catch{return send(res,200,fallback),true}
 }
 if(req.method==="POST"&&p==="/api/student/ocr"){
  const u=await requireUser(req,res,["student"]);if(!u)return true;let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  const m=String(d.dataUrl||"").match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);if(!m)return send(res,400,{error:"Ảnh không hợp lệ"}),true;if(Buffer.from(m[2],"base64").length>5e6)return send(res,413,{error:"Ảnh tối đa 5MB"}),true;
  if(!ai.enabled())return send(res,503,{error:"AI/OCR chưa cấu hình"}),true;
  try{const text=await ai.vision(d.dataUrl,String(d.prompt||"Đọc đề và giải thích từng bước."));return send(res,200,{text}),true}catch(e){return send(res,502,{error:e.message}),true}
 }
 return false;
};