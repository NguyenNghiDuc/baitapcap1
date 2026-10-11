"use strict";
const pg=require("./postgres");
const STALE_MS=120000;
const RETAIN_MS=30*86400000;
const local=new Map();
function available(){return !!process.env.DATABASE_URL||process.env.VERCEL!=="1"}
function stamp(value){const n=Date.parse(value);return Number.isFinite(n)?n:0}
async function touch(userId,sessionId,active){
 if(!available())return false;
 const now=new Date();
 if(process.env.DATABASE_URL){
  await pg.query(`INSERT INTO user_presence(user_id,session_id,last_seen_at,active) VALUES($1,$2,now(),$3)
   ON CONFLICT(user_id,session_id) DO UPDATE SET last_seen_at=now(),active=EXCLUDED.active`,
   [String(userId),sessionId,active]);
 }else{
  local.set(String(userId)+"|"+sessionId,{userId:String(userId),sessionId,lastSeenAt:now.toISOString(),active});
  if(local.size>5000)for(const [k,v] of local)if(stamp(v.lastSeenAt)<Date.now()-RETAIN_MS)local.delete(k);
 }
 return true;
}
async function overview(ids){
 const unique=[...new Set(ids.map(String))].slice(0,100);
 if(!available())return {available:false,users:[],onlineTotal:null};
 let onlineTotal=0,rows=[];
 if(process.env.DATABASE_URL){
  if(unique.length){
   const result=await pg.query(`SELECT user_id AS id,MAX(last_seen_at) AS "lastSeenAt",
    BOOL_OR(active AND last_seen_at>now()-INTERVAL '120 seconds') AS online
    FROM user_presence WHERE user_id=ANY($1::text[]) GROUP BY user_id`,[unique]);
   rows=result.rows;
  }
  const count=await pg.query(`SELECT COUNT(DISTINCT user_id)::int AS online FROM user_presence
   WHERE active=true AND last_seen_at>now()-INTERVAL '120 seconds'`);
  onlineTotal=Number(count.rows[0]?.online||0);
 }else{
  const now=Date.now(),wanted=new Set(unique),grouped=new Map(),allOnline=new Set();
  for(const entry of local.values()){
   const fresh=entry.active&&now-stamp(entry.lastSeenAt)<STALE_MS;
   if(fresh)allOnline.add(entry.userId);
   if(!wanted.has(entry.userId))continue;
   const prev=grouped.get(entry.userId);
   if(!prev)grouped.set(entry.userId,{id:entry.userId,lastSeenAt:entry.lastSeenAt,online:!!fresh});
   else{if(stamp(entry.lastSeenAt)>stamp(prev.lastSeenAt))prev.lastSeenAt=entry.lastSeenAt;prev.online=prev.online||!!fresh}
  }
  onlineTotal=allOnline.size;rows=[...grouped.values()];
 }
 const index=new Map(rows.map(r=>[String(r.id),r]));
 return {available:true,onlineTotal,users:unique.map(id=>{
  const r=index.get(id);return {id,online:!!r?.online,lastSeenAt:r?.lastSeenAt||null}
 })};
}
function reset(){local.clear()}
module.exports={touch,overview,available,STALE_MS,reset};
