window.OfflineSyncQueue=(()=>{
 const KEY="bt_offline_queue_v1",DRAFT="bt_exam_draft_v1";let flushing=false,draftTimer=null,lastDraftId="";
 function list(){try{return JSON.parse(localStorage.getItem(KEY))||[]}catch{return []}}
 function save(a){localStorage.setItem(KEY,JSON.stringify(a.slice(-100)))}
 function id(){return crypto?.randomUUID?.()||("q-"+Date.now()+"-"+Math.random().toString(36).slice(2))}
 function enqueueResult(payload){const a=list(),clientSubmissionId=payload.clientSubmissionId||id();if(!a.some(x=>x.clientSubmissionId===clientSubmissionId)){a.push({type:"result",clientSubmissionId,payload:{...payload,clientSubmissionId},createdAt:new Date().toISOString(),tries:0});save(a)}return clientSubmissionId}
 async function flush(){
  if(flushing||!navigator.onLine||!window.API?.token)return;flushing=true;
  try{
   const a=list(),keep=[];
   for(const item of a){
    try{if(item.type==="result")await API.post("/api/results",item.payload,{retries:1,cancelPrevious:false,key:"offline:"+item.clientSubmissionId,timeout:12000})}
    catch(e){item.tries=(item.tries||0)+1;item.lastError=e.message;if(item.tries<10)keep.push(item)}
   }
   save(keep);window.dispatchEvent(new CustomEvent("bt:sync-flushed",{detail:{remaining:keep.length}}))
  }finally{flushing=false}
 }
 function examId(d){const q=d?.quiz||d||{};return String(q?.meta?.examId||q?.examId||q?.lessonId||q?.customTitle||q?.title||"current-exam").slice(0,160)}
 function saveDraft(draft){
  const payload={...draft,savedAt:new Date().toISOString()};localStorage.setItem(DRAFT,JSON.stringify(payload));lastDraftId=examId(draft);
  clearTimeout(draftTimer);draftTimer=setTimeout(async()=>{if(!navigator.onLine||!API.token)return;try{await API.post("/api/exam-drafts",{clientExamId:lastDraftId,payload},{cancelPrevious:true,key:"exam-draft",timeout:8000})}catch{}},1100)
 }
 function loadDraft(){try{return JSON.parse(localStorage.getItem(DRAFT)||"null")}catch{return null}}
 function clearDraft(){localStorage.removeItem(DRAFT);clearTimeout(draftTimer);const id=lastDraftId;lastDraftId="";if(id&&API.token&&navigator.onLine)API.delete("/api/exam-drafts",{body:JSON.stringify({clientExamId:id}),headers:{"Content-Type":"application/json"},cancelPrevious:false,key:"draft-clear:"+id,retries:0}).catch(()=>{})}
 function count(){return list().length}
 window.addEventListener("online",()=>flush());
 return {enqueueResult,flush,saveDraft,loadDraft,clearDraft,count}
})();