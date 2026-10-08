window.ExamLock=(()=>{
 let active=false,lockedHash="",beforeUnload=null,clickGuard=null,hashGuard=null,popGuard=null,keyGuard=null,visibilityGuard=null,sideNotice=null,leaveCount=0;
 function restoreRoute(){
  if(!active)return;
  const current=location.hash||"";
  if(current!==lockedHash)history.replaceState({examLocked:true},"",location.pathname+location.search+lockedHash);
 }
 function enter(meta={}){
  if(active)return;
  active=true;lockedHash=location.hash||"#tests";leaveCount=0;
  document.body.classList.add("exam-mode-active");
  document.body.dataset.examTitle=meta.title||"Bài kiểm tra";
  history.replaceState({examLocked:true},"",location.pathname+location.search+lockedHash);
  history.pushState({examLocked:true},"",location.pathname+location.search+lockedHash);

  const sidebar=document.querySelector("#sidebar");
  if(sidebar&&!sidebar.querySelector(".exam-side-lock")){
   sideNotice=document.createElement("div");sideNotice.className="exam-side-lock";
   sideNotice.innerHTML='<span class="exam-side-lock-icon">🔒</span><div><b>Đang làm bài kiểm tra</b><small>Các chức năng khác đang tạm khóa cho đến khi nộp bài.</small></div>';
   sidebar.appendChild(sideNotice)
  }

  clickGuard=e=>{
   if(!active)return;
   const target=e.target.closest?.("a,button,[role=tab],[data-route]");
   if(!target)return;
   if(target.closest("#content"))return;
   e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();
   restoreRoute();
   window.dispatchEvent(new CustomEvent("bt:exam-locked-click"))
  };
  document.addEventListener("click",clickGuard,true);

  hashGuard=()=>{if(active)restoreRoute()};
  window.addEventListener("hashchange",hashGuard,true);

  popGuard=()=>{if(!active)return;restoreRoute();history.pushState({examLocked:true},"",location.pathname+location.search+lockedHash)};
  window.addEventListener("popstate",popGuard,true);

  keyGuard=e=>{
   if(!active)return;
   const navShortcut=(e.altKey&&(e.key==="ArrowLeft"||e.key==="ArrowRight"))||(e.ctrlKey&&["l","k"].includes(e.key.toLowerCase()));
   if(navShortcut){e.preventDefault();e.stopImmediatePropagation()}
  };
  window.addEventListener("keydown",keyGuard,true);

  visibilityGuard=()=>{
   if(!active||document.visibilityState!=="hidden")return;
   leaveCount++;
   document.dispatchEvent(new CustomEvent("bt:exam-tab-leave",{detail:{leaveCount,at:new Date().toISOString()}}))
  };
  document.addEventListener("visibilitychange",visibilityGuard,true);

  beforeUnload=e=>{if(!active)return;e.preventDefault();e.returnValue=""};
  window.addEventListener("beforeunload",beforeUnload);
 }
 function exit(){
  if(!active)return;
  active=false;document.body.classList.remove("exam-mode-active");delete document.body.dataset.examTitle;
  if(clickGuard)document.removeEventListener("click",clickGuard,true);
  if(hashGuard)window.removeEventListener("hashchange",hashGuard,true);
  if(popGuard)window.removeEventListener("popstate",popGuard,true);
  if(keyGuard)window.removeEventListener("keydown",keyGuard,true);
  if(visibilityGuard)document.removeEventListener("visibilitychange",visibilityGuard,true);
  if(beforeUnload)window.removeEventListener("beforeunload",beforeUnload);
  clickGuard=hashGuard=popGuard=keyGuard=visibilityGuard=beforeUnload=null;
  sideNotice?.remove();sideNotice=null;
 }
 function isActive(){return active}
 function route(){return lockedHash}
 function stats(){return {active,lockedHash,leaveCount}}
 return {enter,exit,isActive,route,stats,restoreRoute}
})();