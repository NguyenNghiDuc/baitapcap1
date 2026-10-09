window.PracticeFallback={
 mount(quiz,{onAnswer,onNext,onSubmit,onExit}={}){
  const host=document.querySelector("#content");if(!host||!quiz?.questions?.length)return false;
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const i=Math.max(0,Math.min(quiz.questions.length-1,Number(quiz.i)||0)),q=quiz.questions[i];
  host.innerHTML='<section class="panel"><p class="eyebrow">CHẾ ĐỘ BÀI TẬP DỰ PHÒNG</p><h2>'+esc(quiz.customTitle||"Bài luyện tập")+'</h2><p>Câu '+(i+1)+'/'+quiz.questions.length+'</p><h3>'+esc(q.q)+'</h3><div class="options">'+(q.options||[]).map((o,j)=>'<button class="'+(quiz.answers?.[q.id]===j?"selected":"")+'" data-fallback-answer="'+j+'"><span>'+String.fromCharCode(65+j)+'</span> '+esc(o)+'</button>').join("")+'</div><div class="row" style="margin-top:20px"><button class="outline" id="fallbackPrev" '+(i===0?"disabled":"")+'>← Trước</button><button class="outline" id="fallbackNext" '+(i===quiz.questions.length-1?"disabled":"")+'>Tiếp →</button><button class="primary" id="fallbackSubmit">Nộp bài</button></div></section>';
  host.querySelectorAll("[data-fallback-answer]").forEach(b=>b.onclick=()=>onAnswer?.(Number(b.dataset.fallbackAnswer)));
  host.querySelector("#fallbackPrev").onclick=()=>onNext?.(-1);
  host.querySelector("#fallbackNext").onclick=()=>onNext?.(1);
  host.querySelector("#fallbackSubmit").onclick=()=>onSubmit?.();
  return true
 }
};