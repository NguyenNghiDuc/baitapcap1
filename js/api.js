// Browser-local device identifier, never an authentication credential.
function getDeviceId(){
 if(window.__btDeviceId)return window.__btDeviceId;
 try{
  const key="bt_client_device_id";let id=localStorage.getItem(key);
  if(!/^[A-Za-z0-9_-]{12,100}$/.test(id||"")){
   id="btdev_"+(crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,"0")).join(""));
   localStorage.setItem(key,id);
  }
  return window.__btDeviceId=id;
 }catch{return window.__btDeviceId="btdev_"+Math.random().toString(36).slice(2)+Date.now().toString(36)}
}
window.API={
 token:localStorage.getItem("bt_token")||"",
 inflight:new Map(),pending:new Map(),cache:new Map(),generation:0,requestSeq:0,
 // Short-lived memory cache ONLY. Never persist a student's response in storage or the service worker.
 ttl(path){
  if(path==="/api/app/version")return 300000;
  if(!this.token)return 0;
  if(path==="/api/profile/overview")return 8000;
  if(path==="/api/student/sync")return 5000;
  if(path.startsWith("/api/results?")||path==="/api/results")return 8000;
  if(path.startsWith("/api/notifications?")||path==="/api/notifications")return 8000;
  if(path.startsWith("/api/admin/results?"))return 5000;
  return 0;
 },
 invalidate(){
  this.generation++;this.cache.clear();this.pending.clear();
 },
 async request(path,options={}){
  const method=(options.method||"GET").toUpperCase();
  const dedupe=method==="GET"&&!options.signal&&!options.headers&&!options.noDedupe;
  const key=method+":"+path;
  const cacheKey=this.generation+":"+key;
  const ttl=dedupe&&!options.noCache?this.ttl(path):0;
  const cached=ttl?this.cache.get(cacheKey):null;
  if(cached&&cached.exp>Date.now())return cached.data;
  if(dedupe&&options.cancelPrevious!==true&&this.pending.has(cacheKey))return this.pending.get(cacheKey);
  const retries=options.retries??(method==="GET"?2:0),timeout=options.timeout??15000;
  const generation=this.generation,token=this.token;
  const run=async()=>{
   let lastErr;
   for(let attempt=0;attempt<=retries;attempt++){
    const ctrl=new AbortController(),id=dedupe?cacheKey:key+":"+(++this.requestSeq);
    let timedOut=false;
    const timer=setTimeout(()=>{timedOut=true;ctrl.abort()},timeout);
    const external=options.signal;
    const cancel=()=>ctrl.abort();
    if(external){if(external.aborted)ctrl.abort();else external.addEventListener("abort",cancel,{once:true})}
    if(options.cancelPrevious===true&&this.inflight.has(id))this.inflight.get(id).abort();
    this.inflight.set(id,ctrl);
    const headers={"X-Client-Device-ID":getDeviceId(),...(options.body?{"Content-Type":"application/json"}:{}),...(options.headers||{})};
    if(token)headers.Authorization="Bearer "+token;
    try{
     const {signal:ignored,...requestOptions}=options;
     const r=await fetch(path,{...requestOptions,method,headers,signal:ctrl.signal});
     let json={};try{json=await r.json()}catch{}
     if(!r.ok){const error=new Error(json.error||("Yêu cầu thất bại ("+r.status+")"));error.status=r.status;throw error}
     if(ttl&&generation===this.generation&&this.token===token){
      if(this.cache.size>=60)this.cache.delete(this.cache.keys().next().value);
      this.cache.set(cacheKey,{data:json,exp:Date.now()+ttl});
     }
     return json;
    }catch(e){
     lastErr=e;
     // Navigation, logout and explicit cancellation must never be retried.
     if((ctrl.signal.aborted&&!timedOut)||external?.aborted)throw e;
     const retryable=attempt<retries&&(timedOut||(!e.status&&e.name!=="AbortError")||e.status>=500||e.status===429);
     if(!retryable)throw e;
     await new Promise(resolve=>setTimeout(resolve,Math.min(1500,250*Math.pow(2,attempt))));
    }finally{
     clearTimeout(timer);
     if(external)external.removeEventListener("abort",cancel);
     if(this.inflight.get(id)===ctrl)this.inflight.delete(id);
    }
   }
   throw lastErr;
  };
  const task=run();
  if(dedupe){
   this.pending.set(cacheKey,task);
   task.finally(()=>{if(this.pending.get(cacheKey)===task)this.pending.delete(cacheKey)}).catch(()=>{});
  }
  return task;
 },
 abortAll(){for(const c of this.inflight.values())c.abort();this.inflight.clear();this.pending.clear()},
 setToken(token){
  const next=token||"";
  if(next!==this.token){this.abortAll();this.invalidate()}
  this.token=next;
  if(next)localStorage.setItem("bt_token",next);else localStorage.removeItem("bt_token");
 },
 get(p,o={}){return this.request(p,{...o,method:"GET"})},
 post(p,d,o={}){this.invalidate();return this.request(p,{...o,method:"POST",body:JSON.stringify(d)})},
 patch(p,d,o={}){this.invalidate();return this.request(p,{...o,method:"PATCH",body:JSON.stringify(d)})},
 delete(p,o={}){this.invalidate();return this.request(p,{...o,method:"DELETE"})}
};