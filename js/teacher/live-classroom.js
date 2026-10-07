window.LiveClassroom={
 events:[],subs:[],
 async render(){const ok=window.SupabaseApp.enabled();return `<section class="page-head"><span class="eyebrow">REALTIME</span><h1>📡 Live Classroom</h1><p>${ok?"Supabase Realtime đang sẵn sàng.":"Supabase chưa cấu hình."}</p></section><div class="metrics"><div class="metric"><span>🟢</span><div><b id="rtStatus">${ok?"Đang kết nối":"Offline"}</b><small>Realtime</small></div></div><div class="metric"><span>📨</span><div><b id="rtCount">0</b><small>Sự kiện phiên này</small></div></div></div><div class="panel"><h3>Sự kiện trực tiếp</h3><div id="rtFeed" class="list-card"><div class="empty">Chưa có sự kiện.</div></div></div>`},
 bind(toast){
  if(!window.SupabaseApp.enabled())return;
  const feed=document.querySelector("#rtFeed"),count=document.querySelector("#rtCount"),status=document.querySelector("#rtStatus");
  const add=(kind,p)=>{this.events.unshift({kind,p,at:new Date().toLocaleTimeString("vi-VN")});this.events=this.events.slice(0,100);if(count)count.textContent=this.events.length;if(feed)feed.innerHTML=this.events.map(e=>`<div class="simple-row"><span>⚡</span><div class="grow"><b>${e.kind}</b><small>${e.at} • ${JSON.stringify(e.p.new||e.p.old||{}).slice(0,180)}</small></div></div>`).join("")};
  Promise.all([
   window.SupabaseRealtime.subscribe({table:"exam_rooms",onChange:p=>add("Phòng thi",p),channelName:"bt-exam-rooms"}),
   window.SupabaseRealtime.subscribe({table:"submissions",onChange:p=>add("Bài nộp",p),channelName:"bt-submissions"}),
   window.SupabaseRealtime.subscribe({table:"assignments",onChange:p=>add("Bài giao",p),channelName:"bt-assignments"}),
   window.SupabaseRealtime.subscribe({table:"classes",onChange:p=>add("Lớp học",p),channelName:"bt-classes"})
  ]).then(()=>{if(status)status.textContent="Đã kết nối";toast?.("Realtime đã kết nối")}).catch(e=>{if(status)status.textContent="Lỗi kết nối";toast?.(e.message)})
 }
};