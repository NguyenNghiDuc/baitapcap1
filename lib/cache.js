let client=null;const mem=new Map();
async function redis(){if(!process.env.REDIS_URL)return null;if(client)return client;const Redis=require("ioredis");client=new Redis(process.env.REDIS_URL,{maxRetriesPerRequest:2,lazyConnect:true});if(client.status==="wait")await client.connect();return client}
function now(){return Date.now()}
async function get(key){if(process.env.REDIS_URL){try{const c=await redis(),v=await c.get("cache:"+key);return v?JSON.parse(v):null}catch{return null}}const x=mem.get(key);if(!x)return null;if(x.exp<now()){mem.delete(key);return null}return x.value}
async function set(key,value,ttlMs=30000){if(process.env.REDIS_URL){try{const c=await redis();await c.set("cache:"+key,JSON.stringify(value),"PX",ttlMs);return true}catch{return false}}mem.set(key,{value,exp:now()+ttlMs});return true}
async function del(key){if(process.env.REDIS_URL){try{const c=await redis();await c.del("cache:"+key)}catch{}}else mem.delete(key)}
async function remember(key,ttlMs,fn){const hit=await get(key);if(hit!==null)return hit;const value=await fn();await set(key,value,ttlMs);return value}
module.exports={get,set,del,remember};
