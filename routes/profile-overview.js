const loginDevices=require("../lib/login-devices");
const editable=["name","phone","birthday","gender","grade","school","address"];
const text=(v,max)=>String(v??"").trim().slice(0,max);
module.exports=async function handleProfile(req,res,p,ctx){
 if(p!=="/api/profile/overview"&&p!=="/api/profile/details"&&p!=="/api/profile/avatar")return false;
 const {send,parseBody,requireUser,load,save,pg}=ctx,u=await requireUser(req,res);if(!u)return true;
 const db=load(),account=db.users.find(x=>x.id===u.id)||u;
 const real=process.env.DATABASE_URL?await pg.getProfile(u.id):null;
 if(process.env.DATABASE_URL&&!real)return send(res,503,{error:"Hồ sơ chưa đồng bộ PostgreSQL"}),true;
 if(req.method==="PATCH"&&p==="/api/profile/avatar"){
  if(!account.authUserId)return send(res,403,{error:"Cần đăng nhập bằng Supabase để đồng bộ ảnh"}),true;
  let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  const expected=account.authUserId+"/avatar.jpg";
  if(!d||d.path!==expected)return send(res,400,{error:"Đường dẫn ảnh không thuộc tài khoản"}),true;
  if(real){const ok=await pg.updateAvatarPath(u.id,expected);if(!ok)return send(res,503,{error:"Không lưu được ảnh trong PostgreSQL"}),true;}
  account.avatarPath=expected;
  await save(db);
  return send(res,200,{ok:true,avatarPath:expected}),true;
 }
 if(req.method==="PATCH"&&p==="/api/profile/details"){
  let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  if(!d||typeof d!=="object"||Array.isArray(d))return send(res,400,{error:"Dữ liệu không hợp lệ"}),true;
  if(d.name!==undefined&&(typeof d.name!=="string"||!d.name.trim()||d.name.length>80))return send(res,400,{error:"Họ tên từ 1–80 ký tự"}),true;
  if(d.phone!==undefined){const phone=String(d.phone).normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g,"").trim();if(!/^(?:\+?[0-9][0-9 ()-]{0,21})?$/.test(phone))return send(res,400,{error:"Số điện thoại không hợp lệ"}),true;d.phone=phone;}
  if(d.birthday!==undefined&&d.birthday!==""){const date=String(d.birthday),valid=/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date))&&new Date(date+"T00:00:00.000Z").toISOString().slice(0,10)===date&&Date.parse(date)<=Date.now();if(!valid)return send(res,400,{error:"Ngày sinh không hợp lệ"}),true;}
  if(d.gender!==undefined&&!["","female","male","other"].includes(d.gender))return send(res,400,{error:"Giới tính không hợp lệ"}),true;
  if(d.grade!==undefined&&(!Number.isInteger(Number(d.grade))||Number(d.grade)<1||Number(d.grade)>5))return send(res,400,{error:"Lớp phải từ 1 đến 5"}),true;
  const fields={};
  for(const k of editable){if(d[k]===undefined)continue;fields[k]=k==="grade"?Number(d[k]):text(d[k],k==="address"?180:k==="school"?120:80)}
  if(real){
   try{const updated=await pg.updateProfile(u.id,fields);if(!updated)return send(res,503,{error:"Không cập nhật được PostgreSQL"}),true}
   catch{return send(res,503,{error:"Không lưu được hồ sơ vào PostgreSQL"}),true}
  }
  Object.assign(account,fields);
  await save(db);return send(res,200,{ok:true}),true;
 }
 if(req.method==="GET"&&p==="/api/profile/overview"){
  if(loginDevices.record(db,account,req))await save(db);
  const results=(db.results||[]).filter(r=>r.userId===account.id||(r.studentId===account.id));
  const scores=results.filter(r=>r.score!==null&&r.score!==undefined&&r.score!=="").map(r=>Number(r.score)).filter(Number.isFinite);
  const progress=real?await pg.accountActivity(u.id):null;
  const deviceRows=real?await pg.listDevices(u.id):null;
  const parents=(db.users||[]).filter(x=>x.role==="parent"&&Array.isArray(x.children)&&x.children.includes(account.id)).map(x=>({name:x.name||"Phụ huynh",email:x.email||""}));
  const transactions=(db.demoTransactions||[]).filter(x=>x.userId===account.id),balance=transactions.reduce((n,x)=>n+Number(x.amount||0),0);
  const vipUntil=account.demoVipUntil||null;
  const notifications=Object.assign({email:true,schedule:true,homework:true,achievements:true},real?real.notification_preferences:(account.notificationPreferences||{}));
  return send(res,200,{profile:{name:real?.name??account.name,email:real?.email??account.email,role:real?.role??account.role,grade:real?.grade??account.grade,avatar:real?.avatar??account.avatar,avatarPath:real?.avatar_path??account.avatarPath??null,emailVerified:real?.email_verified??!!account.emailVerified,phone:real?.phone??account.phone??"",birthday:real?.birthday?String(real.birthday).slice(0,10):(account.birthday||""),gender:real?.gender??account.gender??"",school:real?.school??account.school??"",address:real?.address??account.address??""},progress:{completed:progress?progress.total.attempts:results.length,average:progress?progress.total.average===null?null:Number(progress.total.average):(scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null),streak:null,badges:null},parents,wallet:{demo:true,enabled:process.env.WALLET_DEMO==="1"||(process.env.NODE_ENV!=="production"&&process.env.WALLET_DEMO!=="0"),balance,active:!!vipUntil&&Date.parse(vipUntil)>Date.now(),until:vipUntil},notifications,devices:deviceRows?deviceRows.map(x=>({device:x.device,browser:x.browser,ip:x.ip||"Không xác định",firstSeenAt:x.first_seen_at,lastSeenAt:x.last_seen_at,current:x.device_id===loginDevices.clientId(req)})):loginDevices.list(db,account,req)}),true;
 }
 if(req.method==="PATCH"&&p==="/api/profile/overview"){
  let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  if(!d||typeof d!=="object"||!d.notifications||typeof d.notifications!=="object")return send(res,400,{error:"Thông báo không hợp lệ"}),true;
  const prefs=account.notificationPreferences||{};
  for(const key of ["email","schedule","homework","achievements"]){if(typeof d.notifications[key]==="boolean")prefs[key]=d.notifications[key]}
  if(real){try{await pg.updateNotificationPreferences(u.id,prefs)}catch{return send(res,503,{error:"Không lưu được cài đặt trong PostgreSQL"}),true}}
  account.notificationPreferences=prefs;await save(db);return send(res,200,{ok:true,notifications:prefs}),true;
 }
 return send(res,405,{error:"Phương thức không hỗ trợ"}),true;
};