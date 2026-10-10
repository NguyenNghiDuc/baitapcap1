const test=require("node:test"),assert=require("node:assert/strict"),fs=require("fs"),path=require("path");
const root=path.join(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
test("Supabase migrations exist and enable RLS",()=>{
 const rls=read("db/migrations/002_supabase_rls.sql"),storage=read("db/migrations/003_supabase_storage.sql"),rt=read("db/migrations/004_supabase_realtime.sql");
 assert.match(rls,/ENABLE ROW LEVEL SECURITY/i);assert.match(rls,/auth\.uid\(\)/i);assert.match(rls,/can_access_student/i);
 assert.match(storage,/student-work/);assert.match(storage,/learning-materials/);assert.match(storage,/storage\.objects/i);
 assert.match(rt,/supabase_realtime/i);assert.match(rt,/submissions/i);assert.match(rt,/exam_rooms/i);
});
test("service role key is never referenced by browser modules",()=>{
 for(const dir of ["js/auth","js/supabase","js/student","js/teacher"]){for(const f of fs.readdirSync(path.join(root,dir))){if(!f.endsWith(".js"))continue;assert.equal(read(dir+"/"+f).includes("SUPABASE_SERVICE_ROLE_KEY"),false,dir+"/"+f)}}
});
test("auth styling loads early while heavy Supabase modules are lazy",()=>{
 const html=read("index.html"),loader=read("js/perf/loader.js"),client=read("js/auth/supabase-client.js"),app=html.indexOf("js/app.js");
 for(const x of ["css/auth.css","js/auth/supabase-client.js","js/auth/auth-ui.js"])assert.ok(html.indexOf(x)>0,x);
 assert.ok(html.indexOf("js/auth/auth-ui.js")<app);assert.ok(client.includes("cdn.jsdelivr.net/npm/@supabase/supabase-js"));
 assert.ok(loader.includes("/js/supabase/storage.js"));assert.ok(loader.includes("/js/supabase/realtime.js"));
});
test("runtime uses Supabase token validation and normalized profile upsert",()=>{
 const server=read("server.js"),route=read("routes/supabase-auth.js"),pg=read("lib/postgres.js");
 assert.match(server,/getUserFromToken/);assert.match(route,/pg\.upsertUser/);assert.match(pg,/auth_user_id/);
});
test("backup restore verify and seed scripts are present",()=>{for(const f of ["db-backup.js","db-restore.js","supabase-verify.js","supabase-seed-auth.js"])assert.ok(fs.existsSync(path.join(root,"scripts",f)),f)});
test("serverless adapter reuses shared server handler",()=>{assert.match(read("api/index.js"),/require\("\.\.\/server"\)/);assert.match(read("server.js"),/module\.exports\.handler=handler/);assert.match(read("server.js"),/module\.exports\.bootstrap=bootstrap/)});
test("PWA v4.1.3 manifests auth storage and realtime assets",()=>{
 const m=JSON.parse(read("offline-manifest.json"));assert.equal(m.version,"4.1.3");
 for(const a of ["/css/auth.css","/js/auth/supabase-client.js","/js/supabase/storage.js","/js/supabase/realtime.js"])assert.ok(m.assets.includes(a),a);
 assert.ok(m.coreAssets.includes("/js/auth/supabase-client.js"));assert.equal(m.coreAssets.includes("/js/supabase/storage.js"),false);
});
