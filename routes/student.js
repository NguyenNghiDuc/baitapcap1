const fs=require("fs"),path=require("path"),crypto=require("crypto"),cache=require("../lib/cache");
module.exports=async function handleStudent(req,res,p,ctx){
 const {send,parseBody,requireUser,load,save,ROOT}=ctx;
 if(req.method==="GET"&&p==="/api/student/leaderboard"){
  const u=await requireUser(req,res);if(!u)return true;
  const key="leaderboard:g"+(u.grade||"all"),rows=await cache.remember(key,30000,async()=>{const db=load(),scores=new Map();
   for(const r of db.results){if(r.verified!==true)continue;const s=scores.get(r.userId)||{attempts:0,points:0,avg:0,sum:0};s.attempts++;s.sum+=Number(r.score)||0;s.points+=(Number(r.correct)||0)*10;s.avg=Math.round(s.sum/s.attempts);scores.set(r.userId,s)}
   return [...scores.entries()].map(([userId,s])=>{const x=db.users.find(v=>v.id===userId);return {userId,name:"Học sinh",grade:x?.grade||null,points:s.points,avg:s.avg,attempts:s.attempts}}).filter(x=>!u.grade||!x.grade||x.grade===u.grade).sort((a,b)=>b.points-a.points||b.avg-a.avg).slice(0,50)
  });
  return send(res,200,{leaderboard:rows,cached:true}),true;
 }
 if(req.method==="GET"&&p==="/api/student/sync"){
  const u=await requireUser(req,res,["student"]);if(!u)return true;const db=load();
  return send(res,200,{sync:u.studentSync||{goals:null,notes:[],bookmarks:[],vocab:[],schedule:[],wrong:[]},updatedAt:u.studentSyncUpdatedAt||null}),true;
 }
 if(req.method==="POST"&&p==="/api/student/sync"){
  const u=await requireUser(req,res,["student"]);if(!u)return true;let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  const db=load(),x=db.users.find(v=>v.id===u.id),sync={goals:d.goals||null,notes:Array.isArray(d.notes)?d.notes.slice(0,200):[],bookmarks:Array.isArray(d.bookmarks)?d.bookmarks.slice(0,500):[],vocab:Array.isArray(d.vocab)?d.vocab.slice(0,500):[],schedule:Array.isArray(d.schedule)?d.schedule.slice(0,200):[],wrong:Array.isArray(d.wrong)?d.wrong.slice(-500):[]};
  x.studentSync=sync;x.studentSyncUpdatedAt=new Date().toISOString();save(db);return send(res,200,{ok:true,updatedAt:x.studentSyncUpdatedAt}),true;
 }
 if(req.method==="POST"&&p==="/api/student/handwriting"){
  const u=await requireUser(req,res,["student"]);if(!u)return true;let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  const m=String(d.dataUrl||"").match(/^data:image\/(png|jpeg);base64,(.+)$/);if(!m)return send(res,400,{error:"Chỉ nhận PNG/JPEG"}),true;
  const buf=Buffer.from(m[2],"base64");if(buf.length>5e6)return send(res,413,{error:"Ảnh tối đa 5MB"}),true;
  const dir=path.join(ROOT,"uploads","student",u.id);fs.mkdirSync(dir,{recursive:true});const name=crypto.randomUUID()+"."+(m[1]==="jpeg"?"jpg":"png");fs.writeFileSync(path.join(dir,name),buf);
  const db=load();db.studentWorks=db.studentWorks||[];const item={id:crypto.randomUUID(),userId:u.id,title:String(d.title||"Bài viết tay").slice(0,120),url:"/uploads/student/"+u.id+"/"+name,createdAt:new Date().toISOString()};db.studentWorks.unshift(item);save(db);return send(res,201,{work:item}),true;
 }
 if(req.method==="POST"&&p==="/api/student/writing-feedback"){
  const u=await requireUser(req,res,["student"]);if(!u)return true;let d;try{d=await parseBody(req)}catch{return send(res,400,{error:"Dữ liệu không hợp lệ"}),true}
  const text=String(d.text||"").slice(0,4000),lang=d.lang==="en"?"English":"Vietnamese";if(!text)return send(res,400,{error:"Thiếu đoạn văn"}),true;
  if(process.env.AI_API_URL&&process.env.AI_API_KEY){try{const rr=await fetch(process.env.AI_API_URL,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.AI_API_KEY},body:JSON.stringify({model:process.env.AI_MODEL||"gpt-4.1-mini",messages:[{role:"system",content:"You are a primary-school writing tutor. Give age-appropriate feedback, preserve the student's voice, identify 2 strengths and at most 3 improvements. Do not rewrite everything."},{role:"user",content:"Language: "+lang+"\nStudent grade: "+(u.grade||"4-5")+"\nText:\n"+text}]})});const j=await rr.json();if(rr.ok)return send(res,200,{feedback:j.choices?.[0]?.message?.content||j.output_text||"Chưa có phản hồi"}),true}catch{}}
  const words=text.trim().split(/\s+/).length;return send(res,200,{feedback:`Đoạn của em có khoảng ${words} từ. Hãy kiểm tra câu mở đầu, dấu câu và xem mỗi câu có diễn đạt một ý rõ ràng không. AI provider chưa được cấu hình nên đây là góp ý cơ bản.`}),true;
 }
 return false;
};