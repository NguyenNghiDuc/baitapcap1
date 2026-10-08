window.LockedExamUI=(()=>{
 const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
 function subjectIcon(subject="math"){return subject==="english"?"📘":subject==="vietnamese"?"📕":subject==="science"?"🧪":"🧮"}
 function subjectName(subject="math"){return subject==="english"?"Tiếng Anh":subject==="vietnamese"?"Ngữ văn":subject==="science"?"Khoa học":subject==="mixed"?"Tổng hợp":"Toán"}
 function render({title="Bài kiểm tra",subject="math",grade=4,index=0,questions=[],answers={},timeMin=15,bodyHtml="",typeLabel="Trắc nghiệm"}={}){
  const total=questions.length||1,done=questions.filter(q=>Object.prototype.hasOwnProperty.call(answers,q.id)).length,pct=Math.round(done/total*100);
  const nav=questions.map((q,i)=>{const answered=Object.prototype.hasOwnProperty.call(answers,q.id);return `<button class="locked-qnav ${i===index?"current":answered?"done":""}" data-qindex="${i}">${i+1}</button>`}).join("");
  return `<section class="locked-exam-shell">
   <div class="locked-exam-banner">
    <div class="locked-banner-title"><span class="locked-banner-icon">🔒</span><div><h1>Chế độ làm bài kiểm tra</h1><p>Trong thời gian làm bài, bạn chỉ có thể xem câu hỏi và nộp bài.<br>Các chức năng khác sẽ bị khóa cho đến khi nộp bài.</p></div></div>
    <div class="locked-banner-warning"><span>❗</span><b>Trong thời gian làm bài, bạn chỉ có thể xem câu hỏi và nộp bài. Các chức năng khác sẽ bị khóa cho đến khi nộp bài.</b></div>
   </div>

   <div class="locked-exam-grid">
    <main class="locked-exam-main">
     <div class="locked-exam-title-card">
      <div class="locked-subject-icon">${subjectIcon(subject)}</div>
      <div><h2>${esc(title)}</h2><div class="locked-meta"><span>⚙️ ${subjectName(subject)}</span><span>📋 ${total} câu</span><span>🕘 ${timeMin} phút</span></div></div>
     </div>

     <div class="locked-progress-card">
      <b>Câu ${index+1}/${total}</b><div class="locked-progress"><span style="width:${pct}%"></span></div><span>Hoàn thành ${pct}%</span>
     </div>

     <article class="locked-question-card">
      <span class="locked-question-badge">Câu ${index+1}</span>
      ${bodyHtml}
      <div class="locked-question-actions">
       <button class="locked-secondary" id="lockedPrev" ${index===0?"disabled":""}>‹ &nbsp; Câu trước</button>
       <button class="locked-primary" id="lockedNext" ${index===total-1?"disabled":""}>Câu tiếp &nbsp; ›</button>
      </div>
     </article>
    </main>

    <aside class="locked-exam-side">
     <div class="locked-timer-card"><span class="locked-timer-icon">◷</span><div><small>Thời gian còn lại</small><b id="timer">--:--</b></div></div>
     <div class="locked-side-card">
      <h3>Danh sách câu hỏi</h3>
      <div class="locked-nav-legend"><span><i class="legend-current"></i>Câu hiện tại</span><span><i></i>Chưa làm</span><span><i class="legend-done"></i>Đã làm</span></div>
      <div class="locked-qnav-grid">${nav}</div>
     </div>
     <div class="locked-side-card locked-info-card">
      <h3>Thông tin bài kiểm tra</h3>
      <div><span>📖 Môn học</span><b>${subjectName(subject)}</b></div>
      <div><span>📄 Số câu hỏi</span><b>${total} câu</b></div>
      <div><span>◷ Thời gian làm bài</span><b>${timeMin} phút</b></div>
      <div><span>☷ Hình thức</span><b>${esc(typeLabel)}</b></div>
      <button class="locked-submit" id="lockedSubmit">✈ &nbsp; Nộp bài</button>
      <small class="locked-submit-note">Hãy kiểm tra kỹ các câu trả lời trước khi nộp bài.</small>
     </div>
    </aside>
   </div>
  </section>`
 }
 return {render}
})();