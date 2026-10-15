"use strict";
window.AdminSecurity=(()=>{
 const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const time=s=>{const t=Date.parse(s||"");return Number.isFinite(t)?new Date(t).toLocaleString("vi-VN"):"—"};
 const history={page:1,search:"",status:"all",userId:"",period:"all",reviewPage:1,reviewId:"",reviewStatus:"all",reviewType:"all",reviewPeriod:"all"};
 let reviewError="";
 const perm=[
  ["viewUsers","Xem tài khoản"],["manageRegularUsers","Quản lý người dùng thông thường"],
  ["viewAudit","Xem nhật ký"],["exportGrades","Xuất bảng điểm"],
  ["grantAdmin","Cấp quyền Admin"],["editOtherAdmins","Sửa quyền Admin khác"]
 ];
 async function crossAccountHistory(){
  // One-time, in-memory handoff from Admin user directory; not stored in URL or localStorage.
  const focus=window.AdminDeviceAccountFocus;
  if(focus){
   delete window.AdminDeviceAccountFocus;
   if(typeof focus.userId==="string"&&focus.userId.length<=128){
    history.userId=focus.userId;history.page=1;history.search="";history.status="all";history.period="all";history.reviewPage=1;history.reviewStatus="all";history.reviewType="all";history.reviewPeriod="all";history.reviewId="";reviewError="";
   }
  }
  const q=new URLSearchParams({page:String(history.page)});
  if(history.search)q.set("search",history.search);
  if(history.status!=="all")q.set("status",history.status);
  if(history.period!=="all")q.set("period",history.period);
  if(history.userId)q.set("userId",history.userId);
  try{
   const j=await API.get("/api/admin/device-logs?"+q.toString(),{noCache:true,cancelPrevious:false});
   const reviewsQuery=new URLSearchParams({page:String(history.reviewPage)});
   if(history.userId)reviewsQuery.set("userId",history.userId);
   if(history.reviewStatus!=="all")reviewsQuery.set("status",history.reviewStatus);
   if(history.reviewType!=="all")reviewsQuery.set("type",history.reviewType);
   if(history.reviewPeriod!=="all")reviewsQuery.set("period",history.reviewPeriod);
   const journal=await API.get("/api/admin/device-reviews?"+reviewsQuery.toString(),
    {noCache:true,cancelPrevious:false}).catch(()=>({reviews:[],pagination:{page:1,total:0,pages:0,hasMore:false},error:true}));
   const reviewButtons=d=>(d.observations||[]).map(o=>{
    if(o.reviewStatus)return '<span class="admin-sec-chip is-allowed">'+(o.reviewStatus==="reviewed"?"Đã xem xét":"Đã bỏ qua")+'</span>';
    return '<button type="button" class="outline admin-review-open" data-observation-review="'+esc(o.id)+'" aria-label="Xem xét dấu hiệu '+(o.type==="ip-change"?"đổi IP":"thiết bị mới")+'">'+
     (o.type==="ip-change"?"🔄 Xem xét IP":"✨ Xem xét thiết bị")+'</button>';
   }).join("");
   const rows=(j.devices||[]).map(d=>'<tr><td><b>'+esc(d.name)+'</b><small>'+esc(d.email)+'</small></td>'+
    '<td><b>'+esc(d.device)+'</b><small>'+esc(d.browser)+'</small></td>'+
    '<td><code>'+esc(d.ip||"Không xác định")+'</code></td><td>'+esc(time(d.lastSeenAt))+'</td>'+
    '<td><div class="admin-device-signals">'+
    (d.newDevice7d?'<span class="admin-sec-chip admin-device-signal-new">Thiết bị mới 7 ngày</span>':'')+
    (d.changedIp7d?'<span class="admin-sec-chip admin-device-signal-ip">IP đổi 7 ngày</span>':'')+
    (!d.newDevice7d&&!d.changedIp7d?'<span class="muted">—</span>':'')+
    '</div>'+reviewButtons(d)+'</td></tr>').join("");
   const pager=j.pagination||{},pages=Math.max(1,Number(pager.pages)||1),summary=j.summary||{};
   const selected=(j.devices||[]).flatMap(d=>(d.observations||[]).map(o=>({...o,userId:d.userId})))
    .find(o=>o.id===history.reviewId&&!o.reviewStatus);
   const reviewForm=selected?'<form id="adminDeviceReviewForm" class="admin-device-review-form">'+
    '<div><h3>📝 Ghi nhận kết quả xem xét</h3><p>Dấu hiệu: '+(selected.type==="ip-change"?"IP thiết bị đã thay đổi":"Thiết bị được ghi nhận mới")+'. '+
    'Thao tác này chỉ ghi nhật ký, không khóa tài khoản.</p></div>'+
    '<label>Kết luận<select name="status" required><option value="reviewed">Đã kiểm tra</option>'+
    '<option value="dismissed">Bỏ qua sau khi xem xét</option></select></label>'+
    '<label>Lý do<textarea name="reason" required minlength="10" maxlength="500" rows="3" placeholder="Nhập lý do hoặc kết quả kiểm tra (10–500 ký tự)"></textarea></label>'+
    '<div class="admin-device-review-actions"><button type="submit" class="primary">Lưu quyết định</button>'+
    '<button type="button" class="outline" id="adminDeviceReviewCancel">Hủy</button></div>'+
    (reviewError?'<p role="alert">'+esc(reviewError)+'</p>':'')+'</form>':"";
   const historyRows=(journal.reviews||[]).map(r=>'<article class="admin-device-review-item">'+
    '<div><b>'+esc(r.accountName)+'</b><span class="admin-sec-chip '+(r.status==="reviewed"?"is-allowed":"")+'">'+
    (r.status==="reviewed"?"Đã kiểm tra":"Bỏ qua")+'</span></div>'+
    '<p>'+esc(r.type==="ip-change"?"Thay đổi IP":"Thiết bị mới")+' · '+esc(time(r.reviewedAt))+'</p>'+
    '<p class="admin-device-review-reason">'+esc(r.reason)+'</p>'+
    '<small>Người xử lý: '+esc(r.reviewerId)+'</small></article>').join("");
   const journalSummary=journal.summary||{};
   const selectOptions=(items,current)=>items.map(([value,label])=>
    '<option value="'+value+'" '+(current===value?"selected":"")+'>'+label+'</option>').join("");
   const reviewFilters='<form id="adminDeviceReviewFilters" class="admin-device-review-filters" aria-label="Lọc nhật ký xử lý">'+
    '<label>Kết luận<select name="status" aria-label="Lọc kết luận nhật ký">'+
    selectOptions([["all","Tất cả kết luận"],["reviewed","Đã kiểm tra"],["dismissed","Đã bỏ qua"]],history.reviewStatus)+
    '</select></label>'+
    '<label>Loại dấu hiệu<select name="type" aria-label="Lọc loại dấu hiệu nhật ký">'+
    selectOptions([["all","Tất cả loại"],["new-device","Thiết bị mới"],["ip-change","Đổi IP"]],history.reviewType)+
    '</select></label>'+
    '<label>Thời gian xử lý<select name="period" aria-label="Lọc thời gian xử lý">'+
    selectOptions([["all","Toàn bộ lịch sử"],["24h","24 giờ qua"],["7d","7 ngày qua"],["30d","30 ngày qua"],["90d","90 ngày qua"]],history.reviewPeriod)+
    '</select></label>'+
    '<div class="admin-device-review-filter-actions"><button type="submit" class="primary">🔎 Lọc nhật ký</button>'+
    '<button type="button" id="adminDeviceReviewResetFilters" class="outline">↺ Xóa lọc</button></div></form>';
   const journalCards='<div class="admin-device-review-stats" aria-label="Thống kê quyết định bảo mật">'+
    [["📋","Tổng đã xử lý",journalSummary.total],["✅","Đã kiểm tra",journalSummary.reviewed],
     ["↩️","Đã bỏ qua",journalSummary.dismissed],["🗓️","30 ngày gần nhất",journalSummary.last30d]]
    .map(([icon,label,n])=>'<div class="admin-device-review-stat"><span aria-hidden="true">'+icon+'</span>'+
      '<strong>'+(Number.isFinite(Number(n))?Number(n).toLocaleString("vi-VN"):"—")+'</strong>'+
      '<small>'+label+'</small></div>').join("")+'</div>';
   const reviewJournal='<section class="panel admin-sec-panel admin-device-review-journal">'+
    '<div class="admin-sec-heading"><h2>📋 Nhật ký xử lý dấu hiệu</h2><span class="muted">'+
    Number(journal.pagination?.total||0)+' quyết định</span></div>'+
    '<p class="muted">Lưu quyết định của Admin và lý do, không lưu thêm IP cũ hoặc mã thiết bị. Không tự động khóa tài khoản. '+
    'Bộ lọc thời gian tính theo thời điểm Admin xử lý, không phải thời điểm đăng nhập.</p>'+
    journalCards+reviewFilters+
    '<p class="admin-device-review-count">'+Number(journal.pagination?.total||0)+' kết quả phù hợp / '+
      Number(journalSummary.total||0)+' quyết định trong phạm vi đang xem</p>'+
    (journal.error?'<p role="alert">Không tải được lịch sử xử lý. Vui lòng thử tải lại.</p>':
      historyRows||'<p class="muted">Chưa có quyết định xử lý nào.</p>')+
    '<div class="admin-device-pager"><button type="button" class="outline" id="adminDeviceReviewPrev" '+
    (history.reviewPage<=1?"disabled":"")+'>← Trước</button><span>Trang '+history.reviewPage+'/'+
    Math.max(1,Number(journal.pagination?.pages)||1)+'</span><button type="button" class="outline" id="adminDeviceReviewNext" '+
    (journal.pagination?.hasMore?"":"disabled")+'>Tiếp →</button></div></section>';

   const accountFocus=history.userId?
    '<div class="admin-device-focus" role="status"><div><b>👤 '+(j.account?esc(j.account.name):"Tài khoản không còn tồn tại")+'</b>'+
    '<small>'+(j.account?esc(j.account.email):"Không có dữ liệu")+'</small>'+
    '<span>Chỉ hiển thị IP và thiết bị của tài khoản này.</span></div>'+
    '<button type="button" id="adminDeviceClearAccount" class="outline">✕ Xem tất cả</button></div>':"";
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
   const periods=[["all","Toàn bộ lịch sử"],["24h","24 giờ qua"],["7d","7 ngày qua"],["30d","30 ngày qua"]];
   const periodOptions=periods.map(([value,label])=>'<option value="'+value+'" '+(history.period===value?"selected":"")+'>'+label+'</option>').join("");
   return '<section class="panel admin-sec-panel admin-device-history"><div class="admin-sec-heading"><h2>🌐 IP và thiết bị của các tài khoản</h2></div>'+
    '<p class="admin-device-description">Đây là dấu vết thiết bị đã ghi nhận, không phải lượt đăng nhập hay phiên online. IP thay đổi có thể do Wi-Fi, mạng di động hoặc VPN; không tự động kết luận đáng ngờ.</p>'+
    accountFocus+
    '<div class="admin-device-metrics" aria-label="Thống kê lịch sử thiết bị">'+metrics+'</div>'+
    '<form id="adminDeviceSearchForm" class="admin-device-filter"><label>Tìm theo tên, email, IP hoặc thiết bị'+
    '<input name="search" type="search" maxlength="100" value="'+esc(history.search)+'" placeholder="VD: email học sinh hoặc 192.0.2..." autocomplete="off"></label>'+
    '<label>Loại lịch sử<select name="status" aria-label="Lọc loại lịch sử thiết bị">'+options+'</select></label>'+
    '<label>Hoạt động gần nhất<select name="period" aria-label="Lọc thời gian hoạt động của thiết bị">'+periodOptions+'</select></label>'+
    '<button type="submit" class="primary">🔎 Áp dụng</button></form>'+
    '<p class="muted">'+Number(pager.total||0)+' thiết bị khớp bộ lọc • '+
    (j.source==="postgres"?"Dữ liệu dùng chung PostgreSQL":"Dữ liệu máy chủ hiện tại")+
    '. Thời gian lọc dựa trên hoạt động gần nhất của thiết bị; thống kê phía trên tính toàn bộ lịch sử trong phạm vi tài khoản.</p>'+
    '<div class="table-wrap" tabindex="0" aria-label="Danh sách thiết bị và IP đã đăng nhập"><table><thead><tr>'+
    '<th>Tài khoản</th><th>Thiết bị / trình duyệt</th><th>Địa chỉ IP</th><th>Gần nhất</th><th>Dấu hiệu</th></tr></thead><tbody>'+
    (rows||'<tr><td colspan="5">Chưa ghi nhận thiết bị nào phù hợp. Người dùng cần đăng nhập để hệ thống ghi nhận.</td></tr>')+
    '</tbody></table></div>'+reviewForm+'<div class="admin-device-pager"><button type="button" id="adminDevicePrev" class="outline" '+(history.page<=1?"disabled":"")+'>← Trước</button>'+
    '<span>Trang '+history.page+'/'+pages+'</span><button type="button" id="adminDeviceNext" class="outline" '+(pager.hasMore?"":"disabled")+'>Tiếp →</button></div></section>'+reviewJournal;
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
  document.querySelector("#adminDeviceClearAccount")?.addEventListener("click",()=>{
   history.userId="";history.search="";history.status="all";history.period="all";history.page=1;history.reviewPage=1;history.reviewStatus="all";history.reviewType="all";history.reviewPeriod="all";history.reviewId="";reviewError="";render();
  });
  document.querySelector("#adminDeviceSearchForm")?.addEventListener("submit",e=>{
   e.preventDefault();const value=String(new FormData(e.currentTarget).get("search")||"").trim();
   const nextStatus=String(new FormData(e.currentTarget).get("status")||"all");
   const nextPeriod=String(new FormData(e.currentTarget).get("period")||"all");
   history.search=value.slice(0,100);history.status=nextStatus;history.period=nextPeriod;history.page=1;history.reviewId="";reviewError="";render();
  });
  document.querySelector("#adminDevicePrev")?.addEventListener("click",()=>{
   history.page=Math.max(1,history.page-1);render();
  });
  document.querySelector("#adminDeviceNext")?.addEventListener("click",()=>{history.page++;render()});
  document.querySelectorAll("[data-observation-review]").forEach(button=>button.addEventListener("click",()=>{
   history.reviewId=button.dataset.observationReview;reviewError="";render();
  }));
  document.querySelector("#adminDeviceReviewCancel")?.addEventListener("click",()=>{
   history.reviewId="";reviewError="";render();
  });
  document.querySelector("#adminDeviceReviewForm")?.addEventListener("submit",async e=>{
   e.preventDefault();
   const form=e.currentTarget,button=form.querySelector('button[type="submit"]');
   const values=new FormData(form);
   button.disabled=true;reviewError="";
   try{
    await API.post("/api/admin/device-reviews",{
     observationId:history.reviewId,status:values.get("status"),reason:values.get("reason")
    });
    history.reviewId="";history.reviewPage=1;
    await render();
   }catch(error){reviewError=String(error.message||"Không lưu được quyết định");
    const message=form.querySelector('[role="alert"]')||document.createElement("p");
    message.setAttribute("role","alert");message.textContent=reviewError;
    if(!message.parentElement)form.appendChild(message);
    button.disabled=false;
   }
  });
  document.querySelector("#adminDeviceReviewFilters")?.addEventListener("submit",e=>{
   e.preventDefault();
   const values=new FormData(e.currentTarget);
   history.reviewStatus=String(values.get("status")||"all");
   history.reviewType=String(values.get("type")||"all");
   history.reviewPeriod=String(values.get("period")||"all");
   history.reviewPage=1;history.reviewId="";reviewError="";render();
  });
  document.querySelector("#adminDeviceReviewResetFilters")?.addEventListener("click",()=>{
   history.reviewStatus="all";history.reviewType="all";history.reviewPeriod="all";
   history.reviewPage=1;history.reviewId="";reviewError="";render();
  });
  document.querySelector("#adminDeviceReviewPrev")?.addEventListener("click",()=>{
   history.reviewPage=Math.max(1,history.reviewPage-1);render();
  });
  document.querySelector("#adminDeviceReviewNext")?.addEventListener("click",()=>{
   history.reviewPage++;render();
  });
 }
 return {render,bind};
})();
