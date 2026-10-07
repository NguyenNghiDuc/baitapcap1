const crypto=require("crypto"),pg=require("./postgres");
function record(db,user,action,meta={}){
 const row={id:crypto.randomUUID(),userId:user?.id||null,action:String(action),meta,at:new Date().toISOString()};
 db.audit=db.audit||[];db.audit.unshift(row);db.audit=db.audit.slice(0,2000);
 if(process.env.DATABASE_URL)pg.query("INSERT INTO audit_logs(id,user_id,action,meta,created_at) VALUES($1,$2,$3,$4::jsonb,$5) ON CONFLICT(id) DO NOTHING",[row.id,row.userId,row.action,JSON.stringify(meta||{}),row.at]).catch(()=>{});
 return row
}
module.exports={record};