"use strict";
// Read-only current-instance alerts; not a durable incident history.
async function bounded(task,ms=1800){
 let timer;
 try{return await Promise.race([Promise.resolve().then(task),new Promise((_,rej)=>{timer=setTimeout(()=>rej(new Error("timeout")),ms)})])}
 finally{clearTimeout(timer)}
}
function assess({db,redis,performance,dbConfigured,redisConfigured,isVercel=false}){
 const incidents=[];
 const add=(id,severity,title,detail)=>incidents.push({id,severity,title,detail});
 if(dbConfigured&&(db?.error||!db?.enabled))add("postgres-unavailable","critical","PostgreSQL không sẵn sàng","Không kết nối được cơ sở dữ liệu của máy chủ hiện tại.");
 if(redisConfigured&&(redis?.error||!redis?.enabled))add("redis-unavailable","warning","Redis không sẵn sàng","Phiên đăng nhập hoặc bộ nhớ đệm có thể bị ảnh hưởng.");
 if(!dbConfigured&&isVercel)add("postgres-not-configured","warning","Chưa cấu hình PostgreSQL","Trên Vercel cần database dùng chung để dữ liệu và quyền nhất quán.");
 if(!redisConfigured)add("redis-not-configured","info","Chưa cấu hình Redis","Có thể dùng cơ chế phiên dự phòng; không mặc định coi đây là sự cố.");
 const routes=Array.isArray(performance?.routes)?performance.routes:[];
 for(const route of routes.filter(x=>Number(x.calls)>=5&&Number(x.p95Ms)>=1800).slice(0,5))
  add("slow-"+route.route,"warning","API phản hồi chậm",route.route+": P95 "+Math.round(Number(route.p95Ms))+" ms trên "+route.calls+" lượt.");
 for(const route of routes.filter(x=>Number(x.errors)>0).slice(0,5))
  add("error-"+route.route,"critical","API trả về lỗi 5xx",route.route+": "+route.errors+" lỗi trong "+route.calls+" lượt.");
 return incidents;
}
async function handler(req,res,p,{send,requireUser,pg,sessionStore,apiPerformance}){
 if(p!=="/api/admin/alerts")return false;
 const admin=await requireUser(req,res,["admin"]);if(!admin)return true;
 if(req.method!=="GET"){send(res,405,{error:"Chỉ hỗ trợ GET"},{"Allow":"GET","Cache-Control":"private, no-store"});return true}
 try{
  const dbConfigured=!!process.env.DATABASE_URL,redisConfigured=!!process.env.REDIS_URL;
  const [db,redis]=await Promise.all([
   bounded(()=>pg.health()).catch(()=>({enabled:dbConfigured,error:"unavailable"})),
   bounded(()=>sessionStore.health()).catch(()=>({enabled:redisConfigured,error:"unavailable"}))
  ]);
  const performance=apiPerformance.summary();
  const incidents=assess({db,redis,performance,dbConfigured,redisConfigured,isVercel:process.env.VERCEL==="1"});
  const counts={critical:incidents.filter(x=>x.severity==="critical").length,
   warning:incidents.filter(x=>x.severity==="warning").length,
   info:incidents.filter(x=>x.severity==="info").length};
  send(res,200,{incidents,counts,sampleCount:Number(performance.sampleCount||0),
   windowMinutes:Number(performance.windowMinutes||15),generatedAt:new Date().toISOString(),
   scope:"current-server-instance",note:"Ảnh chụp trạng thái của một máy chủ; không lưu lịch sử hoặc giám sát liên tục."},
   {"Cache-Control":"private, no-store"});
 }catch{
  send(res,503,{error:"Không đọc được trạng thái cảnh báo trên máy chủ."},{"Cache-Control":"private, no-store"})
 }
 return true;
}
module.exports=handler;
module.exports.assess=assess;
