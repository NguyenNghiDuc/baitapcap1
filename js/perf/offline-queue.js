window.OfflineSyncQueue=(()=>{
 const KEY="bt_offline_queue_v1",DRAFT="bt_exam_draft_v1";let flushing=false;
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
 function saveDraft(draft){localStorage.setItem(DRAFT,JSON.stringify({...draft,savedAt:new Date().toISOString()}))}
 function loadDraft(){try{return JSON.parse(localStorage.getItem(DRAFT)||"null")}catch{return null}}
 function clearDraft(){localStorage.removeItem(DRAFT)}
 function count(){return list().length}
 window.addEventListener("online",()=>flush());
 return {enqueueResult,flush,saveDraft,loadDraft,clearDraft,count}
})();