module.exports=async function handleExamSettings(req,res,p,ctx){
 const {send,parseBody,requireUser,load,save,audit}=ctx;
 const defaults={dailyMin:45,grade4Min:60,grade5Min:60,overrides:{}};
 if(req.method==="GET"&&p==="/api/exam-settings"){
  const db=load();return send(res,200,{settings:{...defaults,...(db.examSettings||{}),overrides:{...defaults.overrides,...(db.examSettings?.overrides||{})}}}),true;
 }
 if(req.method==="POST"&&p==="/api/exam-settings"){
  const u=await requireUser(req,res,["teacher","admin"]);if(!u)return true;let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  const clamp=n=>Math.max(5,Math.min(180,Number(n)||0)),db=load(),cur={...defaults,...(db.examSettings||{}),overrides:{...(db.examSettings?.overrides||{})}};
  if(d.dailyMin!=null)cur.dailyMin=clamp(d.dailyMin);
  if(d.grade4Min!=null)cur.grade4Min=clamp(d.grade4Min);
  if(d.grade5Min!=null)cur.grade5Min=clamp(d.grade5Min);
  if(d.examId){
    const id=String(d.examId);
    const mins=clamp(d.minutes);
    if(d.clear===true||d.clear==="true")delete cur.overrides[id];
    else cur.overrides[id]=mins;
  }
  db.examSettings=cur;audit?.record(db,u,"exam_settings_updated",{examId:d.examId||null,dailyMin:cur.dailyMin,grade4Min:cur.grade4Min,grade5Min:cur.grade5Min});save(db);return send(res,200,{settings:cur}),true;
 }
 return false;
};