const crypto=require("crypto");
module.exports=async function handleSupabaseAuth(req,res,p,ctx){
 const {send,parseBody,load,save,supabase,monitor}=ctx;
 if(req.method==="GET"&&p==="/api/public-config"){
  return send(res,200,{supabase:{url:process.env.SUPABASE_URL||"",publishableKey:process.env.SUPABASE_PUBLISHABLE_KEY||"",enabled:supabase.enabled()},captcha:{provider:process.env.CAPTCHA_PROVIDER||"",siteKey:process.env.TURNSTILE_SITE_KEY||""},appUrl:process.env.APP_PUBLIC_URL||process.env.PUBLIC_BASE_URL||""}),true;
 }
 if(req.method==="POST"&&p==="/api/auth/sync"){
  let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  const token=String(d.accessToken||"");const su=await supabase.getUserFromToken(token);if(!su)return send(res,401,{error:"Supabase session không hợp lệ"}),true;
  const db=load();let u=db.users.find(x=>x.authUserId===su.id||String(x.email||"").toLowerCase()===String(su.email||"").toLowerCase());
  const md=su.user_metadata||{};
  if(!u){
   u={id:"sb-"+crypto.randomUUID(),authUserId:su.id,email:su.email||"",name:String(md.name||md.full_name||su.email?.split("@")[0]||"Học sinh"),role:["student","parent","teacher"].includes(md.role)?md.role:"student",grade:Number(md.grade)||4,avatar:String(md.avatar||"👧🏻"),emailVerified:!!su.email_confirmed_at,children:[],createdAt:new Date().toISOString()};
   db.users.push(u);
  }else{
   u.authUserId=su.id;u.email=su.email||u.email;u.emailVerified=!!su.email_confirmed_at;
   if(md.name||md.full_name)u.name=String(md.name||md.full_name);
   if(["student","parent","teacher"].includes(md.role)&&u.role!=="admin")u.role=md.role;
   if(Number(md.grade)>=1&&Number(md.grade)<=5)u.grade=Number(md.grade);
  }
  save(db);monitor.info("supabase_auth_sync",{userId:u.id,authUserId:su.id,role:u.role});
  return send(res,200,{user:{id:u.id,email:u.email,name:u.name,role:u.role,grade:u.grade,avatar:u.avatar,emailVerified:!!u.emailVerified}}),true;
 }
 return false;
};