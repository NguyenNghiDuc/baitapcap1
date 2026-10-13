"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"..","js","app.js"),"utf8");
test("role menu always uses a NodeList for both Admin and Teacher links",()=>{
 const shell=source.slice(source.indexOf("function shell(){"),source.indexOf("function pageHead("));
 assert.ok(shell.includes('document.querySelectorAll(".admin-only").forEach('),"Admin selector must select all elements");
 assert.ok(shell.includes('document.querySelectorAll(".teacher-only").forEach('),"Teacher selector must select all elements");
 assert.doesNotMatch(shell,/(?<!\$)\$\(\s*["'][.]((admin|teacher)-only)["']\s*\)\.forEach\s*\(/);
});
test("no singular selector can call forEach anywhere in the main app",()=>{
 assert.doesNotMatch(source,/(?<!\$)\$\(\s*["'`][^"'`]*["'`]\s*\)\.forEach\s*\(/);
});
