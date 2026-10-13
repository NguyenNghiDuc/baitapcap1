window.OfflineSyncQueue=(()=>{
 const PREFIX="bt_offline_queue_v2_",DRAFT="bt_exam_draft_v2_";
 let owner="",flushing=false,draftTimer=null,lastDraftId="";
 const hash=s=>{let a=2166136261,b=5381;for(const ch of s){const c=ch.charCodeAt(0);a=Math.imul(a^c,16777619);b=Math.imul(b,33)^c}return (a>>>0).toString(16)+(b>>>0).toString(16)};
 function setOwner(user){
  const email=String(user?.email||"").trim().toLowerCase();
  const next=email?hash(email):"";
  if(owner===next)return;
  clearTimeout(draftTimer);
  lastDraftId="";owner=next;
  if(owner&&navigator.onLine)Promise.resolve().then(flush).catch(()=>{});
 }
 const key=()=>PREFIX+owner,draftKey=()=>DRAFT+(owner||"guest");
 function list(){if(!owner)return [];try{const items=JSON.parse(localStorage.getItem(key())||"[]");return Array.isArray(items)?items:[]}catch{return []}}
 function save(items){if(!owner)return;localStorage.setItem(key(),JSON.stringify(items.slice(-200)))}
 const id=()=>crypto.randomUUID?.()||("q-"+Date.now()+"-"+Math.random().toString(36).slice(2));
 function enqueueResult(payload){
  if(!owner)throw new Error("Cần đăng nhập để đồng bộ điểm.");
  const items=list(),clientSubmissionId=payload.clientSubmissionId||id();
  if(!items.some(x=>x.clientSubmissionId===clientSubmissionId)){
   items.push({type:"result",clientSubmissionId,payload:{...payload,clientSubmissionId},createdAt:new Date().toISOString(),tries:0});
   save(items);
  }
  return clientSubmissionId;
 }
 async function flush(){
  if(flushing||!owner||!navigator.onLine||!window.API?.token)return;
  flushing=true;const startOwner=owner;let sent=0;
  try{
   const snapshot=list().slice(0,30);
   for(const item of snapshot){
    if(owner!==startOwner||!navigator.onLine||!window.API?.token)break;
    try{
     if(item.type!=="result")continue;
     await API.post("/api/results",item.payload,{retries:0,timeout:12000});
     if(owner!==startOwner)break;
     save(list().filter(x=>x.clientSubmissionId!==item.clientSubmissionId));sent++;
    }catch(e){
     if(owner!==startOwner)break;
     const remaining=list(),target=remaining.find(x=>x.clientSubmissionId===item.clientSubmissionId);
     if(target){target.tries=(target.tries||0)+1;target.lastError=String(e.message||"Lỗi mạng").slice(0,150);save(remaining)}
     if([401,403,423,429].includes(e.status)||!navigator.onLine)break;
     // Keep all failed submissions for the next online attempt; never discard after N tries.
    }
   }
  }finally{
   flushing=false;
   window.dispatchEvent(new CustomEvent("bt:sync-flushed",{detail:{remaining:list().length,sent}}));
  }
 }
 function examId(d){const q=d?.quiz||d||{};return String(q?.meta?.examId||q?.examId||q?.lessonId||q?.title||"current-exam").slice(0,160)}
 function saveDraft(draft){
  const payload={...draft,savedAt:new Date().toISOString()},currentOwner=owner;
  localStorage.setItem(draftKey(),JSON.stringify(payload));lastDraftId=examId(draft);
  clearTimeout(draftTimer);
  draftTimer=setTimeout(async()=>{
   if(!currentOwner||owner!==currentOwner||!navigator.onLine||!API.token)return;
   try{await API.post("/api/exam-drafts",{clientExamId:lastDraftId,payload},{timeout:8000,retries:0})}catch{}
  },1200);
 }
 function loadDraft(){try{return JSON.parse(localStorage.getItem(draftKey())||"null")}catch{return null}}
 function clearDraft(){
  localStorage.removeItem(draftKey());clearTimeout(draftTimer);
  const target=lastDraftId;lastDraftId="";
  if(target&&owner&&API.token&&navigator.onLine)
   API.delete("/api/exam-drafts",{body:JSON.stringify({clientExamId:target}),headers:{"Content-Type":"application/json"},retries:0}).catch(()=>{});
 }
 function count(){return list().length}
 function status(){return {pending:count(),accountReady:!!owner,online:navigator.onLine}}
 window.addEventListener("online",()=>flush());
 return {setOwner,enqueueResult,flush,saveDraft,loadDraft,clearDraft,count,status}
})();