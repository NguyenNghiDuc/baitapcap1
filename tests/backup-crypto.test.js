"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const os=require("node:os"),fs=require("node:fs"),path=require("node:path");
const backup=require("../scripts/backup-crypto");
const SECRET="a-strong-offline-backup-passphrase";
const DATA={users:[{id:"student-1",email:"private-child@example.test"}],results:[{score:90}]};
test("AES-GCM snapshots contain no plaintext student records and decrypt losslessly",()=>{
 const output=backup.seal(DATA,SECRET,{appVersion:"4.1.3",createdAt:"2026-10-13T00:00:00Z"});
 assert.equal(output.format,backup.FORMAT);
 assert.equal(output.scope,"app_state_only");
 assert.equal(JSON.stringify(output).includes("private-child@example.test"),false);
 const parsed=backup.inspect(output,{passphrase:SECRET});
 assert.deepEqual(parsed.data,DATA);
 assert.equal(parsed.createdAt,"2026-10-13T00:00:00Z");
});
test("wrong passphrase, tampered ciphertext or auth tag are rejected before restore",()=>{
 const b=backup.seal(DATA,SECRET);
 assert.throws(()=>backup.inspect(b,{passphrase:"incorrect-strong-passphrase"}),/chỉnh sửa|hỏng|không đúng/i);
 assert.throws(()=>backup.inspect({...b,tag:Buffer.alloc(16).toString("base64")},{passphrase:SECRET}),/chỉnh sửa|hỏng|không đúng/i);
 const s=Buffer.from(b.ciphertext,"base64");s[0]^=1;
 assert.throws(()=>backup.inspect({...b,ciphertext:s.toString("base64")},{passphrase:SECRET}),/chỉnh sửa|hỏng|không đúng/i);
});
test("empty or short backup passphrase and missing user list are rejected",()=>{
 assert.throws(()=>backup.seal(DATA,"too-short"),/tối thiểu 16/);
 assert.throws(()=>backup.seal({foo:1},SECRET),/không hợp lệ/);
});
test("legacy JSON restore requires explicit opt-in and strict SHA-256 match",()=>{
 const b={format:"baitapcap1-backup-v1",createdAt:"2026-10-13T00:00:00Z",appVersion:"4.1.2",data:DATA};
 b.sha256=crypto.createHash("sha256").update(JSON.stringify(b,null,2)).digest("hex");
 assert.throws(()=>backup.inspect(b,{}),/--allow-legacy/);
 assert.deepEqual(backup.inspect(b,{allowLegacy:true}).data,DATA);
 assert.throws(()=>backup.inspect({...b,data:{users:[{id:"other"}]}},{allowLegacy:true}),/Checksum/i);
 assert.throws(()=>backup.inspect({...b,sha256:undefined},{allowLegacy:true}),/checksum/i);
});
test("restore CLI --verify does not connect or modify any database",async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),"bc1-backup-"));
 const file=path.join(folder,"backup.enc.json"),previous=process.env.BACKUP_PASSPHRASE;
 try{
  process.env.BACKUP_PASSPHRASE=SECRET;
  fs.writeFileSync(file,JSON.stringify(backup.seal(DATA,SECRET)));
  const run=require("../scripts/db-restore").main;
  await run([file,"--verify"]);
  assert.rejects(()=>run([file]),/chính xác một chế độ/);
  assert.rejects(()=>run([file,"--confirm-restore"]),/RESTORE_CONFIRMATION/);
 }finally{
  if(previous===undefined)delete process.env.BACKUP_PASSPHRASE;else process.env.BACKUP_PASSPHRASE=previous;
  fs.rmSync(folder,{recursive:true,force:true});
 }
});
