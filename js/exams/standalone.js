(() => {
 "use strict";
 const host=document.querySelector("#examApp"),advancedMode=document.body.dataset.examMode==="advanced",B=advancedMode?window.AdvancedExamBank:window.TermExamBank,I=window.ExamInteraction;
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let exam=null,seconds=0,timer=null,page=0,filters={grade:"4",subject:"math",semester:advancedMode?"":"1",stage:advancedMode?"":"1"};
 const names={math:"Toán",vietnamese:"Tiếng Việt",english:"Tiếng Anh"};
 const types=["math","vietnamese","english"];
 function stop(){if(timer){clearInterval(timer);timer=null;}}
 function err(e){host.innerHTML='<section class="panel"><h2>Không thể mở đề</h2><p>'+esc(e?.message||e)+'</p><button id="back">Quay lại danh sách</button></section>';document.querySelector("#back").onclick=list;stop();}
 function list(){
  stop();exam=null;
  if(!B?.exams?.length){err("Ngân hàng đề chưa tải. Vui lòng tải lại trang.");return;}
  if(advancedMode){
   const all=B.exams.filter(e=>(!filters.grade||String(e.grade)===filters.grade)&&(!filters.subject||e.subject===filters.subject));
   const items=all.slice(page*30,(page+1)*30);
   host.innerHTML='<h2>🌟 Bộ đề nâng cao riêng</h2><p>Các câu hỏi được lấy từ ngân hàng nâng cao, không trộn đề kiểm tra thông thường.</p><div class="filters"><select id="g"><option value="">Tất cả lớp</option><option value="4">Lớp 4</option><option value="5">Lớp 5</option></select><select id="s"><option value="">Tất cả môn</option><option value="math">Toán</option><option value="vietnamese">Tiếng Việt</option><option value="english">Tiếng Anh</option></select></div><p>'+all.length+' đề nâng cao</p><div class="grid">'+items.map(e=>'<article class="card"><h3>'+esc(e.title)+'</h3><p>'+(e.challenge?'20 câu · 5 điểm/câu · 45 phút':'30 câu nâng cao · 60 phút')+'</p><button data-exam="'+e.id+'">Bắt đầu đề nâng cao</button></article>').join("")+'</div>';
   document.querySelector("#g").value=filters.grade;
   document.querySelector("#s").value=filters.subject;
   for(const [id,key] of [["g","grade"],["s","subject"]])document.querySelector("#"+id).onchange=e=>{filters[key]=e.target.value;page=0;list();};
   host.querySelectorAll("[data-exam]").forEach(b=>b.onclick=()=>{const e=B.exams.find(x=>x.id===b.dataset.exam);if(e)start(e,B.questions(e.id),e.time);});
   navPages(all.length);
   return;
  }
  const today=[4,5].flatMap(g=>types.map(t=>B.daily(g,t))).filter(e=>(!filters.grade||String(e.grade)===filters.grade)&&(!filters.subject||e.subject===filters.subject));
  const options=(values,labels,selected)=>values.map((v,i)=>'<option value="'+v+'" '+(String(v)===String(selected)?'selected':'')+'>'+labels[i]+'</option>').join("");
  const all=B.exams.filter(e=>(!filters.grade||String(e.grade)===filters.grade)&&(!filters.subject||e.subject===filters.subject)&&(!filters.semester||String(e.semester)===filters.semester)&&(!filters.stage||String(e.stage)===filters.stage));
  const items=all.slice(page*30,(page+1)*30);
  const subjectButtons=[["math","🧮","Toán"],["vietnamese","📖","Tiếng Việt"],["english","🌍","Tiếng Anh"]].map(([key,emoji,label])=>'<button type="button" class="subject-choice '+(filters.subject===key?'active':'')+'" data-select-subject="'+key+'"><span>'+emoji+'</span> '+label+'</button>').join("");
  const setCards=items.map(e=>'<article class="exam-card"><div class="exam-card-head"><span class="exam-tag">'+esc(names[e.subject]||e.subject)+'</span><span class="exam-tag neutral">Lớp '+e.grade+'</span></div><h3>'+esc(e.title)+'</h3><p>📝 30 câu &nbsp;·&nbsp; ⏱ '+(e.time||60)+' phút</p><button data-exam="'+esc(e.id)+'">Bắt đầu làm bài →</button></article>').join("");
  host.innerHTML='<section class="exam-hero"><div><span class="hero-kicker">KHÔNG GIAN ÔN LUYỆN</span><h1>📝 Đề kiểm tra</h1><p>Chọn môn học, lớp và kỳ kiểm tra. Bắt đầu làm bài theo tốc độ của em.</p></div><div class="hero-icon" aria-hidden="true">✏️</div></section>'+
  '<section class="exam-filter-panel"><h2>Chọn môn học</h2><div class="subject-picker">'+subjectButtons+'</div><div class="exam-filter-fields"><label>Lớp<select id="g">'+options(["","4","5"],["Tất cả lớp","Lớp 4","Lớp 5"],filters.grade)+'</select></label><label>Học kỳ<select id="se">'+options(["","1","2","0"],["Tất cả học kỳ","Học kỳ 1","Học kỳ 2","Luyện hằng ngày"],filters.semester)+'</select></label><label>Dạng đề<select id="st">'+options(["","0","1","2","-1"],["Tất cả dạng đề","Đầu kỳ","Giữa kỳ","Cuối kỳ","Luyện hằng ngày"],filters.stage)+'</select></label><button id="resetExamFilters" type="button" class="clear-filters">↺ Đặt lại</button></div></section>'+
  '<section class="exam-section"><div class="exam-section-heading"><div><h2>☀️ Bài luyện hôm nay</h2><p>Luyện kiến thức theo môn đã chọn</p></div></div><div class="grid">'+today.map(e=>'<article class="exam-card daily-card"><span class="exam-tag">Hằng ngày</span><h3>'+esc(names[e.subject])+' lớp '+e.grade+'</h3><p>📝 30 câu &nbsp;·&nbsp; ⏱ 45 phút</p><button data-daily="'+e.grade+':'+e.subject+'">Luyện ngay →</button></article>').join("")+'</div></section>'+
  '<section class="exam-section"><div class="exam-section-heading"><div><h2>📚 Danh sách đề kiểm tra</h2><p>Chọn bộ đề phù hợp để bắt đầu</p></div><strong>'+all.length+' bộ đề</strong></div><div class="grid">'+(setCards||'<p>Chưa có đề phù hợp với bộ lọc.</p>')+'</div></section>';
  host.querySelector("#resetExamFilters").onclick=()=>{filters={grade:"4",subject:"math",semester:"1",stage:"1"};page=0;list();};
  host.querySelectorAll("[data-select-subject]").forEach(b=>b.onclick=()=>{filters.subject=b.dataset.selectSubject;page=0;list();});
  for(const [id,key] of [["g","grade"],["se","semester"],["st","stage"]])document.querySelector("#"+id).onchange=e=>{filters[key]=e.target.value;page=0;list();};
  host.querySelectorAll("[data-exam]").forEach(b=>b.onclick=()=>{const e=B.exams.find(x=>x.id===b.dataset.exam);if(e)start(e,B.questions(e.id),e.time||60);});
  navPages(all.length);
  host.querySelectorAll("[data-daily]").forEach(b=>b.onclick=()=>{const [g,t]=b.dataset.daily.split(":");const e=B.daily(Number(g),t);start(e,e.questions,45);});
 }
 function navPages(count){host.insertAdjacentHTML("beforeend",'<div class="actions"><button id="prevPage">← Trước</button><button id="nextPage">Tiếp →</button></div>');const prev=host.querySelector("#prevPage"),next=host.querySelector("#nextPage");prev.disabled=page===0;next.disabled=(page+1)*30>=count;prev.onclick=()=>{page--;list()};next.onclick=()=>{page++;list()};}
 function start(info,questions,minutes){
  if(!Array.isArray(questions)||questions.length<1){err("Đề không có câu hỏi hợp lệ.");return;}
  stop();exam={info,questions,i:0,answers:{},started:Date.now(),duration:minutes};seconds=minutes*60;
  try{paint();timer=setInterval(()=>{seconds=Math.max(0,seconds-1);const el=document.querySelector("#countdown");if(el)el.textContent=clock();if(seconds===0)finish(true);},1000);}catch(e){err(e);}
 }
 function clock(){return Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0");}
 function persistAnswer(){
  const q=exam.questions[exam.i],t=q.examType||"mcq";
  if(t==="fill")exam.answers[q.id]=document.querySelector("#fill")?.value.trim()||"";
  if(t==="matching"){const vals={};host.querySelectorAll("[data-pair]").forEach(el=>{vals[el.dataset.pair]=el.value});exam.answers[q.id]=vals;}
 }
 function paint(){
  if(!exam)return;const q=exam.questions[exam.i],v=exam.answers[q.id],t=q.examType||"mcq";
  let answer="";
  if(t==="truefalse")answer='<div class="choices">'+["true","false"].map((x,i)=>'<button class="answer '+(v===x?"selected":"")+'" data-choice="'+x+'">'+(i?"Sai":"Đúng")+'</button>').join("")+'</div>';
  else if(t==="fill")answer='<label>Nhập câu trả lời<input id="fill" type="text" value="'+esc(v||"")+'"></label>';
  else if(t==="matching")answer='<div class="matches">'+q.pairs.map((p,i)=>'<label>'+esc(p[0])+'<select data-pair="'+i+'"><option value="">Chọn đáp án</option>'+q.pairs.map(other=>'<option value="'+esc(other[1])+'" '+((v||{})[i]===other[1]?"selected":"")+'>'+esc(other[1])+'</option>').join("")+'</select></label>').join("")+'</div>';
  else answer='<div class="choices">'+(q.options||[]).map((o,i)=>'<button class="answer '+(v===i?"selected":"")+'" data-choice="'+i+'">'+String.fromCharCode(65+i)+'. '+esc(o)+'</button>').join("")+'</div>';
  host.innerHTML='<section class="panel"><div class="exam-top"><strong>'+esc(exam.info.title)+'</strong><strong>⏱ <span id="countdown">'+clock()+'</span></strong></div><p>Câu '+(exam.i+1)+' / '+exam.questions.length+'</p><h2>'+esc(q.q)+'</h2>'+answer+'<div class="actions"><button id="prev" '+(exam.i===0?"disabled":"")+'>← Trước</button><button id="next" '+(exam.i===exam.questions.length-1?"disabled":"")+'>Tiếp →</button><button id="submit" class="submit">Nộp bài</button></div><div class="numbers">'+exam.questions.map((q,i)=>'<button class="'+(i===exam.i?"current":"")+'" data-index="'+i+'">'+(i+1)+'</button>').join("")+'</div></section>';
  host.querySelectorAll("[data-choice]").forEach(b=>b.onclick=()=>{exam.answers[q.id]=t==="truefalse"?b.dataset.choice:Number(b.dataset.choice);paint();});
  host.querySelector("#prev").onclick=()=>move(exam.i-1);host.querySelector("#next").onclick=()=>move(exam.i+1);
  host.querySelectorAll("[data-index]").forEach(b=>b.onclick=()=>move(Number(b.dataset.index)));
  host.querySelector("#submit").onclick=()=>{persistAnswer();if(confirm("Nộp bài kiểm tra?"))finish(false);};
 }
 function move(i){persistAnswer();exam.i=Math.max(0,Math.min(exam.questions.length-1,i));paint();}
 function finish(auto){if(!exam)return;persistAnswer();stop();const done=exam;exam=null;const correct=done.questions.filter(q=>I.isCorrect(q,done.answers[q.id])).length,score=Math.round(correct/done.questions.length*100);
  try{const old=JSON.parse(localStorage.getItem("bt_results")||"[]");old.push({id:Date.now(),title:done.info.title,subject:done.info.subject,grade:done.info.grade,correct,total:done.questions.length,score,points:correct/done.questions.length*100,durationSec:Math.round((Date.now()-done.started)/1000),date:new Date().toLocaleDateString("vi-VN")});localStorage.setItem("bt_results",JSON.stringify(old));}catch{}
  host.innerHTML='<section class="panel"><h1>'+(auto?"Hết giờ!":"Đã nộp bài!")+'</h1><h2>Điểm: '+score+'% ('+correct+'/'+done.questions.length+' câu đúng)</h2><button id="back">← Danh sách đề</button><h3>Đáp án và giải thích</h3>'+done.questions.map((q,i)=>'<article class="review"><b>Câu '+(i+1)+': '+esc(q.q)+'</b><p>Đáp án đúng: '+esc(I.correctText(q))+'</p><small>'+esc(q.explain||"")+'</small></article>').join("")+'</section>';host.querySelector("#back").onclick=list;
 }
 try{list();}catch(e){err(e);}
})();