const test=require("node:test"),assert=require("node:assert/strict");
global.window={};require("../js/data.js");require("../js/advanced-bank.js");
const D=window.APP_DATA,a=D.advancedQuestions||[];
test("advanced bank has 200 questions",()=>assert.equal(a.length,200));
test("advanced bank covers grade 4 and 5",()=>{assert.ok(a.some(q=>q.grade===4));assert.ok(a.some(q=>q.grade===5))});
test("advanced math has 8 forms",()=>assert.equal(new Set(a.filter(q=>q.subject==="math").map(q=>q.type)).size,8));
test("advanced Vietnamese has 7 forms",()=>assert.equal(new Set(a.filter(q=>q.subject==="vietnamese").map(q=>q.type)).size,7));
test("advanced English has 6 forms",()=>assert.equal(new Set(a.filter(q=>q.subject==="english").map(q=>q.type)).size,6));
test("every advanced question has options answer explanation",()=>{for(const q of a){assert.equal(q.options.length,4);assert.ok(q.answer>=0&&q.answer<4);assert.ok(String(q.explain||"").length>=12)}});