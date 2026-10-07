module.exports=async function handleStorageMeta(req,res,p,ctx){
 const {send,parseBody,requireUser,load,save,monitor}=ctx;
 if(req.method==="POST"&&p==="/api/storage/student-work"){
  const u=await requireUser(req,res,["student"]);if(!u)return true;let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  if(d.bucket!=="student-work"||!d.path)return send(res,400,{error:"Storage path không hợp lệ"}),true;
  const db=load();db.studentWorks=db.studentWorks||[];const item={id:cryptoId(),userId:u.id,title:String(d.title||"Bài làm").slice(0,120),bucket:"student-work",path:String(d.path),url:null,createdAt:new Date().toISOString()};db.studentWorks.unshift(item);save(db);monitor.info("student_work_uploaded",{userId:u.id,path:item.path});return send(res,201,{work:item}),true;
 }
 if(req.method==="POST"&&p==="/api/storage/material"){
  const u=await requireUser(req,res,["teacher","admin"]);if(!u)return true;let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  if(d.bucket!=="learning-materials"||!d.path)return send(res,400,{error:"Storage path không hợp lệ"}),true;
  const db=load();db.materials=db.materials||[];const item={id:cryptoId(),ownerId:u.id,title:String(d.title||"Tài liệu").slice(0,160),bucket:"learning-materials",path:String(d.path),url:null,type:String(d.type||""),createdAt:new Date().toISOString()};db.materials.unshift(item);save(db);monitor.info("material_uploaded",{userId:u.id,path:item.path});return send(res,201,{material:item}),true;
 }
 return false;
};
function cryptoId(){return require("crypto").randomUUID()}