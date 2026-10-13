"use strict";
// Encrypted app_state snapshot. This is NOT a pg_dump of all PostgreSQL tables,
// Supabase Auth, buckets or secrets. Never store raw snapshots in public assets.
const crypto=require("node:crypto");
const FORMAT="baitapcap1-app-state-aes256gcm-v2";
const LEGACY="baitapcap1-backup-v1";
const MAX_BYTES=40*1024*1024;
function requirePassphrase(value){
 if(typeof value!=="string"||value.length<16)
  throw new Error("Cần BACKUP_PASSPHRASE dài tối thiểu 16 ký tự và lưu bên ngoài mã nguồn.");
 return value;
}
function validData(data){
 if(!data||typeof data!=="object"||Array.isArray(data)||!Array.isArray(data.users))
  throw new Error("Snapshot app_state không hợp lệ: thiếu danh sách users.");
 return data;
}
function seal(data,passphrase,{appVersion="unknown",createdAt=new Date().toISOString()}={}){
 requirePassphrase(passphrase);validData(data);
 const plaintext=Buffer.from(JSON.stringify({format:"baitapcap1-app-state-v2",createdAt,appVersion,data}),"utf8");
 if(plaintext.length>MAX_BYTES)throw new Error("Snapshot vượt 40 MiB; cần dùng backup PostgreSQL chuyên dụng.");
 const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12);
 const key=crypto.scryptSync(passphrase,salt,32,{N:16384,r:8,p:1,maxmem:64*1024*1024});
 const cipher=crypto.createCipheriv("aes-256-gcm",key,iv);
 const encrypted=Buffer.concat([cipher.update(plaintext),cipher.final()]);
 return {format:FORMAT,scope:"app_state_only",createdAt,appVersion,algorithm:"aes-256-gcm",
  kdf:"scrypt",salt:salt.toString("base64"),iv:iv.toString("base64"),
  tag:cipher.getAuthTag().toString("base64"),ciphertext:encrypted.toString("base64")};
}
function base64Field(value,length,label){
 if(typeof value!=="string"||!/^[A-Za-z0-9+/]+={0,2}$/.test(value)||value.length>MAX_BYTES*2)
  throw new Error("Trường "+label+" không hợp lệ");
 const data=Buffer.from(value,"base64");
 if(length!==null&&data.length!==length)throw new Error("Độ dài "+label+" không hợp lệ");
 return data;
}
function open(envelope,passphrase){
 requirePassphrase(passphrase);
 if(!envelope||envelope.format!==FORMAT||envelope.algorithm!=="aes-256-gcm"||envelope.kdf!=="scrypt"
    ||envelope.scope!=="app_state_only")throw new Error("Định dạng backup mã hóa không được hỗ trợ.");
 const salt=base64Field(envelope.salt,16,"salt"),iv=base64Field(envelope.iv,12,"iv");
 const tag=base64Field(envelope.tag,16,"tag"),ciphertext=base64Field(envelope.ciphertext,null,"ciphertext");
 if(ciphertext.length>MAX_BYTES)throw new Error("Backup vượt giới hạn kiểm tra.");
 const key=crypto.scryptSync(passphrase,salt,32,{N:16384,r:8,p:1,maxmem:64*1024*1024});
 try{
  const decipher=crypto.createDecipheriv("aes-256-gcm",key,iv);decipher.setAuthTag(tag);
  const plain=Buffer.concat([decipher.update(ciphertext),decipher.final()]);
  const data=JSON.parse(plain.toString("utf8"));
  if(data.format!=="baitapcap1-app-state-v2")throw new Error("Sai định dạng snapshot.");
  validData(data.data);return data;
 }catch{throw new Error("Backup bị chỉnh sửa, hỏng hoặc BACKUP_PASSPHRASE không đúng.");}
}
// Historic plaintext backups are accepted only with an explicit opt-in and a valid SHA-256.
// Never allow the previous behavior of ignoring checksum mismatch.
function verifyLegacy(envelope){
 if(!envelope||envelope.format!==LEGACY||!envelope.data||typeof envelope.sha256!=="string"||
    !/^[0-9a-f]{64}$/i.test(envelope.sha256))throw new Error("Backup cũ thiếu checksum hợp lệ.");
 const copy={...envelope};delete copy.sha256;
 const hash=crypto.createHash("sha256").update(JSON.stringify(copy,null,2)).digest("hex");
 if(!crypto.timingSafeEqual(Buffer.from(hash,"hex"),Buffer.from(envelope.sha256,"hex")))
  throw new Error("Checksum SHA-256 không khớp: từ chối khôi phục.");
 validData(envelope.data);return envelope;
}
function inspect(envelope,{passphrase,allowLegacy=false}={}){
 if(envelope?.format===FORMAT)return open(envelope,passphrase);
 if(envelope?.format===LEGACY){
  if(!allowLegacy)throw new Error("Backup JSON cũ chưa mã hóa. Thêm --allow-legacy sau khi xác minh nguồn.");
  return verifyLegacy(envelope);
 }
 throw new Error("Định dạng backup không được hỗ trợ.");
}
module.exports={FORMAT,LEGACY,seal,open,inspect,verifyLegacy,requirePassphrase};
