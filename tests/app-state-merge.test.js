"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {mergeAppState,validateLegacy}=require("../lib/app-state-merge");
const copy=x=>JSON.parse(JSON.stringify(x));
const fixture=()=>({
 users:[{id:"teacher",name:"Giáo viên",role:"teacher"},{id:"student",name:"Học sinh",role:"student"}],
 submissions:[{id:"sub",studentId:"student",score:70,gradedAt:"2026-10-13T00:00:00Z",
  feedback:"Đã chấm",gradingStatus:"teacher_graded",answers:{first:1}}],
 gradeReviews:[],audit:[],notifications:[{id:"n1",title:"Thông báo cũ"}],results:[{id:"res1",score:90}]
});
test("stale teacher cache cannot reverse a newly approved grade or remove its audit",()=>{
 const base=fixture(),local=copy(base),remote=copy(base);
 local.users[1].name="Học sinh mới";local.notifications.push({id:"n2",title:"Mới"});
 remote.submissions[0].score=85;remote.submissions[0].gradedAt="2026-10-13T00:15:00Z";
 remote.gradeReviews.push({id:"approval",status:"approved",newScore:85});
 remote.audit.push({id:"audit-grade",action:"grade_change_approved"});
 const merged=mergeAppState(base,local,remote);
 assert.equal(merged.users[1].name,"Học sinh mới");
 assert.equal(merged.submissions[0].score,85);
 assert.equal(merged.submissions[0].gradedAt,"2026-10-13T00:15:00Z");
 assert.equal(merged.gradeReviews[0].status,"approved");
 assert.equal(merged.audit[0].id,"audit-grade");
 assert.ok(merged.notifications.some(x=>x.id==="n2"));
 assert.equal(remote.users[1].name,"Học sinh");
});
test("concurrent edits to different fields of one record are merged",()=>{
 const base=fixture(),local=copy(base),remote=copy(base);
 local.users[1].name="Tên cập nhật";
 remote.users[1].role="parent";
 const merged=mergeAppState(base,local,remote);
 assert.equal(merged.users[1].name,"Tên cập nhật");
 assert.equal(merged.users[1].role,"parent");
});
test("newly added remote submissions are never lost from a stale snapshot",()=>{
 const base=fixture(),local=copy(base),remote=copy(base);
 local.notifications.push({id:"n2",title:"Thêm"});
 remote.submissions.push({id:"sub2",score:null,studentId:"student"});
 const merged=mergeAppState(base,local,remote);
 assert.deepEqual(merged.submissions.map(s=>s.id),["sub","sub2"]);
});
test("intentional local deletion removes only known records, not concurrent remote inserts",()=>{
 const base=fixture(),local=copy(base),remote=copy(base);
 local.results=[];
 remote.results.push({id:"res2",score:75});
 const merged=mergeAppState(base,local,remote);
 assert.deepEqual(merged.results.map(s=>s.id),["res2"]);
});
test("independent concurrent inserts with unique IDs are retained",()=>{
 const base=fixture(),local=copy(base),remote=copy(base);
 local.notifications.push({id:"n2",title:"Local"});
 remote.notifications.push({id:"n3",title:"Remote"});
 const result=mergeAppState(base,local,remote);
 assert.deepEqual(new Set(result.notifications.map(x=>x.id)),new Set(["n1","n2","n3"]));
});
test("legacy code cannot edit score, grading timestamps or feedback of an existing submission",()=>{
 for(const key of ["score","gradedAt","gradingStatus","feedback"]){
  const base=fixture(),local=copy(base),remote=copy(base);
  local.submissions[0][key]=key==="score"?91:"Bypassed";
  assert.throws(()=>validateLegacy(base,local),/API chấm\/duyệt điểm/);
  assert.throws(()=>mergeAppState(base,local,remote),/API chấm\/duyệt điểm/);
 }
});
test("legacy code cannot approve or remove grade review requests",()=>{
 const base=fixture(),local=copy(base);
 local.gradeReviews.push({id:"review",status:"approved"});
 assert.throws(()=>mergeAppState(base,local,copy(base)),/yêu cầu duyệt điểm/);
});
test("new submissions can carry an automatic initial score without changing an existing grade",()=>{
 const base=fixture(),local=copy(base),remote=copy(base);
 local.submissions.push({id:"automatic",studentId:"student",score:60,gradedAt:null});
 assert.doesNotThrow(()=>validateLegacy(base,local));
 const merged=mergeAppState(base,local,remote);
 assert.equal(merged.submissions.find(x=>x.id==="automatic").score,60);
});
test("unchanged cached fields and unknown new keys never wipe the latest PostgreSQL state",()=>{
 const base=fixture(),local=copy(base),remote=copy(base);
 local.users[1].name="Updated";
 remote.extraFeature={enabled:true,version:4};
 remote.users.push({id:"u2",name:"Remote admin",role:"admin"});
 const merged=mergeAppState(base,local,remote);
 assert.equal(merged.extraFeature.version,4);
 assert.equal(merged.users.find(x=>x.id==="u2").role,"admin");
 assert.equal(merged.users.find(x=>x.id==="student").name,"Updated");
});
test("malformed snapshots fail closed and never silently produce an empty database",()=>{
 assert.throws(()=>mergeAppState({}, {}, []),/PostgreSQL/);
 assert.throws(()=>validateLegacy(null,fixture()),/không hợp lệ/);
});

test("stale snapshots preserve authoritative Admin result-review decisions",()=>{
 const base=fixture(),local=copy(base),remote=copy(base);
 local.users[1].name="Updated student";
 remote.resultReviewDecisions=[{resultId:"res1",status:"reviewed",reason:"Manually checked",reviewerId:"admin1"}];
 const merged=mergeAppState(base,local,remote);
 assert.equal(merged.users[1].name,"Updated student");
 assert.equal(merged.resultReviewDecisions.length,1);
 assert.equal(merged.resultReviewDecisions[0].status,"reviewed");
 assert.equal(merged.resultReviewDecisions[0].reviewerId,"admin1");
});
test("legacy snapshots cannot forge, alter or remove Admin result-review decisions",()=>{
 const base=fixture();base.resultReviewDecisions=[{resultId:"res1",status:"reviewed"}];
 for(const changed of [[],[{resultId:"res1",status:"dismissed"}],[
  {resultId:"res1",status:"reviewed"},{resultId:"res2",status:"reviewed"}]]){
  const local=copy(base);local.resultReviewDecisions=changed;
  assert.throws(()=>validateLegacy(base,local),/lịch sử xem xét/);
  assert.throws(()=>mergeAppState(base,local,copy(base)),/lịch sử xem xét/);
 }
});
