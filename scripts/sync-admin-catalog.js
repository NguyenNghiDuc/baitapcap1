"use strict";
// Generate a PUBLIC catalog of feature names/status only; never expose audit metadata,
// internal source paths, account details or service configuration.
const fs=require("node:fs"),path=require("node:path");
const ROOT=path.resolve(__dirname,".."),TARGET=path.join(ROOT,"assets/admin-feature-catalog.json");
function generate(){
 const groups=[],features=[];
 for(let i=0;i<8;i++){
  const begin=i*20+1,end=begin+19;
  const filename="features-"+String(begin).padStart(3,"0")+"-"+String(end).padStart(3,"0")+".json";
  const data=JSON.parse(fs.readFileSync(path.join(ROOT,"roadmap",filename),"utf8"));
  if(data.features?.length!==20||data.range?.[0]!==begin||data.range?.[1]!==end)throw Error("Invalid roadmap: "+filename);
  groups.push({id:i+1,name:data.title,range:data.range});
  for(const x of data.features)features.push({
   id:x.id,name:x.name,group:i+1,phase:x.phase,assessment:x.assessment,...(x.note?{note:x.note}:{})
  });
 }
 if(features.length!==160||features.some((f,i)=>f.id!==i+1))throw Error("Roadmap IDs 1–160 are incomplete/duplicated");
 return JSON.stringify({schema:1,groups,features},null,2)+"\n"
}
if(require.main===module){
 try{
  const expected=generate();
  if(process.argv.includes("--write")){fs.writeFileSync(TARGET,expected);console.log("Updated public Admin feature catalog")}
  else if(fs.readFileSync(TARGET,"utf8")!==expected)throw Error("Admin catalog is outdated; run npm run admin:catalog:sync");
  else console.log("Admin public catalog: 160/160 entries are in sync");
 }catch(e){console.error(e.message);process.exitCode=1}
}
module.exports={generate};
