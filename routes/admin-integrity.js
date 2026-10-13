"use strict";
// Read-only Admin integrity scan. Never return student records, SQL, IDs or database errors.
const fs=require("node:fs"),path=require("node:path");
const TABLES=["users","results","submissions","classes","app_state","schema_migrations","question_bank"];
const tableSql="SELECT "+TABLES.map(t=>"to_regclass('"+t+"') IS NOT NULL AS "+t).join(",");
const rules=[
 {id:"result_ranges",table:"results",name:"Điểm bài kiểm tra bất thường",sql:"SELECT EXISTS(SELECT 1 FROM results WHERE score < 0 OR score > 100 OR correct < 0 OR total < 0 OR correct > total) AS detected"},
 {id:"submission_ranges",table:"submissions",name:"Điểm hoặc số lượt nộp không hợp lệ",sql:"SELECT EXISTS(SELECT 1 FROM submissions WHERE score < 0 OR score > 100 OR attempt < 1) AS detected"},
 {id:"user_values",table:"users",name:"Vai trò hoặc lớp ngoài phạm vi",sql:"SELECT EXISTS(SELECT 1 FROM users WHERE role NOT IN ('student','parent','teacher','admin') OR (grade IS NOT NULL AND (grade < 1 OR grade > 5))) AS detected"},
 {id:"orphan_results",table:"results",needs:"users",name:"Bài kiểm tra thiếu tài khoản",sql:"SELECT EXISTS(SELECT 1 FROM results r LEFT JOIN users u ON u.id=r.user_id WHERE r.user_id IS NOT NULL AND u.id IS NULL) AS detected"}
];
function expectedMigrations(root=path.resolve(__dirname,"..")){
 const dir=path.join(root,"db","migrations");
 return fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>/^\d+_[a-z0-9_-]+\.sql$/i.test(n)).sort().map(n=>n.slice(0,-4)):[];
}
function summary(report){
 const counts={ok:0,problem:0,warning:0,unavailable:0};
 for(const c of report.checks)counts[c.state]=(counts[c.state]||0)+1;
 return {...report,counts,complete:counts.unavailable===0,healthy:counts.problem===0&&counts.warning===0&&counts.unavailable===0};
}
async function scan({query,databaseConfigured,expected=expectedMigrations()}){
 const checks=[];
 const add=(id,name,state,detail)=>checks.push({id,name,state,detail});
 const report={checks,checkedAt:new Date().toISOString(),source:"postgresql",readonly:true,
  statement:"Chỉ kiểm tra một số quy tắc tự động; không khẳng định mọi dữ liệu đều chính xác."};
 if(!databaseConfigured){
  add("database","Kết nối PostgreSQL","unavailable","Chưa cấu hình DATABASE_URL; chưa thể kiểm tra dữ liệu.");
  return summary(report);
 }
 let tables;
 try{
  const r=await query(tableSql);
  tables=r.rows?.[0];
  if(!tables)throw Error("Missing metadata");
 }catch{
  add("database","Kết nối PostgreSQL","unavailable","Không đọc được thông tin schema PostgreSQL.");
  return summary(report);
 }
 for(const t of TABLES)add("table_"+t,"Bảng "+t,tables[t]===true?"ok":"problem",tables[t]===true?"Có trong database.":"Không tìm thấy bảng cần thiết.");
 if(tables.schema_migrations===true){
  try{
   const r=await query("SELECT version FROM schema_migrations ORDER BY version LIMIT 200");
   const applied=new Set((r.rows||[]).map(x=>String(x.version)));
   const pending=expected.filter(v=>!applied.has(v));
   const unknown=[...applied].filter(v=>v!=="001_initial"&&!expected.includes(v));
   add("migration_status","Trạng thái migration",pending.length||unknown.length?"warning":"ok",
    pending.length?"Có "+pending.length+" migration chưa được ghi nhận.":unknown.length?"Có "+unknown.length+" migration không khớp mã nguồn.":"Các migration trong mã nguồn đã được ghi nhận.");
   report.migrations={expected:expected.length,applied:applied.size,pending:pending.length,unrecognized:unknown.length};
  }catch{
   add("migration_status","Trạng thái migration","unavailable","Không đọc được lịch sử migration.");
  }
 }else add("migration_status","Trạng thái migration","unavailable","Bảng schema_migrations chưa tồn tại.");
 for(const rule of rules){
  if(tables[rule.table]!==true||(rule.needs&&tables[rule.needs]!==true)){
   add(rule.id,rule.name,"unavailable","Thiếu bảng liên quan; không thể kết luận.");continue;
  }
  try{
   const r=await query(rule.sql);
   if(typeof r.rows?.[0]?.detected!=="boolean")throw Error("Invalid check result");
   add(rule.id,rule.name,r.rows[0].detected?"problem":"ok",r.rows[0].detected?"Có ít nhất một bản ghi cần xem xét thủ công.":"Không phát hiện bất thường theo quy tắc này.");
  }catch{add(rule.id,rule.name,"unavailable","Truy vấn không thành công; chưa thể kết luận.");}
 }
 if(tables.app_state===true){
  try{
   const r=await query("SELECT id FROM app_state WHERE id=1 LIMIT 1");
   add("app_state","Snapshot app_state",r.rows?.length?"ok":"warning",r.rows?.length?"Có snapshot, không đọc nội dung học sinh.":"Chưa có snapshot app_state.");
  }catch{add("app_state","Snapshot app_state","unavailable","Không đọc được metadata snapshot.");}
 }else add("app_state","Snapshot app_state","unavailable","Thiếu bảng app_state.");
 return summary(report);
}
async function handler(req,res,p,{send,requireUser,pg}){
 if(p!=="/api/admin/integrity")return false;
 const user=await requireUser(req,res,["admin"]);if(!user)return true;
 const headers={"Cache-Control":"private, no-store"};
 if(req.method!=="GET"){send(res,405,{error:"Chỉ hỗ trợ GET"},{"Allow":"GET",...headers});return true}
 try{
  const report=await scan({query:sql=>pg.query(sql),databaseConfigured:!!process.env.DATABASE_URL});
  send(res,200,report,headers);
 }catch{
  send(res,503,{error:"Không thực hiện được kiểm tra tính toàn vẹn dữ liệu."},headers);
 }
 return true;
}
module.exports=handler;
module.exports.scan=scan;
module.exports.summary=summary;
module.exports.expectedMigrations=expectedMigrations;
