"use strict";
// Process-local rolling API latency samples. No payloads, tokens, emails or query strings.
const alerts=require("./alerting");
const MAX_SAMPLES=1200,WINDOW_MS=15*60*1000;
const samples=[];
function track(req,res,route){
 if(!route.startsWith("/api/")||route==="/api/metrics"||route==="/api/client-errors")return;
 const started=process.hrtime.bigint();
 const path=route.replace(/\/[0-9a-f]{8}-[0-9a-f-]{20,}/gi,"/:id");
 res.once("finish",()=>{
  const ms=Math.max(0,Number(process.hrtime.bigint()-started)/1e6);
  const status=res.statusCode||200;
  samples.push({path,method:req.method||"GET",ms:Math.round(ms),status,at:Date.now()});
  if(samples.length>MAX_SAMPLES)samples.splice(0,samples.length-MAX_SAMPLES);
  const threshold=Math.max(100,Number(process.env.API_SLOW_MS||900));
  if(ms>=threshold)console.warn("[api:slow]",Math.round(ms)+"ms",status,req.method,path);
  if(status>=500)alerts.notify("api_error",{route:path,status,ms});
  else if(ms>=Math.max(threshold,Number(process.env.API_ALERT_THRESHOLD_MS||1800)))alerts.notify("slow_api",{route:path,status,ms});
 });
}
function summary(){
 const now=Date.now(),recent=samples.filter(s=>now-s.at<=WINDOW_MS);
 const threshold=Math.max(100,Number(process.env.API_SLOW_MS||900));
 const groups=new Map();
 for(const s of recent){
  const k=s.method+" "+s.path,g=groups.get(k)||{route:k,calls:0,errors:0,slow:0,totalMs:0,maxMs:0,latencies:[]};
  g.calls++;g.totalMs+=s.ms;g.maxMs=Math.max(g.maxMs,s.ms);
  if(s.status>=500)g.errors++;
  if(s.ms>=threshold)g.slow++;
  g.latencies.push(s.ms);groups.set(k,g);
 }
 const routes=[...groups.values()].map(g=>{
  const sorted=g.latencies.sort((a,b)=>a-b),p95=sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(sorted.length*.95)-1))]||0;
  return {route:g.route,calls:g.calls,errors:g.errors,slow:g.slow,avgMs:Math.round(g.totalMs/g.calls),p95Ms:p95,maxMs:g.maxMs};
 }).sort((a,b)=>b.p95Ms-a.p95Ms||b.calls-a.calls).slice(0,30);
 return {windowMinutes:15,scope:"current-server-instance",sampleCount:recent.length,slowThresholdMs:threshold,routes,generatedAt:new Date(now).toISOString()};
}
module.exports={track,summary};
