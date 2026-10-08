const VERSION="4.1.2",CORE="btcap1-core-"+VERSION,RUNTIME="btcap1-runtime-"+VERSION;
async function manifest(){try{const r=await fetch("/offline-manifest.json",{cache:"no-store"});if(r.ok)return await r.json()}catch{}return {coreAssets:["/","/index.html","/css/style.css","/js/app.js"],assets:[]}}
async function put(cacheName,req,res){if(!res||!res.ok)return res;const c=await caches.open(cacheName);await c.put(req,res.clone());return res}
async function networkFirst(req,{fallback="/index.html",timeout=3500}={}){
 const c=await caches.open(RUNTIME);let timer;
 try{
  const r=await Promise.race([fetch(req),new Promise((_,rej)=>timer=setTimeout(()=>rej(new Error("timeout")),timeout))]);clearTimeout(timer);await put(RUNTIME,req,r);return r
 }catch{clearTimeout(timer);return await c.match(req)||await caches.match(fallback)||new Response("Offline",{status:503})}
}
async function staleWhileRevalidate(req){
 const c=await caches.open(RUNTIME),cached=await c.match(req);const fresh=fetch(req).then(r=>put(RUNTIME,req,r)).catch(()=>null);return cached||await fresh||new Response("",{status:504})
}
async function cacheFirst(req){
 const c=await caches.open(RUNTIME),cached=await c.match(req);if(cached)return cached;try{return await put(RUNTIME,req,await fetch(req))}catch{return new Response("",{status:504})}
}
self.addEventListener("install",e=>e.waitUntil((async()=>{const m=await manifest(),c=await caches.open(CORE);await Promise.allSettled((m.coreAssets||[]).map(a=>c.add(a)));self.skipWaiting()})()));
self.addEventListener("activate",e=>e.waitUntil((async()=>{const ks=await caches.keys();await Promise.all(ks.filter(k=>k.startsWith("btcap1-")&&![CORE,RUNTIME].includes(k)).map(k=>caches.delete(k)));await self.clients.claim()})()));
self.addEventListener("fetch",e=>{
 const req=e.request;if(req.method!=="GET")return;const u=new URL(req.url);if(u.origin!==location.origin)return;
 if(u.pathname.startsWith("/api/"))return;
 if(req.mode==="navigate"){e.respondWith(networkFirst(req));return}
 const dest=req.destination;
 if(dest==="script"||dest==="style"||u.pathname.endsWith(".json")||u.pathname.endsWith(".webmanifest")){e.respondWith(staleWhileRevalidate(req));return}
 if(["image","font","audio"].includes(dest)){e.respondWith(cacheFirst(req));return}
 e.respondWith(staleWhileRevalidate(req))
});
self.addEventListener("message",e=>{if(e.data==="SKIP_WAITING")self.skipWaiting();if(e.data==="CLEAR_RUNTIME")e.waitUntil(caches.delete(RUNTIME))});
self.addEventListener("push",event=>{let d={title:"Bài Tập Cấp 1",body:"Bạn có thông báo mới",url:"/#notifications"};try{d={...d,...event.data.json()}}catch{}event.waitUntil(self.registration.showNotification(d.title,{body:d.body,icon:"/favicon.ico",data:{url:d.url}}))});
self.addEventListener("notificationclick",event=>{event.notification.close();const u=event.notification.data?.url||"/";event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(ws=>{for(const w of ws){if("focus" in w){w.navigate(u);return w.focus()}}return clients.openWindow?clients.openWindow(u):null}))});
