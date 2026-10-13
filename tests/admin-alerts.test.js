"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const handler=require("../routes/admin-alerts");
const {assess}=handler;
async function request(opts={}){
 let sent,checked=false;
 const ctx={
  send:(res,code,payload,headers)=>{sent={code,payload,headers}},
  requireUser:async(req,res,roles)=>{checked=true;assert.deepEqual(roles,["admin"]);if(!opts.auth){sent={code:401,payload:{error:"Login"}};return null}return {id:"admin",role:"admin"}},
  pg:{health:async()=>opts.db||{enabled:false}},sessionStore:{health:async()=>opts.redis||{enabled:false}},
  apiPerformance:{summary:()=>opts.perf||{sampleCount:0,windowMinutes:15,routes:[]}}
 };
 const handled=await handler({method:opts.method||"GET"},{},opts.path||"/api/admin/alerts",ctx);
 return {sent,handled,checked};
}
test("unauthenticated guests cannot read operational alerts",async()=>{
 const r=await request();assert.equal(r.handled,true);assert.equal(r.checked,true);assert.equal(r.sent.code,401);
 const other=await request({path:"/api/public/health"});assert.equal(other.handled,false);
});
test("route is read-only and response has private no-store caching",async()=>{
 const post=await request({auth:true,method:"POST"});assert.equal(post.sent.code,405);
 assert.equal(post.sent.headers["Cache-Control"],"private, no-store");
 const get=await request({auth:true});
 assert.equal(get.sent.code,200);assert.equal(get.sent.payload.scope,"current-server-instance");
 assert.equal(get.sent.headers["Cache-Control"],"private, no-store");
});
test("only meaningful errors or repeated slow calls raise alerts",()=>{
 const p={routes:[
  {route:"GET /api/healthy",calls:8,p95Ms:500,errors:0},
  {route:"GET /api/slow",calls:6,p95Ms:1900,errors:0},
  {route:"POST /api/fail",calls:2,p95Ms:300,errors:1},
  {route:"GET /api/isolated",calls:1,p95Ms:9000,errors:0}
 ]};
 const alerts=assess({db:{enabled:true},redis:{enabled:true},dbConfigured:true,redisConfigured:true,performance:p});
 assert.ok(alerts.some(x=>x.id==="slow-GET /api/slow"&&x.severity==="warning"));
 assert.ok(alerts.some(x=>x.id==="error-POST /api/fail"&&x.severity==="critical"));
 assert.ok(!alerts.some(x=>x.id.includes("isolated")));
 assert.ok(!alerts.some(x=>x.id.includes("healthy")));
});
test("configured failed database is critical; optional missing Redis is only information",()=>{
 const alerts=assess({db:{enabled:true,error:"disconnect"},redis:{enabled:false},dbConfigured:true,redisConfigured:false,performance:{routes:[]},isVercel:true});
 assert.ok(alerts.some(x=>x.id==="postgres-unavailable"&&x.severity==="critical"));
 assert.ok(alerts.some(x=>x.id==="redis-not-configured"&&x.severity==="info"));
 assert.ok(!alerts.some(x=>x.id==="postgres-not-configured"));
});
