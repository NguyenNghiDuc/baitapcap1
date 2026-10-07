const path=require("path");
require("dotenv").config({path:path.join(process.cwd(),".env")});
const sb=require("../lib/supabase-admin"),pg=require("../lib/postgres");
(async()=>{
 const admin=sb.getAdmin();if(!admin)throw new Error("Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY");
 const demos=[
  {email:"hocsinh@demo.vn",password:"Demo1234!",meta:{name:"Bé Minh Anh",role:"student",grade:4},appId:"demo-student"},
  {email:"giaovien@demo.vn",password:"Demo1234!",meta:{name:"Cô Lan",role:"teacher"},appId:"demo-teacher"},
  {email:"phuhuynh@demo.vn",password:"Demo1234!",meta:{name:"Phụ huynh Minh Anh",role:"parent"},appId:"demo-parent"},
  {email:"admin@demo.vn",password:"27032006",meta:{name:"Quản trị viên",role:"admin"},appId:"demo-admin"}
 ];
 await pg.connect();
 for(const x of demos){
  const listed=await admin.auth.admin.listUsers({page:1,perPage:1000});if(listed.error)throw listed.error;
  let user=listed.data.users.find(v=>v.email?.toLowerCase()===x.email);
  if(!user){
   const created=await admin.auth.admin.createUser({email:x.email,password:x.password,email_confirm:true,user_metadata:x.meta});
   if(created.error)throw created.error;user=created.data.user;
  }
  await pg.query("UPDATE users SET auth_user_id=$1,email_verified=true WHERE id=$2",[user.id,x.appId]);
  console.log("linked",x.email,user.id);
 }
 await pg.close();
})().catch(e=>{console.error(e);process.exit(1)});