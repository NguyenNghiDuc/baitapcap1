module.exports=async function handleHealth(req,res,p,ctx){
 if(req.method!=="GET"||p!=="/api/health")return false;
 const {send,storage,pg,supabase}=ctx;const db=await pg.health().catch(e=>({enabled:!!process.env.DATABASE_URL,error:e.message}));
 return send(res,db.error?503:200,{ok:!db.error,storage:storage.status(),database:{enabled:!!db.enabled,error:db.error||null},supabase:{enabled:supabase.enabled()},version:require("../package.json").version,now:new Date().toISOString()}),true;
};