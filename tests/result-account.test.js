const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
global.window={};require("../js/results/account.js");
const A=window.ResultAccount;
test("new results record the authenticated account",()=>{
 const a=A.fromUser({id:"uid-123",name:"Học sinh A",email:"student@example.com"});
 assert.deepEqual(a,{accountId:"uid-123",accountName:"Học sinh A",accountEmail:"student@example.com"});
 assert.deepEqual(A.describe(a),{name:"Học sinh A",detail:"student@example.com"});
});
test("old locally stored results never inherit whoever signs in later",()=>{
 const old={title:"Toán lớp 4",score:75};
 assert.deepEqual(A.describe(old),{name:"Chưa xác định",detail:"Bài cũ lưu trên thiết bị"});
 assert.equal(A.fromUser(null),null);
});
test("account display never needs a password or other private token",()=>{
 const r=A.fromUser({id:"a",email:"Student@Example.COM",name:"A",password:"secret",access_token:"secret"});
 assert.equal(r.accountEmail,"student@example.com");
 assert.equal(JSON.stringify(r).includes("secret"),false);
});
test("all exam paths capture owner, history renders owner and server exports account",()=>{
 const root=path.join(__dirname,"..");
 for(const pathName of ["index.html","kiem-tra.html","kiem-tra-nang-cao.html"]){
  assert.match(fs.readFileSync(path.join(root,pathName),"utf8"),/\/js\/results\/account\.js/);
 }
 const app=fs.readFileSync(path.join(root,"js/app.js"),"utf8");
 assert.match(app,/Tài khoản làm bài/);
 assert.match(app,/ResultAccount\?\.fromUser/);
 const standalone=fs.readFileSync(path.join(root,"js/exams/standalone.js"),"utf8");
 assert.match(standalone,/ResultAccount\?\.current/);
 const runner=fs.readFileSync(path.join(root,"js/exams/runner.js"),"utf8");
 assert.match(runner,/ResultAccount\?\.current/);
 const backend=fs.readFileSync(path.join(root,"server.js"),"utf8");
 assert.match(backend,/TaiKhoan:owner\?\.email/);
 assert.match(backend,/Tai khoan: \$\{owner\?\.email/);
});
