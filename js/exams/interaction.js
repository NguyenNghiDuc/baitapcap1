window.ExamInteraction={
 render(q,value){
  const type=q.examType||"mcq";
  if(type==="truefalse") return `<div class="options exam-tf"><button data-exam-value="true" class="${value==="true"?"selected":""}">✅ Đúng</button><button data-exam-value="false" class="${value==="false"?"selected":""}">❌ Sai</button></div>`;
  if(type==="fill") return `<div class="exam-fill"><input id="examFillInput" value="${value??""}" placeholder="Nhập đáp án của em"><button class="outline" id="examFillSave">Lưu đáp án</button></div>`;
  if(type==="matching"){
   const saved=value||{},left=q.pairs.map((p,i)=>`<div class="match-row"><b>${p[0]}</b><select data-match-index="${i}"><option value="">-- Chọn --</option>${q.pairs.map(x=>`<option value="${x[1]}" ${saved[i]===x[1]?"selected":""}>${x[1]}</option>`).join("")}</select></div>`).join("");
   return `<div class="exam-matching">${left}</div>`;
  }
  return `<div class="options">${q.options.map((o,i)=>`<button class="${value===i?"selected":""}" data-answer="${i}"><span>${String.fromCharCode(65+i)}</span>${o}</button>`).join("")}</div>`;
 },
 bind(q,quiz,rerender,persist){
  const type=q.examType||"mcq",commit=()=>{if(persist)persist();else commit()};
  if(type==="truefalse") document.querySelectorAll("[data-exam-value]").forEach(b=>b.onclick=()=>{quiz.answers[q.id]=b.dataset.examValue;commit();rerender()});
  else if(type==="fill") document.querySelector("#examFillSave")?.addEventListener("click",()=>{quiz.answers[q.id]=document.querySelector("#examFillInput").value.trim();commit();rerender()});
  else if(type==="matching") document.querySelectorAll("[data-match-index]").forEach(s=>s.onchange=()=>{const v=quiz.answers[q.id]&&typeof quiz.answers[q.id]==="object"?quiz.answers[q.id]:{};v[s.dataset.matchIndex]=s.value;quiz.answers[q.id]=v;commit()});
  else document.querySelectorAll("[data-answer]").forEach(b=>b.onclick=()=>{quiz.answers[q.id]=Number(b.dataset.answer);commit();rerender()});
 },
 isCorrect(q,value){
  const type=q.examType||"mcq";
  if(type==="truefalse") return String(value)===String(q.correctValue);
  if(type==="fill") return this.norm(value)===this.norm(q.answerText);
  if(type==="matching") return q.pairs.every((p,i)=>value&&value[i]===p[1]);
  return value===q.answer;
 },
 correctText(q){
  const type=q.examType||"mcq";
  if(type==="truefalse") return q.correctValue==="true"?"Đúng":"Sai";
  if(type==="fill") return q.answerText;
  if(type==="matching") return q.pairs.map(p=>p[0]+" ↔ "+p[1]).join("; ");
  return q.options?.[q.answer]??"";
 },
 norm(v){return String(v??"").trim().toLowerCase().replace(/\s+/g," ").replace(",",".")}
};