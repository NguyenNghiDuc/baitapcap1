window.SupabaseApp=(()=>{
 let client=null,config=null,readyPromise=null,currentAppUser=null;
 async function loadSdk(){
  if(window.supabase?.createClient)return window.supabase;
  await new Promise((resolve,reject)=>{
   const existing=document.querySelector('script[data-supabase-sdk]');
   if(existing){existing.addEventListener("load",resolve,{once:true});existing.addEventListener("error",reject,{once:true});return}
   const sc=document.createElement("script");sc.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/dist/umd/supabase.min.js";sc.async=true;sc.dataset.supabaseSdk="1";sc.onload=resolve;sc.onerror=()=>reject(new Error("Không tải được Supabase SDK"));document.head.appendChild(sc)
  });
  return window.supabase
 }
 async function ready(){
  if(readyPromise)return readyPromise;
  readyPromise=(async()=>{
   config=await fetch("/api/public-config",{cache:"no-store"}).then(r=>r.json()).catch(()=>({supabase:{enabled:false}}));
   if(config?.supabase?.enabled&&config.supabase.url&&config.supabase.publishableKey){
    const sdk=await loadSdk();client=sdk.createClient(config.supabase.url,config.supabase.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},realtime:{params:{eventsPerSecond:10}}});
   }
   return {client,config}
  })();
  return readyPromise
 }
 async function session(){await ready();if(!client)return null;const {data}=await client.auth.getSession();return data.session||null}
 async function sync(sessionObj){if(!sessionObj?.access_token)return null;API.setToken(sessionObj.access_token);const j=await API.post("/api/auth/sync",{accessToken:sessionObj.access_token});currentAppUser=j.user;
  if(j.user?.avatarPath&&client){
   try{const {data,error}=await client.storage.from("avatars").createSignedUrl(j.user.avatarPath,3600);
    if(!error&&data?.signedUrl)j.user.avatarUrl=data.signedUrl;
   }catch(e){console.warn("Không lấy được ảnh đại diện riêng tư",e?.message||e)}
  }
  return j.user}
 async function init(onUser){
  await ready();if(!client)return null;
  const showSession=sess=>{
   if(!sess?.access_token)return;
   API.setToken(sess.access_token);
   const su=sess.user||{},md=su.user_metadata||{};
   onUser?.({id:su.id,email:su.email||"",name:String(md.name||md.full_name||su.email?.split("@")[0]||"Người dùng"),role:"student",grade:Number(md.grade)||4,avatar:"👧🏻",pendingProfile:true});
  };
  const updateProfile=async sess=>{if(!sess?.access_token)return;const u=await sync(sess).catch(e=>{console.warn("Profile sync pending",e?.message||e);return null});if(u)onUser?.(u)};
  // Session restoration is instant after SDK reads persisted credentials;
  // never block the visible signed-in state on the separate profile request.
  client.auth.onAuthStateChange((event,sess)=>{
   if(event==="SIGNED_OUT"){currentAppUser=null;API.setToken("");onUser?.(null);return}
   if(!sess)return;
   if(event==="INITIAL_SESSION"||event==="SIGNED_IN"){showSession(sess);setTimeout(()=>updateProfile(sess),0)}
   else if(event==="USER_UPDATED"||event==="TOKEN_REFRESHED"){API.setToken(sess.access_token);setTimeout(()=>updateProfile(sess),0)}
  });
  const s=await session();
  if(s){showSession(s);updateProfile(s)}
  return s
 }
 return {ready,session,sync,init,get client(){return client},get config(){return config},get user(){return currentAppUser},enabled:()=>!!client}
})();