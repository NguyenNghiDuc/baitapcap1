const crypto=require("crypto");
const PLANS=Object.freeze([{id:"month",name:"VIP 1 tháng",days:30,price:49000},{id:"quarter",name:"VIP 3 tháng",days:90,price:129000},{id:"year",name:"VIP 1 năm",days:365,price:449000}]);
const MAX_CREDIT=100000,DAY=86400000;
const recent=new Map();
function enabled(){return process.env.WALLET_DEMO==="1"||(process.env.NODE_ENV!=="production"&&process.env.WALLET_DEMO!=="0")}
function limit(id){const now=Date.now();const all=(recent.get(id)||[]).filter(t=>now-t<60000);if(all.length>=8)return false;all.push(now);recent.set(id,all);if(recent.size>3000)recent.clear();return true}
function init(db){db.demoTransactions||=[];db.demoPurchases||=[]}
function summary(db,u){const all=db.demoTransactions.filter(x=>x.userId===u.id);const balance=all.reduce((n,x)=>n+x.amount,0);const until=u.demoVipUntil||null;return {demo:true,balance,plans:PLANS,validVip:!!until&&Date.parse(until)>Date.now(),vipUntil:until,history:all.slice(-25).reverse(),purchases:db.demoPurchases.filter(x=>x.userId===u.id).slice(-15).reverse()}}
module.exports=async function wallet(req,res,p,ctx){
 if(!["/api/demo-wallet","/api/demo-wallet/credit","/api/demo-wallet/buy"].includes(p))return false;
 const {send,parseBody,requireUser,load,save}=ctx;
 if(!enabled())return send(res,404,{error:"Ví demo chưa bật. Bật WALLET_DEMO=1 trong môi trường thử nghiệm."}),true;
 const actor=await requireUser(req,res);if(!actor)return true;
 const db=load();init(db);
 const user=db.users.find(x=>x.id===actor.id);if(!user)return send(res,404,{error:"Không tìm thấy hồ sơ"}),true;
 if(req.method==="GET"&&p==="/api/demo-wallet")return send(res,200,{wallet:summary(db,user)}),true;
 if(req.method!=="POST")return send(res,405,{error:"Phương thức không hỗ trợ"}),true;
 if(!limit(user.id))return send(res,429,{error:"Bạn thao tác quá nhanh"}),true;
 let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
 const requestId=String(d.requestId||"");
 if(!/^[a-zA-Z0-9_-]{12,80}$/.test(requestId))return send(res,400,{error:"Thiếu mã giao dịch"}),true;
 if(p==="/api/demo-wallet/credit"){
  const amount=Number(d.amount);
  if(!Number.isInteger(amount)||amount<10000||amount>MAX_CREDIT||amount%1000!==0)return send(res,400,{error:"Tiền ảo demo từ 10.000 tới 100.000, bước 1.000"}),true;
  const prior=db.demoTransactions.find(x=>x.userId===user.id&&x.requestId===requestId);
  if(prior)return send(res,200,{wallet:summary(db,user),duplicate:true}),true;
  const total24=db.demoTransactions.filter(x=>x.userId===user.id&&x.amount>0&&Date.now()-Date.parse(x.at)<DAY).reduce((v,x)=>v+x.amount,0);
  if(total24+amount>200000)return send(res,429,{error:"Giới hạn nhận tiền demo 200.000 mỗi 24 giờ"}),true;
  db.demoTransactions.push({id:crypto.randomUUID(),requestId,userId:user.id,amount,note:"Nhận tiền ảo DEMO",at:new Date().toISOString()});
 }else if(p==="/api/demo-wallet/buy"){
  const old=db.demoPurchases.find(x=>x.userId===user.id&&x.requestId===requestId);
  if(old)return send(res,200,{wallet:summary(db,user),duplicate:true}),true;
  const plan=PLANS.find(x=>x.id===d.planId);if(!plan)return send(res,400,{error:"Gói VIP không hợp lệ"}),true;
  const wallet=summary(db,user);if(wallet.balance<plan.price)return send(res,402,{error:"Số dư demo không đủ"}),true;
  const now=Date.now(),base=Math.max(now,Date.parse(user.demoVipUntil)||0);
  user.demoVipUntil=new Date(base+plan.days*DAY).toISOString();
  const orderId=crypto.randomUUID();
  db.demoTransactions.push({id:crypto.randomUUID(),requestId,userId:user.id,amount:-plan.price,note:"Mua "+plan.name+" (DEMO)",at:new Date().toISOString(),orderId});
  db.demoPurchases.push({id:orderId,requestId,userId:user.id,planId:plan.id,amount:plan.price,at:new Date().toISOString(),until:user.demoVipUntil});
 }
 await save(db);
 return send(res,200,{wallet:summary(db,user)}),true;
};
module.exports.PLANS=PLANS;
