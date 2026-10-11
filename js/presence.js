/* Presence is approximate (visible authenticated tab in the last 120s).
   Only the server chooses the account from the bearer token. */
window.LivePresence=(()=>{
 const sessionId="web_"+(crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,"0")).join(""));
 let userId=null,lastToken="",timer=null,sending=false;
 async function accessToken(){
  if(window.API?.token)return window.API.token;
  const sess=await window.SupabaseApp?.session?.().catch(()=>null);
  return sess?.access_token||"";
 }
 async function ping(active,{keepalive=false}={}){
  if(!userId)return false;
  const token=await accessToken()||lastToken;
  if(!token)return false;
  if(active&&sending)return false;
  if(active)sending=true;
  try{
   const r=await fetch("/api/presence",{method:"POST",cache:"no-store",keepalive,
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
    body:JSON.stringify({sessionId,active})});
   if(r.ok){lastToken=token;return true}
   return false;
  }catch{return false}finally{if(active)sending=false}
 }
 function startTimer(){
  if(timer)return;
  timer=setInterval(()=>{if(userId&&document.visibilityState==="visible")void ping(true)},35000);
 }
 function stopTimer(){if(timer){clearInterval(timer);timer=null}}
 function setIdentity(user){
  const next=user?.id?String(user.id):null;
  if(userId&&userId!==next)void ping(false,{keepalive:true});
  userId=next;
  if(!userId){stopTimer();return}
  startTimer();
  if(document.visibilityState==="visible")void ping(true);
 }
 async function start(){
  try{const s=await window.SupabaseApp?.session?.();if(s?.user?.id)setIdentity(s.user)}
  catch{}
 }
 document.addEventListener("visibilitychange",()=>{
  if(!userId)return;
  void ping(document.visibilityState==="visible",{keepalive:document.visibilityState!=="visible"});
 });
 window.addEventListener("pagehide",()=>{if(userId)void ping(false,{keepalive:true})});
 window.addEventListener("pageshow",()=>{if(userId&&document.visibilityState==="visible")void ping(true)});
 return {setIdentity,start};
})();