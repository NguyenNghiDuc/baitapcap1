window.AdminResults=(()=>{
 const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const state={kind:"exam",page:1,search:"",grade:"",subject:""};
 const subjects={math:"Toán",vietnamese:"Tiếng Việt",english:"Tiếng Anh"};
 const when=d=>{const t=Date.parse(d||"");return Number.isFinite(t)?new Date(t).toLocaleString("vi-VN"):"—"};
 const scoreLabel=n=>n===null||n===undefined||n===""?"Chưa chấm":escape(Number(n).toLocaleString("vi-VN")+"%");
 function form(){
  return '<form id="adminResultsFilter" class="panel admin-score-filters" aria-label="Lọc kết quả học sinh">'+
   '<label>Loại kết quả<select name="kind"><option value="exam" '+(state.kind==="exam"?"selected":"")+'>Đề kiểm tra đã làm</option><option value="assignment" '+(state.kind==="assignment"?"selected":"")+'>Bài giáo viên giao</option></select></label>'+
   '<label>Tìm học sinh/email/bài<input name="search" maxlength="100" value="'+escape(state.search)+'" placeholder="Tên, email hoặc tên bài"></label>'+
   (state.kind==="exam"?'<label>Lớp<select name="grade"><option value="">Tất cả</option>'+[1,2,3,4,5].map(g=>'<option value="'+g+'" '+(state.grade===String(g)?"selected":"")+'>'+g+'</option>').join("")+'</select></label>'+
   '<label>Môn<select name="subject"><option value="">Tất cả</option>'+Object.entries(subjects).map(([id,title])=>'<option value="'+id+'" '+(state.subject===id?"selected":"")+'>'+title+'</option>').join("")+'</select></label>':'')+
   '<button type="submit" class="primary">Lọc kết quả</button></form>';
 }
 async function render(user){
  if(user?.role!=="admin")return '<div class="panel">Chỉ quản trị viên mới được xem kết quả của mọi học sinh.</div>';
  const params=new URLSearchParams({page:String(state.page),limit:"20"});
  if(state.search)params.set("search",state.search);
  if(state.kind==="exam"){if(state.grade)params.set("grade",state.grade);if(state.subject)params.set("subject",state.subject)}
  const url=(state.kind==="exam"?"/api/admin/results":"/api/submissions")+"?"+params.toString();
  let j;
  try{j=await API.get(url,{cancelPrevious:false})}catch(e){return '<section class="page-head"><h1>📊 Kết quả toàn bộ học sinh</h1></section>'+form()+'<div class="panel" role="alert">Không tải được bảng điểm: '+escape(e?.message||"Có lỗi")+'</div>'}
  const rows=state.kind==="exam"?(j.results||[]):(j.submissions||[]);
  const total=Number(j.pagination?.total||0),pages=Math.max(1,Number(j.pagination?.pages||1));
  const body=state.kind==="exam"
   ?rows.map(r=>'<tr><td><strong>'+escape(r.owner?.name||"Chưa xác định")+'</strong><small style="display:block">'+escape(r.owner?.email||"")+'</small></td><td>'+escape(r.title)+'</td><td>'+escape(subjects[r.subject]||r.subject||"—")+'</td><td>'+escape(r.grade??"—")+'</td><td><b>'+scoreLabel(r.score)+'</b><small style="display:block">Tự chấm • chưa xác minh</small></td><td>'+escape(r.correct??"—")+'/'+escape(r.total??"—")+'</td><td>'+when(r.createdAt)+'</td></tr>').join("")
   :rows.map(r=>'<tr><td><strong>'+escape(r.student?.name||"Chưa xác định")+'</strong><small style="display:block">'+escape(r.student?.email||"")+'</small></td><td>'+escape(r.assignment?.title||"Bài được giao")+'</td><td>'+escape(r.assignment?.subject||"—")+'</td><td>'+escape(r.assignment?.grade??"—")+'</td><td><b>'+scoreLabel(r.score)+'</b><small style="display:block">'+(r.gradingStatus==="teacher_graded"?"Đã được giáo viên chấm":"Đang chờ chấm")+'</small></td><td>'+escape(r.feedback||"—")+'</td><td>'+when(r.gradedAt||r.submittedAt)+'</td></tr>').join("");
  const header='<thead><tr><th>Tài khoản</th><th>Bài làm</th><th>Môn</th><th>Lớp</th><th>Điểm</th><th>'+(state.kind==="exam"?"Đúng/Tổng":"Nhận xét")+'</th><th>Ngày</th></tr></thead>';
  return '<section class="page-head"><span class="eyebrow">QUẢN TRỊ • ĐIỂM SỐ</span><h1>📊 Kết quả toàn bộ học sinh</h1><p>Tổng hợp các bài đã gửi lên server, xem tên và email tài khoản nộp.</p></section>'+
   '<div class="panel"><b>Phân biệt nguồn điểm:</b> Điểm đề kiểm tra do học sinh tự gửi từ trình duyệt, <strong>chưa được giáo viên xác minh</strong>. Điểm bài được giao hiển thị khi giáo viên đã chấm.</div>'+
   form()+'<div class="panel"><h3>'+escape(state.kind==="exam"?"Bài kiểm tra đã nộp":"Bài giáo viên giao")+' • '+total+' lượt</h3>'+
   (state.kind==="exam"&&j.source==="local"?'<p class="muted">Dữ liệu đang lưu cục bộ ở server. Cần cấu hình PostgreSQL để đồng bộ nhiều máy chủ.</p>':"")+
   '<div class="table-wrap"><table>'+header+'<tbody>'+ (body||'<tr><td colspan="7">Chưa có kết quả được đồng bộ trên máy chủ theo bộ lọc này. Những bài chỉ lưu trên điện thoại sẽ không hiển thị.</td></tr>')+'</tbody></table></div>'+
   '<div class="exam-pagination"><button id="adminScoresPrev" type="button" class="outline" '+(state.page<=1?"disabled":"")+'>← Trước</button>'+
   '<span>Trang '+state.page+'/'+pages+'</span><button id="adminScoresNext" type="button" class="outline" '+(j.pagination?.hasMore?"":"disabled")+'>Tiếp →</button></div></div>';
 }
 function bind(toast,render){
  const form=document.querySelector("#adminResultsFilter");
  form?.querySelector('[name="kind"]')?.addEventListener("change",e=>{state.kind=e.target.value;state.page=1;render()});
  form?.addEventListener("submit",e=>{
   e.preventDefault();const f=new FormData(e.currentTarget);
   state.search=String(f.get("search")||"").trim().slice(0,100);
   if(state.kind==="exam"){state.grade=String(f.get("grade")||"");state.subject=String(f.get("subject")||"")}
   state.page=1;render();
  });
  document.querySelector("#adminScoresPrev")?.addEventListener("click",()=>{state.page=Math.max(1,state.page-1);render()});
  document.querySelector("#adminScoresNext")?.addEventListener("click",()=>{state.page++;render()});
 }
 return {render,bind};
})();