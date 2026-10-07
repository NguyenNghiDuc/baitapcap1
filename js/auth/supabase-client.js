window.SupabaseApp=(()=>{
 let client=null,config=null,readyPromise=null;
 async function ready(){
  if(readyPromise)return readyPromise;
  readyPromise=(async()=>{
   config=await fetch("/api/public-config",{cache:"no-store"}).then(r=>r.json()).catch(()=>({supabase:{enabled:false}}));
   if(config?.supabase?.enabled&&config.supabase.url&&config.supabase.publishableKey&&window.supabase?.createClient){
    client=window.supabase.createClient(config.supabase.url,config.supabase.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},realtime:{params:{eventsPerSecond:10}}});
   }
   return {client,config}
  })();
  return readyPromise
 }
 async function session(){await ready();if(!client)return null;const {data}=await client.auth.getSession();return data.session||null}
 async function sync(sessionObj){if(!sessionObj?.access_token)return null;API.setToken(sessionObj.access_token);const j=await API.post("/api/auth/sync",{accessToken:sessionObj.access_token});return j.user}
 async function init(onUser){
  await ready();if(!client)return null;
  const s=await session();if(s){const u=await sync(s).catch(()=>null);if(u)onUser?.(u)}
  client.auth.onAuthStateChange((event,sess)=>{setTimeout(async()=>{if(sess){const u=await sync(sess).catch(()=>null);if(u)onUser?.(u)}else if(event==="SIGNED_OUT"){API.setToken("");onUser?.(null)}},0)});
  return s
 }
 return {ready,session,sync,init,get client(){return client},get config(){return config},enabled:()=>!!client}
})();