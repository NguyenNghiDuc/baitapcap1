let client=null;
const memory=new Map();
async function connect(){
 if(!process.env.REDIS_URL)return null;
 const Redis=require("ioredis");client=new Redis(process.env.REDIS_URL,{maxRetriesPerRequest:2,lazyConnect:true});
 if(client.status==="wait")await client.connect();
 await client.ping();return client;
}
async function set(token,value,ttlMs){if(process.env.REDIS_URL){if(!client)await connect();await client.set("session:"+token,JSON.stringify(value),"PX",ttlMs)}else memory.set(token,value)}
async function get(token){if(process.env.REDIS_URL){if(!client)await connect();const v=await client.get("session:"+token);return v?JSON.parse(v):null}return memory.get(token)||null}
async function del(token){if(process.env.REDIS_URL){if(!client)await connect();await client.del("session:"+token)}else memory.delete(token)}
async function health(){if(!process.env.REDIS_URL)return {enabled:false};if(!client)await connect();return {enabled:true,ping:await client.ping()}}
module.exports={connect,set,get,del,health};