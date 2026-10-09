const fs=require("fs"),path=require("path");
module.exports=async function handleApp(req,res,p,ctx){
 const {send,parseBody,requireUser,ROOT}=ctx;
 if(req.method==="GET"&&p==="/api/app/version"){
  const version=require("../package.json").version;
  return send(res,200,{version,build:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,7)||process.env.APP_BUILD||"local",updatedAt:process.env.APP_UPDATED_AT||null}),true;
 }
 if(req.method==="POST"&&p==="/api/student/ocr"){
  const u=await requireUser(req,res,["student"]);if(!u)return true;let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  const m=String(d.dataUrl||"").match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);if(!m)return send(res,400,{error:"Ảnh không hợp lệ"}),true;
  if(Buffer.from(m[2],"base64").length>5e6)return send(res,413,{error:"Ảnh tối đa 5MB"}),true;
  if(!process.env.AI_API_URL||!process.env.AI_API_KEY)return send(res,503,{error:"OCR AI chưa được cấu hình AI_API_URL/API_KEY"}),true;
  try{
   const payload={model:process.env.AI_VISION_MODEL||process.env.AI_MODEL||"gpt-4.1-mini",messages:[{role:"system",content:"Bạn là giáo viên tiểu học lớp 4-5. Đọc chính xác đề trong ảnh, sau đó giải thích từng bước. Không bịa nội dung nếu ảnh mờ."},{role:"user",content:[{type:"text",text:String(d.prompt||"Đọc và giải thích bài trong ảnh.")},{type:"image_url",image_url:{url:d.dataUrl}}]}]};
   const rr=await fetch(process.env.AI_API_URL,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.AI_API_KEY},body:JSON.stringify(payload)}),j=await rr.json();
   if(!rr.ok)return send(res,502,{error:"AI vision không xử lý được ảnh"}),true;
   return send(res,200,{text:j.choices?.[0]?.message?.content||j.output_text||"Không đọc được nội dung"}),true;
  }catch(e){return send(res,502,{error:"OCR AI thất bại: "+e.message}),true}
 }
 if(req.method==="POST"&&p==="/api/student/feedback"){
  const u=await requireUser(req,res);if(!u)return true;let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  const file=path.join(ROOT,"data","feedback.json");let a=[];try{a=JSON.parse(fs.readFileSync(file,"utf8"))}catch{}a.unshift({id:Date.now().toString(36),userId:u.id,type:String(d.type||"general"),message:String(d.message||"").slice(0,2000),questionId:d.questionId||null,createdAt:new Date().toISOString()});fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(a.slice(0,1000),null,2));return send(res,201,{ok:true}),true;
 }
 return false;
};