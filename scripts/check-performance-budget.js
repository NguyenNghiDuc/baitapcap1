"use strict";
/* Deterministic bundle budget: no remote requests, no third-party benchmarks.
 * Counts required critical CSS/JS and validates route-lazy assets after build.
 */
const fs=require("node:fs"),path=require("node:path"),zlib=require("node:zlib"),assert=require("node:assert/strict");
const ROOT=path.join(__dirname,"..");
const limits={scripts:30,styles:10,sourceJsBytes:195000,sourceCssBytes:70000,brotliEstimatedBytes:110000};
function read(p){return fs.readFileSync(path.join(ROOT,p),"utf8")}
function scan(html){
 const scriptPaths=[...html.matchAll(/<script[^>]+src=["'](\/?js\/[^"'?]+)(?:\?[^"']*)?["']/g)].map(m=>m[1].replace(/^\//,""));
 const stylePaths=[...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["'](\/?css\/[^"'?]+)(?:\?[^"']*)?["']/g)].map(m=>m[1].replace(/^\//,""));
 return {scriptPaths,stylePaths}
}
function validate(opts={}){
 const h=read("index.html"),{scriptPaths,stylePaths}=scan(h);
 const fail=[];
 const unique=a=>new Set(a).size===a.length;
 if(!unique(scriptPaths))fail.push("Có JavaScript được nạp trùng trên trang đầu");
 if(!unique(stylePaths))fail.push("Có stylesheet được nạp trùng trên trang đầu");
 const size=a=>a.reduce((n,p)=>n+fs.statSync(path.join(ROOT,p)).size,0);
 const jsBytes=size(scriptPaths),cssBytes=size(stylePaths);
 const compressed=scriptPaths.concat(stylePaths).reduce((n,p)=>n+zlib.brotliCompressSync(fs.readFileSync(path.join(ROOT,p)),{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:5}}).length,0);
 for(const [name,value] of Object.entries({scripts:scriptPaths.length,styles:stylePaths.length,sourceJsBytes:jsBytes,sourceCssBytes:cssBytes,brotliEstimatedBytes:compressed})){
  if(value>limits[name])fail.push(name+" vượt ngân sách: "+value+" / "+limits[name]);
 }
 if(stylePaths.some(p=>/css\/admin-(results|users|console|audit)\.css$/.test(p)))fail.push("Không được tải CSS chỉ dành cho Admin ở trang học sinh");
 const lazy=read("js/perf/loader.js");
 const assets=[...lazy.matchAll(/["'](\/(?:css|js)\/[^"'?]+?\.(?:css|js))["']/g)].map(m=>m[1].slice(1));
 for(const name of assets)if(!fs.existsSync(path.join(ROOT,name)))fail.push("Thiếu lazy asset: "+name);
 const dist=path.join(ROOT,"dist");
 if(fs.existsSync(path.join(dist,"index.html"))){
  const prod=scan(fs.readFileSync(path.join(dist,"index.html"),"utf8"));
  for(const p of [...prod.scriptPaths,...prod.stylePaths,...assets]){
   if(!fs.existsSync(path.join(dist,p)))fail.push("Bản build thiếu: "+p);
  }
  const manifest=JSON.parse(fs.readFileSync(path.join(dist,"asset-hashes.json"),"utf8"));
  for(const p of assets)if(!manifest.hashes["/"+p])fail.push("Không có hash phiên bản cho: "+p);
 }
 const result={ok:fail.length===0,initial:{scripts:scriptPaths.length,styles:stylePaths.length,jsBytes,cssBytes,estimatedBrotliBytes:compressed},limits,lazyAssets:assets.length,failures:fail};
 if(opts.throwOnFailure&&fail.length)throw new Error(fail.join("\n"));
 return result
}
if(require.main===module){
 try{const result=validate({throwOnFailure:true});console.log("Frontend performance budget:",JSON.stringify(result.initial),"lazy assets:",result.lazyAssets)}
 catch(e){console.error("Frontend performance budget failed:\n"+e.message);process.exitCode=1}
}
module.exports={scan,validate};
