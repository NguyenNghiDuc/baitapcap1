const fs=require("fs"),path=require("path"),crypto=require("crypto"),esbuild=require("esbuild");
const ROOT=process.cwd(),OUT=path.join(ROOT,"dist");
function walk(dir,out=[]){if(!fs.existsSync(dir))return out;for(const n of fs.readdirSync(dir)){const p=path.join(dir,n),st=fs.statSync(p);if(st.isDirectory())walk(p,out);else out.push(p)}return out}
function ensure(p){fs.mkdirSync(path.dirname(p),{recursive:true})}
function copyFile(src,dst){ensure(dst);fs.copyFileSync(src,dst)}
(async()=>{
 fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
 for(const dir of ["js","css"]){
  for(const file of walk(path.join(ROOT,dir))){
   const rel=path.relative(ROOT,file),dst=path.join(OUT,rel),ext=path.extname(file);
   ensure(dst);
   if(ext===".js"||ext===".css"){const src=fs.readFileSync(file,"utf8"),r=await esbuild.transform(src,{loader:ext===".js"?"js":"css",minify:true,target:ext===".js"?"es2020":undefined,legalComments:"none"});fs.writeFileSync(dst,r.code)}
   else copyFile(file,dst)
  }
 }
 for(const name of ["index.html","kiem-tra.html","kiem-tra-nang-cao.html","de-giua-ki-1-toan-4.html","manifest.webmanifest","offline-manifest.json","privacy.html","terms.html","sw.js","favicon.ico"]){const src=path.join(ROOT,name);if(fs.existsSync(src))copyFile(src,path.join(OUT,name))}
 for(const dir of ["assets","images","icons"]){for(const file of walk(path.join(ROOT,dir)))copyFile(file,path.join(OUT,path.relative(ROOT,file)))}
 const hashes={};for(const file of [...walk(path.join(OUT,"js")),...walk(path.join(OUT,"css"))]){const rel="/"+path.relative(OUT,file).replace(/\\/g,"/"),hash=crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0,10);hashes[rel]=hash}
 let html=fs.readFileSync(path.join(OUT,"index.html"),"utf8");
 html=html.replace(/(src|href)="(\/?(?:js|css)\/[^"?]+)(?:\?[^"]*)?"/g,(m,a,u)=>{const key=u.startsWith("/")?u:"/"+u,h=hashes[key];return h?`${a}="${u}?h=${h}"`:m});
 fs.writeFileSync(path.join(OUT,"index.html"),html);fs.writeFileSync(path.join(OUT,"asset-hashes.json"),JSON.stringify({version:require("../package.json").version,hashes},null,2));
 console.log("Production build complete:",Object.keys(hashes).length,"hashed JS/CSS files");
})().catch(e=>{console.error(e);process.exit(1)});