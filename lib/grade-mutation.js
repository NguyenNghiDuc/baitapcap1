"use strict";
const crypto=require("node:crypto");
// Only grade-specific writes use this row-locked transaction. Legacy app_state
// writers elsewhere still require a wider concurrency migration.
function recordAudit(db,user,action,meta){
 const event={id:crypto.randomUUID(),userId:user?.id||null,action,
  meta,at:new Date().toISOString()};
 db.audit=Array.isArray(db.audit)?db.audit:[];
 db.audit.unshift(event);db.audit=db.audit.slice(0,2000);
 return event;
}
async function readLatest(ctx){
 if(process.env.DATABASE_URL){
  const db=await ctx.pg.loadAppState();
  if(!db||!Array.isArray(db.users))throw Error("PostgreSQL app_state chưa sẵn sàng");
  return db;
 }
 return ctx.load();
}
async function execute(ctx,operation){
 if(process.env.DATABASE_URL){
  if(!ctx.pg?.mutateAppState||!ctx.storage?.flush||!ctx.storage?.adopt)
   throw Error("Transactional grade storage not configured");
  await ctx.storage.flush();
  const out=await ctx.pg.mutateAppState((db,client)=>operation(db,recordAudit,client));
  if(out.changed)ctx.storage.adopt(out.state);
  return out;
 }
 const db=ctx.load();
 const out=await operation(db,(state,user,action,meta)=>{
  ctx.audit(state,user,action,meta);
  return null;
 });
 if(out.changed)ctx.save(db);
 return out;
}
module.exports={execute,readLatest,recordAudit};
