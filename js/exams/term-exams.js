window.TermExamBank=(()=>{
 const D=window.APP_DATA||{},stages=["Đầu kỳ","Giữa kỳ","Cuối kỳ"],subjects=["math","vietnamese","english"];
 const subjectInfo={
  math:{name:"Toán",icon:"🧮",badge:"Toán"},
  vietnamese:{name:"Tiếng Việt",icon:"📕",badge:"Tiếng Việt"},
  english:{name:"Tiếng Anh",icon:"📘",badge:"Tiếng Anh"}
 };
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
 const subjectTypes={
  math:new Set(["multiplication","division","expression","word-problem","average","unit","fraction-common","fraction-add","perimeter","geometry","time","money","ratio","percent","find-two","chart","decimal","speed","age"]),
  vietnamese:new Set(["word-class","spelling","subject-predicate","synonym","antonym","reading","meaning","compound-redup","main-idea","homonym","relation-word","adverbial","sentence-writing","spelling-fix","long-reading","punctuation"]),
  english:new Set(["present-simple","vocabulary","pronoun","present-continuous","preposition","question-word","plural","can","past-simple","sentence-order","communication","topic-vocab","phonics","grammar","stress","listening"])
 };
 const exams=[];
 for(const grade of [4,5])for(const semester of [1,2])for(let stage=0;stage<3;stage++)for(const subject of subjects)for(let v=1;v<=6;v++){
  const id=`term-g${grade}-s${semester}-p${stage+1}-${subject}-v${v}`,info=subjectInfo[subject];
  exams.push({id,grade,semester,stage,subject,variant:v,title:`${info.name} lớp ${grade} • HK${semester} • ${stages[stage]} • Mã ${String(v).padStart(2,"0")}`,time:60});
 }
 function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
 function rnd(seed){return ()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296)}
 function shuffle(a,seed){const r=rnd(seed),x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
 function allowedTypes(exam){const raw=scopes[`${exam.grade}-${exam.semester}-${exam.stage}`]||[];return raw.filter(t=>subjectTypes[exam.subject]?.has(t))}
 function pool(exam){
  const types=allowedTypes(exam),all=(D.questions||[]).filter(q=>q.grade===exam.grade&&q.subject===exam.subject);
  const scoped=all.filter(q=>types.includes(q.type));
  return scoped.length?scoped:all;
 }
 function cloneMcq(q,id){return {...q,id,subject:q.subject,examType:"mcq"}}
 function trueFalse(q,id,truth){const correct=q.options?.[q.answer]??"",wrong=q.options?.find((_,i)=>i!==q.answer)??"";return {...q,id,subject:q.subject,examType:"truefalse",q:`Đúng hay Sai? ${q.q} → ${truth?correct:wrong}`,correctValue:truth?"true":"false",options:undefined,answer:undefined,explain:`${truth?"Nhận định đúng.":"Nhận định sai."} Đáp án đúng là: ${correct}. ${q.explain||""}`}}
 function fill(q,id){return {...q,id,subject:q.subject,examType:"fill",q:`${q.q} (Ghi đáp án)`,answerText:String(q.options?.[q.answer]??""),options:undefined,answer:undefined}}
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
  const seed=hash(exam.id+seedExtra),p=shuffle(pool(exam),seed);
  if(!p.length)return [];
  const geo=exam.subject==="math"?shuffle((D.questions||[]).filter(q=>q.grade===exam.grade&&q.subject==="math"&&["geometry","perimeter","chart"].includes(q.type)),seed+9):[];
  const out=[];let n=0,idx=0,next=()=>p[(idx++)%p.length];
  for(let i=0;i<18;i++){const q=next();out.push(cloneMcq(q,`${exam.id}-m${++n}`))}
  for(let i=0;i<4;i++){const q=next();out.push(trueFalse(q,`${exam.id}-t${++n}`,i%2===0))}
  for(let i=0;i<4;i++){const q=next();out.push(fill(q,`${exam.id}-f${++n}`))}
  out.push(matchQuestion(exam.grade,exam.subject,`${exam.id}-x${++n}`,seed+1));
  out.push(matchQuestion(exam.grade,exam.subject,`${exam.id}-x${++n}`,seed+2));
  if(exam.subject==="math"){
   for(let i=0;i<2;i++){const q=geo[i%Math.max(1,geo.length)]||next();out.push(cloneMcq(q,`${exam.id}-g${++n}`))}
  }else{
   for(let i=0;i<2;i++){const q=next();out.push(cloneMcq(q,`${exam.id}-e${++n}`))}
  }
  return out.slice(0,30).map(q=>({...q,subject:exam.subject}));
 }
 function currentStage(date=new Date()){const m=date.getMonth()+1;if(m>=9&&m<=10)return {semester:1,stage:0};if(m===11)return {semester:1,stage:1};if(m===12||m===1)return {semester:1,stage:2};if(m>=2&&m<=3)return {semester:2,stage:0};if(m===4)return {semester:2,stage:1};return {semester:2,stage:2}}
 function daily(grade=4,subject="math",date=new Date()){const x=currentStage(date),day=date.toISOString().slice(0,10),info=subjectInfo[subject],exam={id:`daily-g${grade}-${subject}-${day}`,grade,subject,semester:x.semester,stage:x.stage,variant:1,title:`Ôn ${info.name} hằng ngày • Lớp ${grade} • ${day}`,time:45,daily:true};return {...exam,questions:build(exam,day)}}
 function questions(id){const e=exams.find(x=>x.id===id);return e?build(e):[]}
 function render(timeResolver){
  const dailyCards=[4,5].flatMap(grade=>subjects.map(subject=>daily(grade,subject)));
  return `<section class="page-head"><span class="eyebrow">BÀI KIỂM TRA</span><h1>📝 Kiểm tra theo môn, học kỳ & ôn hằng ngày</h1><p>Đề được tách riêng từng môn. Đề Toán chỉ có Toán, Tiếng Việt chỉ có Tiếng Việt, Tiếng Anh chỉ có Tiếng Anh.</p></section>
  <div class="cards-3">${dailyCards.map(e=>{const info=subjectInfo[e.subject];return `<article class="test-card daily-exam"><h3>${info.icon} ${info.name} hôm nay — Lớp ${e.grade}</h3><p>Ôn đúng môn ${info.name} • ${timeResolver?timeResolver(e):e.time} phút.</p><button class="primary full" data-daily-grade="${e.grade}" data-daily-subject="${e.subject}">Làm đề ${info.name}</button></article>`}).join("")}</div>
  <section class="filterbar"><select id="termSubject"><option value="">Tất cả môn</option><option value="math">Toán</option><option value="vietnamese">Tiếng Việt</option><option value="english">Tiếng Anh</option></select><select id="termGrade"><option value="">Lớp 4 & 5</option><option value="4">Lớp 4</option><option value="5">Lớp 5</option></select><select id="termSemester"><option value="">Cả HK1 & HK2</option><option value="1">Học kỳ 1</option><option value="2">Học kỳ 2</option></select><select id="termStage"><option value="">Tất cả mốc</option><option value="0">Đầu kỳ</option><option value="1">Giữa kỳ</option><option value="2">Cuối kỳ</option></select></section>
  <div id="termExamGrid" class="cards-3">${exams.map(e=>{const info=subjectInfo[e.subject];return `<article class="test-card term-exam" data-subject="${e.subject}" data-grade="${e.grade}" data-semester="${e.semester}" data-stage="${e.stage}"><div class="test-top"><span class="subject-icon mini blue">${info.icon}</span><span class="badge">${info.badge} • HK${e.semester}</span></div><h3>${e.title}</h3><p>30 câu ${info.name} • ${timeResolver?timeResolver(e):e.time} phút • không trộn môn</p><div class="test-meta"><span>✅ A/B/C/D</span><span>↔ Nối</span>${e.subject==="math"?'<span>📐 Hình học</span>':""}</div><button class="primary full" data-term-exam="${e.id}">Bắt đầu</button></article>`}).join("")}</div>`
 }
 function bind(startCustom){
  document.querySelectorAll("[data-term-exam]").forEach(b=>b.onclick=()=>{const e=exams.find(x=>x.id===b.dataset.termExam);startCustom(questions(e.id),e.title,{examId:e.id,time:e.time,termExam:true,subject:e.subject,grade:e.grade})});
  document.querySelectorAll("[data-daily-grade]").forEach(b=>{b.onclick=()=>{const e=daily(Number(b.dataset.dailyGrade),b.dataset.dailySubject);startCustom(e.questions,e.title,{examId:e.id,time:e.time,daily:true,subject:e.subject,grade:e.grade})}});
  const filter=()=>{const sub=document.querySelector("#termSubject")?.value,g=document.querySelector("#termGrade")?.value,s=document.querySelector("#termSemester")?.value,p=document.querySelector("#termStage")?.value;document.querySelectorAll(".term-exam").forEach(c=>c.style.display=(!sub||c.dataset.subject===sub)&&(!g||c.dataset.grade===g)&&(!s||c.dataset.semester===s)&&(!p||c.dataset.stage===p)?"":"none")};
  ["termSubject","termGrade","termSemester","termStage"].forEach(id=>document.querySelector("#"+id)?.addEventListener("change",filter));
 }
 return {exams,scopes,subjectTypes,subjectInfo,build,questions,daily,render,bind};
})();