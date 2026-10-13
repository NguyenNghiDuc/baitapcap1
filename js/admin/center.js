"use strict";
window.AdminCenter=(()=>{
 const sections=[
  {id:"overview",icon:"🧭",title:"Tổng quan",description:"Bảng điều khiển và danh mục phát triển",links:[["admin","Dashboard"],["adminCenter","Danh mục 160 mục"]]},
  {id:"users",icon:"👥",title:"Người dùng",description:"Tài khoản và phân quyền đang sử dụng",links:[["adminUsers","Quản lý tài khoản"]]},
  {id:"learning",icon:"🏫",title:"Học tập & lớp học",description:"Công cụ lớp học và người giám hộ",links:[["classes","Lớp học"],["teacher","Giáo viên"],["parent","Phụ huynh"]]},
  {id:"exams",icon:"📝",title:"Đề thi & chấm điểm",description:"Câu hỏi, phòng thi và bài đã nộp",links:[["questionBank","Ngân hàng câu hỏi"],["examRooms","Phòng thi"],["submissions","Chấm bài"]]},
  {id:"ai",icon:"🤖",title:"AI học tập",description:"Trải nghiệm trợ giảng, chưa phải bảng cấu hình AI",links:[["ai","Trợ giảng AI"]]},
  {id:"reports",icon:"📊",title:"Báo cáo & thống kê",description:"Điểm học sinh và phân tích kết quả",links:[["adminResults","Bảng điểm"],["analytics","Phân tích"]]},
  {id:"security",icon:"🛡️",title:"Bảo mật",description:"Nhật ký Admin và bảo mật tài khoản đang đăng nhập",links:[["adminAudit","Nhật ký"],["accountSecurity","Bảo mật của tôi"]]},
  {id:"system",icon:"⚙️",title:"Hệ thống",description:"Theo dõi API và cơ sở dữ liệu",links:[["adminAlerts","Cảnh báo hệ thống"],["performanceMonitor","Hiệu năng API"],["storageHealth","PostgreSQL/Redis"]]}
 ];
 const state={search:"",group:"all",status:"all",page:1},LIMIT=12;
 let cached=null;
 const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").toLowerCase();
 const labels={"not-verified":"Chưa xác minh","partial":"Đã làm một phần","verified":"Đã kiểm thử","blocked":"Cần điều kiện triển khai"};
 async function catalog(){
  if(cached)return cached;
  const r=await fetch("/assets/admin-feature-catalog.json?revision=20261013-admin3",{cache:"reload"});
  if(!r.ok)throw Error("Không tải được danh mục chức năng.");
  const data=await r.json();
  if(data.schema!==1||data.features?.length!==160||data.groups?.length!==8)throw Error("Danh mục chưa được đồng bộ từ lộ trình.");
  cached=data;return data;
 }
 function options(items,selected){return items.map(([v,t])=>'<option value="'+esc(v)+'" '+(selected===v?'selected':'')+'>'+esc(t)+'</option>').join("")}
 async function render(user){
  if(user?.role!=="admin")return '<div class="panel">Chỉ quản trị viên được xem Trung tâm quản trị.</div>';
  let data;try{data=await catalog()}catch(err){return '<div class="panel"><h3>Không tải được danh mục</h3><p>'+esc(err.message)+'</p><button class="outline" id="adminCenterRetry" type="button">Thử lại</button></div>'}
  const counts={verified:0,partial:0,blocked:0,"not-verified":0};
  data.features.forEach(f=>{counts[f.assessment]=(counts[f.assessment]||0)+1});
  const actions=sections.map(s=>
   '<article class="admin-center-group"><div class="admin-center-group-heading"><span class="admin-center-icon" aria-hidden="true">'+s.icon+'</span><div><h3>'+esc(s.title)+'</h3><p>'+esc(s.description)+'</p></div></div>'+
    '<div class="admin-center-links">'+s.links.map(([route,label])=>'<a href="#'+esc(route)+'">'+esc(label)+' <span aria-hidden="true">↗</span></a>').join("")+'</div></article>'
  ).join("");
  const norm=normalize(state.search.trim());
  const filtered=data.features.filter(f=>(state.group==="all"||String(f.group)===state.group)&&
   (state.status==="all"||f.assessment===state.status)&&
   (!norm||normalize(f.id+" "+f.name).includes(norm)));
  const pages=Math.max(1,Math.ceil(filtered.length/LIMIT));state.page=Math.min(Math.max(1,state.page),pages);
  const rows=filtered.slice((state.page-1)*LIMIT,state.page*LIMIT).map(f=>
   '<div class="admin-center-feature"><span class="admin-center-number">#'+f.id+'</span><div class="admin-center-feature-copy"><b>'+esc(f.name)+'</b>'+
   '<small>'+esc(data.groups[f.group-1]?.name||"")+'</small>'+(f.note?'<p>'+esc(f.note)+'</p>':'')+'</div>'+
   '<span class="admin-center-state" data-status="'+esc(f.assessment)+'">'+esc(labels[f.assessment]||"Đang kiểm tra")+'</span></div>'
  ).join("")||'<p class="admin-center-empty">Không tìm thấy mục phù hợp.</p>';
  return '<div class="admin-center">'+
   '<section class="page-head"><span class="eyebrow">ADMIN • ĐIỀU HÀNH</span><h1>🧭 Trung tâm quản trị</h1><p>8 nhóm điều hành có đường dẫn hoạt động; theo dõi minh bạch 160 hạng mục phát triển, không đánh dấu hoàn thành khi chưa kiểm thử.</p></section>'+
   '<div class="admin-center-stats"><div><strong>8</strong><span>Nhóm quản trị</span></div><div><strong>160</strong><span>Hạng mục đề xuất</span></div><div><strong>'+counts.verified+'</strong><span>Đã xác minh hoàn thành</span></div><div><strong>'+counts.partial+'</strong><span>Hoàn thiện một phần</span></div></div>'+
   '<div class="admin-center-section-heading"><div><h2>Đi đến chức năng</h2><p>Các liên kết dưới đây dẫn tới trang đã tồn tại. Một số thao tác cần cấu hình dịch vụ và quyền phù hợp.</p></div></div>'+
   '<div class="admin-center-grid">'+actions+'</div>'+
   '<section class="panel admin-center-roadmap"><div class="admin-center-section-heading"><div><h2>Danh mục phát triển 1–160</h2><p>'+counts["not-verified"]+' mục chưa xác minh • '+counts.blocked+' mục đang chờ điều kiện • '+counts.partial+' mục đã làm một phần. Chưa xác minh không có nghĩa là chưa có code.</p></div></div>'+
   '<form id="adminCenterFilters" class="admin-center-filters"><label>Tìm chức năng<input type="search" name="search" maxlength="100" placeholder="VD: phân quyền, tạo đề, AI..." value="'+esc(state.search)+'"></label>'+
   '<label>Nhóm đề xuất<select name="group">'+options([["all","Tất cả nhóm"],...data.groups.map(g=>[String(g.id),g.name])],state.group)+'</select></label>'+
   '<label>Tiến độ<select name="status">'+options([["all","Tất cả trạng thái"],...Object.entries(labels)],state.status)+'</select></label>'+
   '<button class="primary" type="submit">Lọc</button></form>'+
   '<div class="admin-center-feature-list" aria-live="polite">'+rows+'</div>'+
   '<div class="admin-center-pager"><button class="outline" id="adminCenterPrev" type="button" '+(state.page<=1?'disabled':'')+'>← Trước</button><span>'+filtered.length+' kết quả • Trang '+state.page+'/'+pages+'</span><button class="outline" id="adminCenterNext" type="button" '+(state.page>=pages?'disabled':'')+'>Tiếp →</button></div>'+
   '<p class="admin-center-disclaimer">Danh mục này là kế hoạch và tình trạng rà soát mã nguồn, không phải 160 chức năng đã vận hành. Các thao tác cấp quyền hoặc chỉnh điểm tiếp tục được kiểm tra ở API.</p></section></div>';
 }
 function bind(rerender){
  document.querySelector("#adminCenterRetry")?.addEventListener("click",()=>{cached=null;rerender()});
  const form=document.querySelector("#adminCenterFilters");
  form?.addEventListener("submit",e=>{
   e.preventDefault();const d=new FormData(form);
   state.search=String(d.get("search")||"").trim().slice(0,100);
   state.group=String(d.get("group")||"all");state.status=String(d.get("status")||"all");state.page=1;rerender()
  });
  form?.querySelectorAll("select").forEach(select=>select.addEventListener("change",()=>form.requestSubmit()));
  document.querySelector("#adminCenterPrev")?.addEventListener("click",()=>{state.page=Math.max(1,state.page-1);rerender()});
  document.querySelector("#adminCenterNext")?.addEventListener("click",()=>{state.page++;rerender()});
 }
 return {render,bind,sections};
})();
