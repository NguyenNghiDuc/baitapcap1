window.TermExamBank=(()=>{
 const D=window.APP_DATA||{},stages=["Đầu kỳ","Giữa kỳ","Cuối kỳ"];
 const scopes={
  "4-1-0":["multiplication","division","expression","word-problem","word-class","spelling","subject-predicate","present-simple","vocabulary","pronoun"],
  "4-1-1":["multiplication","division","expression","average","unit","fraction-common","word-class","synonym","antonym","reading","present-simple","present-continuous","preposition","question-word"],
  "4-1-2":["multiplication","division","expression","average","unit","fraction-common","fraction-add","perimeter","geometry","reading","meaning","compound-redup","present-simple","present-continuous","preposition","question-word","plural","can"],
  "4-2-0":["fraction-common","fraction-add","geometry","perimeter","time","money","ratio","reading","main-idea","homonym","communication","topic-vocab","phonics"],
  "4-2-1":["fraction-common","fraction-add","geometry","time","money","ratio","percent","find-two","long-reading","relation-word","adverbial","communication","topic-vocab","phonics","grammar"],
  "4-2-2":["multiplication","division","fraction-common","fraction-add","geometry","time","money","ratio","percent","find-two","chart","long-reading","main-idea","relation-word","adverbial","communication","topic-vocab","phonics","grammar"],
  "5-1-0":["decimal","multiplication","division","fraction-common","fraction-add","word-class","reading","present-simple","past-simple","vocabulary"],
  "5-1-1":["decimal","fraction-common","fraction-add","geometry","unit","average","reading","meaning","past-simple","preposition","question-word","sentence-order"],
  "5-1-2":["decimal","fraction-common","fraction-add","geometry","unit","average","word-problem","reading","meaning","past-simple","preposition","question-word","sentence-order","plural"],
  "5-2-0":["decimal","geometry","percent","ratio","speed","time","money","long-reading","main-idea","relation-word","stress","communication","grammar"],
  "5-2-1":["decimal","geometry","percent","ratio","speed","time","money","age","find-two","long-reading","homonym","relation-word","adverbial","stress","communication","grammar"],
  "5-2-2":["decimal","geometry","percent","ratio","speed","time","money","age","find-two","chart","long-reading","main-idea","homonym","relation-word","adverbial","listening","stress","communication","grammar"]
 };
 const exams=[];
 for(const grade of [4,5])for(const semester of [1,2])for(let stage=0;stage<3;stage++)for(let v=1;v<=6;v++){
  const id=`term-g${grade}-s${semester}-p${stage+1}-v${v}`;
  exams.push({id,grade,semester,stage,variant:v,title:`Lớp ${grade} • HK${semester} • ${stages[stage]} • Mã ${String(v).padStart(2,"0")}`,time:60});
 }
 function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
 function rnd(seed){return ()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296)}
 function shuffle(a,seed){const r=rnd(seed),x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
 function pool(exam){const types=scopes[`${exam.grade}-${exam.semester}-${exam.stage}`]||[];return (D.questions||[]).filter(q=>q.grade===exam.grade&&types.includes(q.type))}
 function cloneMcq(q,id){return {...q,id,examType:"mcq"}}
 function trueFalse(q,id,truth){const correct=q.options?.[q.answer]??"";const wrong=q.options?.find((_,i)=>i!==q.answer)??"";return {...q,id,examType:"truefalse",q:`Đúng hay Sai? ${q.q} → ${truth?correct:wrong}`,correctValue:truth?"true":"false",options:undefined,answer:undefined,explain:`${truth?"Nhận định đúng.":"Nhận định sai."} Đáp án đúng là: ${correct}. ${q.explain||""}`}}
 function fill(q,id){return {...q,id,examType:"fill",q:`${q.q} (Ghi đáp án)`,answerText:String(q.options?.[q.answer]??""),options:undefined,answer:undefined}}
 function matchQuestion(grade,subject,id,seed){
  const sets={
   math:[["Chu vi hình vuông","cạnh × 4"],["Diện tích tam giác","đáy × cao : 2"],["Thể tích hình hộp","dài × rộng × cao"],["Quy đồng","đưa về cùng mẫu số"]],
   vietnamese:[["Động từ","chỉ hoạt động"],["Tính từ","chỉ đặc điểm"],["Chủ ngữ","trả lời Ai?/Cái gì?"],["Trạng ngữ","bổ sung thời gian/nơi chốn"]],
   english:[["go","went"],["child","children"],["How","cách thức"],["library","thư viện"]]
  };
  const pairs=shuffle(sets[subject],seed);
  return {id,grade,subject,type:"matching",examType:"matching",q:"Nối mỗi nội dung ở cột trái với đáp án phù hợp ở cột phải.",pairs,explain:"Ghép theo đúng quy tắc/ý nghĩa đã học."}
 }
 function build(exam,seedExtra=""){
  const seed=hash(exam.id+seedExtra),p=shuffle(pool(exam),seed),geo=shuffle((D.questions||[]).filter(q=>q.grade===exam.grade&&q.subject==="math"&&["geometry","perimeter","chart"].includes(q.type)),seed+9);
  const used=new Set(),take=(pred)=>{const q=p.find(x=>!used.has(x.id)&&pred(x));if(q)used.add(q.id);return q};
  const out=[];let n=0;
  for(let i=0;i<15;i++){const q=take(()=>true)||p[i%p.length];if(q)out.push(cloneMcq(q,`${exam.id}-m${++n}`))}
  for(let i=0;i<4;i++){const q=take(()=>true)||p[(15+i)%p.length];if(q)out.push(trueFalse(q,`${exam.id}-t${++n}`,i%2===0))}
  for(let i=0;i<4;i++){const q=take(()=>true)||p[(19+i)%p.length];if(q)out.push(fill(q,`${exam.id}-f${++n}`))}
  out.push(matchQuestion(exam.grade,"math",`${exam.id}-x${++n}`,seed+1),matchQuestion(exam.grade,"vietnamese",`${exam.id}-x${++n}`,seed+2),matchQuestion(exam.grade,"english",`${exam.id}-x${++n}`,seed+3));
  for(let i=0;i<4;i++){const q=geo[i]||take(q=>q.subject==="math")||p[(23+i)%p.length];if(q)out.push(cloneMcq(q,`${exam.id}-g${++n}`))}
  return out.slice(0,30);
 }
 function currentStage(date=new Date()){const m=date.getMonth()+1;if(m>=9&&m<=10)return {semester:1,stage:0};if(m===11)return {semester:1,stage:1};if(m===12||m===1)return {semester:1,stage:2};if(m>=2&&m<=3)return {semester:2,stage:0};if(m===4)return {semester:2,stage:1};return {semester:2,stage:2}}
 function daily(grade=4,date=new Date()){const x=currentStage(date),day=date.toISOString().slice(0,10),exam={id:`daily-g${grade}-${day}`,grade,semester:x.semester,stage:x.stage,variant:1,title:`Ôn tập hằng ngày • Lớp ${grade} • ${day}`,time:45,daily:true};return {...exam,questions:build(exam,day)}}
 function questions(id){const e=exams.find(x=>x.id===id);return e?build(e):[]}
 function render(timeResolver){
  const d4=daily(4),d5=daily(5);
  return `<section class="page-head"><span class="eyebrow">BÀI KIỂM TRA</span><h1>📝 Kiểm tra theo học kỳ & ôn hằng ngày</h1><p>72 đề học kỳ + 1 đề ôn mỗi ngày. Mỗi đề 30 câu với A/B/C/D, Đúng/Sai, ghi đáp án, nối cặp và hình học.</p></section>
  <div class="cards-3"><article class="test-card daily-exam"><h3>☀️ Đề hôm nay — Lớp 4</h3><p>Ôn toàn bộ phần đã học đến thời điểm hiện tại • ${timeResolver?timeResolver(d4):d4.time} phút.</p><button class="primary full" data-daily-grade="4">Làm đề hôm nay</button></article><article class="test-card daily-exam"><h3>☀️ Đề hôm nay — Lớp 5</h3><p>Ôn toàn bộ phần đã học đến thời điểm hiện tại • ${timeResolver?timeResolver(d5):d5.time} phút.</p><button class="primary full" data-daily-grade="5">Làm đề hôm nay</button></article></div>
  <section class="filterbar"><select id="termGrade"><option value="">Lớp 4 & 5</option><option value="4">Lớp 4</option><option value="5">Lớp 5</option></select><select id="termSemester"><option value="">Cả HK1 & HK2</option><option value="1">Học kỳ 1</option><option value="2">Học kỳ 2</option></select><select id="termStage"><option value="">Tất cả mốc</option><option value="0">Đầu kỳ</option><option value="1">Giữa kỳ</option><option value="2">Cuối kỳ</option></select></section>
  <div id="termExamGrid" class="cards-3">${exams.map(e=>`<article class="test-card term-exam" data-grade="${e.grade}" data-semester="${e.semester}" data-stage="${e.stage}"><div class="test-top"><span class="subject-icon mini blue">📝</span><span class="badge">HK${e.semester}</span></div><h3>${e.title}</h3><p>30 câu • ${timeResolver?timeResolver(e):e.time} phút • nhiều dạng</p><div class="test-meta"><span>✅ A/B/C/D</span><span>↔ Nối</span><span>📐 Hình học</span></div><button class="primary full" data-term-exam="${e.id}">Bắt đầu</button></article>`).join("")}</div>`;
 }
 function bind(startCustom){
  document.querySelectorAll("[data-term-exam]").forEach(b=>b.onclick=()=>{const e=exams.find(x=>x.id===b.dataset.termExam);startCustom(questions(e.id),e.title,{examId:e.id,time:e.time,termExam:true})});
  document.querySelectorAll("[data-daily-grade]").forEach(b=>{b.onclick=()=>{const e=daily(Number(b.dataset.dailyGrade));startCustom(e.questions,e.title,{examId:e.id,time:e.time,daily:true})}});
  const filter=()=>{const g=document.querySelector("#termGrade")?.value,s=document.querySelector("#termSemester")?.value,p=document.querySelector("#termStage")?.value;document.querySelectorAll(".term-exam").forEach(c=>c.style.display=(!g||c.dataset.grade===g)&&(!s||c.dataset.semester===s)&&(!p||c.dataset.stage===p)?"":"none")};
  ["termGrade","termSemester","termStage"].forEach(id=>document.querySelector("#"+id)?.addEventListener("change",filter));
 }
 return {exams,scopes,build,questions,daily,render,bind};
})();