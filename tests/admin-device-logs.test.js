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
