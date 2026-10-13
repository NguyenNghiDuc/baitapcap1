"use strict";
// Only cache PUBLIC/SHARED derived data with non-PII keys. Do not store authenticated
// user profiles, grades or tokens in shared Redis cache.
let redisClient=null,connecting=null;
const memory=new Map(),flights=new Map(),MAX_ENTRIES=300,KEY_PREFIX="btcap1:cache:";
function now(){return Date.now()}
function ttl(v){return Math.min(600000,Math.max(1000,Number(v)||30000))}
function localGet(key){const x=memory.get(key);if(!x)return null;if(x.until<=now()){memory.delete(key);return null}return x.value}
function localSet(key,value,ms){if(memory.size>=MAX_ENTRIES)memory.delete(memory.keys().next().value);memory.set(key,{value,until:now()+ms})}
async function redis(){
 if(!process.env.REDIS_URL)return null;
 if(redisClient&&redisClient.status==="ready")return redisClient;
 if(connecting)return connecting;
 connecting=(async()=>{
  const Redis=require("ioredis"),c=redisClient||new Redis(process.env.REDIS_URL,{
   lazyConnect:true,maxRetriesPerRequest:1,enableOfflineQueue:false,
   connectTimeout:1500,retryStrategy:attempt=>attempt<=2?Math.min(1000,150*attempt):null
  });
  redisClient=c;c.on("error",()=>{});
  if(c.status==="wait")await c.connect();
  if(c.status!=="ready")throw new Error("Redis chưa sẵn sàng");
  return c;
 })().finally(()=>{connecting=null});
 return connecting;
}
async function get(key){
 const local=localGet(key);if(local!==null)return local;
 if(!process.env.REDIS_URL)return null;
 try{const c=await redis(),raw=await c.get(KEY_PREFIX+key);return raw===null?null:JSON.parse(raw)}
 catch{return null}
}
async function set(key,value,ttlMs=30000){
 const ms=ttl(ttlMs);localSet(key,value,ms);
 if(!process.env.REDIS_URL)return true;
 try{const c=await redis();await c.set(KEY_PREFIX+key,JSON.stringify(value),"PX",ms);return true}
 catch{return false}
}
async function del(key){
 memory.delete(key);
 if(process.env.REDIS_URL)try{(await redis()).del(KEY_PREFIX+key).catch(()=>{})}catch{}
}
async function remember(key,ttlMs,fn){
 const cached=await get(key);if(cached!==null)return cached;
 if(flights.has(key))return flights.get(key);
 const pending=Promise.resolve().then(fn).then(async result=>{await set(key,result,ttlMs);return result})
  .finally(()=>{if(flights.get(key)===pending)flights.delete(key)});
 flights.set(key,pending);return pending;
}
function stats(){return {redisConfigured:!!process.env.REDIS_URL,redisConnected:redisClient?.status==="ready",memoryEntries:memory.size,inflight:flights.size}}
module.exports={get,set,del,remember,stats};