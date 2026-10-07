const test=require("node:test"),assert=require("node:assert/strict"),fs=require("fs"),path=require("path");
const root=path.join(__dirname,".."),schema=fs.readFileSync(path.join(root,"db","schema.sql"),"utf8");
const tables=["schema_migrations","users","classes","class_students","assignments","submissions","results","notifications","materials","audit_logs","question_bank","exam_rooms","exam_settings","push_subscriptions","feedback","student_works"];
test("postgres schema contains all production tables",()=>{for(const t of tables)assert.match(schema,new RegExp("CREATE TABLE IF NOT EXISTS "+t+"\\b","i"),t)});
test("exam settings persist configurable durations",()=>{assert.match(schema,/daily_min/i);assert.match(schema,/grade4_min/i);assert.match(schema,/grade5_min/i);assert.match(schema,/overrides JSONB/i)});
test("database scripts exist",()=>{for(const f of ["db-migrate.js","db-seed.js","db-import-json.js","db-check.js"])assert.ok(fs.existsSync(path.join(root,"scripts",f)),f)});
test("docker postgres setup exists",()=>assert.ok(fs.existsSync(path.join(root,"docker-compose.yml"))));
test("env file is ignored",()=>{const g=fs.readFileSync(path.join(root,".gitignore"),"utf8");assert.match(g,/^\.env$/m)});
