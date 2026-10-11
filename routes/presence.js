"use strict";
const {URL}=require("node:url");
const presence=require("../lib/presence");
module.exports=async function handlePresence(req,res,p,ctx){
 if(p!=="/api/presence"&&p!=="/api/admin/presence")return false;
 const {send,parseBody,requireUser,monitor}=ctx;
 if(p==="/api/presence"){
  if(req.method!=="POST")return send(res,405,{error:"Phương thức không được hỗ trợ"}),true;
  const user=await requireUser(req,res);if(!user)return true;
  if(!presence.available())return send(res,503,{error:"Cần cấu hình PostgreSQL để xem online trên Vercel"}),true;
  let data;try{data=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  const sessionId=String(data?.sessionId||"");
  if(!/^[A-Za-z0-9_-]{16,100}$/.test(sessionId)||typeof data.active!=="boolean")
   return send(res,400,{error:"Trạng thái hoạt động không hợp lệ"}),true;
  try{await presence.touch(user.id,sessionId,data.active);
   return send(res,200,{ok:true,active:data.active,ttlSeconds:120}),true;
  }catch(e){monitor.warn("presence_write_failed",{message:e.message});return send(res,503,{error:"Chưa lưu được trạng thái online"}),true}
 }
 const admin=await requireUser(req,res,["admin"]);if(!admin)return true;
 if(req.method!=="GET")return send(res,405,{error:"Phương thức không được hỗ trợ"}),true;
 const raw=new URL(req.url,"http://localhost").searchParams.get("ids")||"";
 const ids=raw.split(",").filter(Boolean);
 if(ids.length>50||ids.some(id=>!/^[A-Za-z0-9_-]{1,128}$/.test(id)))
  return send(res,400,{error:"Danh sách tài khoản không hợp lệ"}),true;
 try{
  const status=await presence.overview(ids);
  return send(res,200,status),true;
 }catch(e){monitor.warn("presence_read_failed",{message:e.message});return send(res,503,{error:"Không đọc được trạng thái online"}),true}
};
