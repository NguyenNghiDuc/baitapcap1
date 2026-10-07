const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),url=require('url');
const PORT=process.env.PORT||3000,ROOT=__dirname,DB=path.join(ROOT,'data','db.json');
const sessions=new Map(),attempts=new Map();
function load(){try{return JSON.parse(fs.readFileSync(DB,'utf8'))}catch{return {users:[]}}}
function save(db){fs.mkdirSync(path.dirname(DB),{recursive:true});fs.writeFileSync(DB,JSON.stringify(db,null,2))}
function hashPassword(password,salt=crypto.randomBytes(16).toString('hex')){return salt+':'+crypto.scryptSync(password,salt,64).toString('hex')}
function verify(password,stored){const [salt,hash]=stored.split(':');const a=Buffer.from(hash,'hex'),b=crypto.scryptSync(password,salt,64);return a.length===b.length&&crypto.timingSafeEqual(a,b)}
function json(res,code,obj){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer'});res.end(JSON.stringify(obj))}
function body(req){return new Promise((resolve,reject)=>{let d='';req.on('data',c=>{d+=c;if(d.length>1e6)req.destroy()});req.on('end',()=>{try{resolve(JSON.parse(d||'{}'))}catch{reject(new Error('json'))}})})}
function allowed(ip){const now=Date.now(),arr=(attempts.get(ip)||[]).filter(t=>now-t<60000);arr.push(now);attempts.set(ip,arr);return arr.length<=8}
function safeUser(u){return {id:u.id,name:u.name,email:u.email,role:u.role,grade:u.grade||null,avatar:u.avatar||'👧🏻'}}
function mime(file){return ({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream'}
http.createServer(async(req,res)=>{
 const p=url.parse(req.url).pathname,ip=req.socket.remoteAddress||'unknown';
 if(req.method==='POST'&&p==='/api/register'){
  if(!allowed(ip))return json(res,429,{error:'Thử lại sau'});let d;try{d=await body(req)}catch{return json(res,400,{error:'JSON không hợp lệ'})}
  const email=String(d.email||'').trim().toLowerCase(),password=String(d.password||'');
  if(!email.includes('@')||password.length<8)return json(res,400,{error:'Email hợp lệ và mật khẩu tối thiểu 8 ký tự'});
  const db=load();if(db.users.some(u=>u.email===email))return json(res,409,{error:'Email đã tồn tại'});
  const u={id:crypto.randomUUID(),name:String(d.name||'Học sinh').slice(0,80),email,password:hashPassword(password),role:'student',grade:Number(d.grade)||1,avatar:'👧🏻'};db.users.push(u);save(db);return json(res,201,{user:safeUser(u)});
 }
 if(req.method==='POST'&&p==='/api/login'){
  if(!allowed(ip))return json(res,429,{error:'Quá nhiều lần thử'});let d;try{d=await body(req)}catch{return json(res,400,{error:'JSON không hợp lệ'})}
  const db=load(),u=db.users.find(x=>x.email===String(d.email||'').trim().toLowerCase());if(!u||!verify(String(d.password||''),u.password))return json(res,401,{error:'Sai tài khoản hoặc mật khẩu'});
  const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{uid:u.id,exp:Date.now()+7*864e5});return json(res,200,{token,user:safeUser(u)});
 }
 if(req.method==='GET'&&p==='/api/me'){
  const token=(req.headers.authorization||'').replace(/^Bearer /,''),s=sessions.get(token);if(!s||s.exp<Date.now())return json(res,401,{error:'Phiên không hợp lệ'});const u=load().users.find(x=>x.id===s.uid);return json(res,200,{user:safeUser(u)});
 }
 if(req.method==='POST'&&p==='/api/logout'){const token=(req.headers.authorization||'').replace(/^Bearer /,'');sessions.delete(token);return json(res,200,{ok:true})}
 let file=p==='/'?'index.html':decodeURIComponent(p.slice(1));file=path.normalize(file).replace(/^(\.\.(\/|\\|$))+/,'');let abs=path.join(ROOT,file);if(!abs.startsWith(ROOT))return json(res,403,{error:'Forbidden'});
 const gzApp=file==='js/app.js'&&fs.existsSync(abs+'.gz');if(gzApp)abs+='.gz';
 fs.stat(abs,(err,st)=>{if(err||!st.isFile()){res.writeHead(404);return res.end('Not found')}const headers={'Content-Type':gzApp?'text/javascript; charset=utf-8':mime(abs),'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; img-src 'self' data:; connect-src 'self'"};if(gzApp)headers['Content-Encoding']='gzip';res.writeHead(200,headers);fs.createReadStream(abs).pipe(res)})
}).listen(PORT,()=>console.log('Bài Tập Cấp 1: http://localhost:'+PORT));
