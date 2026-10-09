"use strict";
module.exports=async(req,res)=>{
 res.setHeader("Content-Type","application/json; charset=utf-8");
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="GET"){res.statusCode=405;return res.end(JSON.stringify({error:"Method not allowed"}))}
 const configured=Boolean(process.env.AI_API_URL&&process.env.AI_API_KEY);
 let endpointValid=false;try{const endpoint=new URL(process.env.AI_API_URL||"");endpointValid=endpoint.protocol==="https:"&&endpoint.pathname.endsWith("/chat/completions")}catch{}
 res.statusCode=200;
 return res.end(JSON.stringify({configured,endpointValid,modelConfigured:Boolean(process.env.AI_MODEL),provider:"openai-compatible",note:"Chỉ kiểm tra biến môi trường, không thử API key.",version:"ai-status-v2"}));
};
