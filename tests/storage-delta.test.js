"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const pg=require("../lib/postgres"),{mergeAppState}=require("../lib/app-state-merge");
function snapshot(){return {users:[{id:"stu",name:"Học sinh"}],
 submissions:[{id:"s",score:70,gradedAt:"2026-10-13"}],gradeReviews:[],audit:[],notifications:[]}}
test("legacy storage queues only field-level deltas and uses transaction-safe PostgreSQL persistence",async()=>{
 const old={connect:pg.connect,migrateIfNeeded:pg.migrateIfNeeded,loadAppState:pg.loadAppState,
  saveLegacyAppState:pg.saveLegacyAppState},oldUrl=process.env.DATABASE_URL;
 let remote=snapshot(),calls=[];
 const storagePath=require.resolve("../lib/storage");
 const wasCached=require.cache[storagePath];
 try{
  process.env.DATABASE_URL="postgres://mock.invalid/test";
  pg.connect=async()=>({});pg.migrateIfNeeded=async()=>true;
  pg.loadAppState=async()=>JSON.parse(JSON.stringify(remote));
  pg.saveLegacyAppState=async(base,next)=>{
   calls.push({base,next});remote=mergeAppState(base,next,remote);return true;
  };
  delete require.cache[storagePath];
  const storage=require("../lib/storage");
  await storage.init();
  const cached=storage.load();cached.users[0].name="Mới";
  storage.save(cached);
  // A different worker approves a grade before the queued save finishes.
  remote.submissions[0].score=90;remote.gradeReviews.push({id:"r",status:"approved"});
  await storage.flush();
  assert.equal(calls.length,1);
  assert.equal(remote.users[0].name,"Mới");
  assert.equal(remote.submissions[0].score,90);
  assert.equal(remote.gradeReviews[0].status,"approved");
  // The old path must reject a direct grade modification before reporting success.
  storage.load().submissions[0].score=50;
  assert.throws(()=>storage.save(storage.load()),/API chấm\/duyệt điểm/);
  assert.equal(storage.load().submissions[0].score,70,"Rejected legacy edit must not leak through local read cache");
 }finally{
  for(const [key,value] of Object.entries(old))pg[key]=value;
  if(oldUrl===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=oldUrl;
  delete require.cache[storagePath];
  if(wasCached)require.cache[storagePath]=wasCached;
 }
});
test("failed background PostgreSQL write makes flush fail closed",async()=>{
 const previous={connect:pg.connect,migrateIfNeeded:pg.migrateIfNeeded,loadAppState:pg.loadAppState,
  saveLegacyAppState:pg.saveLegacyAppState},url=process.env.DATABASE_URL;
 const storagePath=require.resolve("../lib/storage"),oldCache=require.cache[storagePath];
 try{
  process.env.DATABASE_URL="postgres://mock.invalid/test";
  pg.connect=async()=>({});pg.migrateIfNeeded=async()=>true;
  pg.loadAppState=async()=>snapshot();
  pg.saveLegacyAppState=async()=>{throw Error("Database offline")};
  delete require.cache[storagePath];
  const store=require("../lib/storage");await store.init();
  const d=store.load();d.users[0].name="Changed";store.save(d);
  await assert.rejects(()=>store.flush(),/pending PostgreSQL snapshot write failed/);
 }finally{
  Object.assign(pg,previous);
  if(url===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=url;
  delete require.cache[storagePath];if(oldCache)require.cache[storagePath]=oldCache;
 }
});
