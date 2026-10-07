window.SupabaseRealtime=(()=>{
 const entries=new Set();let disposed=false;
 async function client(){await window.SupabaseApp.ready();if(!window.SupabaseApp.client)throw new Error("Supabase Realtime chưa cấu hình");return window.SupabaseApp.client}
 function delay(ms){return new Promise(r=>setTimeout(r,ms))}
 async function connect(entry){
  if(disposed||entry.closed)return null;const c=await client(),{table,event="*",filter,onChange,channelName}=entry.spec,name=channelName||("bt-"+table+"-"+Math.random().toString(36).slice(2));
  if(entry.channel)await c.removeChannel(entry.channel).catch(()=>{});
  let ch=c.channel(name).on("postgres_changes",{event,schema:"public",table,...(filter?{filter}:{})},p=>onChange?.(p));
  entry.channel=ch;return new Promise((resolve,reject)=>{
   let done=false;const timer=setTimeout(()=>{if(!done){done=true;reject(new Error("Realtime subscribe timeout"))}},8000);
   ch.subscribe(async status=>{
    if(status==="SUBSCRIBED"){clearTimeout(timer);done=true;entry.tries=0;resolve(ch)}
    else if(["CHANNEL_ERROR","TIMED_OUT","CLOSED"].includes(status)&&!entry.closed&&!disposed){
     clearTimeout(timer);if(!done){done=true;reject(new Error("Realtime "+status.toLowerCase()))}
     entry.tries=(entry.tries||0)+1;const wait=Math.min(15000,800*Math.pow(2,Math.min(entry.tries,4)));await delay(wait);if(!entry.closed&&!disposed&&navigator.onLine)connect(entry).catch(()=>{})
    }
   })
  })
 }
 async function subscribe(spec){disposed=false;const entry={spec,channel:null,closed:false,tries:0};entries.add(entry);return connect(entry)}
 async function unsubscribeAll(){disposed=true;const c=await client().catch(()=>null);const all=[...entries];entries.clear();await Promise.all(all.map(async e=>{e.closed=true;if(c&&e.channel)await c.removeChannel(e.channel).catch(()=>{})}))}
 window.addEventListener("online",()=>{for(const e of entries)if(!e.closed&&!e.channel)connect(e).catch(()=>{})});
 return {subscribe,unsubscribeAll}
})();