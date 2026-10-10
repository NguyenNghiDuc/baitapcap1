const crypto=require("crypto"),pg=require("./postgres");
const pending=new Set();
function record(db,user,action,meta={}){
 const row={id:crypto.randomUUID(),userId:user?.id||null,action:String(action),meta,at:new Date().toISOString()};
 db.audit=db.audit||[];db.audit.unshift(row);db.audit=db.audit.slice(0,2000);
 if(process.env.DATABASE_URL){
  const write=pg.query("INSERT INTO audit_logs(id,user_id,action,meta,created_at) VALUES($1,$2,$3,$4::jsonb,$5) ON CONFLICT(id) DO NOTHING",[row.id,row.userId,row.action,JSON.stringify(meta||{}),row.at]);
  pending.add(write);
  write.then(()=>pending.delete(write),e=>{console.error("[audit-postgres]",e.message);pending.delete(write)});
 }
 return row;
}
async function flush(){await Promise.allSettled([...pending])}
module.exports={record,flush};
