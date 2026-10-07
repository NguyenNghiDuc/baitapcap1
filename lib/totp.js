const crypto=require("crypto");
const A="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function enc(buf){let bits=0,val=0,out="";for(const byte of buf){val=(val<<8)|byte;bits+=8;while(bits>=5){out+=A[(val>>>(bits-5))&31];bits-=5}}if(bits)out+=A[(val<<(5-bits))&31];return out}
function dec(str){let bits=0,val=0,out=[];for(const ch of String(str).replace(/=+$/,"").toUpperCase()){const x=A.indexOf(ch);if(x<0)continue;val=(val<<5)|x;bits+=5;if(bits>=8){out.push((val>>>(bits-8))&255);bits-=8}}return Buffer.from(out)}
function code(secret,time=Date.now()){const key=dec(secret),counter=BigInt(Math.floor(time/30000)),buf=Buffer.alloc(8);buf.writeBigUInt64BE(counter);const h=crypto.createHmac("sha1",key).update(buf).digest(),off=h[h.length-1]&15,num=(h.readUInt32BE(off)&0x7fffffff)%1000000;return String(num).padStart(6,"0")}
function verify(secret,input){return [-30000,0,30000].some(d=>{const a=Buffer.from(code(secret,Date.now()+d)),b=Buffer.from(String(input||"").padStart(6,"0"));return a.length===b.length&&crypto.timingSafeEqual(a,b)})}
function secret(){return enc(crypto.randomBytes(20))}
module.exports={code,verify,secret};