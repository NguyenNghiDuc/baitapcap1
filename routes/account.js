module.exports=async function handleAccount(req,res,p,ctx){
 const {send,requireUser,load,save,supabase,monitor,audit,pg}=ctx;
 if(req.method==="GET"&&p==="/api/account/export"){
  const u=await requireUser(req,res);if(!u)return true;const db=load();
  audit?.record(db,u,"account_exported");save(db);const payload={exportedAt:new Date().toISOString(),profile:{id:u.id,email:u.email,name:u.name,role:u.role,grade:u.grade,avatar:u.avatar},results:db.results.filter(x=>x.userId===u.id),submissions:db.submissions.filter(x=>(x.studentId||x.userId)===u.id),notifications:db.notifications.filter(x=>x.userId===u.id),studentWorks:(db.studentWorks||[]).filter(x=>x.userId===u.id),loginDevices:(db.loginDevices||[]).filter(x=>x.userId===u.id),sync:u.studentSync||null};
  return send(res,200,payload),true;
 }
 if(req.method==="DELETE"&&p==="/api/account"){
  const u=await requireUser(req,res);if(!u)return true;const db=load(),id=u.id;
  if(process.env.DATABASE_URL){
   try{await pg.query("DELETE FROM user_presence WHERE user_id=$1",[String(id)])}
   catch(e){monitor.warn("account_presence_delete_failed",{message:e.message,userId:id});return send(res,503,{error:"Không xóa được lịch sử hoạt động, vui lòng thử lại"}),true}
  }
  db.results=db.results.filter(x=>x.userId!==id);db.submissions=db.submissions.filter(x=>(x.studentId||x.userId)!==id);db.notifications=db.notifications.filter(x=>x.userId!==id);db.studentWorks=(db.studentWorks||[]).filter(x=>x.userId!==id);db.pushSubscriptions=(db.pushSubscriptions||[]).filter(x=>x.userId!==id);db.loginDevices=(db.loginDevices||[]).filter(x=>x.userId!==id);audit?.record(db,u,"account_deleted");db.users=db.users.filter(x=>x.id!==id);save(db);
  if(u.authUserId)await supabase.deleteAuthUser(u.authUserId).catch(()=>{});
  monitor.warn("account_deleted",{userId:id,authUserId:u.authUserId||null});return send(res,200,{ok:true}),true;
 }
 return false;
};