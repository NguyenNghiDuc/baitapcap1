"use strict";
window.AdminSecurity=(()=>{
 const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const time=s=>{const t=Date.parse(s||"");return Number.isFinite(t)?new Date(t).toLocaleString("vi-VN"):"—"};
 const history={page:1,search:"",status:"all"};
 const perm=[
  ["viewUsers","Xem tài khoản"],["manageRegularUsers","Quản lý người dùng thông thường"],
  ["viewAudit","Xem nhật ký"],["exportGrades","Xuất bảng điểm"],
  ["grantAdmin","Cấp quyền Admin"],["editOtherAdmins","Sửa quyền Admin khác"]
 ];
 async function crossAccountHistory(){
  const q=new URLSearchParams({page:String(history.page)});
  if(history.search)q.set("search",history.search);
  if(history.status!=="all")q.set("status",history.status);
  try{
   const j=await API.get("/api/admin/device-logs?"+q.toString(),{noCache:true,cancelPrevious:false});
   const rows=(j.devices||[]).map(d=>'<tr><td><b>'+esc(d.name)+'</b><small>'+esc(d.email)+'</small></td>'+
    '<td><b>'+esc(d.device)+'</b><small>'+esc(d.browser)+'</small></td>'+
    '<td><code>'+esc(d.ip||"Không xác định")+'</code></td><td>'+esc(time(d.lastSeenAt))+'</td>'+
    '<td><div class="admin-device-signals">'+
    (d.newDevice7d?'<span class="admin-sec-chip admin-device-signal-new">Thiết bị mới 7 ngày</span>':'')+
    (d.changedIp7d?'<span class="admin-sec-chip admin-device-signal-ip">IP đổi 7 ngày</span>':'')+
    (!d.newDevice7d&&!d.changedIp7d?'<span class="muted">—</span>':'')+
    '</div></td></tr>').join("");
   const pager=j.pagination||{},pages=Math.max(1,Number(pager.pages)||1),summary=j.summary||{};
   const metrics=[
    ["👥", "Tài khoản có thiết bị",summary.uniqueAccounts],
    ["🖥️", "Thiết bị đã ghi nhận",summary.totalDevices],
    ["🕒", "Hoạt động 24 giờ",summary.recent24h],
    ["✨", "Thiết bị mới 7 ngày",summary.newDevices7d],
    ["🔄", "Thiết bị đổi IP 7 ngày",summary.changedIp7d]
   ].map(([icon,label,count])=>'<div class="admin-device-metric"><span aria-hidden="true">'+icon+'</span>'+
    '<strong>'+((count===undefined||count===null)?"—":Number(count).toLocaleString("vi-VN"))+'</strong>'+
    '<small>'+label+'</small></div>').join("");
   const choices=[["all","Tất cả thiết bị"],["recent","Có hoạt động 24 giờ"],["new-device","Thiết bị mới 7 ngày"],["ip-change","IP thay đổi 7 ngày"]];
   const options=choices.map(([value,label])=>'<option value="'+value+'" '+(history.status===value?"selected":"")+'>'+label+'</option>').join("");
   return '<section class="panel admin-sec-panel admin-device-history"><div class="admin-sec-heading"><h2>🌐 IP và thiết bị của các tài khoản</h2></div>'+
    '<p class="admin-device-description">Đây là dấu vết thiết bị đã ghi nhận, không phải lượt đăng nhập hay phiên online. IP thay đổi có thể do Wi-Fi, mạng di động hoặc VPN; không tự động kết luận đáng ngờ.</p>'+
    '<div class="admin-device-metrics" aria-label="Thống kê lịch sử thiết bị">'+metrics+'</div>'+
    '<form id="adminDeviceSearchForm" class="admin-device-filter"><label>Tìm theo tên, email, IP hoặc thiết bị'+
    '<input name="search" type="search" maxlength="100" value="'+esc(history.search)+'" placeholder="VD: email học sinh hoặc 192.0.2..." autocomplete="off"></label>'+
    '<label>Loại lịch sử<select name="status" aria-label="Lọc loại lịch sử thiết bị">'+options+'</select></label>'+
    '<button type="submit" class="primary">🔎 Áp dụng</button></form>'+
    '<p class="muted">'+Number(pager.total||0)+' thiết bị khớp bộ lọc • '+(j.source==="postgres"?"Dữ liệu dùng chung PostgreSQL":"Dữ liệu máy chủ hiện tại")+'</p>'+
    '<div class="table-wrap" tabindex="0" aria-label="Danh sách thiết bị và IP đã đăng nhập"><table><thead><tr>'+
    '<th>Tài khoản</th><th>Thiết bị / trình duyệt</th><th>Địa chỉ IP</th><th>Gần nhất</th><th>Dấu hiệu</th></tr></thead><tbody>'+
    (rows||'<tr><td colspan="5">Chưa ghi nhận thiết bị nào phù hợp. Người dùng cần đăng nhập để hệ thống ghi nhận.</td></tr>')+
    '</tbody></table></div><div class="admin-device-pager"><button type="button" id="adminDevicePrev" class="outline" '+(history.page<=1?"disabled":"")+'>← Trước</button>'+
    '<span>Trang '+history.page+'/'+pages+'</span><button type="button" id="adminDeviceNext" class="outline" '+(pager.hasMore?"":"disabled")+'>Tiếp →</button></div></section>';
  }catch(e){
   return '<section class="panel admin-sec-panel admin-device-history" role="alert"><h2>🌐 IP các tài khoản</h2><p>Chưa tải được lịch sử thiết bị: '+esc(e.message||"Có lỗi")+'</p></section>';
  }
 }
 async function render(user){
  if(user?.role!=="admin")return '<section class="panel">Chỉ Admin được xem Trung tâm bảo mật.</section>';
  try{
   const j=await API.get("/api/admin/security",{noCache:true,cancelPrevious:false});
   const p=j.permissions||{},powers=p.capabilities||{};
   const capabilities=perm.map(([key,title])=>'<div class="admin-sec-power"><span>'+esc(title)+'</span><span class="admin-sec-chip '+(powers[key]?"is-allowed":"is-limited")+'">'+(powers[key]?"Được phép":"Không có quyền")+'</span></div>').join("");
   const rows=(j.devices||[]).map(d=>'<tr><td><b>'+esc(d.device)+'</b><small>'+esc(d.browser)+'</small></td>'+
    '<td><code>'+esc(d.ip||"Không rõ")+'</code></td><td>'+esc(time(d.lastSeenAt))+'</td>'+
    '<td><span class="admin-sec-chip '+(d.current?"is-allowed":"")+'">'+(d.current?"Thiết bị này":"Đã ghi nhận")+'</span></td></tr>').join("");
   const accountHistory=await crossAccountHistory();
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
    '<p class="admin-sec-note">'+esc(j.notice||"")+'</p></section>'+accountHistory+'</div>';
  }catch(e){
   return '<div class="panel" role="alert"><h3>Không tải được Trung tâm bảo mật</h3><p>'+esc(e?.message||"Có lỗi")+'</p>'+
    '<button type="button" class="outline" id="adminSecurityReload">Thử lại</button></div>';
  }
 }
 function bind(render){
  document.querySelector("#adminSecurityReload")?.addEventListener("click",render);
  document.querySelector("#adminDeviceSearchForm")?.addEventListener("submit",e=>{
   e.preventDefault();const value=String(new FormData(e.currentTarget).get("search")||"").trim();
   const nextStatus=String(new FormData(e.currentTarget).get("status")||"all");
   history.search=value.slice(0,100);history.status=nextStatus;history.page=1;render();
  });
  document.querySelector("#adminDevicePrev")?.addEventListener("click",()=>{
   history.page=Math.max(1,history.page-1);render();
  });
  document.querySelector("#adminDeviceNext")?.addEventListener("click",()=>{history.page++;render()});
 }
 return {render,bind};
})();
