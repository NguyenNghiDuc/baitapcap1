"use strict";
const {URL}=require("node:url");
const {execute,readLatest}=require("../lib/grade-mutation");
const {history,parseHistoryFilters,exportJournalCsv,validateDecision,decide}=require("../lib/admin-device-reviews");
const HEADERS={"Cache-Control":"private, no-store"};
module.exports=async function handler(req,res,p,ctx){
 if(p!=="/api/admin/device-reviews"&&p!=="/api/admin/device-reviews/export")return false;
 const {send,parseBody,requireUser}=ctx;
 const admin=await requireUser(req,res,["admin"]);
 if(!admin)return true;
 if(req.method==="GET"){
  try{
   const q=new URL(req.url,"http://localhost").searchParams;
   if(["page","status","userId","type","period","search"].some(k=>q.getAll(k).length>1)){
    send(res,400,{error:"Bộ lọc lịch sử không hợp lệ"},HEADERS);return true;
   }
   let filters;
   try{
    filters=parseHistoryFilters({
     page:q.get("page")??"1",status:q.get("status")??"all",
     userId:q.get("userId")??"",type:q.get("type")??"all",period:q.get("period")??"all",search:q.get("search")??""
    });
   }catch{
    send(res,400,{error:"Bộ lọc lịch sử không hợp lệ"},HEADERS);return true;
   }
   const db=await readLatest(ctx);
   if(p.endsWith("/export")){
    let csv;try{csv=exportJournalCsv(db,filters)}
    catch(e){send(res,e.status===413?413:400,{error:e.message},HEADERS);return true}
    res.writeHead(200,{"Content-Type":"text/csv; charset=utf-8",
     "Content-Disposition":'attachment; filename="nhat-ky-bao-mat-admin.csv"',
     "X-Content-Type-Options":"nosniff",...HEADERS});
    res.end(csv);return true;
   }
   send(res,200,history(db,filters),HEADERS);
  }catch(e){
   send(res,/Invalid device review filters/.test(e.message)?400:503,
    {error:"Không đọc được lịch sử xem xét hoặc bộ lọc không hợp lệ."},HEADERS);
  }
  return true;
 }
 if(req.method==="POST"){
  if(p.endsWith("/export")){send(res,405,{error:"Chỉ hỗ trợ GET"},{"Allow":"GET",...HEADERS});return true}
  if(process.env.VERCEL==="1"&&!process.env.DATABASE_URL){
   send(res,503,{error:"Cần PostgreSQL để lưu quyết định lâu dài."},HEADERS);return true;
  }
  let body,decision;
  try{body=await parseBody(req);decision=validateDecision(body)}
  catch{send(res,400,{error:"Dữ liệu quyết định không hợp lệ (lý do 10–500 ký tự)."},HEADERS);return true}
  try{
   const out=await execute(ctx,async(db,audit)=>decide(db,admin,decision,audit));
   send(res,out.status,out.data,HEADERS);
  }catch{
   send(res,503,{error:"Không lưu được quyết định bảo mật. Vui lòng thử lại."},HEADERS);
  }
  return true;
 }
 send(res,405,{error:"Chỉ hỗ trợ GET và POST"},{"Allow":"GET, POST",...HEADERS});
 return true;
};
