window.ExamInteraction={
 escape(v){return String(v??"").replace(/[&<>"\']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))},
 render(q,value){
  const type=q.examType||"mcq";
  if(type==="truefalse") return `<div class="options exam-tf"><button data-exam-value="true" class="${value==="true"?"selected":""}">✅ Đúng</button><button data-exam-value="false" class="${value==="false"?"selected":""}">❌ Sai</button></div>`;
  if(["fill","shortanswer","essay"].includes(type)) return `<div class="exam-fill exam-short-answer"><label for="examFillInput">✏️ Chỉ ghi đáp án đúng, không cần trình bày cách làm</label><div><input id="examFillInput" type="text" autocomplete="off" value="${this.escape(value??"")}" placeholder="Ví dụ: 73"><button type="button" class="outline" id="examFillSave">Lưu đáp án</button></div></div>`;
  if(type==="matching"){
   const saved=value||{},left=q.pairs.map((p,i)=>`<div class="match-row"><b>${p[0]}</b><select data-match-index="${i}"><option value="">-- Chọn --</option>${q.pairs.map(x=>`<option value="${x[1]}" ${saved[i]===x[1]?"selected":""}>${x[1]}</option>`).join("")}</select></div>`).join("");
   return `<div class="exam-matching">${left}</div>`;
  }
  return `<div class="options">${q.options.map((o,i)=>`<button class="${value===i?"selected":""}" data-answer="${i}"><span>${String.fromCharCode(65+i)}</span>${o}</button>`).join("")}</div>`;
 },
 bind(q,quiz,rerender,persist){
  const type=q.examType||"mcq",commit=()=>{if(persist)persist();else commit()};
  if(type==="truefalse") document.querySelectorAll("[data-exam-value]").forEach(b=>b.onclick=()=>{quiz.answers[q.id]=b.dataset.examValue;commit();rerender()});
  else if(["fill","shortanswer","essay"].includes(type)){const field=document.querySelector("#examFillInput");const save=()=>{quiz.answers[q.id]=field?.value.trim()||"";commit()};field?.addEventListener("input",save);document.querySelector("#examFillSave")?.addEventListener("click",()=>{save();rerender()})}
  else if(type==="matching") document.querySelectorAll("[data-match-index]").forEach(s=>s.onchange=()=>{const v=quiz.answers[q.id]&&typeof quiz.answers[q.id]==="object"?quiz.answers[q.id]:{};v[s.dataset.matchIndex]=s.value;quiz.answers[q.id]=v;commit()});
  else document.querySelectorAll("[data-answer]").forEach(b=>b.onclick=()=>{quiz.answers[q.id]=Number(b.dataset.answer);commit();rerender()});
 },
 isCorrect(q,value){
  const type=q.examType||"mcq";
  if(type==="truefalse") return String(value)===String(q.correctValue);
  if(["fill","shortanswer","essay"].includes(type)) return this.norm(value)!==""&&this.norm(value)===this.norm(q.answerText);
  if(type==="matching") return q.pairs.every((p,i)=>value&&value[i]===p[1]);
  return value===q.answer;
 },
 correctText(q){
  const type=q.examType||"mcq";
  if(type==="truefalse") return q.correctValue==="true"?"Đúng":"Sai";
  if(["fill","shortanswer","essay"].includes(type)) return q.answerText;
  if(type==="matching") return q.pairs.map(p=>p[0]+" ↔ "+p[1]).join("; ");
  return q.options?.[q.answer]??"";
 },
 norm(v){const text=String(v??"").normalize("NFKC").trim().toLowerCase().replace(/\s+/g," ").replace(/−/g,"-");const numeric=text.replace(/\s/g,"").replace(",",".").replace(/\.$/,"");return /^[-+]?\d+(?:\.\d+)?$/.test(numeric)?String(Number(numeric)):text}
};