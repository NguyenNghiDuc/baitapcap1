window.DemoWallet=(()=>{
 const $=s=>document.querySelector(s),fmt=n=>new Intl.NumberFormat("vi-VN").format(n)+" đ";
 let wallet=null;
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function guid(){return "demo-"+crypto.randomUUID()}
 async function render(){
  try{const data=await API.get("/api/demo-wallet");wallet=data.wallet}catch(e){
   return '<section class="page-head"><h1>⭐ Ví & VIP</h1></section><div class="panel"><h3>Ví demo chưa khả dụng</h3><p>'+esc(e.message)+'</p><p>Chế độ thử nghiệm cần bật WALLET_DEMO=1. Không có giao dịch tiền thật.</p></div>'
  }
  const cards=wallet.plans.map(p=>'<article class="test-card"><h3>'+esc(p.name)+'</h3><h2>'+fmt(p.price)+'</h2><p>'+p.days+' ngày</p><button class="primary" data-demo-buy="'+p.id+'">Mua bằng tiền ảo</button></article>').join("");
  const history=wallet.history.map(x=>'<div class="lesson-row"><div class="grow"><b>'+esc(x.note)+'</b><small>'+new Date(x.at).toLocaleString("vi-VN")+'</small></div><b>'+(x.amount>0?"+":"")+fmt(x.amount)+'</b></div>').join("")||'<p>Chưa có giao dịch thử nghiệm.</p>';
  return '<section class="page-head"><span class="eyebrow">CHẾ ĐỘ THỬ NGHIỆM</span><h1>💎 Ví ảo & VIP</h1><p>Chỉ để trải nghiệm tính năng. Không chuyển tiền và không nhập thông tin ngân hàng hoặc thẻ thật.</p></section>'+
  '<div class="panel" style="border:2px solid var(--blue)"><h3>Số dư tiền ảo</h3><h1>'+fmt(wallet.balance)+'</h1><p>Gói hiện tại: <b>'+(wallet.validVip?'VIP đến '+new Date(wallet.vipUntil).toLocaleDateString("vi-VN"):'Miễn phí')+'</b></p><label>Nhận tiền ảo để dùng thử <select id="demoAmount"><option value="20000">20.000 đ</option><option value="50000">50.000 đ</option><option value="100000">100.000 đ</option></select></label> <button class="outline" id="demoCredit">Nhận tiền ảo (DEMO)</button><p id="demoFeedback" role="status" aria-live="polite"></p></div>'+
  '<h2>Gói VIP thử nghiệm</h2><div class="cards-3">'+cards+'</div><div class="panel"><h3>Lịch sử giao dịch demo</h3>'+history+'</div>';
 }
 async function refresh(){const el=$("#content");if(el&&location.hash.slice(1)==="premium"){el.innerHTML=await render();bind()}}
 function bind(){
  const feedback=msg=>{const el=$("#demoFeedback");if(el)el.textContent=msg;else alert(msg)};
  $("#demoCredit")?.addEventListener("click",async e=>{
   if(!confirm("Cộng tiền ảo DEMO vào tài khoản? Đây không phải giao dịch ngân hàng."))return;
   const b=e.currentTarget;b.disabled=true;
   try{await API.post("/api/demo-wallet/credit",{amount:Number($("#demoAmount").value),requestId:guid()});await refresh();feedback("Đã nhận tiền ảo demo")}catch(err){feedback(err.message);b.disabled=false}
  });
  document.querySelectorAll("[data-demo-buy]").forEach(b=>b.addEventListener("click",async()=>{
   const plan=wallet?.plans.find(p=>p.id===b.dataset.demoBuy);if(!plan)return;
   if(!confirm("Dùng "+fmt(plan.price)+" tiền ảo để mua "+plan.name+"? Không thu tiền thật."))return;
   b.disabled=true;
   try{await API.post("/api/demo-wallet/buy",{planId:plan.id,requestId:guid()});await refresh();feedback("Đã cấp VIP thử nghiệm")}catch(err){feedback(err.message);b.disabled=false}
  }));
 }
 return {render,bind};
})();
