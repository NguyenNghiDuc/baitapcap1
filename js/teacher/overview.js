"use strict";
window.TeacherOverview=(()=>{
 const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
 })[ch]);
 const keys=["classes","students","assignments","pendingGrading"];
 const count=n=>Number.isSafeInteger(n)&&n>=0?n.toLocaleString("vi-VN"):"—";
 function bind(){
  const root=document.querySelector(".teacher-dashboard");
  if(!root)return;
  const status=root.querySelector("#teacherOverviewStatus"),recent=root.querySelector("#teacherRecentAssignments");
  const button=root.querySelector("#teacherOverviewRefresh");
  let attempt=0;
  async function load(){
   const current=++attempt;
   button.disabled=true;status.textContent="Đang đồng bộ thống kê giáo viên…";
   try{
    const data=await API.get("/api/teacher/overview",{noCache:true});
    if(current!==attempt||!root.isConnected)return;
    for(const key of keys){
     const element=root.querySelector('[data-teacher-count="'+key+'"]');
     if(element)element.textContent=count(data.counts?.[key]);
    }
    const list=Array.isArray(data.recentAssignments)?data.recentAssignments.slice(0,4):[];
    recent.innerHTML=list.length?list.map(item=>{
     const date=typeof item.deadline==="string"?new Date(item.deadline):null;
     const deadline=date&&Number.isFinite(date.getTime())?
      "Hạn nộp: "+date.toLocaleDateString("vi-VN"):"Không giới hạn hạn nộp";
     return '<div class="teacher-overview-item"><div><b>'+escapeHtml(item.title)+
      '</b><small>'+escapeHtml(item.className)+'</small></div><span>'+escapeHtml(deadline)+'</span></div>';
    }).join(""):'<p class="teacher-overview-status">Chưa có bài tập nào được giao trong lớp của bạn.</p>';
    status.textContent="Số liệu lấy từ các lớp và bài tập của tài khoản đang đăng nhập.";
   }catch{
    if(current!==attempt||!root.isConnected)return;
    for(const key of keys){
     const element=root.querySelector('[data-teacher-count="'+key+'"]');
     if(element)element.textContent="—";
    }
    recent.textContent="Chưa thể tải danh sách bài mới giao.";
    status.textContent="Không tải được thống kê. Nhấn Làm mới để thử lại.";
   }finally{if(current===attempt&&root.isConnected)button.disabled=false}
  }
  button.addEventListener("click",load);
  load();
 }
 return {bind};
})();
