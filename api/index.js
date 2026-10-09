const {handler}=require("../server");
module.exports=async(req,res)=>{
 const original=new URL(req.url||"/api/index.js","http://localhost");
 const route=original.searchParams.get("route");
 if(route){
  const clean=route.replace(/^\/+|\/+$/g,"");
  if(!/^[A-Za-z0-9_./:-]{1,200}$/.test(clean)||clean.split("/").some(p=>p==="."||p==="..")){res.statusCode=400;return res.end("Invalid API route")}
  original.searchParams.delete("route");
  req.url="/api/"+clean+(original.searchParams.size?"?"+original.searchParams.toString():"");
 }
 return handler(req,res);
};
