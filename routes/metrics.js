module.exports=async function handleMetrics(req,res,p,ctx){
 if(req.method!=="POST")return false;
 if(p==="/api/client-errors"){
  const {send,parseBody,monitor}=ctx;let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  monitor.error("client_error",{message:String(d.message||"").slice(0,500),stack:String(d.stack||"").slice(0,3000),route:String(d.route||"").slice(0,120),path:String(d.path||"").slice(0,180),ua:String(d.ua||"").slice(0,300)});return send(res,202,{ok:true}),true;
 }
 if(p!=="/api/metrics")return false;
 const {send,parseBody,monitor}=ctx;let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
 const allowed=["LCP","CLS","INP","FCP","TTFB"],name=String(d.name||"").toUpperCase();if(!allowed.includes(name))return send(res,400,{error:"Metric không hợp lệ"}),true;
 const value=Number(d.value);if(!Number.isFinite(value)||value<0)return send(res,400,{error:"Giá trị không hợp lệ"}),true;
 monitor.info("web_vital",{name,value:Math.round(value*100)/100,rating:String(d.rating||""),path:String(d.path||"").slice(0,180),device:String(d.device||"").slice(0,40)});
 return send(res,202,{ok:true}),true;
};