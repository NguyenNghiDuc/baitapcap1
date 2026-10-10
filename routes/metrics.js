module.exports=async function handleMetrics(req,res,p,ctx){
 if(req.method!=="POST")return false;
 if(p==="/api/client-errors"){
  const {send,parseBody,monitor}=ctx;let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  const strip=v=>String(v||"").replace(/Bearer\\s+[^\\s]+/gi,"[redacted]").replace(/(token|key|password|secret)=\\S+/gi,"$1=[redacted]").slice(0,240);
  const route=String(d.route||"").split("?")[0].slice(0,120),message=strip(d.message);
  monitor.error("client_error",{message,route});
  if(process.env.DATABASE_URL){
   try{await ctx.pg.clientError(route,message)}catch(e){monitor.warn("client_error_store_failed",{message:e.message})}
  }
  return send(res,202,{ok:true}),true;
 }
 if(p!=="/api/metrics")return false;
 const {send,parseBody,monitor}=ctx;let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
 const allowed=["LCP","CLS","INP","FCP","TTFB"],name=String(d.name||"").toUpperCase();if(!allowed.includes(name))return send(res,400,{error:"Metric không hợp lệ"}),true;
 const value=Number(d.value);if(!Number.isFinite(value)||value<0)return send(res,400,{error:"Giá trị không hợp lệ"}),true;
 monitor.info("web_vital",{name,value:Math.round(value*100)/100,rating:String(d.rating||""),path:String(d.path||"").slice(0,180),device:String(d.device||"").slice(0,40)});
 return send(res,202,{ok:true}),true;
};