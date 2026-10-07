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
 async function sync(sessionObj){if(!sessionObj?.access_token)return null;API.setToken(sessionObj.access_token);const j=await API.post("/api/auth/sync",{accessToken:sessionObj.access_token});currentAppUser=j.user;return j.user}
 async function init(onUser){
  await ready();if(!client)return null;
  const s=await session();if(s){const u=await sync(s).catch(()=>null);if(u)onUser?.(u)}
  client.auth.onAuthStateChange((event,sess)=>{setTimeout(async()=>{if(sess){const u=await sync(sess).catch(()=>null);if(u)onUser?.(u)}else if(event==="SIGNED_OUT"){API.setToken("");onUser?.(null)}},0)});
  return s
 }
 return {ready,session,sync,init,get client(){return client},get config(){return config},get user(){return currentAppUser},enabled:()=>!!client}
})();