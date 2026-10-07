module.exports=async function handleExamDrafts(req,res,p,ctx){
 const {send,parseBody,requireUser,load,save}=ctx;
 if(p!=="/api/exam-drafts")return false;
 const u=await requireUser(req,res,["student"]);if(!u)return true;
 const db=load();db.examDrafts=db.examDrafts||[];
 if(req.method==="GET"){
  const draft=[...db.examDrafts].filter(x=>x.userId===u.id).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt))[0]||null;
  return send(res,200,{draft}),true;
 }
 if(req.method==="POST"){
  let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  const clientExamId=String(d.clientExamId||"").slice(0,160);if(!clientExamId)return send(res,400,{error:"Thiếu clientExamId"}),true;
  let item=db.examDrafts.find(x=>x.userId===u.id&&x.clientExamId===clientExamId);
  if(!item){item={id:require("crypto").randomUUID(),userId:u.id,clientExamId,createdAt:new Date().toISOString()};db.examDrafts.push(item)}
  item.payload=d.payload||{};item.updatedAt=new Date().toISOString();save(db);return send(res,200,{draft:item}),true;
 }
 if(req.method==="DELETE"){
  let d={};try{d=await parseBody(req)}catch{}
  const id=String(d.clientExamId||"");db.examDrafts=db.examDrafts.filter(x=>x.userId!==u.id||(id&&x.clientExamId!==id));save(db);return send(res,200,{ok:true}),true;
 }
 return false;
};