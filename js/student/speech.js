window.StudentSpeech={
 render(){return `
 <section class="page-head speech-head">
   <span class="eyebrow">PHÁT ÂM</span>
   <h1>🎙 Luyện nói Tiếng Anh</h1>
   <p>Nghe mẫu, đọc lại và xem kết quả nhận dạng ngay bên dưới.</p>
 </section>
 <section class="speech-practice-card">
   <div class="speech-practice-main">
     <div class="speech-field">
       <div class="speech-label-row">
         <label for="speechSentence">Câu luyện</label>
         <span class="speech-lang-badge">EN-US</span>
       </div>
       <div class="speech-input-wrap">
         <span class="speech-input-icon">💬</span>
         <input id="speechSentence" value="I usually do my homework after dinner." autocomplete="off" spellcheck="false">
       </div>
     </div>

     <div class="speech-actions">
       <button class="speech-btn speech-btn-listen" id="speechListen" type="button">
         <span class="speech-btn-icon">🔊</span>
         <span><b>Nghe mẫu</b><small>Phát âm chuẩn câu mẫu</small></span>
       </button>
       <button class="speech-btn speech-btn-start" id="speechStart" type="button">
         <span class="speech-btn-icon">🎙</span>
         <span><b>Bắt đầu nói</b><small>Nhấn rồi đọc câu phía trên</small></span>
       </button>
     </div>
   </div>

   <aside class="speech-side-card">
     <div class="speech-side-icon">✨</div>
     <h3>Mẹo luyện nói</h3>
     <p>Nghe mẫu 1–2 lần, sau đó đọc chậm và rõ từng từ.</p>
     <div class="speech-tip-list">
       <span>✓ Nói gần micro</span>
       <span>✓ Giữ tốc độ vừa phải</span>
       <span>✓ Thử lại nếu chưa khớp</span>
     </div>
   </aside>

   <div id="speechResult" class="speech-result" aria-live="polite">
     <div class="speech-result-icon">🎧</div>
     <div>
       <b>Sẵn sàng luyện nói</b>
       <small>Kết quả nhận dạng sẽ hiện ở đây.</small>
     </div>
   </div>
 </section>`},
 bind(toast){
  const listen=document.querySelector("#speechListen"),start=document.querySelector("#speechStart"),input=document.querySelector("#speechSentence"),result=document.querySelector("#speechResult");
  listen?.addEventListener("click",()=>{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(input.value);u.lang="en-US";u.rate=.85;
    listen.classList.add("is-active");u.onend=()=>listen.classList.remove("is-active");u.onerror=()=>listen.classList.remove("is-active");
    speechSynthesis.speak(u)
  });
  start?.addEventListener("click",()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR)return toast("Trình duyệt này chưa hỗ trợ nhận dạng giọng nói");
    const r=new SR();window._btSpeechRecognition=r;r.lang="en-US";r.interimResults=false;r.continuous=false;
    start.classList.add("is-listening");start.querySelector("b").textContent="Đang nghe...";
    result.className="speech-result is-listening";result.innerHTML='<div class="speech-result-icon">🎙</div><div><b>Đang nghe giọng nói...</b><small>Hãy đọc câu phía trên thật rõ.</small></div>';
    const reset=()=>{start.classList.remove("is-listening");const b=start.querySelector("b");if(b)b.textContent="Bắt đầu nói"};
    r.onresult=e=>{
      const got=e.results[0][0].transcript,target=input.value,n=s=>s.toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim(),ok=n(got)===n(target);
      result.className="speech-result "+(ok?"is-success":"is-retry");
      result.innerHTML=`<div class="speech-result-icon">${ok?"✅":"🟡"}</div><div><b>${ok?"Rất tốt!":"Thử lại nhé"}</b><small>Em nói: <strong>${got.replace(/[<>]/g,"")}</strong></small></div>`;
      reset()
    };
    r.onerror=()=>{result.className="speech-result is-error";result.innerHTML='<div class="speech-result-icon">⚠️</div><div><b>Chưa nhận được giọng nói</b><small>Kiểm tra micro rồi thử lại.</small></div>';reset();toast("Không nhận được giọng nói")};
    r.onend=reset;r.start()
  })
 }
};