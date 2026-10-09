"use strict";
const fs=require("fs"),path=require("path");
const LOG_DIR=process.env.VERCEL?"/tmp/baitapcap1-logs":path.join(__dirname,"..","logs");
function sanitize(value){
 if(value==null)return value;
 if(typeof value!=="object")return value;
 try{return JSON.parse(JSON.stringify(value,(key,v)=>/^(password|token|authorization|access_token|refresh_token|service_role_key|api_key|secret)$/i.test(key)?"[redacted]":v))}catch{return {note:"metadata unavailable"}}
}
function write(level,event,meta={}){
 const row={at:new Date().toISOString(),level,event,meta:sanitize(meta)};
 try{(level==="error"?console.error:level==="warn"?console.warn:console.log)("[monitor]",event,row.meta)}catch{}
 if(!process.env.VERCEL){
  try{fs.mkdirSync(LOG_DIR,{recursive:true});fs.appendFileSync(path.join(LOG_DIR,"app.log"),JSON.stringify(row)+"\n")}catch{}
 }
 if(level==="error"&&process.env.MONITORING_WEBHOOK_URL){try{fetch(process.env.MONITORING_WEBHOOK_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(row)}).catch(()=>{})}catch{}}
 return row;
}
module.exports={info:(e,m)=>write("info",e,m),warn:(e,m)=>write("warn",e,m),error:(e,m)=>write("error",e,m),sanitize};
