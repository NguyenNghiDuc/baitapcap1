const fs=require("fs"),path=require("path"),pg=require("./postgres");
const ROOT=path.join(__dirname,".."),DB_PATH=path.join(ROOT,"data","db.json");
function empty(){return {users:[],classes:[],assignments:[],submissions:[],results:[],notifications:[],materials:[],audit:[],subscriptions:[],feedback:[],questionBank:[],examRooms:[],pushSubscriptions:[],examDrafts:[]}}
let cache=empty(),chain=Promise.resolve(),mode="json";
function json(){try{return Object.assign(empty(),JSON.parse(fs.readFileSync(DB_PATH,"utf8")))}catch{return empty()}}
async function init(){
 if(process.env.DATABASE_URL){
  await pg.connect();await pg.migrate();
  const remote=await pg.loadAppState();
  if(remote&&Object.keys(remote).length)cache=Object.assign(empty(),remote);
  else{cache=json();await pg.saveAppState(cache)}
  mode="supabase";console.log("[storage] Supabase PostgreSQL active");
 }else{cache=json();mode="json";console.log("[storage] JSON fallback active")}
 return cache
}
function load(){return cache}
function save(db){
 cache=Object.assign(empty(),db||{});
 const snapshot=JSON.parse(JSON.stringify(cache));
 if(mode==="supabase"&&process.env.DATABASE_URL){
  chain=chain.then(()=>pg.saveAppState(snapshot)).catch(e=>console.error("[supabase-save]",e.message));
 }else{
  fs.mkdirSync(path.dirname(DB_PATH),{recursive:true});
  fs.writeFileSync(DB_PATH,JSON.stringify(snapshot,null,2));
 }
}
async function flush(){await chain}
function status(){return {mode,database:mode==="supabase"?"supabase-postgres":"json"}}
module.exports={init,load,save,flush,status,empty};