"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,".."),read=name=>fs.readFileSync(path.join(root,name),"utf8");
test("Supabase cached Admin session never reports Student while restoring, syncs only once",async()=>{
 let authCallback,posts=0;
 const session={access_token:"valid-token",user:{id:"admin-auth-uuid",email:"admin@example.test",user_metadata:{name:"Administrator"}}};
 const client={
  auth:{onAuthStateChange(cb){authCallback=cb;return {data:{subscription:{unsubscribe(){}}}}},async getSession(){authCallback("INITIAL_SESSION",session);return {data:{session}}}},
  storage:{from(){return {createSignedUrl:async()=>({data:null,error:null})}}}
 };
 const window={supabase:{createClient:()=>client},__btPublicConfigPromise:Promise.resolve({supabase:{enabled:true,url:"https://example.supabase.co",publishableKey:"public-key"}})};
 const reported=[];
 const API={token:"",setToken(t){this.token=t},async post(){
  posts++;
  await new Promise(resolve=>setTimeout(resolve,5));
  return {user:{id:"app-admin",authUserId:"admin-auth-uuid",name:"Administrator",email:"admin@example.test",role:"admin"}};
 }};
 const context={window,API,fetch:async()=>{throw Error("unexpected config request")},document:{},setTimeout,clearTimeout,console};
 vm.runInNewContext(read("js/auth/supabase-client.js"),context);
 await window.SupabaseApp.init(user=>reported.push(user));
 await new Promise(resolve=>setTimeout(resolve,35));
 assert.equal(reported[0].role,"pending");
 assert.ok(reported.every(user=>user===null||user.role!=="student"),"must not label Admin as Student");
 assert.equal(reported.at(-1).role,"admin");
 assert.equal(posts,1,"INITIAL_SESSION and getSession must share the same sync request");
 authCallback("SIGNED_OUT",null);
 assert.equal(reported.at(-1),null);
 assert.equal(API.token,"");
});
test("UI labels and rerenders server-verified roles; fallback remains supported",()=>{
 const app=read("js/app.js"),auth=read("js/auth/auth-ui.js"),html=read("index.html");
 assert.ok(app.includes('u?.pendingProfile?('));
 assert.ok(app.includes('before!==u?.role'));
 assert.ok(auth.includes('role:"pending",avatar:"👤",pendingProfile:true'));
 assert.ok(html.includes('<small id="sideRole">Khách</small>'));
});
test("JWT auth avoids Redis and startup skips migrations when current",()=>{
 const server=read("server.js"),pg=read("lib/postgres.js"),storage=read("lib/storage.js");
 const jwt=server.indexOf('t.split(".").length===3'),redis=server.indexOf('const ss=await sessionStore.get(t)',jwt);
 assert.ok(jwt>0&&redis>jwt);
 assert.ok(pg.includes("async function migrateIfNeeded()"));
 assert.ok(storage.includes("await pg.migrateIfNeeded()"));
});
