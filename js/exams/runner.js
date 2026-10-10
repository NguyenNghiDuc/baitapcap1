window.ExamRunner=(()=>{
 let quiz=null;
 const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
 function save(){localStorage.setItem("bt_term_quiz",JSON.stringify(quiz));window.OfflineSyncQueue?.saveDraft?.({kind:"term",quiz})}
 function start(questions,title,meta={}){
  if(!Array.isArray(questions)||questions.length!==30)return alert("Đề chưa đủ 30 câu.");
  quiz={questions,i:0,answers:{},marked:[],title,grade:questions[0]?.grade||meta.grade||4,start:Date.now(),meta};
  try{render();save();if(meta.time)window.StudentExamProctor?.start(meta.time);if(meta.time)window.StudentExamProctor?.attach(document.querySelector("#timer"),()=>finish(true));}catch(error){window.ExamLock?.exit();quiz=null;localStorage.removeItem("bt_term_quiz");throw error;}
 }
 function body(q){
  return `<h2>${esc(q.q)}</h2>${window.ExamInteraction.render(q,quiz.answers[q.id])}`
 }
 function render(){
  if(!quiz)return;
  const q=quiz.questions[quiz.i],subject=q.subject||"mixed",timeMin=Number(quiz.meta.time)||60;
  document.querySelector("#content").innerHTML=window.LockedExamUI.render({
   title:quiz.title,subject,grade:quiz.grade,index:quiz.i,questions:quiz.questions,answers:quiz.answers,timeMin,
   bodyHtml:body(q),typeLabel:q.examType==="truefalse"?"Đúng / Sai":q.examType==="matching"?"Nối đáp án":["fill","shortanswer","essay"].includes(q.examType)?"Trả lời ngắn":"Trắc nghiệm"
  });
  window.ExamInteraction.bind(q,quiz,render,save);
  document.querySelector("#lockedPrev").onclick=()=>{if(quiz.i>0){quiz.i--;save();render()}};
  document.querySelector("#lockedNext").onclick=()=>{if(quiz.i<quiz.questions.length-1){quiz.i++;save();render()}};
  document.querySelector("#lockedSubmit").onclick=()=>{if(confirm("Bạn chắc chắn muốn nộp bài? Sau khi nộp sẽ không thể sửa đáp án."))finish()};
  document.querySelectorAll(".locked-qnav").forEach(b=>b.onclick=()=>{quiz.i=Number(b.dataset.qindex);save();render()});
  // Lock only after the exam UI was successfully created.
  if(!window.ExamLock?.isActive?.())window.ExamLock?.enter({title:quiz.title});
  if(quiz.meta.time&&window.StudentExamProctor?.state?.started)window.StudentExamProctor.attach(document.querySelector("#timer"),()=>finish(true));
 }
 async function finish(auto=false){
  if(!quiz)return;
  let correct=0;const wrong=[],correctIds=[];
  for(const q of quiz.questions){if(window.ExamInteraction.isCorrect(q,quiz.answers[q.id])){correct++;correctIds.push(q.id)}else wrong.push(q)}
  const score=Math.round(correct/30*100),durationSec=Math.round((Date.now()-quiz.start)/1000),proctor=quiz.meta.time?window.StudentExamProctor?.stop():null;
  const result={...(await window.ResultAccount?.current?.()||{}),id:Date.now(),title:quiz.title,subject:quiz.meta?.subject||quiz.questions[0]?.subject||"math",grade:quiz.grade,correct,total:30,score,points:correct*10,durationSec,date:new Date().toLocaleDateString("vi-VN"),isoDate:new Date().toISOString(),proctor,autoSubmitted:!!auto};
  const results=JSON.parse(localStorage.getItem("bt_results")||"[]");results.push(result);localStorage.setItem("bt_results",JSON.stringify(results));
  window.StudentReview?.add(wrong.map(q=>({id:q.id,q:q.q,options:q.options,answer:q.answer,grade:q.grade,subject:q.subject,type:q.type,topic:q.type,explain:q.explain})));
  window.StudentRewards?.earn(score,correct);window.StudentMastery?.record(quiz.questions,correctIds);
  if(API.token){result.clientSubmissionId=window.OfflineSyncQueue?.enqueueResult?.({...result,wrongQuestionIds:wrong.map(q=>q.id)});await window.OfflineSyncQueue?.flush?.()}
  localStorage.removeItem("bt_term_quiz");window.OfflineSyncQueue?.clearDraft?.();window.ExamLock?.exit();
  document.querySelector("#content").innerHTML=`<section class="result-card"><div class="score-ring"><b>${score}%</b><span>${correct}/30 đúng</span></div><h1>${auto?"Hết giờ – bài đã tự nộp ⏰":score>=80?"Làm rất tốt 🎉":score>=50?"Khá tốt 👍":"Cần ôn lại 💪"}</h1><p>${quiz.meta.daily?"Đây là bài ôn hằng ngày.":"Đề kiểm tra theo học kỳ."} Các câu sai đã được đưa vào mục Ôn câu sai.</p><div class="result-review">${quiz.questions.map((q,i)=>{const ok=window.ExamInteraction.isCorrect(q,quiz.answers[q.id]);return `<div class="review ${ok?"":"bad"}"><b>Câu ${i+1}: ${esc(q.q)}</b><p>Đáp án đúng: ${esc(window.ExamInteraction.correctText(q))}</p><small>💡 ${esc(q.explain||"")}</small></div>`}).join("")}</div><div class="quiz-actions"><button class="outline" id="backTests">← Về danh sách đề</button><button class="primary" id="reviewWrongNow">🧠 Ôn câu sai</button></div></section>`;
  document.querySelector("#backTests").onclick=()=>{location.hash="tests"};
  document.querySelector("#reviewWrongNow").onclick=()=>{location.hash="wrongReview"};
  quiz=null;
 }
 function resume(){try{const q=JSON.parse(localStorage.getItem("bt_term_quiz")||"null");if(q&&q.questions?.length===30){quiz=q;window.ExamLock?.enter({title:q.title});if(q.meta?.time){const elapsed=Math.floor((Date.now()-q.start)/1000),remain=Math.max(1,(q.meta.time*60)-elapsed);window.StudentExamProctor?.start(remain/60)}render();return true}}catch{}return false}
 return {start,resume};
})();