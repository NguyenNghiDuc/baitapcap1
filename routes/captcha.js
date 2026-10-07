module.exports=async function handleCaptcha(req,res,p,ctx){
 const {send,parseBody}=ctx;if(req.method!=="POST"||p!=="/api/captcha/verify")return false;
 if((process.env.CAPTCHA_PROVIDER||"").toLowerCase()!=="turnstile"||!process.env.TURNSTILE_SECRET_KEY)return send(res,200,{ok:true,bypassed:true}),true;
 let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
 const body=new URLSearchParams({secret:process.env.TURNSTILE_SECRET_KEY,response:String(d.token||"")});if(d.remoteip)body.set("remoteip",String(d.remoteip));
 try{const r=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body});const j=await r.json();return send(res,j.success?200:400,{ok:!!j.success,errorCodes:j["error-codes"]||[]}),true}catch(e){return send(res,502,{error:"CAPTCHA verify thất bại"}),true}
};