window.SupabaseApp=(()=>{
 let client=null,config=null,readyPromise=null,currentAppUser=null,syncing=null;
 async function loadSdk(){
  if(window.supabase?.createClient)return window.supabase;
  await new Promise((resolve,reject)=>{
   const old=document.querySelector("script[data-supabase-sdk]");
   const sc=old||document.createElement("script");
   let settled=false;
   const finish=e=>{if(settled)return;settled=true;clearTimeout(timer);sc.removeEventListener("load",loaded);sc.removeEventListener("error",failed);e?reject(e):resolve()};
   const loaded=()=>finish(),failed=()=>finish(new Error("Không tải được Supabase SDK"));
   const timer=setTimeout(()=>finish(new Error("Tải thư viện đăng nhập quá lâu. Kiểm tra kết nối mạng.")),8000);
   sc.addEventListener("load",loaded,{once:true});sc.addEventListener("error",failed,{once:true});
   if(!old){
    sc.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/dist/umd/supabase.min.js";
    sc.async=true;sc.dataset.supabaseSdk="1";document.head.appendChild(sc);
   }
  });
  if(!window.supabase?.createClient)throw new Error("Supabase SDK chưa sẵn sàng");
  return window.supabase;
 }
 async function ready(){
  if(readyPromise)return readyPromise;
  readyPromise=(async()=>{
   config=await (window.__btPublicConfigPromise ||=fetch("/api/public-config",{cache:"no-store"})
    .then(r=>r.ok?r.json():Promise.reject(new Error("Cấu hình không khả dụng"))))
    .catch(()=>({supabase:{enabled:false}}));
   if(config?.supabase?.enabled&&config.supabase.url&&config.supabase.publishableKey){
    const sdk=await loadSdk();
    client=sdk.createClient(config.supabase.url,config.supabase.publishableKey,{
     auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},
     realtime:{params:{eventsPerSecond:10}}
    });
   }
   return {client,config};
  })().catch(e=>{readyPromise=null;throw e});
  return readyPromise;
 }
 async function session(){
  await ready();if(!client)return null;
  const {data,error}=await client.auth.getSession();
  if(error)throw error;
  return data?.session||null;
 }
 async function sync(sess){
  if(!sess?.access_token)return null;
  if(syncing?.token===sess.access_token)return syncing.promise;
  const request=(async()=>{
   API.setToken(sess.access_token);
   const j=await API.post("/api/auth/sync",{accessToken:sess.access_token},{timeout:15000,retries:0});
   if(!j?.user)throw new Error("Máy chủ chưa trả hồ sơ tài khoản.");
   if(j.user.avatarPath&&client){
    try{
     const {data,error}=await client.storage.from("avatars").createSignedUrl(j.user.avatarPath,3600);
     if(!error&&data?.signedUrl)j.user.avatarUrl=data.signedUrl;
    }catch(e){console.warn("Không tải được ảnh hồ sơ",e?.message||e)}
   }
   return j.user;
  })();
  syncing={token:sess.access_token,promise:request};
  try{return await request}finally{if(syncing?.promise===request)syncing=null}
 }
 async function init(onUser){
  await ready();
  if(!client)return null;
  let authId="",profileFlight=null,lastError="";
  const pending=sess=>{
   if(!sess?.access_token)return;
   API.setToken(sess.access_token);
   const su=sess.user||{},md=su.user_metadata||{};
   if(su.id===authId)return;
   authId=su.id||"";currentAppUser=null;lastError="";
   // A Supabase session confirms identity, NOT the server-side Admin/teacher/student role.
   onUser?.({id:su.id,email:su.email||"",name:String(md.name||md.full_name||su.email?.split("@")[0]||"Người dùng"),role:"pending",avatar:"👤",pendingProfile:true});
  };
  const updateProfile=sess=>{
   if(!sess?.access_token)return Promise.resolve(null);
   if(profileFlight?.token===sess.access_token)return profileFlight.promise;
   const task=(async()=>{
    try{
     const u=await sync(sess);
     if(authId===sess.user?.id&&u){
      currentAppUser=u;lastError="";onUser?.(u);
     }
     return u;
    }catch(e){
     const message=String(e?.message||"Không thể xác thực quyền");
     console.warn("Profile sync pending",message);
     if(authId===sess.user?.id&&lastError!==message){
      lastError=message;
      onUser?.({id:sess.user?.id,email:sess.user?.email||"",name:String(sess.user?.user_metadata?.name||sess.user?.email?.split("@")[0]||"Người dùng"),role:"pending",pendingProfile:true,syncError:true});
     }
     return null;
    }
   })();
   profileFlight={token:sess.access_token,promise:task};
   task.finally(()=>{if(profileFlight?.promise===task)profileFlight=null}).catch(()=>{});
   return task;
  };
  client.auth.onAuthStateChange((event,sess)=>{
   if(event==="SIGNED_OUT"){
    authId="";currentAppUser=null;lastError="";profileFlight=null;API.setToken("");onUser?.(null);return;
   }
   if(!sess?.access_token)return;
   if(event==="INITIAL_SESSION"||event==="SIGNED_IN"){
    pending(sess);setTimeout(()=>updateProfile(sess),0);
   }else if(event==="USER_UPDATED"){
    setTimeout(()=>updateProfile(sess),0);
   }else if(event==="TOKEN_REFRESHED"){
    API.setToken(sess.access_token);
    if(!currentAppUser)setTimeout(()=>updateProfile(sess),0);
   }
  });
  const s=await session();
  if(s){pending(s);void updateProfile(s)}
  else API.setToken("");
  return s;
 }
 return {ready,session,sync,init,get client(){return client},get config(){return config},get user(){return currentAppUser},enabled:()=>!!client};
})();