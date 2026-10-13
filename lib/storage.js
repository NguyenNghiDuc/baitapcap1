"use strict";
const fs=require("fs"),path=require("path"),pg=require("./postgres");
const {validateLegacy}=require("./app-state-merge");
const ROOT=path.join(__dirname,".."),DB_PATH=path.join(ROOT,"data","db.json");
function empty(){return {users:[],classes:[],assignments:[],submissions:[],results:[],notifications:[],materials:[],audit:[],subscriptions:[],feedback:[],questionBank:[],examRooms:[],pushSubscriptions:[],examDrafts:[],loginDevices:[]}}
const clone=value=>JSON.parse(JSON.stringify(value));
let cache=empty(),baseline=clone(cache),chain=Promise.resolve(),mode="json",saveError=null;
function json(){try{return Object.assign(empty(),JSON.parse(fs.readFileSync(DB_PATH,"utf8")))}catch{return empty()}}
async function init(){
 if(process.env.DATABASE_URL){
  await pg.connect();await pg.migrateIfNeeded();
  const remote=await pg.loadAppState();
  if(remote&&Object.keys(remote).length)cache=Object.assign(empty(),remote);
  else{cache=json();await pg.saveAppState(cache)}
  mode="supabase";console.log("[storage] Supabase PostgreSQL active");
 }else{cache=json();mode="json";console.log("[storage] JSON fallback active")}
 baseline=clone(cache);chain=Promise.resolve();saveError=null;
 return cache;
}
function load(){return cache}
function save(db){
 const snapshot=clone(Object.assign(empty(),db||{}));
 if(mode==="supabase"&&process.env.DATABASE_URL){
  // Reject grade modifications synchronously, before acknowledging a legacy route.
  try{validateLegacy(baseline,snapshot)}catch(error){
   // A legacy handler may already have mutated the shared in-memory object.
   // Revert it immediately; a failed validation must not expose a fake grade.
   cache=Object.assign(empty(),clone(baseline));
   throw error;
  }
  const before=baseline;
  baseline=clone(snapshot);cache=Object.assign(empty(),snapshot);
  // Queue only deltas. A row lock merges them into the latest remote snapshot.
  chain=chain.then(()=>pg.saveLegacyAppState(before,snapshot))
   .then(()=>{saveError=null})
   .catch(error=>{
    saveError=error;
    console.error("[supabase-save]",String(error.message||error).slice(0,160));
   });
 }else{
  cache=Object.assign(empty(),snapshot);baseline=clone(snapshot);
  fs.mkdirSync(path.dirname(DB_PATH),{recursive:true});
  fs.writeFileSync(DB_PATH,JSON.stringify(snapshot,null,2));
 }
}
// Adopt a successful grading transaction, which already committed to PostgreSQL.
function adopt(db){cache=Object.assign(empty(),db||{});baseline=clone(cache);return cache}
async function flush(){
 await chain;
 if(saveError)throw Error("A pending PostgreSQL snapshot write failed");
}
function status(){return {mode,database:mode==="supabase"?"supabase-postgres":"json"}}
module.exports={init,load,save,flush,adopt,status,empty};
