"use strict";
window.AdminIntegrity=(()=>{
 const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const states={ok:["✓","Đạt"],problem:["!","Cần kiểm tra"],warning:["!","Cảnh báo"],unavailable:["?","Chưa xác minh"]};
 async function render(user){
  if(user?.role!=="admin")return '<section class="panel">Chỉ Admin được xem kết quả kiểm tra.</section>';
  try{
   const r=await API.get("/api/admin/integrity",{noCache:true,cancelPrevious:false});
   const checks=(r.checks||[]).map(c=>{
    const mark=states[c.state]||states.unavailable;
    return '<article class="admin-integrity-check" data-state="'+esc(c.state)+'"><span class="admin-integrity-mark" aria-hidden="true">'+mark[0]+'</span>'+
    '<div><h3>'+esc(c.name)+'</h3><p>'+esc(c.detail)+'</p></div><span class="admin-integrity-state">'+mark[1]+'</span></article>';
   }).join("");
   const boxes=[["ok","Đạt"],["problem","Cần kiểm tra"],["warning","Cảnh báo"],["unavailable","Chưa xác minh"]]
    .map(([key,label])=>'<div class="admin-integrity-metric" data-kind="'+key+'"><strong>'+Number(r.counts?.[key]||0)+'</strong><span>'+label+'</span></div>').join("");
   return '<div class="admin-integrity-page"><section class="page-head"><span class="eyebrow">ADMIN • CHẤT LƯỢNG DỮ LIỆU</span><h1>🩺 Kiểm tra dữ liệu</h1>'+
   '<p>Kiểm tra cấu trúc PostgreSQL, migration và giá trị bất thường mà không sửa hay xóa dữ liệu.</p></section>'+
   '<div class="admin-integrity-metrics">'+boxes+'</div>'+
   '<section class="panel admin-integrity-panel"><div class="admin-integrity-heading"><h2>Kết quả kiểm tra</h2><button class="outline" type="button" id="adminIntegrityRefresh">↻ Kiểm tra lại</button></div>'+
   '<p class="muted">Đây là kết quả tại thời điểm yêu cầu. Chưa xác minh không đồng nghĩa dữ liệu an toàn hoặc bị lỗi.</p>'+
   '<div class="admin-integrity-checks">'+(checks||'<p class="muted">Không có kết quả kiểm tra.</p>')+'</div>'+
   '<p class="admin-integrity-note">'+esc(r.statement||"Kết quả tự động không thay thế kiểm toán dữ liệu.")+'</p>'+
   '<p class="muted">Thời gian: '+esc(r.checkedAt?new Date(r.checkedAt).toLocaleString("vi-VN"):"—")+
   '. Trang này không chỉnh điểm, xóa bản ghi hoặc chạy migration.</p></section></div>';
  }catch(e){
   return '<section class="panel" role="alert"><h3>Không thể kiểm tra dữ liệu</h3><p>'+esc(e?.message||"Có lỗi")+
   '</p><button type="button" id="adminIntegrityRefresh" class="outline">Thử lại</button></section>';
  }
 }
 function bind(render){document.querySelector("#adminIntegrityRefresh")?.addEventListener("click",render)}
 return {render,bind};
})();
