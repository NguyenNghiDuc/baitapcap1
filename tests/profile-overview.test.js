const test=require("node:test");
const assert=require("node:assert/strict");
const handle=require("../routes/profile-overview");
const user={id:"u-1",role:"student"};
function make(){
 const db={users:[{id:"u-1",authUserId:"supa-1",name:"Tên thật",email:"student@example.test",role:"student",grade:4}],results:[{userId:"u-1",score:80},{userId:"u-2",score:1}],demoTransactions:[]};
 const ctx={send:(_,status,payload)=>({status,payload}),parseBody:async req=>req.data,requireUser:async()=>user,load:()=>db,save:async()=>{}};
 return {db,ctx};
}
async function call(p,method,data){
 const {db,ctx}=make();let status,payload;
 ctx.send=(_,s,d)=>{status=s;payload=d};
 await handle({method,data},null,p,ctx);
 return {status,payload,db};
}
test("profile overview reads only authenticated student's real results",async()=>{
 const r=await call("/api/profile/overview","GET");
 assert.equal(r.status,200);
 assert.equal(r.payload.profile.name,"Tên thật");
 assert.equal(r.payload.progress.completed,1);
 assert.equal(r.payload.progress.average,80);
 assert.equal(r.payload.progress.streak,null);
});
test("profile update rejects invalid birthdate and phone",async()=>{
 assert.equal((await call("/api/profile/details","PATCH",{birthday:"bad-date"})).status,400);
 assert.equal((await call("/api/profile/details","PATCH",{birthday:"2025-02-30"})).status,400);
 assert.equal((await call("/api/profile/details","PATCH",{phone:"abc"})).status,400);
});
test("profile update stores supported fields but not forged role or email",async()=>{
 const r=await call("/api/profile/details","PATCH",{name:"Tên mới",phone:"0912345678",birthday:"2014-05-10",role:"admin",email:"admin@example.test"});
 assert.equal(r.status,200);
 assert.equal(r.db.users[0].name,"Tên mới");
 assert.equal(r.db.users[0].phone,"0912345678");
 assert.equal(r.db.users[0].role,"student");
 assert.equal(r.db.users[0].email,"student@example.test");
});

test("avatar path is restricted to the authenticated Supabase owner",async()=>{
 const path="supa-1/avatar.jpg";
 const bad=await call("/api/profile/avatar","PATCH",{path:"another-user/avatar.jpg"});
 assert.equal(bad.status,400);
 const own=await call("/api/profile/avatar","PATCH",{path});
 assert.equal(own.status,200);
 assert.equal(own.db.users[0].avatarPath,path);
});
