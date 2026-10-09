const editable=["name","phone","birthday","gender","grade","school","address"];
const text=(v,max)=>String(v??"").trim().slice(0,max);
module.exports=async function handleProfile(req,res,p,ctx){
 if(p!=="/api/profile/overview"&&p!=="/api/profile/details")return false;
 const {send,parseBody,requireUser,load,save}=ctx,u=await requireUser(req,res);if(!u)return true;
 const db=load(),account=db.users.find(x=>x.id===u.id);if(!account)return send(res,404,{error:"Hồ sơ chưa được đồng bộ"}),true;
 if(req.method==="PATCH"&&p==="/api/profile/details"){
  let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  if(!d||typeof d!=="object"||Array.isArray(d))return send(res,400,{error:"Dữ liệu không hợp lệ"}),true;
  if(d.name!==undefined&&(typeof d.name!=="string"||!d.name.trim()||d.name.length>80))return send(res,400,{error:"Họ tên từ 1–80 ký tự"}),true;
  if(d.phone!==undefined&&(!/^\\+?[0-9 ()-]{0,22}$/.test(String(d.phone))))return send(res,400,{error:"Số điện thoại không hợp lệ"}),true;
  if(d.birthday!==undefined&&d.birthday!==""&&(!/^\\d{4}-\\d{2}-\\d{2}$/.test(String(d.birthday))||isNaN(Date.parse(d.birthday))||Date.parse(d.birthday)>Date.now()))return send(res,400,{error:"Ngày sinh không hợp lệ"}),true;
  if(d.gender!==undefined&&!["","female","male","other"].includes(d.gender))return send(res,400,{error:"Giới tính không hợp lệ"}),true;
  if(d.grade!==undefined&&(!Number.isInteger(Number(d.grade))||Number(d.grade)<1||Number(d.grade)>5))return send(res,400,{error:"Lớp phải từ 1 đến 5"}),true;
  for(const k of editable){if(d[k]===undefined)continue;account[k]=k==="grade"?Number(d[k]):text(d[k],k==="address"?180:k==="school"?120:80)}
  await save(db);return send(res,200,{ok:true}),true;
 }
 if(req.method==="GET"&&p==="/api/profile/overview"){
  const results=(db.results||[]).filter(r=>r.userId===account.id||(r.studentId===account.id));
  const scores=results.map(r=>Number(r.score)).filter(Number.isFinite);
  const parents=(db.users||[]).filter(x=>x.role==="parent"&&Array.isArray(x.children)&&x.children.includes(account.id)).map(x=>({name:x.name||"Phụ huynh",email:x.email||""}));
  const transactions=(db.demoTransactions||[]).filter(x=>x.userId===account.id),balance=transactions.reduce((n,x)=>n+Number(x.amount||0),0);
  const vipUntil=account.demoVipUntil||null;
  const notifications=Object.assign({email:true,schedule:true,homework:true,achievements:true},account.notificationPreferences||{});
  return send(res,200,{profile:{name:account.name,email:account.email,role:account.role,grade:account.grade,avatar:account.avatar,emailVerified:!!account.emailVerified,phone:account.phone||"",birthday:account.birthday||"",gender:account.gender||"",school:account.school||"",address:account.address||""},progress:{completed:results.length,average:scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null,streak:null,badges:null},parents,wallet:{demo:true,enabled:process.env.WALLET_DEMO==="1"||(process.env.NODE_ENV!=="production"&&process.env.WALLET_DEMO!=="0"),balance,active:!!vipUntil&&Date.parse(vipUntil)>Date.now(),until:vipUntil},notifications}),true;
 }
 if(req.method==="PATCH"&&p==="/api/profile/overview"){
  let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  if(!d||typeof d!=="object"||!d.notifications||typeof d.notifications!=="object")return send(res,400,{error:"Thông báo không hợp lệ"}),true;
  const prefs=account.notificationPreferences||{};
  for(const key of ["email","schedule","homework","achievements"]){if(typeof d.notifications[key]==="boolean")prefs[key]=d.notifications[key]}
  account.notificationPreferences=prefs;await save(db);return send(res,200,{ok:true,notifications:prefs}),true;
 }
 return send(res,405,{error:"Phương thức không hỗ trợ"}),true;
};