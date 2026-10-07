window.ExamRunner=(()=>{
 let quiz=null;
 const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
 function save(){localStorage.setItem("bt_term_quiz",JSON.stringify(quiz))}
 function start(questions,title,meta={}){
  if(!Array.isArray(questions)||questions.length!==30)return alert("Đề chưa đủ 30 câu.");
  quiz={questions,i:0,answers:{},marked:[],title,grade:questions[0]?.grade||meta.grade||4,start:Date.now(),meta};
  save();if(meta.time)window.StudentExamProctor?.start(meta.time);render();
 }
 function render(){
  const q=quiz.questions[quiz.i],answered=Object.prototype.hasOwnProperty.call(quiz.answers,q.id),tools=window.StudentQuizTools?.renderNavigator({questions:quiz.questions,i:quiz.i,answers:quiz.answers,marked:quiz.marked})||"";
  document.querySelector("#content").innerHTML=`<section class="quiz-shell"><div class="quiz-head"><div><span class="badge">${esc(quiz.title)}</span><h2>Câu ${quiz.i+1}/30</h2></div><div id="timer">⏱</div></div><div class="progress"><span style="width:${(quiz.i+1)/30*100}%"></span></div><div class="quiz-toolbar"><button class="outline small" id="termMark">🚩 ${quiz.marked.includes(q.id)?"Bỏ đánh dấu":"Đánh dấu"}</button><button class="outline small" id="termSpeak">🔊 Đọc câu</button></div><article class="question-card"><h2>${esc(q.q)}</h2>${window.ExamInteraction.render(q,quiz.answers[q.id])}</article><div class="quiz-actions"><button class="outline" id="termPrev" ${quiz.i===0?"disabled":""}>← Trước</button><button class="primary" id="${quiz.i===29?"termFinish":"termNext"}">${quiz.i===29?"Nộp bài":"Tiếp →"}</button></div>${tools}</section>`;
  window.ExamInteraction.bind(q,quiz,render);
  document.querySelector("#termPrev").onclick=()=>{quiz.i--;save();render()};
  document.querySelector("#termNext")?.addEventListener("click",()=>{quiz.i++;save();render()});
  document.querySelector("#termFinish")?.addEventListener("click",finish);
  document.querySelector("#termMark").onclick=()=>{quiz.marked=quiz.marked.includes(q.id)?quiz.marked.filter(x=>x!==q.id):[...quiz.marked,q.id];save();render()};
  document.querySelector("#termSpeak").onclick=()=>{if("speechSynthesis" in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(q.q))}};
  document.querySelectorAll(".qnav").forEach(b=>b.onclick=()=>{quiz.i=Number(b.dataset.qindex);save();render()});
  if(quiz.meta.time)window.StudentExamProctor?.attach(document.querySelector("#timer"),finish);
 }
 async function finish(){
  let correct=0;const wrong=[],correctIds=[];
  for(const q of quiz.questions){if(window.ExamInteraction.isCorrect(q,quiz.answers[q.id])){correct++;correctIds.push(q.id)}else wrong.push(q)}
  const score=Math.round(correct/30*100),durationSec=Math.round((Date.now()-quiz.start)/1000),proctor=quiz.meta.time?window.StudentExamProctor?.stop():null;
  const result={id:Date.now(),title:quiz.title,subject:"mixed",grade:quiz.grade,correct,total:30,score,points:correct*10,durationSec,date:new Date().toLocaleDateString("vi-VN"),isoDate:new Date().toISOString(),proctor};
  const results=JSON.parse(localStorage.getItem("bt_results")||"[]");results.push(result);localStorage.setItem("bt_results",JSON.stringify(results));
  window.StudentReview?.add(wrong.map(q=>({id:q.id,q:q.q,options:q.options,answer:q.answer,grade:q.grade,subject:q.subject,type:q.type,topic:q.type,explain:q.explain})));
  window.StudentRewards?.earn(score,correct);window.StudentMastery?.record(quiz.questions,correctIds);
  try{if(API.token)await API.post("/api/results",{...result,wrongQuestionIds:wrong.map(q=>q.id)})}catch{}
  localStorage.removeItem("bt_term_quiz");
  document.querySelector("#content").innerHTML=`<section class="result-card"><div class="score-ring"><b>${score}%</b><span>${correct}/30 đúng</span></div><h1>${score>=80?"Làm rất tốt 🎉":score>=50?"Khá tốt 👍":"Cần ôn lại 💪"}</h1><p>${quiz.meta.daily?"Đây là bài ôn hằng ngày.":"Đề kiểm tra theo học kỳ."} Các câu sai đã được đưa vào mục Ôn câu sai.</p><div class="result-review">${quiz.questions.map((q,i)=>{const ok=window.ExamInteraction.isCorrect(q,quiz.answers[q.id]);return `<div class="review ${ok?"":"bad"}"><b>Câu ${i+1}: ${esc(q.q)}</b><p>Đáp án đúng: ${esc(window.ExamInteraction.correctText(q))}</p><small>💡 ${esc(q.explain||"")}</small></div>`}).join("")}</div><div class="quiz-actions"><button class="outline" id="backTests">← Về danh sách đề</button><button class="primary" id="reviewWrongNow">🧠 Ôn câu sai</button></div></section>`;
  document.querySelector("#backTests").onclick=()=>{location.hash="tests"};
  document.querySelector("#reviewWrongNow").onclick=()=>{location.hash="wrongReview"};
  quiz=null;
 }
 function resume(){try{const q=JSON.parse(localStorage.getItem("bt_term_quiz")||"null");if(q&&q.questions?.length===30){quiz=q;render();return true}}catch{}return false}
 return {start,resume};
})();