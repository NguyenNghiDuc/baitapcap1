window.WebVitalsLite=(()=>{
 const sent=new Set(),sample=Math.random()<(Number(localStorage.getItem("bt_vitals_sample")||1));
 function send(name,value,rating=""){if(!sample||!Number.isFinite(value)||sent.has(name))return;sent.add(name);const body=JSON.stringify({name,value,rating,path:location.pathname+location.hash,device:innerWidth<700?"mobile":"desktop"});if(navigator.sendBeacon){const blob=new Blob([body],{type:"application/json"});navigator.sendBeacon("/api/metrics",blob)}else fetch("/api/metrics",{method:"POST",headers:{"Content-Type":"application/json"},body,keepalive:true}).catch(()=>{})}
 function rate(name,v){if(name==="CLS")return v<=.1?"good":v<=.25?"needs-improvement":"poor";if(name==="LCP")return v<=2500?"good":v<=4000?"needs-improvement":"poor";if(name==="INP")return v<=200?"good":v<=500?"needs-improvement":"poor";return ""}
 function init(){
  try{const nav=performance.getEntriesByType("navigation")[0];if(nav)send("TTFB",nav.responseStart)}
  catch{}
  try{for(const p of performance.getEntriesByType("paint"))if(p.name==="first-contentful-paint")send("FCP",p.startTime)}catch{}
  try{let lcp=0;const o=new PerformanceObserver(list=>{for(const e of list.getEntries())lcp=Math.max(lcp,e.startTime)});o.observe({type:"largest-contentful-paint",buffered:true});addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"){send("LCP",lcp,rate("LCP",lcp));o.disconnect()}},{once:true})}catch{}
  try{let cls=0;const o=new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)cls+=e.value});o.observe({type:"layout-shift",buffered:true});addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"){send("CLS",cls,rate("CLS",cls));o.disconnect()}},{once:true})}catch{}
  try{let inp=0;const o=new PerformanceObserver(list=>{for(const e of list.getEntries())if(e.interactionId)inp=Math.max(inp,e.duration)});o.observe({type:"event",durationThreshold:40,buffered:true});addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"){send("INP",inp,rate("INP",inp));o.disconnect()}},{once:true})}catch{}
 }
 return {init}
})();window.addEventListener("load",()=>window.WebVitalsLite.init(),{once:true});