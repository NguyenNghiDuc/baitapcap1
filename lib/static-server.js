const fs=require("fs"),path=require("path"),zlib=require("zlib");
const MIME={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".svg":"image/svg+xml",".pdf":"application/pdf",".webmanifest":"application/manifest+json",".woff2":"font/woff2"};
const TEXT=new Set([".html",".css",".js",".json",".svg",".webmanifest"]);
function etag(st){return 'W/"'+st.size.toString(16)+"-"+Math.floor(st.mtimeMs).toString(16)+'"'}
function cacheControl(file){
 const base=path.basename(file),ext=path.extname(file).toLowerCase();
 if(base==="sw.js"||base==="offline-manifest.json"||ext===".html")return "no-cache, no-store, must-revalidate";
 if([".png",".jpg",".jpeg",".webp",".svg",".woff2"].includes(ext))return "public, max-age=86400, stale-while-revalidate=604800";
 if([".js",".css"].includes(ext))return "public, max-age=300, stale-while-revalidate=86400";
 return "public, max-age=600";
}
function securityHeaders(){
 return {"X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Referrer-Policy":"strict-origin-when-cross-origin","Permissions-Policy":"camera=(self), microphone=(self), geolocation=()","Content-Security-Policy":"default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' https://cdn.jsdelivr.net https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; connect-src 'self' https: wss:; worker-src 'self' blob:; manifest-src 'self'"}
}
function serve(req,res,root,pathname){
 let file;try{file=pathname==="/"?"index.html":decodeURIComponent(pathname.slice(1))}catch{res.writeHead(400,securityHeaders());res.end("Bad request");return Promise.resolve(true)}
 file=path.normalize(file);const allowedRoot=new Set(["index.html","kiem-tra.html","kiem-tra-nang-cao.html","de-giua-ki-1-toan-4.html","de-cuoi-ki-1-toan-4.html","privacy.html","terms.html","favicon.ico","sw.js","manifest.webmanifest","offline-manifest.json","asset-hashes.json"]);const safeDir=/^(js|css|assets|images|icons)[\\/]/;if(path.isAbsolute(file)||file.startsWith("..")||file.includes("\\")||file.split(/[\\/]/).some(x=>x.startsWith("."))||(!allowedRoot.has(file)&&!safeDir.test(file))){res.writeHead(403,securityHeaders());res.end("Forbidden");return Promise.resolve(true)}
 const abs=path.resolve(root,file);
 if(!abs.startsWith(root)){res.writeHead(403,securityHeaders());res.end("Forbidden");return Promise.resolve(true)}
 return new Promise(resolve=>fs.stat(abs,(err,st)=>{
  if(err||!st.isFile()){res.writeHead(404,securityHeaders());res.end("Not found");return resolve(true)}
  const tag=etag(st),headers={...securityHeaders(),"Content-Type":MIME[path.extname(abs).toLowerCase()]||"application/octet-stream","Cache-Control":cacheControl(file),"ETag":tag,"Vary":"Accept-Encoding"};
  if(req.headers["if-none-match"]===tag){res.writeHead(304,headers);res.end();return resolve(true)}
  const ext=path.extname(abs).toLowerCase(),accept=String(req.headers["accept-encoding"]||""),canCompress=TEXT.has(ext)&&st.size>1024;
  let stream=fs.createReadStream(abs);if(canCompress&&accept.includes("br")){headers["Content-Encoding"]="br";stream=stream.pipe(zlib.createBrotliCompress({params:{[zlib.constants.BROTLI_PARAM_QUALITY]:4}}))}else if(canCompress&&accept.includes("gzip")){headers["Content-Encoding"]="gzip";stream=stream.pipe(zlib.createGzip({level:6}))}
  res.writeHead(200,headers);stream.on("close",()=>resolve(true));stream.on("error",()=>{try{res.end()}catch{}resolve(true)});stream.pipe(res)
 }))
}
module.exports={serve,cacheControl,etag};
