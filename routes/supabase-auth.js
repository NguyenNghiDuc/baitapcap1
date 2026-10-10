const crypto=require("crypto");
const loginDevices=require("../lib/login-devices");
module.exports=async function handleSupabaseAuth(req,res,p,ctx){
 const {send,parseBody,load,save,supabase,monitor,pg}=ctx;
 if(req.method==="GET"&&p==="/api/public-config"){
  return send(res,200,{supabase:{url:process.env.SUPABASE_URL||"",publishableKey:process.env.SUPABASE_PUBLISHABLE_KEY||"",enabled:supabase.enabled()},captcha:{provider:process.env.CAPTCHA_PROVIDER||"",siteKey:process.env.TURNSTILE_SITE_KEY||""},appUrl:process.env.APP_PUBLIC_URL||process.env.PUBLIC_BASE_URL||"",features:{disabled:String(process.env.DISABLED_FEATURES||"").split(",").map(x=>x.trim()).filter(Boolean)}}),true;
 }
 if(req.method==="POST"&&p==="/api/auth/sync"){
  let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  const token=String(d.accessToken||"");const su=await supabase.getUserFromToken(token);if(!su)return send(res,401,{error:"Supabase session không hợp lệ"}),true;
  const db=load();let u=db.users.find(x=>x.authUserId===su.id);
  const md=su.user_metadata||{};
  // Admin provisioning must be tied to the exact Supabase Auth user UUID,
  // configured by the site owner. Never trust email or user_metadata.role.
  const adminUid=String(process.env.ADMIN_SUPABASE_UID||"").trim();
  const isConfiguredAdmin=Boolean(adminUid&&su.id===adminUid);
  if(!u){
   u={id:"sb-"+crypto.randomUUID(),authUserId:su.id,email:su.email||"",name:String(md.name||md.full_name||su.email?.split("@")[0]||"Học sinh"),role:isConfiguredAdmin?"admin":(["student","parent"].includes(md.role)?md.role:"student"),grade:Number(md.grade)||4,avatar:String(md.avatar||"👧🏻"),emailVerified:!!su.email_confirmed_at,children:[],createdAt:new Date().toISOString()};
   db.users.push(u);
  }else{
   u.authUserId=su.id;u.email=su.email||u.email;u.emailVerified=!!su.email_confirmed_at;
   if(isConfiguredAdmin)u.role="admin";
   else if(u.role!=="admin"&&["student","parent"].includes(md.role))u.role=md.role;
  }
  if(u&&process.env.DATABASE_URL){
   try{const access=await pg.getUserAccess(u.id);if(access){u.role=access.role;u.locked=!!access.locked}}
   catch(e){monitor.warn("auth_user_access_failed",{message:e.message});return send(res,503,{error:"Không thể kiểm tra quyền tài khoản với PostgreSQL"}),true}
  }
  if(u.locked)return send(res,423,{error:"Tài khoản đã bị Admin khóa. Vui lòng liên hệ quản trị viên."}),true;
  loginDevices.record(db,u,req);
  await save(db);await pg.upsertUser(u).catch(e=>monitor.warn("profile_upsert_failed",{message:e.message,userId:u.id}));monitor.info("supabase_auth_sync",{userId:u.id,authUserId:su.id,role:u.role});
  return send(res,200,{user:{id:u.id,email:u.email,name:u.name,role:u.role,grade:u.grade,avatar:u.avatar,avatarPath:u.avatarPath||null,emailVerified:!!u.emailVerified}}),true;
 }
 return false;
};