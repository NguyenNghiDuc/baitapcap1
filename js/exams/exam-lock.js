window.ExamLock=(()=>{
 let active=false,lockedHash="",beforeUnload=null,clickGuard=null,hashGuard=null,sideNotice=null;
 function enter(meta={}){
  if(active)return;active=true;lockedHash=location.hash||"#tests";
  document.body.classList.add("exam-mode-active");
  document.body.dataset.examTitle=meta.title||"Bài kiểm tra";
  const sidebar=document.querySelector("#sidebar");
  if(sidebar&&!sidebar.querySelector(".exam-side-lock")){
   sideNotice=document.createElement("div");sideNotice.className="exam-side-lock";
   sideNotice.innerHTML='<span class="exam-side-lock-icon">🔒</span><div><b>Đang làm bài kiểm tra</b><small>Các chức năng khác đang tạm khóa.</small></div>';
   sidebar.appendChild(sideNotice)
  }
  clickGuard=e=>{
   if(!active)return;const target=e.target.closest?.("a,button");
   if(!target)return;
   if(target.closest("#content"))return;
   e.preventDefault();e.stopPropagation();window.dispatchEvent(new CustomEvent("bt:exam-locked-click"))
  };
  document.addEventListener("click",clickGuard,true);
  hashGuard=()=>{if(!active)return;if(location.hash!==lockedHash)history.replaceState(null,"",location.pathname+location.search+lockedHash)};
  window.addEventListener("hashchange",hashGuard);
  beforeUnload=e=>{if(!active)return;e.preventDefault();e.returnValue=""};
  window.addEventListener("beforeunload",beforeUnload);
 }
 function exit(){
  if(!active)return;active=false;document.body.classList.remove("exam-mode-active");delete document.body.dataset.examTitle;
  if(clickGuard)document.removeEventListener("click",clickGuard,true);
  if(hashGuard)window.removeEventListener("hashchange",hashGuard);
  if(beforeUnload)window.removeEventListener("beforeunload",beforeUnload);
  clickGuard=hashGuard=beforeUnload=null;sideNotice?.remove();sideNotice=null
 }
 function isActive(){return active}
 return {enter,exit,isActive}
})();