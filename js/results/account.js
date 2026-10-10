/* Keep ownership provenance on new locally stored results.
   Existing legacy results with no provenance must never inherit the current login. */
window.ResultAccount=(()=>{
 function fromUser(user){
  if(!user?.id)return null;
  return {
   accountId:String(user.id).slice(0,128),
   accountName:String(user.name||user.user_metadata?.name||user.email?.split("@")[0]||"").slice(0,120),
   accountEmail:String(user.email||"").trim().toLowerCase().slice(0,180)
  };
 }
 async function current(){
  if(window.API?.token){
   const cached=fromUser(window.SupabaseApp?.user);
   if(cached)return cached;
   try{const j=await window.API.get("/api/me");const owner=fromUser(j?.user);if(owner)return owner}catch{}
  }
  try{
   const session=await window.SupabaseApp?.session?.();
   return session?.user?.id?fromUser(session.user):null;
  }catch{return null}
 }
 function describe(result){
  if(!result?.accountId)return {name:"Chưa xác định",detail:"Bài cũ lưu trên thiết bị"};
  const name=String(result.accountName||"").trim();
  const email=String(result.accountEmail||"").trim();
  return {name:name||email||"Tài khoản đã lưu",detail:email||(result.accountId?"ID: "+result.accountId:"")};
 }
 return {fromUser,current,describe};
})();
