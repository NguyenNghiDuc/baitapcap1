/* Reliable cross-device score sync for standalone term/advanced exams.
   Scores are self-reported by the browser and NOT teacher verified. */
window.ExamResultSync=(()=>{
 const KEY="bt_standalone_scores_pending_v1";
 let busy=false;
 function queued(){try{const j=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(j)?j:[]}catch{return []}}
 function store(all){try{localStorage.setItem(KEY,JSON.stringify(all.slice(-100)))}catch{}}
 function uid(session){return String(session?.user?.id||"")}
 async function session(){return window.SupabaseApp?.session?.()||null}
 function createId(){return crypto?.randomUUID?.()||("exam-"+Date.now()+"-"+Math.random().toString(36).slice(2))}
 async function send(item,token){
  if(!token)throw new Error("Phiên đăng nhập không hợp lệ");
  const resp=await fetch("/api/results",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify(item.payload),cache:"no-store"});
  const result=await resp.json().catch(()=>({}));
  if(!resp.ok)throw new Error(result.error||"Không đồng bộ được điểm (HTTP "+resp.status+")");
  return result;
 }
 async function submit(payload){
  const s=await session(),ownerUid=uid(s);
  if(!ownerUid) return {synced:false,message:"Chưa có phiên đăng nhập. Kết quả chỉ được lưu trên thiết bị."};
  const clientSubmissionId=String(payload.clientSubmissionId||createId());
  const entry={ownerUid,clientSubmissionId,payload:{...payload,clientSubmissionId},createdAt:new Date().toISOString()};
  const all=queued();
  if(!all.some(x=>x.ownerUid===ownerUid&&x.clientSubmissionId===clientSubmissionId)){all.push(entry);store(all)}
  try{
   await send(entry,s.access_token);
   store(queued().filter(x=>!(x.ownerUid===ownerUid&&x.clientSubmissionId===clientSubmissionId)));
   return {synced:true,message:"Đã lưu kết quả lên máy chủ. Admin có thể xem trong bảng điểm."};
  }catch(e){return {synced:false,message:"Chưa đồng bộ lên máy chủ: "+(e?.message||"Lỗi mạng")+". Hãy nhấn Thử gửi lại."}}
 }
 async function retryPending(){
  if(busy)return {synced:0,pending:queued().length};
  busy=true;
  try{
   const s=await session(),ownerUid=uid(s);
   if(!ownerUid)return {synced:0,pending:queued().length,message:"Vui lòng đăng nhập lại"};
   let synced=0,remaining=[];
   for(const item of queued()){
    if(item.ownerUid!==ownerUid){remaining.push(item);continue}
    try{await send(item,s.access_token);synced++}catch(e){remaining.push(item)}
   }
   store(remaining);
   return {synced,pending:remaining.filter(x=>x.ownerUid===ownerUid).length};
  }finally{busy=false}
 }
 window.addEventListener("online",()=>{void retryPending()});
 return {submit,retryPending,queued};
})();