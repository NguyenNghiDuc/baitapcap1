const test=require("node:test");
const assert=require("node:assert/strict");
const devices=require("../lib/login-devices");

function req(id,agent,ip){
 return {headers:{"x-client-device-id":id,"user-agent":agent,"x-vercel-forwarded-for":ip},socket:{remoteAddress:"127.0.0.1"}};
}
test("records each signed-in browser with its device and public IP only for the owner",()=>{
 const old=process.env.TRUST_PROXY;process.env.TRUST_PROXY="1";
 try{
  const db={users:[],loginDevices:[]},a={id:"alice"},b={id:"bob"};
  const iphone=req("btdev_1234567890123","Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1","203.0.113.10");
  const pc=req("btdev_1234567890456","Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36","198.51.100.3");
  assert.equal(devices.record(db,a,iphone),true);
  assert.equal(devices.record(db,a,pc),true);
  assert.equal(devices.record(db,b,iphone),true);
  assert.equal(devices.list(db,a,iphone).length,2);
  assert.equal(devices.list(db,b,iphone).length,1);
  const current=devices.list(db,a,iphone).find(x=>x.current);
  assert.equal(current.device,"iPhone");
  assert.equal(current.browser,"Safari");
  assert.equal(current.ip,"203.0.113.10");
  assert.equal(typeof current.firstSeenAt,"string");
  assert.equal(devices.record(db,a,iphone),false);
 }finally{if(old===undefined)delete process.env.TRUST_PROXY;else process.env.TRUST_PROXY=old}
});
test("invalid forwarded IP cannot be displayed as trusted public IP",()=>{
 const old=process.env.TRUST_PROXY;process.env.TRUST_PROXY="1";
 try{
  const r=req("btdev_1234567890123","Firefox/128.0","not-an-ip");
  assert.equal(devices.clientIp(r),"127.0.0.1");
 }finally{if(old===undefined)delete process.env.TRUST_PROXY;else process.env.TRUST_PROXY=old}
});
test("stores no more than 25 recent browser entries per account",()=>{
 const db={loginDevices:[]},user={id:"owner"};
 for(let i=0;i<27;i++)devices.record(db,user,req("btdev_"+String(i).padStart(12,"0"),"Chrome/131.0","127.0.0.1"));
 assert.equal(devices.list(db,user,req("btdev_"+String(26).padStart(12,"0"),"Chrome/131.0","127.0.0.1")).length,25);
});
