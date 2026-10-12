"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
function setup(fetchImpl){
 const store=new Map(),window={};
 const context={window,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  crypto:{randomUUID:()=>"abcdef00-0000-4000-a000-111111111111"},
  fetch:fetchImpl,AbortController,Date,Math,Promise,setTimeout,clearTimeout};
 vm.runInNewContext(read("js/api.js"),context,{filename:"js/api.js"});
 return window.API;
}
const okay=(body)=>({ok:true,status:200,json:async()=>body});
test("GET requests deduplicate in-flight calls and cache for the same session",async()=>{
 let calls=0;
 const api=setup(async(url,opts)=>{calls++;await new Promise(r=>setTimeout(r,8));return okay({owner:opts.headers.Authorization})});
 api.setToken("student-a");
 const three=await Promise.all([api.get("/api/profile/overview"),api.get("/api/profile/overview"),api.get("/api/profile/overview")]);
 assert.equal(calls,1);
 assert.ok(three.every(x=>x.owner==="Bearer student-a"));
 await api.get("/api/profile/overview");assert.equal(calls,1);
 api.setToken("student-b");
 const other=await api.get("/api/profile/overview");
 assert.equal(other.owner,"Bearer student-b");
 assert.equal(calls,2);
});
test("a mutation invalidates prior GET cache; unknown and sensitive paths are not cached",async()=>{
 let reads=0;
 const api=setup(async(url)=>{
  if(url==="/api/profile/overview"){reads++;return okay({version:reads})}
  return okay({ok:true});
 });
 api.setToken("student-a");
 assert.equal((await api.get("/api/profile/overview")).version,1);
 assert.equal((await api.get("/api/profile/overview")).version,1);
 await api.patch("/api/profile/details",{name:"A"});
 assert.equal((await api.get("/api/profile/overview")).version,2);
 let unknown=0;
 const other=setup(async()=>{unknown++;return okay({count:unknown})});
 other.setToken("admin-a");
 await other.get("/api/admin/users");await other.get("/api/admin/users");
 assert.equal(unknown,2);
});
test("failed GET response is neither memoized nor cached",async()=>{
 let calls=0;
 const api=setup(async()=>{calls++;return calls===1?{ok:false,status:503,json:async()=>({error:"offline"})}:okay({ok:true})});
 api.setToken("student-a");
 await assert.rejects(api.get("/api/profile/overview",{retries:0}),/offline/);
 assert.deepEqual(await api.get("/api/profile/overview",{retries:0}),{ok:true});
 assert.equal(calls,2);
});
test("deployment keeps authenticated APIs private and versioned scripts offline-safe",()=>{
 const vercel=JSON.parse(read("vercel.json"));
 assert.ok(vercel.headers.some(x=>x.source==="/api/:path*"&&x.headers.some(h=>h.value.includes("no-store"))));
 const sw=read("sw.js");
 assert.ok(sw.includes('u.searchParams.has("h")?cacheFirst(req)'));
 assert.ok(sw.includes('u.pathname.startsWith("/api/")'));
});
test("admin p95 reporting requires authentication and SQL list migrations exist",()=>{
 const server=read("server.js");
 assert.ok(server.includes('p==="/api/admin/performance"'));
 assert.ok(server.includes('requireUser(req,res,["admin"])'));
 assert.ok(server.includes("apiPerformance.track(req,res,p)"));
 const sql=read("db/migrations/008_fast_lists.sql");
 assert.ok(sql.includes("idx_results_user_time_id"));
 assert.ok(sql.includes("idx_notifications_user_time"));
});
