window.RuntimeGuard=(()=>{
 let disabled=new Set(),readyPromise=null;
 function ready(){if(readyPromise)return readyPromise;readyPromise=fetch("/api/public-config",{cache:"no-store"}).then(r=>r.json()).then(j=>{disabled=new Set(j.features?.disabled||[]);return true}).catch(()=>false);return readyPromise}
 function enabled(route){return !disabled.has(route)}
 function capture(error,context={}){try{const body=JSON.stringify({message:String(error?.message||error||"Unknown error").slice(0,500),stack:String(error?.stack||"").slice(0,3000),route:context.route||location.hash.slice(1)||"home",path:location.pathname+location.hash,ua:navigator.userAgent.slice(0,300)});navigator.sendBeacon?.("/api/client-errors",new Blob([body],{type:"application/json"}))}catch{}}
 function renderError(error,route){capture(error,{route});const box=document.querySelector("#content");if(box)box.innerHTML=`<div class="empty large"><h2>⚠️ Chức năng này đang tạm lỗi</h2><p>${String(error?.message||"Có lỗi xảy ra").replace(/[<>]/g,"")}</p><button class="primary" onclick="location.hash='home'">Về trang chủ</button></div>`}
 window.addEventListener("error",e=>capture(e.error||e.message,{route:location.hash.slice(1)}));
 window.addEventListener("unhandledrejection",e=>capture(e.reason,{route:location.hash.slice(1)}));
 ready();
 return {ready,enabled,renderError,capture}
})();