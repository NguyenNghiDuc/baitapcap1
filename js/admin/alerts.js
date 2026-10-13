"use strict";
window.AdminAlerts=(()=>{
 const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const severity={critical:["🔴","Nghiêm trọng"],warning:["🟠","Cảnh báo"],info:["🔵","Thông tin"]};
 async function render(user){
  if(user?.role!=="admin")return '<div class="panel">Chỉ Admin được xem cảnh báo.</div>';
  try{
   const j=await API.get("/api/admin/alerts",{noCache:true,cancelPrevious:false});
   const items=(j.incidents||[]).map(x=>{
    const kind=severity[x.severity]||severity.info;
    return '<article class="admin-alerts-item" data-severity="'+esc(x.severity)+'"><span class="admin-alerts-icon" aria-hidden="true">'+kind[0]+'</span><div><div class="admin-alerts-label">'+esc(kind[1])+'</div><h3>'+esc(x.title)+'</h3><p>'+esc(x.detail)+'</p></div></article>'
   }).join("");
   return '<div class="admin-alerts-page">'+
    '<section class="page-head"><span class="eyebrow">QUẢN TRỊ • HỆ THỐNG</span><h1>🚨 Trung tâm cảnh báo</h1><p>Kiểm tra kết nối database, Redis và API chậm hoặc lỗi trên máy chủ hiện tại.</p></section>'+
    '<div class="admin-alerts-stats"><div><strong>'+Number(j.counts?.critical||0)+'</strong><small>Nghiêm trọng</small></div><div><strong>'+Number(j.counts?.warning||0)+'</strong><small>Cảnh báo</small></div><div><strong>'+Number(j.counts?.info||0)+'</strong><small>Thông tin</small></div></div>'+
    '<section class="panel"><div class="admin-alerts-heading"><h2>Tình trạng mới nhất</h2><button class="outline" type="button" id="adminAlertsRefresh">↻ Làm mới</button></div>'+
    '<p class="muted">Ghi nhận '+Number(j.sampleCount||0)+' yêu cầu API trong '+Number(j.windowMinutes||15)+' phút gần nhất. Đây không phải nhật ký cảnh báo toàn hệ thống.</p>'+
    '<div class="admin-alerts-list">'+(items||'<div class="admin-alerts-empty">🟢 Chưa phát hiện bất thường từ những chỉ số hiện có.</div>')+'</div>'+
    '<p class="muted">Lần đọc: '+(j.generatedAt?esc(new Date(j.generatedAt).toLocaleString("vi-VN")):"—")+'. Không cấu hình Redis có thể là chủ ý tại môi trường local.</p></section></div>';
  }catch(e){
   return '<div class="panel" role="alert"><h3>Không thể tải cảnh báo</h3><p>'+esc(e?.message||"Có lỗi")+'</p><button class="outline" type="button" id="adminAlertsRefresh">Thử lại</button></div>';
  }
 }
 function bind(render){document.querySelector("#adminAlertsRefresh")?.addEventListener("click",render)}
 return {render,bind};
})();
