const test=require("node:test"),assert=require("node:assert/strict"),fs=require("fs"),path=require("path");
const root=path.join(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("initial HTML keeps a small core script budget",()=>{
 const h=read("index.html"),count=(h.match(/<script /g)||[]).length;
 assert.ok(count<=30,"initial scripts: "+count);
 assert.equal(h.includes("js/student/dashboard.js"),false);
 assert.equal(h.includes("js/exams/runner.js"),false);
});

test("route loader lazy loads heavy feature groups",()=>{
 const l=read("js/perf/loader.js");
 for(const x of ["tests:","handwriting:","liveClassroom:","materials:","featureHub:"])assert.ok(l.includes(x),x);
 assert.ok(l.includes("asset-hashes.json"));
});

test("static server supports compression ETag and differentiated caching",()=>{
 const s=read("lib/static-server.js"),server=read("server.js");
 assert.ok(s.includes("createBrotliCompress"));
 assert.ok(s.includes("createGzip"));
 assert.ok(s.includes("ETag"));
 assert.ok(s.includes("stale-while-revalidate"));
 assert.ok(server.includes('require("./lib/static-server")'));
 assert.ok(server.includes("STATIC_ROOT="));
});

test("service worker precaches only core and runtime caches routes",()=>{
 const m=JSON.parse(read("offline-manifest.json")),sw=read("sw.js");
 assert.equal(m.version,"4.1.2");
 assert.ok(m.coreAssets.length<m.assets.length);
 for(const x of ["staleWhileRevalidate","networkFirst","cacheFirst",'pathname.startsWith("/api/")'])assert.ok(sw.includes(x),x);
});

test("offline submission queue and server autosave are wired",()=>{
 const q=read("js/perf/offline-queue.js"),server=read("server.js");
 for(const x of ["clientSubmissionId","/api/exam-drafts","/api/results"])assert.ok(q.includes(x),x);
 assert.ok(server.includes("clientSubmissionId"));
 assert.ok(server.includes("handleExamDrafts"));
});

test("large list APIs are paginated and searchable",()=>{
 const server=read("server.js");assert.ok(server.includes("function pageList"));
 for(const p of ["/api/results","/api/notifications","/api/submissions","/api/question-bank","/api/admin/users"])assert.ok(server.includes(p),p);
});

test("database performance migration and tuned pool exist",()=>{
 const sql=read("db/migrations/005_performance_indexes.sql"),pg=read("lib/postgres.js");
 assert.ok(sql.includes("idx_results_client_submission"));
 assert.ok(sql.includes("idx_submissions_student_submitted"));
 assert.ok(pg.includes("query_timeout"));
 assert.ok(pg.includes("keepAlive:true"));
});

test("production build minifies assets and Docker serves dist",()=>{
 const build=read("scripts/build-production.js"),docker=read("Dockerfile");
 assert.ok(build.includes("minify:true"));
 assert.ok(build.includes("asset-hashes.json"));
 assert.ok(docker.includes("npm run build"));
 assert.ok(docker.includes("STATIC_ROOT=/app/dist"));
});
