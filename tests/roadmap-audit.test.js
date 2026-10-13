"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const path=require("node:path"),fs=require("node:fs");
const {inspect}=require("../scripts/audit-roadmap");
const root=path.resolve(__dirname,"..");
test("every roadmap capability 1–160 appears exactly once in separate catalogs",()=>{
 const a=inspect();
 assert.equal(a.ok,true,a.issues.join("; "));
 assert.equal(a.total,160);
 assert.deepEqual(a.features.map(f=>f.id),Array.from({length:160},(_,i)=>i+1));
 assert.equal(fs.readdirSync(path.join(root,"roadmap")).filter(p=>/^features-\d{3}-\d{3}\.json$/.test(p)).length,8);
});
test("roadmap does not confuse related source files with completed functionality",()=>{
 const a=inspect();
 assert.equal(a.verified,0,"Completion requires reviewed feature-specific tests");
 assert.ok(a.withRelatedCode>50,"Audit should map meaningful existing code");
 assert.equal(a.features.find(f=>f.id===1).evidenceState,"related-source-found");
 assert.equal(a.features.find(f=>f.id===151).evidenceState,"not-mapped");
 for(const f of a.features)assert.ok(["not-verified","partial","verified","blocked"].includes(f.assessment));
});
test("high-risk child data and role functionality is gated for first phase",()=>{
 const a=inspect();
 for(const id of [1,2,6,7,8,10,27,37,41,59,61,62,73,76,78,79,95,125,126,128,141,144,160]){
  const f=a.features.find(x=>x.id===id);
  assert.equal(f.phase,"foundation","Critical capability "+id+" must be reviewed in foundation phase");
 }
});
