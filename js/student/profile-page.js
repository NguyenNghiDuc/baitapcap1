window.ProfilePage=(()=>{
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const fmt=n=>Number(n||0).toLocaleString("vi-VN");
 let data=null;
 const label={student:"Học sinh",teacher:"Giáo viên",parent:"Phụ huynh",admin:"Quản trị viên"};
 const input=(n,title,v,type="text")=>'<label>'+title+'<input name="'+n+'" type="'+type+'" value="'+esc(v||"")+'" '+(n==="email"?"readonly":"")+'></label>';
 const sel=(n,title,opts,val)=>'<label>'+title+'<select name="'+n+'">'+opts.map(([id,t])=>'<option value="'+id+'" '+(String(val)===String(id)?"selected":"")+'>'+t+'</option>').join("")+'</select></label>';
 function section(title,body,extra=""){return '<section class="panel profile-panel"><h3>'+title+'</h3>'+body+extra+'</section>'}
 async function render(){
  try{data=await API.get("/api/profile/overview")}catch(e){return '<div class="panel"><h2>Không tải được hồ sơ</h2><p>'+esc(e.message)+'</p><button class="outline" data-route="profile">Thử lại</button></div>'}
  const p=data.profile,r=data.progress,w=data.wallet;
  const image=(window.ProfileAvatar?.()||"");const avatar=image?'<img src="'+image+'" alt="Ảnh đại diện">':esc(p.avatar||"👧🏻");
  const avatarButton='<label class="outline small profile-upload">📷 Đổi ảnh đại diện<input id="profileAvatarInput" type="file" accept="image/png,image/jpeg,image/webp" hidden></label>';
  const top='<div class="profile-top"><section class="panel profile-hero"><div class="profile-hero-main"><div class="profile-photo">'+avatar+'</div><div><h2>'+esc(p.name)+'</h2><p>'+esc(p.email)+'</p><span class="badge">'+esc(label[p.role]||p.role)+' • '+(p.grade?"Lớp "+p.grade:"Chưa cập nhật lớp")+'</span><div class="profile-actions">'+avatarButton+'<button class="primary small" id="profileEdit">✏️ Chỉnh sửa hồ sơ</button></div></div></div><div class="profile-verified"><p>✅ '+(p.emailVerified?"Email đã xác minh":"Email chưa xác minh")+'</p><p>🔐 Tài khoản đã đăng nhập</p></div></section>'+
  section("📊 Tiến độ học tập",'<div class="profile-metrics"><div><b>'+fmt(r.completed)+'</b><small>Bài đã làm</small></div><div><b>'+(r.average===null?"—":fmt(r.average)+"%")+'</b><small>Điểm trung bình</small></div><div><b>'+(r.streak===null?"—":fmt(r.streak))+'</b><small>Ngày liên tiếp</small></div><div><b>'+(r.badges===null?"—":fmt(r.badges))+'</b><small>Huy hiệu</small></div></div><small class="muted">Số liệu lấy từ bài làm đã lưu trên máy chủ; dấu — là chưa có dữ liệu.</small><p><a href="#history">Xem kết quả học tập →</a></p>')+'</div>';
  const wallet=section("⭐ Ví & VIP",w.enabled?'<div class="profile-wallet"><div><small>Số dư thử nghiệm</small><h2>'+fmt(w.balance)+' đ ảo</h2></div><div><b>'+(w.active?"VIP đến "+new Date(w.until).toLocaleDateString("vi-VN"):"Gói miễn phí")+'</b><p>Không phải tiền thật</p></div><a class="outline small" href="#premium">Mở ví demo →</a></div>':'<p>Ví thử nghiệm hiện chưa bật. Không có giao dịch tiền thật.</p><a class="outline small" href="#premium">Xem trạng thái ví →</a>');
  const fields=section("👤 Thông tin cá nhân",'<form id="profileDetailsForm" class="profile-fields">'+input("name","Họ tên",p.name)+input("email","Email",p.email)+input("phone","Số điện thoại",p.phone,"tel")+input("birthday","Ngày sinh",p.birthday,"date")+sel("gender","Giới tính",[["","Chưa cập nhật"],["female","Nữ"],["male","Nam"],["other","Khác"]],p.gender)+sel("grade","Lớp",[1,2,3,4,5].map(v=>[v,"Lớp "+v]),p.grade)+input("school","Trường",p.school)+input("address","Địa chỉ",p.address)+'<div class="profile-form-actions"><button class="primary" type="submit">💾 Lưu thay đổi</button><button type="reset" class="outline">Hủy thay đổi</button></div></form>');
  const security=section("🛡️ Bảo mật tài khoản",'<div class="profile-rows"><p>✉️ Email: <b>'+esc(p.emailVerified?"Đã xác minh":"Chưa xác minh")+'</b></p><p>🔐 Mật khẩu <a href="#accountSecurity">Đổi mật khẩu →</a></p><p>🛡️ Xác thực 2 bước: <a href="#accountSecurity">Xem cài đặt bảo mật →</a></p><p>💻 Thiết bị đăng nhập: <a href="#profileDevices">Xem thiết bị và địa chỉ IP ↓</a></p></div>');
  const deviceRows=(data.devices||[]).map(d=>{
   const first=d.firstSeenAt&&!Number.isNaN(Date.parse(d.firstSeenAt))?new Date(d.firstSeenAt).toLocaleString("vi-VN"):"Chưa rõ";
   const last=d.lastSeenAt&&!Number.isNaN(Date.parse(d.lastSeenAt))?new Date(d.lastSeenAt).toLocaleString("vi-VN"):"Chưa rõ";
   return '<article class="profile-device-item"><div class="profile-device-name"><span aria-hidden="true">💻</span><div><b>'+esc(d.device||"Thiết bị không xác định")+'</b>'+(d.current?'<span class="profile-device-current">Thiết bị này</span>':'')+'<small>'+esc(d.browser||"Trình duyệt không xác định")+'</small></div></div><div class="profile-device-meta"><div><span>Địa chỉ IP</span><strong>'+esc(d.ip||"Không xác định")+'</strong></div><div><span>Đăng nhập được ghi nhận</span><strong>'+esc(first)+'</strong></div><div><span>Hoạt động gần nhất</span><strong>'+esc(last)+'</strong></div></div></article>';
  }).join("");
  const devices='<section class="panel profile-panel profile-devices" id="profileDevices"><h3>💻 Thiết bị đăng nhập & IP</h3><p class="muted profile-device-hint">Chỉ tài khoản của bạn xem được. Dữ liệu được ghi nhận từ khi bật tính năng; một thiết bị dùng nhiều trình duyệt có thể hiện nhiều dòng. IP có thể thay đổi khi đổi mạng, VPN hoặc 4G/5G.</p>'+ (deviceRows||'<p>Chưa có lịch sử từ các lần đăng nhập trước. Thiết bị hiện tại sẽ được ghi nhận khi đồng bộ phiên đăng nhập.</p>') +'</section>';
  const preferences=section("🔔 Cài đặt thông báo",'<div class="profile-rows">'+[["email","Email thông báo"],["schedule","Nhắc lịch học"],["homework","Nhắc bài tập"],["achievements","Thông báo thành tích"]].map(([id,t])=>'<label class="profile-switch">'+t+' <input data-profile-pref="'+id+'" type="checkbox" '+(data.notifications[id]?"checked":"")+'></label>').join("")+'</div><small class="muted">Lưu tùy chọn vào hồ sơ. Việc gửi thông báo còn tùy chức năng thông báo được bật.</small>');
  const family=section("👨‍👩‍👧 Liên kết gia đình / phụ huynh",data.parents.length?data.parents.map(x=>'<div class="profile-family"><b>'+esc(x.name)+'</b><span>'+esc(x.email)+'</span></div>').join(""):'<p>Chưa có phụ huynh liên kết trong dữ liệu hệ thống.</p>','<a href="#parent" class="outline small">Quản lý liên kết →</a>');
  const privacy=section("🗄️ Quyền riêng tư & dữ liệu",'<div class="profile-rows"><p>⬇️ <button class="outline small" id="profileDownload">Tải dữ liệu cá nhân</button></p><p>📄 <a href="#history">Xuất báo cáo kết quả học tập →</a></p><p>⚠️ <a href="#accountSecurity">Yêu cầu xóa tài khoản →</a></p></div>');
  return '<section class="page-head"><span class="eyebrow">TÀI KHOẢN</span><h1>Hồ sơ</h1><p>Quản lý thông tin cá nhân, bảo mật và cài đặt tài khoản.</p></section><div class="profile-dashboard">'+top+wallet+'<div class="profile-columns"><div>'+fields+family+'</div><div>'+security+devices+privacy+'</div><div>'+preferences+'</div></div></div>';
 }
 function bind(toast,refresh){
  document.querySelector("#profileEdit")?.addEventListener("click",()=>document.querySelector('#profileDetailsForm [name="name"]')?.focus());
  document.querySelector("#profileDetailsForm")?.addEventListener("submit",async e=>{
   e.preventDefault();const b=e.currentTarget.querySelector('[type="submit"]');b.disabled=true;
   try{const d=Object.fromEntries(new FormData(e.currentTarget));d.grade=Number(d.grade);await API.patch("/api/profile/details",d);window.AppAuthBridge?.updateProfile?.(d);toast("Đã lưu thông tin hồ sơ");refresh()}catch(err){toast(err.message)}finally{b.disabled=false}
  });
  document.querySelectorAll("[data-profile-pref]").forEach(el=>el.addEventListener("change",async()=>{
   const prefs=Object.fromEntries([...document.querySelectorAll("[data-profile-pref]")].map(x=>[x.dataset.profilePref,x.checked]));
   try{await API.patch("/api/profile/overview",{notifications:prefs});toast("Đã lưu cài đặt thông báo")}catch(err){el.checked=!el.checked;toast(err.message)}
  }));
  document.querySelector("#profileDownload")?.addEventListener("click",async()=>{
   try{const d=await API.get("/api/account/export"),blob=new Blob([JSON.stringify(d,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="du-lieu-ca-nhan.json";a.click();URL.revokeObjectURL(url)}catch(err){toast(err.message)}
  });
 }
 return {render,bind};
})();
