window.StudentAdminGrades=(()=>{
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const fmt=v=>v===null||v===undefined?"—":Number(v).toLocaleString("vi-VN",{maximumFractionDigits:2});
 const when=v=>v?new Date(v).toLocaleString("vi-VN"):"—";
 const subjects={math:"Toán",vietnamese:"Tiếng Việt",english:"Tiếng Anh",nature:"Tự nhiên & Xã hội",science:"Khoa học",history:"Lịch sử & Địa lý"};
 let filters={grade:"",subject:"",status:"",search:"",page:1},loading=false;
 function option(val,name,current){return '<option value="'+esc(val)+'"'+(String(val)===String(current)?" selected":"")+'>'+esc(name)+'</option>'}
 async function render(user){
  if(user?.role!=="admin")return '<section class="panel"><h2>Không có quyền xem điểm</h2><p>Chỉ tài khoản quản trị được cấp quyền mới xem được.</p></section>';
  try{
   const params=new URLSearchParams();
   for(const key of ["grade","subject","status","search"])if(filters[key])params.set(key,filters[key]);
   params.set("page",String(filters.page));
   const data=await API.get("/api/real/admin/grades?"+params);
   if(data.source!=="postgres")throw new Error("Nguồn điểm không phải PostgreSQL");
   const x=data.summary,p=data.pagination;
   const rows=data.results.map(r=>{
    const verified=r.verified===true;
    return '<tr><td><b>'+esc(r.student_name||"Chưa có tên")+'</b></td><td>'+esc(r.grade??"—")+'</td><td>'+esc(subjects[r.subject]||r.subject||"Khác")+'</td><td>'+esc(r.title||"Bài tập")+'</td><td><strong>'+fmt(r.score)+'</strong> / 100'+(r.total!==null&&r.total!==undefined?'<small class="grade-progress">'+fmt(r.correct)+'/'+fmt(r.total)+' câu</small>':'')+'</td><td><span class="grade-status '+(verified?"verified":"unverified")+'">'+(verified?"✓ Đã xác minh":"! Chưa xác minh")+'</span></td><td>'+esc(when(r.created_at))+'</td></tr>';
   }).join("");
   return '<section class="page-head"><span class="eyebrow">POSTGRESQL • CHỈ ADMIN</span><h1>📊 Điểm học sinh</h1><p>Xem kết quả đã lưu trong cơ sở dữ liệu, phân biệt điểm học sinh tự nộp và điểm đã được xác minh.</p></section>'+
    '<div class="metrics"><div class="metric"><b>'+fmt(x.total)+'</b><small>Kết quả theo bộ lọc</small></div><div class="metric"><b>'+fmt(x.verified)+'</b><small>Đã xác minh</small></div><div class="metric"><b>'+fmt(x.unverified)+'</b><small>Chưa xác minh</small></div></div>'+
    '<section class="panel"><form id="adminGradeFilters" class="grade-filters" autocomplete="off">'+
      '<label>Tìm học sinh<input id="adminGradeSearch" type="search" maxlength="80" placeholder="Nhập tên học sinh" value="'+esc(filters.search)+'"></label>'+
      '<label>Lớp<select id="adminGradeClass">'+option("","Tất cả lớp",filters.grade)+[1,2,3,4,5].map(g=>option(g,"Lớp "+g,filters.grade)).join("")+'</select></label>'+
      '<label>Môn học<select id="adminGradeSubject">'+option("","Tất cả môn",filters.subject)+Object.entries(subjects).map(([key,value])=>option(key,value,filters.subject)).join("")+'</select></label>'+
      '<label>Trạng thái<select id="adminGradeStatus">'+option("","Tất cả kết quả",filters.status)+option("verified","Đã xác minh",filters.status)+option("unverified","Chưa xác minh",filters.status)+'</select></label>'+
      '<button type="submit" class="primary">🔎 Lọc điểm</button><button type="button" id="adminGradesReset" class="outline">Xóa lọc</button></form>'+
      '<p class="muted">Điểm tự nộp chưa được giáo viên hoặc hệ thống chấm xác minh. Không sử dụng điểm đó làm kết quả thi chính thức.</p>'+
      '<div class="table-wrap"><table class="grade-table"><thead><tr><th>Học sinh</th><th>Lớp</th><th>Môn</th><th>Bài làm</th><th>Điểm</th><th>Xác minh</th><th>Thời gian</th></tr></thead><tbody>'+
      (rows||'<tr><td colspan="7">Chưa có kết quả thật phù hợp bộ lọc.</td></tr>')+'</tbody></table></div>'+
      '<div class="grade-pagination"><button id="adminGradesPrev" type="button" class="outline"'+(p.page<=1?' disabled':'')+'>← Trước</button><span>Trang '+fmt(p.page)+'/'+fmt(Math.max(1,p.pages))+'</span><button id="adminGradesNext" type="button" class="outline"'+(!p.hasMore?' disabled':'')+'>Tiếp →</button></div></section>';
  }catch(e){return '<section class="panel"><h2>Chưa tải được điểm học sinh</h2><p>'+esc(e.message)+'</p><p>Kiểm tra DATABASE_URL, migrations và quyền Admin; không hiển thị điểm giả.</p><button type="button" class="outline" id="adminGradesRetry">Thử lại</button></section>'}
 }
 function bind(){
  async function refresh(){
   if(loading)return;loading=true;
   try{const el=document.querySelector("#content");if(el){el.innerHTML=await render({role:"admin"});bind()}}finally{loading=false}
  }
  document.querySelector("#adminGradeFilters")?.addEventListener("submit",e=>{
   e.preventDefault();
   filters={grade:document.querySelector("#adminGradeClass").value,subject:document.querySelector("#adminGradeSubject").value,status:document.querySelector("#adminGradeStatus").value,search:document.querySelector("#adminGradeSearch").value.trim(),page:1};
   refresh();
  });
  document.querySelector("#adminGradesReset")?.addEventListener("click",()=>{filters={grade:"",subject:"",status:"",search:"",page:1};refresh()});
  document.querySelector("#adminGradesPrev")?.addEventListener("click",()=>{if(filters.page>1){filters.page--;refresh()}});
  document.querySelector("#adminGradesNext")?.addEventListener("click",()=>{filters.page++;refresh()});
  document.querySelector("#adminGradesRetry")?.addEventListener("click",refresh);
 }
 return {render,bind};
})();