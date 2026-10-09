const test=require("node:test"),assert=require("node:assert/strict");
const handle=require("../routes/supabase-auth");
function env(initial){
 const db={users:initial.map(u=>({...u}))};let last;
 const ctx={send:(_,status,payload)=>{last={status,payload}},parseBody:async req=>req.body,load:()=>db,save:async()=>{},supabase:{getUserFromToken:async()=>({id:"auth-new",email:"same@example.test",email_confirmed_at:null,user_metadata:{name:"Injected",role:"admin",grade:5}})},pg:{upsertUser:async()=>{}},monitor:{warn:()=>{},info:()=>{}}};
 return {db,ctx,last:()=>last}
}
test("sync must never attach new Supabase UUID to an existing account with same email",async()=>{
 const e=env([{id:"old",authUserId:"auth-old",email:"same@example.test",role:"admin",name:"Owner"}]);
 await handle({method:"POST",body:{accessToken:"signed"}},null,"/api/auth/sync",e.ctx);
 assert.equal(e.last().status,200);assert.equal(e.db.users[0].authUserId,"auth-old");
 assert.equal(e.db.users[0].role,"admin");assert.equal(e.db.users.length,2);
 assert.equal(e.db.users[1].role,"student");
});
test("sync preserves edited name and grade against stale user metadata",async()=>{
 const e=env([{id:"old",authUserId:"auth-new",email:"same@example.test",role:"student",name:"Edited name",grade:3}]);
 await handle({method:"POST",body:{accessToken:"signed"}},null,"/api/auth/sync",e.ctx);
 assert.equal(e.last().status,200);assert.equal(e.db.users[0].name,"Edited name");
 assert.equal(e.db.users[0].grade,3);
});
