"use strict";
const crypto=require("node:crypto");
const net=require("node:net");
const MAX_RECORDS=25;
const DEVICE_ID=/^[A-Za-z0-9_-]{12,100}$/;

function browserFrom(ua){
 const value=String(ua||"").slice(0,500);
 if(/EdgA?\//i.test(value))return "Microsoft Edge";
 if(/OPR\//i.test(value))return "Opera";
 if(/CriOS\//i.test(value))return "Chrome trên iOS";
 if(/FxiOS\//i.test(value))return "Firefox trên iOS";
 if(/Firefox\//i.test(value))return "Firefox";
 if(/Chrome\//i.test(value))return "Google Chrome";
 if(/Safari\//i.test(value))return "Safari";
 return "Không xác định";
}
function deviceFrom(ua){
 const value=String(ua||"");
 if(/iPhone/i.test(value))return "iPhone";
 if(/iPad/i.test(value))return "iPad";
 if(/Android/i.test(value))return /Mobile/i.test(value)?"Điện thoại Android":"Máy tính bảng Android";
 if(/Windows/i.test(value))return "Máy tính Windows";
 if(/Macintosh|Mac OS X/i.test(value))return "Máy Mac";
 if(/Linux/i.test(value))return "Máy Linux";
 return "Thiết bị không xác định";
}
function cleanIp(ip){
 let v=String(ip||"").trim().replace(/^"|"$/g,"");
 if(v.startsWith("::ffff:"))v=v.slice(7);
 if(net.isIP(v))return v;
 // A forwarded header can carry a port for IPv4.
 if(/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(v)){
  v=v.slice(0,v.lastIndexOf(":"));if(net.isIP(v))return v;
 }
 return null;
}
function clientIp(req){
 const headers=req.headers||{};
 // Only trust forwarding headers when running behind a configured reverse proxy.
 const trust=process.env.VERCEL==="1"||process.env.TRUST_PROXY==="1";
 if(trust){
  for(const key of ["x-vercel-forwarded-for","x-forwarded-for","x-real-ip"]){
   const value=headers[key];const first=String(Array.isArray(value)?value[0]:value||"").split(",")[0].trim();
   const ip=cleanIp(first);if(ip)return ip;
  }
 }
 return cleanIp(req.socket?.remoteAddress)||"Không xác định";
}
function clientId(req){
 const value=String(req.headers?.["x-client-device-id"]||"");
 if(DEVICE_ID.test(value))return value;
 // For browsers without the device-ID header, show an approximate entry,
 // without relying on it as an authentication factor.
 const identity=String(req.headers?.["user-agent"]||"").slice(0,500)+"|"+clientIp(req);
 return "legacy_"+crypto.createHash("sha256").update(identity).digest("hex").slice(0,36);
}
function record(db,user,req){
 if(!db||!user?.id)return false;
 if(!Array.isArray(db.loginDevices))db.loginDevices=[];
 const id=clientId(req),now=new Date().toISOString(),ua=String(req.headers?.["user-agent"]||"");
 let entry=db.loginDevices.find(row=>row.userId===user.id&&row.deviceId===id);
 const ip=clientIp(req),device=deviceFrom(ua),browser=browserFrom(ua);
 if(entry){
  const recently=Date.now()-Date.parse(entry.lastSeenAt||0)<60*1000;
  if(recently&&entry.ip===ip&&entry.browser===browser&&entry.device===device)return false;
  entry.lastSeenAt=now;entry.ip=ip;entry.device=device;entry.browser=browser;
 }else{
  entry={userId:user.id,deviceId:id,device,browser,ip,firstSeenAt:now,lastSeenAt:now};
  db.loginDevices.push(entry);
 }
 const own=db.loginDevices.filter(row=>row.userId===user.id).sort((a,b)=>Date.parse(b.lastSeenAt)-Date.parse(a.lastSeenAt));
 if(own.length>MAX_RECORDS){
  const keep=new Set(own.slice(0,MAX_RECORDS).map(row=>row.deviceId));
  db.loginDevices=db.loginDevices.filter(row=>row.userId!==user.id||keep.has(row.deviceId));
 }
 return true;
}
function list(db,user,req){
 const currentId=clientId(req);
 return (db.loginDevices||[])
  .filter(row=>row.userId===user.id)
  .sort((a,b)=>Date.parse(b.lastSeenAt)-Date.parse(a.lastSeenAt))
  .slice(0,MAX_RECORDS)
  .map(row=>({
   device:row.device,browser:row.browser,ip:row.ip,
   firstSeenAt:row.firstSeenAt,lastSeenAt:row.lastSeenAt,
   current:row.deviceId===currentId
  }));
}
module.exports={record,list,clientIp,clientId,deviceFrom,browserFrom};
