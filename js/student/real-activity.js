window.StudentRealActivity=(()=>{
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const time=v=>v?new Date(v).toLocaleString("vi-VN"):"Chưa có";
 const fmt=v=>v===null||v===undefined?"—":Number(v).toLocaleString("vi-VN");
 async function render(){
  try{
   const [progress,notifications,devices]=await Promise.all([
    API.get("/api/real/me/activity"),API.get("/api/real/me/notifications"),API.get("/api/real/me/devices")
   ]);
   if([progress,notifications,devices].some(r=>r.source!=="postgres"))throw new Error("Nguồn dữ liệu chưa được xác minh");
   const d=progress.activity;
   return '<section class="page-head"><span class="eyebrow">DỮ LIỆU THẬT • POSTGRESQL</span><h1>📊 Hoạt động của tôi</h1><p>Chỉ hiển thị bài làm, thông báo và thiết bị được lưu trong tài khoản này. Không có số liệu mẫu.</p></section>'+
    '<div class="metrics">'+
     '<div class="metric"><b>'+fmt(d.total.attempts)+'</b><span>Lượt làm bài đã lưu</span></div>'+
     '<div class="metric"><b>'+fmt(d.total.average)+'</b><span>Điểm trung bình bài đã có điểm</span></div>'+
     '<div class="metric"><b>'+fmt(d.submissions)+'</b><span>Bài đã nộp</span></div>'+
     '<div class="metric"><b>'+fmt(d.unreadNotifications)+'</b><span>Thông báo chưa đọc</span></div></div>'+
    '<div class="real-data-columns"><section class="panel"><h3>📚 Thống kê theo môn</h3><div class="table-wrap"><table><thead><tr><th>Môn</th><th>Lượt</th><th>Điểm TB</th></tr></thead><tbody>'+
      (d.subjects.map(x=>'<tr><td>'+esc(x.subject||"Chưa phân loại")+'</td><td>'+fmt(x.attempts)+'</td><td>'+fmt(x.average)+'</td></tr>').join("")||'<tr><td colspan="3">Chưa có bài đã lưu trên PostgreSQL.</td></tr>')+
     '</tbody></table></div><h3>📝 Bài gần đây</h3><div class="real-activity-list">'+
     (d.recent.map(x=>'<div><b>'+esc(x.title||x.subject||"Bài tập")+'</b><span>'+fmt(x.score)+' điểm • '+esc(time(x.created_at))+'</span></div>').join("")||'<p>Chưa có kết quả thật.</p>')+
     '</div></section><section class="panel"><h3>🔔 Thông báo của tôi</h3>'+
     (notifications.items.map(x=>'<div class="real-notice"><b>'+esc(x.title)+'</b><p>'+esc(x.message)+'</p><small>'+esc(time(x.created_at))+'</small> '+(x.read_at?'<small>Đã đọc</small>':'<button class="outline small" data-real-read="'+esc(x.id)+'">Đánh dấu đã đọc</button>')+'</div>').join("")||'<p>Chưa có thông báo mới trong cơ sở dữ liệu.</p>')+
     '</section></div><section class="panel"><h3>💻 Thiết bị đã ghi nhận</h3><p class="muted">IP và thiết bị chỉ chủ tài khoản được xem. Đây là lịch sử truy cập, chưa phải chức năng đăng xuất thiết bị từ xa.</p><div class="real-device-grid">'+
     (devices.devices.map(x=>'<article><b>'+esc(x.device)+' • '+esc(x.browser)+'</b>'+(x.current?'<span class="badge">Trình duyệt này</span>':'')+'<p>IP: '+esc(x.ip)+'</p><small>Lần gần nhất: '+esc(time(x.lastSeenAt))+'</small></article>').join("")||'<p>Chưa có thiết bị được ghi nhận.</p>')+
     '</div></section><button type="button" class="outline" id="refreshRealActivity">↻ Tải lại dữ liệu từ PostgreSQL</button>';
  }catch(e){return '<section class="panel"><h2>Chưa kết nối được dữ liệu học tập thật</h2><p>'+esc(e.message)+'</p><p>Kiểm tra DATABASE_URL và migration PostgreSQL trên môi trường đang sử dụng. Ứng dụng không hiển thị số liệu giả.</p></section>'}
 }
 function bind(){
  document.querySelectorAll("[data-real-read]").forEach(b=>b.onclick=async()=>{
   b.disabled=true;try{await API.patch("/api/real/me/notifications/"+encodeURIComponent(b.dataset.realRead)+"/read",{});location.hash="realActivity";document.querySelector("#refreshRealActivity")?.click()}catch(e){alert(e.message);b.disabled=false}
  });
  document.querySelector("#refreshRealActivity")?.addEventListener("click",async()=>{
   const el=document.querySelector("#content");if(el){el.innerHTML=await render();bind()}
  });
 }
 return {render,bind};
})();