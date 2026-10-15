"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {list,filters}=require("../lib/admin-device-logs");
const data={users:[
 {id:"u1",name:"Minh Anh",email:"child@example.test",role:"student"},
 {id:"u2",name:"Giáo viên",email:"teacher@example.test",role:"teacher"}
],loginDevices:[
 {userId:"u1",deviceId:"private-123",device:"iPhone",browser:"Safari",ip:"203.0.113.22",
  firstSeenAt:"2026-10-12T01:00:00Z",lastSeenAt:"2026-10-14T01:00:00Z",token:"sensitive"},
 {userId:"u2",deviceId:"private-456",device:"Windows",browser:"Chrome",ip:"198.51.100.9",
  firstSeenAt:"2026-10-12T01:00:00Z",lastSeenAt:"2026-10-13T01:00:00Z"},
 {userId:"deleted",deviceId:"not-in-users",device:"Unknown",ip:"192.0.2.1"}
]};
test("Admin device history joins accounts, orders by last login, and omits secret IDs",()=>{
 const d=list(data,{});
 assert.equal(d.pagination.total,2);
 assert.deepEqual(d.devices.map(x=>x.userId),["u1","u2"]);
 assert.equal(d.devices[0].ip,"203.0.113.22");
 assert.equal(d.devices[1].email,"teacher@example.test");
 assert.equal(d.devices[0].deviceId,undefined);
 assert.equal(JSON.stringify(d).includes("private-123"),false);
 assert.equal(JSON.stringify(d).includes("sensitive"),false);
});
test("Search finds by email, name with accents, browser and IP",()=>{
 assert.equal(list(data,{search:"child@example.test"}).devices[0].userId,"u1");
 assert.equal(list(data,{search:"giao vien"}).devices[0].userId,"u2");
 assert.equal(list(data,{search:"198.51.100"}).pagination.total,1);
 assert.equal(list(data,{search:"iPhone"}).pagination.total,1);
 assert.equal(list(data,{search:"not-registered"}).pagination.total,0);
});
test("Device history safely bounds filters",()=>{
 for(const q of [{page:0},{page:-1},{page:1.2},{page:10001},{page:"Infinity"},{search:"z".repeat(101)},{search:["a","b"]}]){
  assert.throws(()=>filters(q),/Bộ lọc/);
 }
 const many={users:[{id:"u",name:"Admin",email:"user@example.test"}],loginDevices:Array.from({length:45},(_,i)=>({
  userId:"u",device:"Windows",ip:"192.0.2."+i,lastSeenAt:new Date(2026,9,14,0,i).toISOString()
 }))};
 assert.equal(list(many,{page:1}).devices.length,20);
 assert.equal(list(many,{page:3}).devices.length,5);
 assert.equal(list(many,{page:3}).pagination.hasMore,false);
});


test("Admin security metrics separate recent use, first-seen devices, and IP changes",()=>{
 const now=Date.parse("2026-10-15T12:00:00Z");
 const db={users:[{id:"a",name:"An",email:"an@example.test"},{id:"b",name:"Binh",email:"binh@example.test"}],
  loginDevices:[
   {userId:"a",deviceId:"id-one",ip:"198.51.100.1",device:"Windows",browser:"Chrome",
    firstSeenAt:"2026-09-01T12:00:00Z",lastSeenAt:"2026-10-15T11:00:00Z",ipChangedAt:"2026-10-14T12:00:00Z"},
   {userId:"b",deviceId:"id-two",ip:"203.0.113.1",device:"iPhone",browser:"Safari",
    firstSeenAt:"2026-10-14T12:00:00Z",lastSeenAt:"2026-10-14T12:00:00Z"},
   {userId:"a",deviceId:"id-three",ip:"203.0.113.3",device:"iPhone",browser:"Safari",
    firstSeenAt:"2026-07-10T12:00:00Z",lastSeenAt:"2026-09-11T12:00:00Z"}
  ]};
 const result=list(db,{search:"An"},now);
 // Search is scoped, but overview metrics always cover all observed devices.
 assert.deepEqual(result.summary,{totalDevices:3,uniqueAccounts:2,recent24h:2,newDevices7d:1,changedIp7d:1});
 assert.equal(result.pagination.total,2);
 assert.equal(list(db,{status:"ip-change"},now).devices[0].ipChangedAt,"2026-10-14T12:00:00Z");
 assert.deepEqual(list(db,{status:"ip-change"},now).devices.map(d=>d.userId),["a"]);
 assert.deepEqual(list(db,{status:"new-device"},now).devices.map(d=>d.userId),["b"]);
 assert.equal(list(db,{status:"recent"},now).pagination.total,2);
 assert.equal(list(db,{status:"ip-change",search:"unmatched"},now).pagination.total,0);
 assert.equal(JSON.stringify(list(db,{},now)).includes("id-one"),false);
});
test("Invalid device history statuses are rejected instead of falling back to all IPs",()=>{
 for(const q of [{status:"compromised"},{status:["all","ip-change"]},{status:5},{status:""},{search:{"$ne":""}}])
  assert.throws(()=>filters(q),/Bộ lọc/);
 assert.equal(filters({status:"new-device"}).status,"new-device");
});


test("Account scope only returns the selected user's IPs and recomputes that scope's metrics",()=>{
 const now=Date.parse("2026-10-15T12:00:00.000Z");
 const db={users:[
  {id:"student-a",name:"Student A",email:"a@example.test"},
  {id:"student-b",name:"Student B",email:"b@example.test"}
 ],loginDevices:[
  {userId:"student-a",deviceId:"secret-a",ip:"203.0.113.100",device:"iPhone",
   firstSeenAt:"2026-10-14T12:00:00Z",lastSeenAt:"2026-10-15T11:00:00Z"},
  {userId:"student-b",deviceId:"secret-b",ip:"198.51.100.200",device:"Windows",
   firstSeenAt:"2026-10-13T12:00:00Z",lastSeenAt:"2026-10-15T11:00:00Z"}
 ]};
 const selected=list(db,{userId:"student-a"},now);
 assert.equal(selected.pagination.total,1);
 assert.equal(selected.devices[0].ip,"203.0.113.100");
 assert.equal(JSON.stringify(selected).includes("198.51.100.200"),false);
 assert.equal(JSON.stringify(selected).includes("secret-a"),false);
 assert.deepEqual(selected.account,{userId:"student-a",name:"Student A",email:"a@example.test"});
 assert.equal(selected.userId,"student-a");
 assert.deepEqual(selected.summary,{totalDevices:1,uniqueAccounts:1,recent24h:1,newDevices7d:1,changedIp7d:0});
 const zero=list({...db,loginDevices:[db.loginDevices[1]]},{userId:"student-a"},now);
 assert.equal(zero.pagination.total,0);
 assert.equal(zero.account.email,"a@example.test");
 assert.equal(zero.summary.totalDevices,0);
 const unknown=list(db,{userId:"unknown"},now);
 assert.equal(unknown.account,null);
 assert.equal(unknown.devices.length,0);
});
test("Account scope rejects ambiguous or oversized identifiers and cannot broaden to another account",()=>{
 for(const query of [{userId:" "},{userId:"x".repeat(129)},{userId:["a","b"]},{userId:{test:1}}]){
  assert.throws(()=>filters(query),/Bộ lọc/);
 }
 assert.equal(filters({userId:"student-a"}).userId,"student-a");
 assert.equal(filters({}).userId,"");
});
