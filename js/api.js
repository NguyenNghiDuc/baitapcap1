// Browser-local identifier for the account's device history. Not an auth credential.
function getDeviceId(){
 if(window.__btDeviceId)return window.__btDeviceId;
 try{
  const key="bt_client_device_id";
  let id=localStorage.getItem(key);
  if(!/^[A-Za-z0-9_-]{12,100}$/.test(id||"")){
   id="btdev_"+(crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,"0")).join(""));
   localStorage.setItem(key,id);
  }
  return window.__btDeviceId=id;
 }catch{
  return window.__btDeviceId="btdev_"+Math.random().toString(36).slice(2)+Date.now().toString(36);
 }
}
window.API={
 token:localStorage.getItem("bt_token")||"",
 inflight:new Map(),
 async request(path,options={}){
  const method=(options.method||"GET").toUpperCase(),key=options.key||method+":"+path,retries=options.retries??(method==="GET"?2:0),timeout=options.timeout??15000;
  if(options.cancelPrevious!==false&&this.inflight.has(key))this.inflight.get(key).abort();
  let lastErr;
  for(let attempt=0;attempt<=retries;attempt++){
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);this.inflight.set(key,ctrl);
   const headers={"X-Client-Device-ID":getDeviceId(),...(options.body?{"Content-Type":"application/json"}:{}),...(options.headers||{})};if(this.token)headers.Authorization="Bearer "+this.token;
   try{
    const r=await fetch(path,{...options,headers,signal:options.signal||ctrl.signal});let j={};try{j=await r.json()}catch{}
    if(!r.ok){const e=new Error(j.error||("Yêu cầu thất bại ("+r.status+")"));e.status=r.status;throw e}
    return j
   }catch(e){
    lastErr=e;if(e.name==="AbortError"&&options.signal?.aborted)throw e;
    const retryable=attempt<retries&&(e.name==="AbortError"||!e.status||e.status>=500||e.status===429);
    if(!retryable)throw e;await new Promise(r=>setTimeout(r,300*Math.pow(2,attempt)))
   }finally{clearTimeout(timer);if(this.inflight.get(key)===ctrl)this.inflight.delete(key)}
  }
  throw lastErr
 },
 abortAll(){for(const c of this.inflight.values())c.abort();this.inflight.clear()},
 setToken(t){this.token=t||"";if(t)localStorage.setItem("bt_token",t);else localStorage.removeItem("bt_token")},
 get(p,o={}){return this.request(p,{...o,method:"GET"})},
 post(p,d,o={}){return this.request(p,{...o,method:"POST",body:JSON.stringify(d)})},
 patch(p,d,o={}){return this.request(p,{...o,method:"PATCH",body:JSON.stringify(d)})},
 delete(p,o={}){return this.request(p,{...o,method:"DELETE"})}
};