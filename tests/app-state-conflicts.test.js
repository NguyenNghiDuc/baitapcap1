"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {mergeAppState,validateLegacy}=require("../lib/app-state-merge");
const clone=x=>JSON.parse(JSON.stringify(x));
const seed=()=>({
 users:[{id:"u1",name:"Student",role:"student",locked:false}],
 submissions:[{id:"s1",studentId:"u1",score:70,gradedAt:"2026-10-13T00:00:00Z",feedback:"Original"}],
 results:[{id:"r1",score:70,title:"Test"}],gradeReviews:[],audit:[],notifications:[]
});
test("legacy snapshot cannot delete a graded submission, even if a user was removed",()=>{
 const base=seed(),local=clone(base);
 local.submissions=[];
 assert.throws(()=>validateLegacy(base,local),/không thể xóa bài đã chấm/i);
 assert.throws(()=>mergeAppState(base,local,clone(base)),/không thể xóa bài đã chấm/i);
});
test("reviewed submissions also cannot be removed via a stale legacy snapshot",()=>{
 const base=seed(),local=clone(base);
 base.submissions[0].score=null;
 base.gradeReviews.push({id:"review",submissionId:"s1",status:"pending"});
 local.submissions=[];local.gradeReviews=clone(base.gradeReviews);
 assert.throws(()=>mergeAppState(base,local,clone(base)),/yêu cầu sửa điểm/i);
});
test("concurrent same-field edits reject instead of silently clobbering role or account data",()=>{
 const base=seed(),local=clone(base),remote=clone(base);
 local.users[0].role="teacher";remote.users[0].role="admin";
 assert.throws(()=>mergeAppState(base,local,remote),/Xung đột dữ liệu/);
});
test("independent account fields on the same record can still merge",()=>{
 const base=seed(),local=clone(base),remote=clone(base);
 local.users[0].name="New Name";remote.users[0].role="teacher";
 const out=mergeAppState(base,local,remote);
 assert.equal(out.users[0].name,"New Name");assert.equal(out.users[0].role,"teacher");
});
test("stale deletion cannot remove remotely changed result or user",()=>{
 const base=seed(),local=clone(base),remote=clone(base);
 local.results=[];remote.results[0].score=90;
 assert.throws(()=>mergeAppState(base,local,remote),/Xung đột dữ liệu/);
 const b=seed(),n=clone(b),r=clone(b);
 n.users=[];r.users[0].locked=true;
 assert.throws(()=>mergeAppState(b,n,r),/Xung đột dữ liệu/);
});
test("concurrent insertion with identical ID but different contents is rejected",()=>{
 const base=seed(),local=clone(base),remote=clone(base);
 local.notifications.push({id:"n",title:"Local"});
 remote.notifications.push({id:"n",title:"Remote"});
 assert.throws(()=>mergeAppState(base,local,remote),/Xung đột dữ liệu/);
});
test("non-keyed arrays changed by two workers do not discard either side silently",()=>{
 const base=seed();base.users[0].children=["c1"];
 const local=clone(base),remote=clone(base);
 local.users[0].children=["c1","c2"];
 remote.users[0].children=["c1","c3"];
 assert.throws(()=>mergeAppState(base,local,remote),/Xung đột dữ liệu/);
});
test("concurrent remote deletion is not undone by a stale local edit",()=>{
 const base=seed(),local=clone(base),remote=clone(base);
 local.results[0].title="Edited";remote.results=[];
 assert.throws(()=>mergeAppState(base,local,remote),/Xung đột dữ liệu/);
});
test("independent local deletion preserves newly inserted remote records",()=>{
 const base=seed(),local=clone(base),remote=clone(base);
 local.results=[];remote.results.push({id:"r2",title:"Remote"});
 const out=mergeAppState(base,local,remote);
 assert.deepEqual(out.results.map(x=>x.id),["r2"]);
});
