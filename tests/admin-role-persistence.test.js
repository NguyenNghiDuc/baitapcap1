"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
test("Admin list, editing and grant all query authoritative PostgreSQL accounts",()=>{
 const server=read("server.js"),pg=read("lib/postgres.js");
 assert.ok(server.includes('SELECT id,name,email,role,grade,locked FROM users ORDER BY created_at DESC'));
 assert.ok(server.includes("pgStore.findAdminUserById(userPatch.id)"),"edit must look up PG ID, not just app_state");
 assert.ok(server.includes("pgStore.findAdminUserByEmail(email)"),"grant must look up PostgreSQL email");
 assert.ok(pg.includes("async function findAdminUserById(id)"));
 assert.ok(pg.includes("async function findAdminUserByEmail(email)"));
 assert.ok(server.includes("pgStore.setUserAccess(target.id,{role:\"admin\""),"grant must persist authoritative role");
});
test("Admin promotions require configured root Supabase owner, authenticated target, and protected routes",()=>{
 const server=read("server.js");
 const from=server.indexOf('if(req.method==="POST"&&p==="/api/admin/grant-admin")');
 const to=server.indexOf('if(req.method==="POST"&&p==="/api/admin/users")',from);
 assert.ok(from>0&&to>from);
 const grant=server.slice(from,to);
 assert.ok(grant.includes('requireUser(req,res,["admin"])'));
 assert.ok(grant.includes("current.authUserId!==ownerUid"));
 assert.ok(grant.includes("if(!target.authUserId)"));
 assert.ok(grant.includes("if(target.locked)"));
 assert.ok(grant.includes("await storage.flush()"));
});
test("Changing dropdown to Admin invokes dedicated protected grant API",()=>{
 const app=read("js/app.js");
 assert.ok(app.includes("data-can-grant-admin="));
 assert.ok(app.includes("data-current-role="));
 assert.ok(app.includes("const promoting=role===\"admin\"&&was!==\"admin\""));
 assert.ok(app.includes('API.post("/api/admin/grant-admin",{email:select.dataset.userEmail})'));
 assert.ok(app.includes('API.patch("/api/admin/users/"+encodeURIComponent(b.dataset.userSave),{role})'));
});
