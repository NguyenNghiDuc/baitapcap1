"use strict";
const {makeTeacherOverview}=require("../lib/teacher-overview");
module.exports=async function handleTeacherOverview(req,res,p,ctx){
 if(p!=="/api/teacher/overview")return false;
 const headers={"Cache-Control":"private, no-store"};
 const {send,requireUser,pg,load}=ctx;
 if(req.method!=="GET"){
  send(res,405,{error:"Chỉ hỗ trợ GET"},{"Allow":"GET",...headers});return true;
 }
 const actor=await requireUser(req,res,["teacher","admin"]);
 if(!actor)return true;
 try{
  const db=process.env.DATABASE_URL?await pg.loadAppState():load();
  if(!db||!Array.isArray(db.classes)||!Array.isArray(db.assignments)||!Array.isArray(db.submissions))
   throw Error("incomplete teacher summary");
  send(res,200,makeTeacherOverview(db,actor),headers);
 }catch{
  send(res,503,{error:"Chưa tải được thống kê giáo viên. Vui lòng thử lại sau."},headers);
 }
 return true;
};
