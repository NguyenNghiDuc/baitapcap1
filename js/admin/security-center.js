"use strict";
window.AdminSecurity=(()=>{
 const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const time=s=>{const t=Date.parse(s||"");return Number.isFinite(t)?new Date(t).toLocaleString("vi-VN"):"—"};
 const perm=[
  ["viewUsers","Xem tài khoản"],["manageRegularUsers","Quản lý người dùng thông thường"],
  ["viewAudit","Xem nhật ký"],["exportGrades","Xuất bảng điểm"],
  ["grantAdmin","Cấp quyền Admin"],["editOtherAdmins","Sửa quyền Admin khác"]
 ];
 async function render(user){
  if(user?.role!=="admin")return '<section class="panel">Chỉ Admin được xem Trung tâm bảo mật.</section>';
  try{
   const j=await API.get("/api/admin/security",{noCache:true,cancelPrevious:false});
   const p=j.permissions||{},powers=p.capabilities||{};
   const capabilities=perm.map(([key,title])=>'<div class="admin-sec-power"><span>'+esc(title)+'</span><span class="admin-sec-chip '+(powers[key]?"is-allowed":"is-limited")+'">'+(powers[key]?"Được phép":"Không có quyền")+'</span></div>').join("");
   const rows=(j.devices||[]).map(d=>'<tr><td><b>'+esc(d.device)+'</b><small>'+esc(d.browser)+'</small></td>'+
    '<td><code>'+esc(d.ip||"Không rõ")+'</code></td><td>'+esc(time(d.lastSeenAt))+'</td>'+
    '<td><span class="admin-sec-chip '+(d.current?"is-allowed":"")+'">'+(d.current?"Thiết bị này":"Đã ghi nhận")+'</span></td></tr>').join("");
   return '<div class="admin-security-page">'+
    '<section class="page-head"><span class="eyebrow">ADMIN • AN TOÀN</span><h1>🔐 Trung tâm bảo mật</h1><p>Kiểm tra cấp quyền hiện tại và các thiết bị đã đăng nhập bằng tài khoản của bạn.</p></section>'+
    '<div class="admin-sec-stats"><div><span>Vai trò hiện tại</span><strong>'+esc(p.title||"Admin")+'</strong></div>'+
    '<div><span>Thiết bị đã ghi nhận</span><strong>'+Number(j.devices?.length||0)+'</strong></div>'+
    '<div><span>Cấu hình Admin chính</span><strong>'+(p.ownerConfigured?"Đã thiết lập":"Chưa thiết lập")+'</strong></div></div>'+
    '<section class="panel admin-sec-panel"><div class="admin-sec-heading"><h2>Quyền quản trị</h2><a href="#adminUsers" class="outline">Quản lý tài khoản →</a></div>'+
    '<p class="muted">Quyền được xác định ở máy chủ theo vai trò và Supabase UID, không dựa vào tên hay email hiển thị.</p>'+
    '<div class="admin-sec-powers">'+capabilities+'</div></section>'+
    '<section class="panel admin-sec-panel"><div class="admin-sec-heading"><h2>Thiết bị của tôi</h2>'+
    '<button type="button" id="adminSecurityReload" class="outline">↻ Làm mới</button></div>'+
    '<p class="muted">Chỉ hiển thị thiết bị của tài khoản hiện tại. Địa chỉ IP có thể thay đổi khi đổi mạng hoặc bật VPN.</p>'+
    '<div class="table-wrap" tabindex="0"><table><thead><tr><th>Thiết bị</th><th>Địa chỉ IP</th><th>Gần nhất</th><th>Trạng thái</th></tr></thead><tbody>'+
    (rows||'<tr><td colspan="4">Chưa ghi nhận thiết bị nào. Đăng nhập lại để cập nhật lịch sử.</td></tr>')+'</tbody></table></div>'+
    '<p class="admin-sec-note">'+esc(j.notice||"")+'</p></section></div>';
  }catch(e){
   return '<div class="panel" role="alert"><h3>Không tải được Trung tâm bảo mật</h3><p>'+esc(e?.message||"Có lỗi")+'</p>'+
    '<button type="button" class="outline" id="adminSecurityReload">Thử lại</button></div>';
  }
 }
 function bind(render){document.querySelector("#adminSecurityReload")?.addEventListener("click",render)}
 return {render,bind};
})();
