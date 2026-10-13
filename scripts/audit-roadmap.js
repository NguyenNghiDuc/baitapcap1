"use strict";
/**
 * Feature audit: tracks the 160 proposed capabilities without guessing their
 * completion state. Source evidence means "related code exists", not "works".
 *
 * Usage: node scripts/audit-roadmap.js [--json]
 */
const fs=require("node:fs");
const path=require("node:path");
const ROOT=path.resolve(__dirname,"..");
const RANGE=/^features-(\d{3})-(\d{3})\.json$/;
const VALID_STATUS=new Set(["not-verified","partial","verified","blocked"]);
const VALID_PHASE=new Set(["foundation","learning","ai","scale"]);
function inspect(root=ROOT){
 const folder=path.join(root,"roadmap");
 const names=fs.readdirSync(folder).filter(n=>RANGE.test(n)).sort();
 if(names.length!==8)throw new Error("Phải có đúng 8 file danh mục 1–160, hiện có "+names.length);
 const features=[],issues=[];
 for(const name of names){
  const data=JSON.parse(fs.readFileSync(path.join(folder,name),"utf8"));
  const m=name.match(RANGE),start=Number(m[1]),end=Number(m[2]);
  if(data.range?.[0]!==start||data.range?.[1]!==end)issues.push(name+": khoảng ID không khớp");
  if(!Array.isArray(data.features)||data.features.length!==20)issues.push(name+": không đủ 20 mục");
  for(const item of data.features||[]){
   features.push(item);
   if(!Number.isInteger(item.id)||item.id<1||item.id>160)issues.push(name+": ID không hợp lệ "+item.id);
   if(typeof item.name!=="string"||item.name.trim().length<6)issues.push(name+": tên quá ngắn tại "+item.id);
   if(!VALID_STATUS.has(item.assessment))issues.push(name+": trạng thái không hợp lệ tại "+item.id);
   if(!VALID_PHASE.has(item.phase))issues.push(name+": giai đoạn không hợp lệ tại "+item.id);
   if(item.assessment==="verified"&&(!Array.isArray(item.tests)||!item.tests.length||!item.verifiedBy))
    issues.push(name+": không được đánh dấu hoàn thành khi thiếu kiểm thử và người duyệt (ID "+item.id+")");
   for(const t of item.tests||[]){
    if(!fs.existsSync(path.join(root,t)))issues.push(name+": file kiểm thử không tồn tại: "+t);
   }
  }
 }
 const countById=new Map();
 for(const item of features)countById.set(item.id,(countById.get(item.id)||0)+1);
 for(let i=1;i<=160;i++)if(countById.get(i)!==1)issues.push("Mục "+i+" xuất hiện "+(countById.get(i)||0)+" lần");
 const evidence=JSON.parse(fs.readFileSync(path.join(folder,"evidence.json"),"utf8")).features||{};
 for(const [key,paths] of Object.entries(evidence)){
  const id=Number(key);
  if(!Number.isInteger(id)||id<1||id>160||!countById.has(id))issues.push("ID bằng chứng không tồn tại: "+key);
  if(!Array.isArray(paths)||!paths.length)issues.push("Thiếu đường dẫn bằng chứng của "+key);
  for(const file of paths||[]){
   if(typeof file!=="string"||file.includes("..")||path.isAbsolute(file)||!fs.existsSync(path.join(root,file)))
    issues.push("Không tìm thấy bằng chứng liên quan mục "+key+": "+file);
  }
 }
 const status=Object.fromEntries([...VALID_STATUS].map(n=>[n,features.filter(f=>f.assessment===n).length]));
 const phase=Object.fromEntries([...VALID_PHASE].map(n=>[n,features.filter(f=>f.phase===n).length]));
 return {
  ok:issues.length===0,
  total:features.length,
  withRelatedCode:Object.keys(evidence).length,
  verified:status.verified,
  phase,status,issues,
  features:features.sort((a,b)=>a.id-b.id).map(f=>({
   ...f,
   evidence:evidence[f.id]||[],
   evidenceState:(evidence[f.id]||[]).length?"related-source-found":"not-mapped"
  }))
 };
}
if(require.main===module){
 try{
  const result=inspect();
  if(process.argv.includes("--json"))process.stdout.write(JSON.stringify(result,null,2)+"\n");
  else{
   process.stdout.write("Feature audit 1–160: "+(result.ok?"PASS":"FAIL")+"\n"+
    "Tổng mục: "+result.total+" | Có file code liên quan: "+result.withRelatedCode+
    " | Được kiểm chứng hoàn thành: "+result.verified+"\n"+
    "Giai đoạn: "+JSON.stringify(result.phase)+"\n");
   for(const issue of result.issues)process.stderr.write("- "+issue+"\n");
  }
  if(!result.ok)process.exitCode=1;
 }catch(e){console.error("Feature audit failed:",e.message);process.exitCode=1;}
}
module.exports={inspect};
