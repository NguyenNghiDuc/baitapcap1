"use strict";
window.GradeReviews=(()=>{
 const escape=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
 const state={status:"pending",page:1};
 const labels={pending:"Đang chờ",approved:"Đã duyệt",rejected:"Từ chối"};
 async function render(user){
  if(!["teacher","admin"].includes(user?.role))return '<section class="panel">Chỉ giáo viên và Admin được xem yêu cầu sửa điểm.</section>';
  try{
   const params=new URLSearchParams({page:String(state.page),status:state.status});
   const j=await API.get("/api/grade-reviews?"+params.toString(),{noCache:true,cancelPrevious:false});
   const rows=(j.reviews||[]).map(x=>{
    const canDecide=user.role==="admin"&&x.status==="pending";
    return '<article class="grade-review-row" data-review="'+escape(x.id)+'">'+
     '<div class="grade-review-top"><div><h3>'+escape(x.studentName)+' — '+escape(x.assignmentTitle)+'</h3>'+
     '<small>Giáo viên: '+escape(x.requesterName)+' · '+escape(new Date(x.createdAt).toLocaleString("vi-VN"))+'</small></div>'+
     '<span class="grade-review-badge" data-status="'+escape(x.status)+'">'+escape(labels[x.status]||x.status)+'</span></div>'+
     '<div class="grade-review-score"><strong>'+Number(x.oldScore)+'%</strong><span aria-hidden="true">→</span><strong>'+Number(x.newScore)+'%</strong></div>'+
     '<p><b>Lý do:</b> '+escape(x.reason)+'</p>'+
     (x.feedback?'<p><b>Nhận xét đề nghị:</b> '+escape(x.feedback)+'</p>':"")+
     (x.decisionReason?'<p><b>Ghi chú quyết định:</b> '+escape(x.decisionReason)+'</p>':"")+
     (canDecide?'<form class="grade-review-decision" data-grade-decision="'+escape(x.id)+'">'+
      '<label>Ghi chú khi từ chối<input name="reason" maxlength="500" placeholder="Nhập lý do nếu từ chối"></label>'+
      '<div class="grade-review-actions"><button class="primary" type="submit" name="decision" value="approve">✓ Duyệt sửa điểm</button>'+
      '<button class="outline" type="submit" name="decision" value="reject">Từ chối</button></div></form>':"")+
     '</article>';
   }).join("");
   const pages=Math.max(1,Number(j.pagination?.pages||1));
   return '<div class="grade-review-page">'+
    '<section class="page-head"><span class="eyebrow">HỌC TẬP • KIỂM SOÁT ĐIỂM</span><h1>📝 Yêu cầu sửa điểm</h1>'+
    '<p>Giáo viên đề xuất chỉnh điểm đã chấm. Chỉ Admin duyệt mới thay đổi điểm trên bài nộp.</p></section>'+
    '<section class="panel"><div class="grade-review-toolbar"><label>Trạng thái<select id="gradeReviewsStatus">'+
    Object.entries({pending:"Đang chờ duyệt",approved:"Đã duyệt",rejected:"Đã từ chối",all:"Tất cả"}).map(([v,l])=>'<option value="'+v+'" '+(v===state.status?"selected":"")+'>'+l+'</option>').join("")+
    '</select></label><a class="outline" href="#submissions">← Bài đã nộp</a></div>'+
    '<div class="grade-review-list">'+(rows||'<p class="muted">Không có yêu cầu trong bộ lọc này.</p>')+'</div>'+
    '<div class="grade-review-pages"><button type="button" class="outline" id="gradeReviewsPrev" '+(state.page<=1?"disabled":"")+'>← Trước</button>'+
    '<span>Trang '+state.page+'/'+pages+' · '+Number(j.pagination?.total||0)+' yêu cầu</span>'+
    '<button type="button" class="outline" id="gradeReviewsNext" '+(state.page>=pages?"disabled":"")+'>Sau →</button></div>'+
    '<p class="muted">Yêu cầu và quyết định được ghi nhật ký. Hệ thống chưa hỗ trợ phê duyệt đa máy chủ theo giao dịch nguyên tử.</p>'+
    '</section></div>';
  }catch(e){return '<section class="panel" role="alert"><h3>Không tải được yêu cầu sửa điểm</h3><p>'+escape(e?.message||"Có lỗi")+'</p><button id="gradeReviewsRetry" class="outline">Thử lại</button></section>'}
 }
 function bind(toast,rerender){
  document.querySelector("#gradeReviewsStatus")?.addEventListener("change",e=>{state.status=e.target.value;state.page=1;rerender()});
  document.querySelector("#gradeReviewsPrev")?.addEventListener("click",()=>{state.page=Math.max(1,state.page-1);rerender()});
  document.querySelector("#gradeReviewsNext")?.addEventListener("click",()=>{state.page++;rerender()});
  document.querySelector("#gradeReviewsRetry")?.addEventListener("click",rerender);
  document.querySelectorAll("[data-grade-decision]").forEach(form=>form.addEventListener("submit",async e=>{
   e.preventDefault();
   const decision=e.submitter?.value;
   if(!["approve","reject"].includes(decision))return;
   const reason=String(new FormData(form).get("reason")||"").trim();
   if(decision==="reject"&&reason.length<8){toast("Từ chối phải nêu lý do ít nhất 8 ký tự.");return}
   if(!confirm(decision==="approve"?"Duyệt và áp dụng điểm đã đề nghị?":"Từ chối yêu cầu này?"))return;
   for(const button of form.querySelectorAll("button"))button.disabled=true;
   try{
    await API.post("/api/grade-reviews/"+encodeURIComponent(form.dataset.gradeDecision)+"/decision",{decision,reason});
    toast(decision==="approve"?"Đã duyệt và cập nhật điểm":"Đã từ chối yêu cầu");rerender();
   }catch(err){toast(err.message||"Không thể xử lý yêu cầu");for(const button of form.querySelectorAll("button"))button.disabled=false}
  }));
 }
 return {render,bind};
})();
