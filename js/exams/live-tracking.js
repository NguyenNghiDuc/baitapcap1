/* Server-observed exam sessions. No answer content or graded score is sent here. */
window.ExamTracking=(()=>{
 const inFlight=new Map(),lastHeartbeat=new Map();
 const uid=()=>crypto.randomUUID();
 async function token(){
  if(window.SupabaseApp?.enabled?.()){
   await window.SupabaseApp.ready();
   const {data}=await window.SupabaseApp.client.auth.getSession();
   if(data?.session?.access_token)return data.session.access_token;
  }
  return window.API?.token||"";
 }
 async function send(method,data){
  const credential=await token();
  if(!credential)throw new Error("Cần đăng nhập để theo dõi bài làm");
  const response=await fetch("/api/real/me/exam-sessions/"+method,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+credential},body:JSON.stringify(data),cache:"no-store"});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||"Không đồng bộ được bài làm");
  if(result.source!=="postgres"||!result.session)throw new Error("Không có dữ liệu phiên làm bài từ PostgreSQL");
  return result;
 }
 function meta(z){
  const questions=Array.isArray(z.questions)?z.questions:[];
  return {id:z.trackingId,examId:String(z.examId||z.info?.id||z.lessonId||"practice"),title:String(z.customTitle||z.info?.title||z.title||"Bài luyện tập"),subject:String(z.subject||z.info?.subject||"mixed"),grade:Number(z.grade||z.info?.grade||4),durationMinutes:Number(z.durationMin||z.duration||z.time||15),totalQuestions:questions.length};
 }
 function count(z){return Math.min((z.questions||[]).length,Object.keys(z.answers||{}).filter(k=>z.answers[k]!==undefined&&z.answers[k]!==null&&z.answers[k]!=="").length)}
 function initialize(z){if(!z.trackingId)z.trackingId=uid();return z.trackingId}
 async function begin(z){
  const id=initialize(z);
  if(z.trackingSession)return z.trackingSession;
  if(inFlight.has(id))return inFlight.get(id);
  const request=send("start",meta(z)).then(j=>{z.trackingSession=j.session;z.trackingServerOffset=Date.parse(j.serverNow)-Date.now();z.trackingError="";return j.session})
   .catch(e=>{z.trackingError=e.message;return null})
   .finally(()=>inFlight.delete(id));
  inFlight.set(id,request);
  return request;
 }
 async function heartbeat(z){
  if(!z)return null;
  const id=initialize(z),now=Date.now();
  if(now-(lastHeartbeat.get(id)||0)<20000)return z.trackingSession||null;
  lastHeartbeat.set(id,now);
  const session=await begin(z);
  if(!session||session.submittedAt)return session;
  try{
   const result=await send("heartbeat",{id,answeredCount:count(z)});
   z.trackingSession=result.session;z.trackingServerOffset=Date.parse(result.serverNow)-Date.now();return result.session;
  }catch(e){z.trackingError=e.message;return null}
 }
 async function submit(z){
  if(!z)return false;
  const session=await begin(z);
  if(!session)return false;
  try{
   const result=await send("submit",{id:z.trackingId,answeredCount:count(z)});
   z.trackingSession=result.session;z.trackingServerOffset=Date.parse(result.serverNow)-Date.now();z.trackingError="";
   return !!result.session.submittedAt;
  }catch(e){z.trackingError=e.message;return false}
 }
 function observe(z){
  if(!z||!z.questions?.length)return;
  initialize(z);
  void heartbeat(z);
 }
 function remaining(z){
  const deadline=Date.parse(z?.trackingSession?.dueAt||"");
  return Number.isFinite(deadline)?Math.max(0,Math.ceil((deadline-Date.now()-(z.trackingServerOffset||0))/1000)):null;
 }
 return {begin,heartbeat,submit,observe,remaining};
})();
