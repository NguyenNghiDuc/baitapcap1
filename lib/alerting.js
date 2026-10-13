"use strict";
const cooldowns=new Map();
const COOLDOWN_MS=5*60*1000;
function enabled(){return /^https:\/\//i.test(process.env.PERFORMANCE_ALERT_WEBHOOK_URL||"")}
function notify(event,details={}){
 if(!enabled())return false;
 const safeEvent=String(event||"incident").slice(0,60);
 const safeRoute=String(details.route||"unknown").replace(/\?.*$/,"").slice(0,130);
 const key=safeEvent+":"+safeRoute,now=Date.now();
 if((cooldowns.get(key)||0)>now)return false;
 if(cooldowns.size>500)for(const [k,v] of cooldowns)if(v<now)cooldowns.delete(k);
 cooldowns.set(key,now+COOLDOWN_MS);
 const payload={service:"baitapcap1",event:safeEvent,route:safeRoute,at:new Date(now).toISOString(),
  status:Number(details.status)||null,latencyMs:Math.max(0,Number(details.ms)||0)};
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);
 fetch(process.env.PERFORMANCE_ALERT_WEBHOOK_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:controller.signal})
  .catch(()=>{}).finally(()=>clearTimeout(timer));
 return true;
}
module.exports={notify,enabled};
