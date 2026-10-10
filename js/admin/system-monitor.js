window.StudentSystemMonitor=(()=>{
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const fmt=v=>v===null||v===undefined?"—":Number(v).toLocaleString("vi-VN");
 const dt=v=>v?new Date(v).toLocaleString("vi-VN"):"Chưa có";
 async function render(user){
  if(user?.role!=="admin")return '<div class="panel">Chỉ quản trị viên được xem báo cáo hệ thống.</div>';
  try{
   const [dashboard,audit,errors]=await Promise.all([API.get("/api/real/admin/dashboard"),API.get("/api/real/admin/audit"),API.get("/api/real/admin/errors")]);
   if([dashboard,audit,errors].some(x=>x.source!=="postgres"))throw new Error("Nguồn dữ liệu chưa được xác minh");
   const s=dashboard.stats;
   return '<section class="page-head"><span class="eyebrow">POSTGRESQL • DỮ LIỆU THẬT</span><h1>🛡️ Trung tâm giám sát Admin</h1><p>Số liệu truy vấn từ cơ sở dữ liệu hiện tại, không phải thống kê mẫu hoặc dữ liệu trong bộ nhớ trình duyệt.</p></section>'+
   '<div class="metrics">'+[
    ["👥",s.users.total,"Tổng tài khoản"],
    ["🔒",s.users.locked,"Tài khoản đã khóa"],
    ["📝",s.results.total,"Kết quả đã lưu"],
    ["📚",s.submissions,"Bài đã nộp"],
    ["💻",s.activeUsers7d,"Tài khoản có thiết bị hoạt động 7 ngày"],
    ["⚠️",s.errors24h,"Lỗi trình duyệt 24 giờ"]
   ].map(([ic,value,label])=>'<div class="metric"><span>'+ic+'</span><b>'+fmt(value)+'</b><small>'+esc(label)+'</small></div>').join("")+'</div>'+
   '<div class="real-data-columns"><section class="panel"><h3>👤 Tài khoản theo vai trò</h3>'+
     '<div class="table-wrap"><table><thead><tr><th>Vai trò</th><th>Số tài khoản</th></tr></thead><tbody>'+
     (s.roles.map(x=>'<tr><td>'+esc(x.role)+'</td><td>'+fmt(x.total)+'</td></tr>').join("")||'<tr><td colspan="2">Chưa có tài khoản trong database.</td></tr>')+
     '</tbody></table></div><h3>💾 Sao lưu PostgreSQL</h3>'+
     (s.lastBackup?'<p>Lần chạy được ghi nhận: '+esc(dt(s.lastBackup.created_at))+'</p><small>SHA256: '+esc(s.lastBackup.sha256)+' • '+fmt(s.lastBackup.bytes)+' byte</small>':'<p>Chưa có bản sao lưu toàn bộ PostgreSQL được ghi nhận. Không thể xác nhận đã có bản sao lưu.</p>')+
   '</section><section class="panel"><h3>📜 Nhật ký quản trị</h3><div class="real-scroll">'+
    (audit.events.map(x=>'<div class="real-log"><b>'+esc(x.action)+'</b><span>'+esc(dt(x.created_at))+'</span><small>ID người thao tác: '+esc(x.user_id||"Hệ thống")+'</small></div>').join("")||'<p>Chưa có hoạt động ghi vào audit_logs.</p>')+
   '</div></section></div><section class="panel"><h3>⚠️ Lỗi ứng dụng gần đây</h3><div class="real-scroll">'+
    (errors.errors.map(x=>'<div class="real-log"><b>'+esc(x.route||"Không xác định")+'</b><p>'+esc(x.message)+'</p><span>'+esc(dt(x.created_at))+'</span></div>').join("")||'<p>Chưa ghi nhận lỗi trình duyệt nào trong PostgreSQL.</p>')+
   '</div></section><button id="refreshSystemMonitor" class="outline" type="button">↻ Cập nhật số liệu thật</button>';
  }catch(e){return '<section class="panel"><h2>Không truy cập được dữ liệu giám sát thật</h2><p>'+esc(e.message)+'</p><p>Hãy kiểm tra DATABASE_URL, quyền Admin và migrations. Không có số liệu mặc định thay thế.</p></section>'}
 }
 function bind(){
  document.querySelector("#refreshSystemMonitor")?.addEventListener("click",async()=>{
   const el=document.querySelector("#content");if(el){el.innerHTML=await render({role:"admin"});bind()}
  });
 }
 return {render,bind};
})();