"use strict";
window.AdminAudit=(()=>{
 const state={search:"",page:1},limit=20;
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const time=s=>{const n=Date.parse(s||"");return Number.isFinite(n)?new Date(n).toLocaleString("vi-VN"):"—"};
 async function render(user){
  if(user?.role!=="admin")return '<div class="panel">Chỉ Admin được xem nhật ký hệ thống.</div>';
  const q=new URLSearchParams({page:String(state.page),limit:String(limit)});
  if(state.search)q.set("search",state.search);
  try{
   const d=await API.get("/api/admin/audit?"+q,{cancelPrevious:false,noCache:true});
   const pagination=d.pagination||{},events=Array.isArray(d.events)?d.events:[];
   const total=Number(pagination.total||0),pages=Math.max(1,Number(pagination.pages||1));
   const rows=events.map(e=>'<tr><td><span class="admin-audit-action">'+esc(e.action)+'</span></td>'+
     '<td><b>'+esc(e.actorName||"Không rõ")+'</b><small>'+esc(e.userId||"Hệ thống")+'</small></td>'+
     '<td><time>'+esc(time(e.at))+'</time></td></tr>').join("");
   return '<div class="admin-audit-page">'+
    '<section class="page-head"><span class="eyebrow">QUẢN TRỊ • KIỂM TOÁN</span><h1>📋 Nhật ký hoạt động</h1>'+
     '<p>Tra cứu thao tác quản trị và thay đổi trong hệ thống. Thông tin nhạy cảm không được hiển thị trong danh sách.</p></section>'+
    '<div class="admin-audit-summary">'+
     '<div class="admin-audit-stat"><span aria-hidden="true">📄</span><div><strong>'+total.toLocaleString("vi-VN")+'</strong><small>Sự kiện phù hợp</small></div></div>'+
     '<div class="admin-audit-stat"><span aria-hidden="true">🔒</span><div><strong>Riêng tư</strong><small>Không hiển thị metadata nội bộ</small></div></div>'+
     '</div>'+
    '<form id="adminAuditSearch" class="admin-audit-search" aria-label="Tìm nhật ký">'+
     '<label for="adminAuditQuery">Tìm theo thao tác hoặc người thực hiện</label><div>'+
     '<input id="adminAuditQuery" name="search" type="search" maxlength="100" value="'+esc(state.search)+'" placeholder="Ví dụ: login, user_updated, admin_granted">'+
     '<button class="primary" type="submit">🔍 Tìm</button></div></form>'+
    '<section class="panel admin-audit-list"><div class="admin-audit-heading"><h3>Lịch sử mới nhất</h3><span>Trang '+state.page+'/'+pages+'</span></div>'+
     '<div class="table-wrap" tabindex="0"><table><thead><tr><th>Thao tác</th><th>Người thực hiện</th><th>Thời gian</th></tr></thead>'+
     '<tbody>'+(rows||'<tr><td colspan="3">Chưa có sự kiện phù hợp với tìm kiếm.</td></tr>')+'</tbody></table></div>'+
     '<div class="admin-audit-pagination"><button type="button" id="adminAuditPrev" class="outline" '+(state.page<=1?"disabled":"")+'>← Trước</button>'+
     '<span>Trang '+state.page+' / '+pages+'</span>'+
     '<button type="button" id="adminAuditNext" class="outline" '+(pagination.hasMore?"":"disabled")+'>Tiếp →</button></div>'+
     '<p class="muted">Nguồn dữ liệu: '+(d.scope==="database"?"PostgreSQL":"bộ nhớ máy chủ hiện tại")+
      '. Nhật ký chỉ hỗ trợ tra cứu, không có chức năng chỉnh sửa hoặc xóa tại đây.</p></section></div>';
  }catch(e){
   return '<section class="panel admin-audit-error" role="alert"><h3>Chưa xem được nhật ký</h3><p>'+
    esc(e?.message||"Có lỗi khi tải dữ liệu")+'</p><button class="outline" data-route="adminAudit">↻ Thử lại</button></section>';
  }
 }
 function bind(toast,rerender){
  document.querySelector("#adminAuditSearch")?.addEventListener("submit",e=>{
   e.preventDefault();state.search=String(new FormData(e.currentTarget).get("search")||"").trim().slice(0,100);
   state.page=1;rerender();
  });
  document.querySelector("#adminAuditPrev")?.addEventListener("click",()=>{
   state.page=Math.max(1,state.page-1);rerender();
  });
  document.querySelector("#adminAuditNext")?.addEventListener("click",()=>{
   state.page=Math.min(10000,state.page+1);rerender();
  });
 }
 return {render,bind};
})();
