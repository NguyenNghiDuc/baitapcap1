"use strict";
let client=null,connecting=null;
const memory=new Map();
async function connect(){
 if(!process.env.REDIS_URL)return null;
 if(client?.status==="ready")return client;
 if(connecting)return connecting;
 connecting=(async()=>{
  const Redis=require("ioredis");
  const c=client||new Redis(process.env.REDIS_URL,{
   maxRetriesPerRequest:1,lazyConnect:true,enableOfflineQueue:false,connectTimeout:1800,commandTimeout:2500,
   retryStrategy:n=>n<=2?Math.min(1000,200*n):null
  });
  client=c;c.on("error",()=>{});
  if(c.status==="wait")await c.connect();
  if(c.status!=="ready")throw new Error("Redis phiên đăng nhập chưa sẵn sàng");
  return c;
 })().finally(()=>{connecting=null});
 return connecting;
}
async function set(token,value,ttlMs){
 if(process.env.REDIS_URL){const c=await connect();await c.set("session:"+token,JSON.stringify(value),"PX",ttlMs)}
 else memory.set(token,value);
}
async function get(token){
 if(process.env.REDIS_URL){const c=await connect(),value=await c.get("session:"+token);return value?JSON.parse(value):null}
 return memory.get(token)||null;
}
async function del(token){
 if(process.env.REDIS_URL){const c=await connect();await c.del("session:"+token)}
 else memory.delete(token);
}
async function health(){
 if(!process.env.REDIS_URL)return {enabled:false};
 try{return {enabled:true,ping:await (await connect()).ping()}}
 catch(e){return {enabled:true,error:e.message}}
}
module.exports={connect,set,get,del,health};
