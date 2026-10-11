const test=require("node:test");
const assert=require("node:assert/strict");
const presence=require("../lib/presence");

test("presence tracks concurrent tabs: offline only after last active tab exits",async()=>{
 const db=process.env.DATABASE_URL,vercel=process.env.VERCEL;
 delete process.env.DATABASE_URL;delete process.env.VERCEL;
 try{
  presence.reset();
  assert.equal(await presence.touch("studentA","session_A_123456789",true),true);
  assert.equal(await presence.touch("studentA","session_B_123456789",true),true);
  assert.equal(await presence.touch("studentB","session_C_123456789",true),true);
  let v=await presence.overview(["studentA","studentB","studentC"]);
  assert.equal(v.available,true);assert.equal(v.onlineTotal,2);
  assert.equal(v.users[0].online,true);assert.equal(v.users[2].online,false);
  assert.equal(typeof v.users[0].lastSeenAt,"string");
  await presence.touch("studentA","session_A_123456789",false);
  v=await presence.overview(["studentA"]);
  assert.equal(v.users[0].online,true);
  await presence.touch("studentA","session_B_123456789",false);
  v=await presence.overview(["studentA"]);
  assert.equal(v.users[0].online,false);
  assert.ok(v.users[0].lastSeenAt);
 }finally{
  presence.reset();if(db===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=db;
  if(vercel===undefined)delete process.env.VERCEL;else process.env.VERCEL=vercel;
 }
});
test("Vercel without shared PostgreSQL never pretends online/offline is reliable",async()=>{
 const db=process.env.DATABASE_URL,vercel=process.env.VERCEL;
 delete process.env.DATABASE_URL;process.env.VERCEL="1";
 try{
  assert.equal(presence.available(),false);
  assert.equal(await presence.touch("x","session_987654321012345",true),false);
  assert.deepEqual(await presence.overview(["x"]),{available:false,users:[],onlineTotal:null});
 }finally{
  if(db===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=db;
  if(vercel===undefined)delete process.env.VERCEL;else process.env.VERCEL=vercel;
 }
});
