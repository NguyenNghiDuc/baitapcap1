"use strict";
window.ClassInsights=(()=>{
 const state={page:1},esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const format=n=>Number.isFinite(Number(n))?Number(n).toLocaleString("vi-VN"):"—";
 async function render(user){
  if(!["teacher","admin"].includes(user?.role))return '<section class="panel">Chỉ giáo viên/Admin được xem thống kê lớp học.</section>';
  try{
   const d=await API.get("/api/teacher/class-insights?page="+state.page+"&limit=12",{noCache:true,cancelPrevious:false});
   const pg=d.pagination||{page:1,pages:1,total:0};
   const boxes=(d.classes||[]).map(c=>{
    const coverage=c.completionRate===null?"—":format(c.completionRate)+"%";
    return '<article class="class-insights-card"><div class="class-insights-heading"><div><span class="class-insights-grade">Lớp '+esc(c.grade||"—")+'</span><h3>'+esc(c.name)+'</h3></div><span class="class-insights-count">'+format(c.studentCount)+' học sinh</span></div>'+
    '<div class="class-insights-grid"><div><strong>'+format(c.assignmentCount)+'</strong><small>Bài đã giao</small></div>'+
    '<div><strong>'+format(c.uniqueSubmitted)+'</strong><small>Học sinh–bài đã nộp</small></div>'+
    '<div><strong>'+format(c.pendingReview)+'</strong><small>Lượt chờ chấm</small></div>'+
    '<div><strong>'+coverage+'</strong><small>Tỷ lệ có nộp</small></div></div>'+
    '<p class="class-insights-caption">Tổng '+format(c.submissionAttempts)+' lượt nộp; '+format(c.gradedAttempts)+' lượt đã có điểm. Tỷ lệ tính theo số học sinh đang trong lớp và số bài đã giao.</p></article>';
   }).join("");
   return '<div class="class-insights-page"><section class="page-head"><span class="eyebrow">GIÁO VIÊN • THỐNG KÊ</span><h1>📚 Tổng quan lớp học</h1><p>Theo dõi bài đã giao, lượt nộp và bài còn chờ chấm mà không cần mở từng lớp.</p></section>'+
    '<div class="class-insights-toolbar"><div><strong>'+format(pg.total)+' lớp học</strong><p class="muted">Giáo viên chỉ xem lớp mình phụ trách; Admin có thể xem toàn bộ lớp.</p></div><div class="class-insights-shortcuts"><a href="#classes" class="outline">🏫 Quản lý lớp</a><a href="#assignments" class="outline">📌 Giao bài</a><a href="#submissions" class="outline">📨 Chấm bài</a></div></div>'+
    '<div class="class-insights-list">'+(boxes||'<section class="panel"><h3>Chưa có lớp phù hợp</h3><p>Tạo lớp hoặc kiểm tra phân công giáo viên để bắt đầu xem thống kê.</p></section>')+'</div>'+
    '<div class="class-insights-pager"><button id="classInsightsPrev" class="outline" type="button" '+(pg.page<=1?"disabled":"")+'>← Trước</button><span>Trang '+format(pg.page)+'/'+format(pg.pages)+'</span><button id="classInsightsNext" class="outline" type="button" '+(pg.page>=pg.pages?"disabled":"")+'>Tiếp →</button></div>'+
    '<p class="class-insights-disclaimer">'+esc(d.note||"Báo cáo chỉ dùng dữ liệu đã lưu trên máy chủ.")+'</p></div>';
  }catch(e){
   return '<section class="panel" role="alert"><h3>Không tải được thống kê lớp</h3><p>'+esc(e?.message||"Có lỗi")+'</p><button type="button" id="classInsightsRetry" class="outline">Thử lại</button></section>';
  }
 }
 function bind(render){
  document.querySelector("#classInsightsRetry")?.addEventListener("click",render);
  document.querySelector("#classInsightsPrev")?.addEventListener("click",()=>{state.page=Math.max(1,state.page-1);render()});
  document.querySelector("#classInsightsNext")?.addEventListener("click",()=>{state.page++;render()});
 }
 return {render,bind};
})();
