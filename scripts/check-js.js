const fs=require("fs"),path=require("path"),{spawnSync}=require("child_process");
const roots=["js","lib","routes","scripts"],files=[];
function walk(dir){for(const name of fs.readdirSync(dir)){const p=path.join(dir,name),st=fs.statSync(p);if(st.isDirectory())walk(p);else if(p.endsWith(".js"))files.push(p)}}
roots.filter(fs.existsSync).forEach(walk);if(fs.existsSync("sw.js"))files.push("sw.js");
let bad=0;
for(const f of files){const r=spawnSync(process.execPath,["--check",f],{encoding:"utf8"});if(r.status!==0){bad++;process.stderr.write("\n"+f+"\n"+r.stderr)}}
if(bad)process.exit(1);
console.log("Checked "+files.length+" JavaScript files");
