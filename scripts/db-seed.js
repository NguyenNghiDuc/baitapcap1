const path=require("path"),crypto=require("crypto");
require("dotenv").config({path:path.join(process.cwd(),".env")});
const {Pool}=require("pg");
function hashPassword(p){const salt=crypto.randomBytes(16).toString("hex"),hash=crypto.scryptSync(p,salt,64).toString("hex");return salt+":"+hash}
async function main(){
 if(!process.env.DATABASE_URL)throw new Error("Thiếu DATABASE_URL");
 const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.PGSSL==="0"?false:{rejectUnauthorized:false}});
 const users=[
  ["demo-student","hocsinh@demo.vn","Bé Minh Anh","student",3,"👧🏻","Demo1234!"],
  ["demo-teacher","giaovien@demo.vn","Cô Lan","teacher",null,"👩🏻‍🏫","Demo1234!"],
  ["demo-parent","phuhuynh@demo.vn","Phụ huynh Minh Anh","parent",null,"👩🏻","Demo1234!"],
  ["demo-admin","admin@demo.vn","Quản trị viên","admin",null,"🧑🏻‍💻","27032006"]
 ];
 try{
  for(const [id,email,name,role,grade,avatar,password] of users){
   await pool.query(`INSERT INTO users(id,email,password_hash,name,role,grade,avatar,email_verified,created_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,true,now())
    ON CONFLICT(id) DO UPDATE SET email=EXCLUDED.email,name=EXCLUDED.name,role=EXCLUDED.role,grade=EXCLUDED.grade,avatar=EXCLUDED.avatar,email_verified=true`,
    [id,email,hashPassword(password),name,role,grade,avatar]);
  }
  await pool.query("UPDATE users SET children=$1::jsonb WHERE id='demo-parent'",[JSON.stringify(["demo-student"])]);
  console.log("Seed OK. Admin: admin@demo.vn / 27032006");
 }finally{await pool.end()}
}
main().catch(e=>{console.error(e);process.exit(1)});
