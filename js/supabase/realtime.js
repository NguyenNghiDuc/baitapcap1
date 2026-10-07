window.SupabaseRealtime=(()=>{
 let channels=[];
 async function client(){await window.SupabaseApp.ready();if(!window.SupabaseApp.client)throw new Error("Supabase Realtime chưa cấu hình");return window.SupabaseApp.client}
 async function subscribe({table,event="*",filter,onChange,channelName}){
  const c=await client();const name=channelName||("bt-"+table+"-"+Math.random().toString(36).slice(2));
  let ch=c.channel(name).on("postgres_changes",{event,schema:"public",table,...(filter?{filter}:{})},payload=>onChange?.(payload));
  const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("Realtime subscribe timeout")),8000);ch=ch.subscribe(status=>{if(status==="SUBSCRIBED"){clearTimeout(timer);resolve(ch)}else if(status==="CHANNEL_ERROR"){clearTimeout(timer);reject(new Error("Realtime channel error"))}})});
  channels.push(result);return result
 }
 async function unsubscribeAll(){const c=await client().catch(()=>null);if(!c)return;await Promise.all(channels.map(ch=>c.removeChannel(ch).catch(()=>{})));channels=[]}
 return {subscribe,unsubscribeAll}
})();