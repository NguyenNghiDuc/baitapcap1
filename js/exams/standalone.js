(() => {
 "use strict";
 const host=document.querySelector("#examApp"),advancedMode=document.body.dataset.examMode==="advanced",B=advancedMode?window.AdvancedExamBank:window.TermExamBank,I=window.ExamInteraction;
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let exam=null,seconds=0,timer=null,filters={grade:advancedMode?"5":"",subject:"",semester:"",stage:advancedMode?"2":""};
 const names={math:"Toán",vietnamese:"Tiếng Việt",english:"Tiếng Anh"};
 const types=["math","vietnamese","english"];
 function stop(){if(timer){clearInterval(timer);timer=null;}}
 function err(e){host.innerHTML='<section class="panel"><h2>Không thể mở đề</h2><p>'+esc(e?.message||e)+'</p><button id="back">Quay lại danh sách</button></section>';document.querySelector("#back").onclick=list;stop();}
 function list(){
  stop();exam=null;
  if(!B?.exams?.length){err("Ngân hàng đề chưa tải. Vui lòng tải lại trang.");return;}
  if(advancedMode){
   const items=B.exams.filter(e=>(!filters.grade||String(e.grade)===filters.grade)&&(!filters.subject||e.subject===filters.subject));
   host.innerHTML='<h2>🌟 Bộ đề nâng cao riêng</h2><p>Các câu hỏi được lấy từ ngân hàng nâng cao, không trộn đề kiểm tra thông thường.</p><div class="filters"><select id="g"><option value="">Tất cả lớp</option><option value="4">Lớp 4</option><option value="5">Lớp 5</option></select><select id="s"><option value="">Tất cả môn</option><option value="math">Toán</option><option value="vietnamese">Tiếng Việt</option><option value="english">Tiếng Anh</option></select></div><p>'+items.length+' đề nâng cao</p><div class="grid">'+items.map(e=>'<article class="card"><h3>'+esc(e.title)+'</h3><p>30 câu nâng cao · 60 phút</p><button data-exam="'+e.id+'">Bắt đầu đề nâng cao</button></article>').join("")+'</div>';
   document.querySelector("#g").value=filters.grade;
   document.querySelector("#s").value=filters.subject;
   for(const [id,key] of [["g","grade"],["s","subject"]])document.querySelector("#"+id).onchange=e=>{filters[key]=e.target.value;list();};
   host.querySelectorAll("[data-exam]").forEach(b=>b.onclick=()=>{const e=B.exams.find(x=>x.id===b.dataset.exam);if(e)start(e,B.questions(e.id),e.time);});
   return;
  }
  const today=[4,5].flatMap(g=>types.map(t=>B.daily(g,t)));
  const options=(values,labels,selected)=>values.map((v,i)=>'<option value="'+v+'" '+(String(v)===String(selected)?'selected':'')+'>'+labels[i]+'</option>').join("");
  const items=B.exams.filter(e=>(!filters.grade||String(e.grade)===filters.grade)&&(!filters.subject||e.subject===filters.subject)&&(!filters.semester||String(e.semester)===filters.semester)&&(!filters.stage||String(e.stage)===filters.stage));
  host.innerHTML=(advancedMode?'<h2>🌟 Thử sức với đề nâng cao</h2><p>Đã chọn sẵn lớp 5 và đề cuối kỳ. Bạn có thể thay đổi bộ lọc để chọn đề khác.</p>':'<h2>Ôn luyện mỗi ngày</h2><div class="grid">')+today.map(e=>'<article class="card"><h3>'+esc(e.title)+'</h3><p>30 câu · 45 phút</p><button data-daily="'+e.grade+':'+e.subject+'">Làm đề hôm nay</button></article>').join("")+(advancedMode?'':'</div><h2>Đề theo học kỳ</h2>')+'<div class="filters"><select id="g">'+options(["","4","5"],["Tất cả lớp","Lớp 4","Lớp 5"],filters.grade)+'</select><select id="s">'+options(["",...types],["Tất cả môn","Toán","Tiếng Việt","Tiếng Anh"],filters.subject)+'</select><select id="se">'+options(["","1","2"],["Cả hai học kỳ","Học kỳ 1","Học kỳ 2"],filters.semester)+'</select><select id="st">'+options(["","0","1","2"],["Mọi giai đoạn","Đầu kỳ","Giữa kỳ","Cuối kỳ"],filters.stage)+'</select></div><p>'+items.length+' đề kiểm tra</p><div class="grid">'+items.map(e=>'<article class="card"><h3>'+esc(e.title)+'</h3><p>30 câu · 60 phút</p><button data-exam="'+e.id+'">Bắt đầu</button></article>').join("")+'</div>';
  for(const [id,key] of [["g","grade"],["s","subject"],["se","semester"],["st","stage"]])document.querySelector("#"+id).onchange=e=>{filters[key]=e.target.value;list();};
  host.querySelectorAll("[data-exam]").forEach(b=>b.onclick=()=>{const e=B.exams.find(x=>x.id===b.dataset.exam);if(e)start(e,B.questions(e.id),60);});
  host.querySelectorAll("[data-daily]").forEach(b=>b.onclick=()=>{const [g,t]=b.dataset.daily.split(":");const e=B.daily(Number(g),t);start(e,e.questions,45);});
 }
 function start(info,questions,minutes){
  if(!Array.isArray(questions)||questions.length!==30){err("Đề không đủ 30 câu.");return;}
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
  host.innerHTML='<section class="panel"><div class="exam-top"><strong>'+esc(exam.info.title)+'</strong><strong>⏱ <span id="countdown">'+clock()+'</span></strong></div><p>Câu '+(exam.i+1)+' / 30</p><h2>'+esc(q.q)+'</h2>'+answer+'<div class="actions"><button id="prev" '+(exam.i===0?"disabled":"")+'>← Trước</button><button id="next" '+(exam.i===29?"disabled":"")+'>Tiếp →</button><button id="submit" class="submit">Nộp bài</button></div><div class="numbers">'+exam.questions.map((q,i)=>'<button class="'+(i===exam.i?"current":"")+'" data-index="'+i+'">'+(i+1)+'</button>').join("")+'</div></section>';
  host.querySelectorAll("[data-choice]").forEach(b=>b.onclick=()=>{exam.answers[q.id]=t==="truefalse"?b.dataset.choice:Number(b.dataset.choice);paint();});
  host.querySelector("#prev").onclick=()=>move(exam.i-1);host.querySelector("#next").onclick=()=>move(exam.i+1);
  host.querySelectorAll("[data-index]").forEach(b=>b.onclick=()=>move(Number(b.dataset.index)));
  host.querySelector("#submit").onclick=()=>{persistAnswer();if(confirm("Nộp bài kiểm tra?"))finish(false);};
 }
 function move(i){persistAnswer();exam.i=Math.max(0,Math.min(29,i));paint();}
 function finish(auto){if(!exam)return;persistAnswer();stop();const done=exam;exam=null;const correct=done.questions.filter(q=>I.isCorrect(q,done.answers[q.id])).length,score=Math.round(correct/30*100);
  try{const old=JSON.parse(localStorage.getItem("bt_results")||"[]");old.push({id:Date.now(),title:done.info.title,subject:done.info.subject,grade:done.info.grade,correct,total:30,score,points:correct*10,durationSec:Math.round((Date.now()-done.started)/1000),date:new Date().toLocaleDateString("vi-VN")});localStorage.setItem("bt_results",JSON.stringify(old));}catch{}
  host.innerHTML='<section class="panel"><h1>'+(auto?"Hết giờ!":"Đã nộp bài!")+'</h1><h2>Điểm: '+score+'% ('+correct+'/30 câu đúng)</h2><button id="back">← Danh sách đề</button><h3>Đáp án và giải thích</h3>'+done.questions.map((q,i)=>'<article class="review"><b>Câu '+(i+1)+': '+esc(q.q)+'</b><p>Đáp án đúng: '+esc(I.correctText(q))+'</p><small>'+esc(q.explain||"")+'</small></article>').join("")+'</section>';host.querySelector("#back").onclick=list;
 }
 try{list();}catch(e){err(e);}
})();