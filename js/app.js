if(location.hash==="#tests")location.replace("/kiem-tra.html");
(()=>{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],D=window.APP_DATA||{subjects:[],lessons:[],questions:[],tests:[],materials:[]};
const state={user:null,route:location.hash.slice(1)||"home",theme:localStorage.getItem("bt_theme")||"light",results:JSON.parse(localStorage.getItem("bt_results")||"[]"),favorites:JSON.parse(localStorage.getItem("bt_favs")||"[]"),quiz:null,lastWrong:[],historyPage:1};
let renderSequence=0;
window.AppAuthBridge={setUser(u){const p=state.user;if(p?.id===u?.id&&p?.role===u?.role&&p?.name===u?.name&&p?.email===u?.email&&p?.pendingProfile===u?.pendingProfile&&p?.syncError===u?.syncError&&p?.avatarUrl===u?.avatarUrl)return;state.user=u;window.OfflineSyncQueue?.setOwner?.(u);window.LivePresence?.setIdentity?.(u);render()},updateProfile(data){if(!state.user)return;state.user={...state.user,name:data.name||state.user.name,grade:Number(data.grade)||state.user.grade};shell()},toast,render};
document.documentElement.dataset.theme=state.theme;
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const subj=id=>D.subjects.find(x=>x.id===id)||{id,name:id,icon:"📘",color:"blue"};
function toast(t){const e=$("#toast");if(!e)return;e.textContent=t;e.classList.add("show");clearTimeout(window._tt);window._tt=setTimeout(()=>e.classList.remove("show"),2200)}
function saveLocal(){localStorage.setItem("bt_results",JSON.stringify(state.results));localStorage.setItem("bt_favs",JSON.stringify(state.favorites))}
function nav(r){if(window.ExamLock?.isActive?.()&&!state.quiz)window.ExamLock.exit();if(window.ExamLock?.isActive?.()){window.ExamLock.restoreRoute();window.dispatchEvent(new CustomEvent("bt:exam-locked-click"));return}if(location.hash.slice(1)!==r){location.hash=r}else{state.route=r;render()}$("#sidebar")?.classList.remove("open");scrollTo({top:0,behavior:"smooth"})}
function metric(i,n,l){return `<div class="metric"><span>${i}</span><div><b>${n}</b><small>${l}</small></div></div>`}
async function downloadProtected(path,name){try{const r=await fetch(path,{headers:API.token?{Authorization:"Bearer "+API.token}:{}});if(!r.ok){let j={};try{j=await r.json()}catch{}throw new Error(j.error||"Không tải được file")}const b=await r.blob(),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(u)}catch(e){toast(e.message)}}
async function restore(){if(!API.token)return;try{const j=await API.get("/api/me");state.user=j.user}catch{API.setToken("")}}
function avatarKey(u){return "bt_avatar_"+String(u?.id||u?.email||"guest").replace(/[^a-zA-Z0-9_-]/g,"_")}
window.ProfileAvatar=()=>avatarUrl(state.user);
function avatarUrl(u){if(typeof u?.avatarUrl==="string"&&u.avatarUrl.startsWith("https://"))return u.avatarUrl;try{const v=localStorage.getItem(avatarKey(u));return v&&/^data:image\/(png|jpeg|webp);base64,/.test(v)?v:null}catch{return null}}
function avatarHtml(u,large=false){const src=avatarUrl(u);return src?'<img src="'+src+'" alt="Ảnh đại diện" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':esc(u?.avatar||"👧🏻")}
function shell(){const u=state.user;$("#sideName").textContent=u?.name||"Khách";$("#sideRole").textContent=u?.pendingProfile?(u.syncError?"Không đồng bộ được quyền":"Đang xác thực quyền…"):u?({student:"Học sinh",parent:"Phụ huynh",teacher:"Giáo viên",admin:"Quản trị viên"}[u.role]||"Đang xác thực quyền…"):"Khách";const retry=$("#retryRoleSync");if(retry)retry.hidden=!u?.syncError;const syncDetail=$("#sideSyncDetail");if(syncDetail){syncDetail.hidden=!u?.syncError;syncDetail.textContent=u?.syncError?String(u.syncErrorMessage||"Không kết nối được máy chủ xác thực.").slice(0,180):"";}$("#sideAvatar").innerHTML=avatarHtml(u);$("#authBtn").textContent=u?"Đăng xuất":"Đăng nhập";const rb=$("#registerBtn");if(rb)rb.hidden=!!u;document.querySelectorAll(".admin-only").forEach(x=>x.style.display=u?.role==="admin"?"flex":"none");document.querySelectorAll(".teacher-only").forEach(x=>x.style.display=["teacher","admin"].includes(u?.role)?"flex":"none");window.SidebarNav?.refresh?.(u)}
function pageHead(k,t,p=""){return `<section class="page-head"><span class="eyebrow">${k}</span><h1>${t}</h1><p>${p}</p></section>`}
function hero(){return `<section class="hero"><div class="hero-copy"><span class="pill">✨ HỌC VUI MỖI NGÀY</span><h1>Bài Tập <em>Cấp 1</em></h1><h2>Học vui – Luyện giỏi – Tiến bộ mỗi ngày</h2><p>Học theo lớp, làm bài, xem tiến bộ, tham gia lớp của giáo viên và nhận gợi ý học tập cá nhân.</p><div class="hero-search"><input id="globalSearch" placeholder="Tìm bài học, môn học, tài liệu..."><button id="globalSearchBtn">Tìm kiếm</button></div><div class="quick-grades">${[1,2,3,4,5].map(g=>`<button data-grade="${g}">Lớp ${g}</button>`).join("")}</div></div><div class="hero-art"><div class="bubble">⭐ Học mỗi ngày</div><div class="big-kid">👧🏻📚</div><div class="bubble second">🏆 Tiến bộ</div></div></section>`}
function lessonRow(l){const s=subj(l.subject),fav=state.favorites.includes(l.id);return `<div class="lesson-row"><div class="lesson-ico">${s.icon}</div><div class="grow"><b>${esc(l.title)}</b><small>${s.name} • Lớp ${l.grade} • ${l.topic||""} • ${l.level||""}</small></div><button class="heart" data-fav="${l.id}">${fav?"❤️":"🤍"}</button><button class="outline small" data-start="${l.subject}" data-grade="${l.grade}" data-lesson="${l.lessonId||""}">Luyện tập</button></div>`}
function mathFocus(){const a=D.lessons.filter(l=>l.subject==="math"&&[4,5].includes(l.grade)&&l.lessonId);return `<section class="section"><div class="section-head"><div><span class="eyebrow">TRỌNG TÂM LỚP 4–5</span><h2>🧮 Toán 30 câu mỗi bài</h2></div><button class="link-btn" data-route="examRooms">Phòng thi →</button></div><div class="cards-3">${a.map(l=>`<article class="test-card"><div class="test-top"><span class="subject-icon mini pink">➗</span><span class="badge">Lớp ${l.grade}</span></div><h3>${esc(l.title)}</h3><p>${esc(l.desc||l.topic||"")}</p><div class="test-meta"><span>❓ 30 câu</span><span>💡 Có giải thích</span></div><button class="primary full" data-start="math" data-grade="${l.grade}" data-lesson="${l.lessonId}">Làm 30 câu</button></article>`).join("")}</div></section>`}
function home(){const avg=state.results.length?Math.round(state.results.reduce((a,b)=>a+b.score,0)/state.results.length):0;return hero()+mathFocus()+`<section class="metrics">${metric("📝",state.results.length,"Bài đã làm")}${metric("🎯",avg+"%","Điểm trung bình")}${metric("❤️",state.favorites.length,"Bài đã lưu")}${metric("🔥","3","Ngày liên tiếp")}</section><section class="section"><div class="section-head"><div><span class="eyebrow">KHÁM PHÁ</span><h2>Môn học nổi bật</h2></div></div><div class="subject-grid">${D.subjects.map(s=>`<article class="subject-card ${s.color}"><div class="subject-icon">${s.icon}</div><h3>${s.name}</h3><p>${s.desc||""}</p><button class="primary small" data-subject="${s.id}">Xem bài tập →</button></article>`).join("")}</div></section><section class="section split"><div><div class="section-head"><h2>⭐ Bài tập mới</h2></div><div class="list-card">${D.lessons.slice(0,6).map(lessonRow).join("")}</div></div><div class="panel"><h3>⚡ Truy cập nhanh</h3><div class="admin-actions"><button class="outline" data-route="classes">🏫 Lớp học</button><button class="outline" data-route="assignments">📌 Bài được giao</button><button class="outline" data-route="analytics">📊 Phân tích</button><button class="outline" data-route="notifications">🔔 Thông báo</button><button class="outline" data-route="liveClassroom">📡 Live Classroom</button><button class="outline" data-route="submissions">📨 Chấm bài</button><button class="outline" data-route="gradeReviews">📝 Đề nghị sửa điểm</button></div></div></section>`}
function subjects(){return pageHead("THƯ VIỆN","Môn học & bài tập","Tìm không dấu, lọc theo lớp/môn/mức độ.")+`<section class="filterbar"><input id="lessonSearch" placeholder="🔎 Tìm bài..."><select id="gradeFilter"><option value="">Tất cả lớp</option>${[1,2,3,4,5].map(g=>`<option>${g}</option>`).join("")}</select><select id="levelFilter"><option value="">Mọi mức độ</option><option>Dễ</option><option>Trung bình</option><option>Khó</option></select></section><section class="subject-grid compact">${D.subjects.map(s=>`<button class="subject-filter ${s.color}" data-filter-subject="${s.id}"><span>${s.icon}</span><b>${s.name}</b></button>`).join("")}</section><div id="lessonResults" class="list-card">${D.lessons.map(lessonRow).join("")}</div>`}
function tests(){return window.TermExamBank?.render?.()||pageHead("KIỂM TRA","Đang tải ngân hàng đề","Hãy thử lại sau vài giây.")}

function materials(){return pageHead("TÀI LIỆU","Kho tài liệu","Giáo viên/Admin có thể tải PDF, ảnh và audio lên backend.")+`<div class="panel teacher-only"><h3>⬆️ Upload tài liệu</h3><form id="uploadForm" class="stack"><label>Tiêu đề<input name="title" required></label><label>File<input id="uploadFile" type="file" accept=".pdf,image/png,image/jpeg,audio/mpeg,audio/wav" required></label><button class="primary">Tải lên</button></form></div><div class="list-card" id="materialList">${D.materials.map(m=>`<div class="material-row"><div class="pdf">PDF</div><div class="grow"><b>${esc(m.title)}</b><small>${m.subject||""} • Lớp ${m.grade||""} • ${m.size||""}</small></div><button class="outline">Xem</button></div>`).join("")}</div>`}
function favorites(){const a=D.lessons.filter(x=>state.favorites.includes(x.id));return pageHead("ĐÃ LƯU","Yêu thích")+`<div class="list-card">${a.length?a.map(lessonRow).join(""):'<div class="empty">Chưa có bài yêu thích.</div>'}</div>`}
function history(){const a=[...state.results].reverse(),historyPages=Math.max(1,Math.ceil(a.length/20)),historyPage=Math.max(1,Math.min(historyPages,state.historyPage||1)),avg=a.length?Math.round(a.reduce((x,y)=>x+y.score,0)/a.length):0;return pageHead("TIẾN ĐỘ","Kết quả học tập")+(state.user?.role==="admin"?'<div class="panel"><b>🛡️ Bạn đang dùng Admin.</b> Đây là lịch sử trên thiết bị hiện tại, không phải toàn bộ học sinh. <button class="primary" data-route="adminResults">📊 Xem bảng điểm tất cả tài khoản →</button></div>':"")+`<div class="panel"><button class="outline" id="exportXlsx">📊 Xuất Excel</button> <button class="outline" id="exportPdf">📄 Xuất PDF</button><p class="muted" style="margin:12px 0 0">Lịch sử ở đây lưu trên thiết bị; Excel/PDF lấy các bài đã đồng bộ lên server. Bài cũ không có thông tin tài khoản sẽ ghi “Chưa xác định”.</p></div>`+`<div class="metrics">${metric("📝",a.length,"Lượt làm")}${metric("🎯",avg+"%","Trung bình")}${metric("⭐",a.reduce((x,y)=>x+(y.points||0),0),"Điểm thưởng")}${metric("⏱",Math.round(a.reduce((x,y)=>x+(y.durationSec||0),0)/60)+"p","Thời gian")}</div><div class="panel"><div class="table-wrap" ${a.length>250?"hidden":""}><table><thead><tr><th>Bài</th><th>Tài khoản làm bài</th><th>Môn</th><th>Điểm</th><th>Ngày</th></tr></thead><tbody>${a.slice((historyPage-1)*20,historyPage*20).map(r=>`<tr><td>${esc(r.title)}</td><td><b>${esc(window.ResultAccount?.describe?.(r)?.name||"Chưa xác định")}</b><small style="display:block;color:var(--muted,#718096)">${esc(window.ResultAccount?.describe?.(r)?.detail||"Bài cũ lưu trên thiết bị")}</small></td><td>${esc(subj(r.subject).name)}</td><td><b>${r.score}%</b></td><td>${esc(r.date||"")}</td></tr>`).join("")||'<tr><td colspan="5">Chưa có dữ liệu.</td></tr>'}</tbody></table></div><div class="exam-pagination" ${a.length>250?"hidden":""} aria-label="Chuyển trang lịch sử"><button type="button" class="outline" id="historyPrev" ${historyPage<=1?"disabled":""}>← Trước</button><span>Trang ${historyPage}/${historyPages}</span><button type="button" class="outline" id="historyNext" ${historyPage>=historyPages?"disabled":""}>Tiếp →</button></div>${a.length>250?'<p class="muted">Danh sách dài được tải theo phần đang hiển thị để tránh giật lag.</p><div id="historyVirtualScroll"></div>':""}</div>`}
async function analytics(){
 if(!state.user)return loginRequired("Đăng nhập để xem phân tích.");
 let j;try{j=await API.get("/api/analytics")}catch(e){return errorBox(e.message)}
 const isAdmin=state.user.role==="admin";
 const attempts=Array.isArray(j.recentResults)?j.recentResults:[];
 const formatted=d=>{
  const t=Date.parse(d||"");
  return Number.isFinite(t)?new Date(t).toLocaleString("vi-VN"):"Chưa rõ";
 };
 const latest=attempts.map(r=>
  '<tr><td><b>'+esc(r.studentName||"Chưa xác định tài khoản")+'</b>'+
   (isAdmin&&r.studentEmail?'<small class="analytics-account-email">'+esc(r.studentEmail)+'</small>':"")+
   '</td><td>'+esc(r.title||"Bài luyện tập")+'</td><td>'+esc(subj(r.subject).name)+'</td>'+
   '<td><b>'+esc(Number(r.score||0))+'%</b></td><td>'+formatted(r.createdAt)+'</td></tr>'
 ).join("");
 return pageHead("PHÂN TÍCH","Điểm mạnh & điểm cần ôn","Dữ liệu tính từ kết quả đã lưu trên server.")+
  '<div class="metrics">'+metric("📝",j.totalAttempts,"Lượt làm")+metric("🎯",j.average+"%","Trung bình")+
   metric("⏱",j.totalMinutes,"Phút học")+metric("💡",j.weakest?.name||"—","Môn cần ôn")+'</div>'+
  '<div class="panel"><h3>Theo môn</h3>'+(j.subjects||[]).map(x=>'<div class="simple-row"><span>'+esc(subj(x.id).icon)+'</span><div class="grow"><b>'+esc(x.name)+'</b><small>'+esc(x.attempts)+' lượt • '+esc(x.wrong)+' câu sai</small></div><strong>'+esc(x.avg)+'%</strong></div>').join("")+
   ((j.subjects||[]).length?"":"<p>Chưa có dữ liệu.</p>")+'</div>'+
  '<div class="panel analytics-account-results"><h3>👤 Ai đã làm bài kiểm tra?</h3>'+
   '<p class="muted">'+(isAdmin?"Hiển thị 30 lượt làm mới nhất của các tài khoản.":"Hiển thị các lượt làm mới nhất thuộc tài khoản được phép xem.")+
   ' Điểm tự động từ trình duyệt chưa phải điểm giáo viên duyệt.</p>'+
   '<div class="table-wrap"><table><thead><tr><th>Tài khoản làm bài</th><th>Tên bài</th><th>Môn</th><th>Điểm</th><th>Ngày làm</th></tr></thead><tbody>'+
   (latest||'<tr><td colspan="5">Chưa có bài đã đồng bộ lên server. Những bài chỉ lưu trên máy sẽ không hiển thị ở đây.</td></tr>')+
   '</tbody></table></div>'+
   (isAdmin?'<p class="muted">Muốn xem tất cả bài nộp, lọc theo tài khoản hoặc lớp? <a href="#adminResults">Mở bảng điểm học sinh →</a></p>':"")+
  '</div>';
}
function loginRequired(msg="Bạn cần đăng nhập."){return `<div class="empty large"><h2>🔐 ${msg}</h2><button class="primary" id="openLogin">Đăng nhập / Đăng ký</button></div>`}
function errorBox(m){return `<div class="empty large"><h2>⚠️ Có lỗi</h2><p>${esc(m)}</p></div>`}
async function classes(){if(!state.user)return loginRequired();let j;try{j=await API.get("/api/classes")}catch(e){return errorBox(e.message)}const canCreate=["teacher","admin"].includes(state.user.role);return pageHead("LỚP HỌC","Lớp học của bạn","Giáo viên tạo lớp bằng mã, học sinh nhập mã để tham gia.")+`${canCreate?'<div class="panel"><h3>➕ Tạo lớp</h3><form id="classForm" class="form-grid"><label>Tên lớp<input name="name" required></label><label>Khối<select name="grade">'+[1,2,3,4,5].map(g=>'<option>'+g+'</option>').join('')+'</select></label><button class="primary">Tạo lớp</button></form></div>':''}${state.user.role==="student"?'<div class="panel"><h3>🔑 Vào lớp bằng mã</h3><form id="joinClassForm" class="chat-input"><input name="code" placeholder="Nhập mã lớp" required><button class="primary">Tham gia</button></form></div>':''}<div class="cards-3">${j.classes.map(c=>`<article class="test-card"><h3>🏫 ${esc(c.name)}</h3><p>Lớp ${c.grade}</p><div class="test-meta"><span>Mã: <b>${c.code}</b></span><span>👥 ${c.studentIds?.length||0}</span></div></article>`).join("")||'<div class="empty">Chưa có lớp học.</div>'}</div>`}
async function assignments(){if(!state.user)return loginRequired();let j,cls;try{[j,cls]=await Promise.all([API.get("/api/assignments"),API.get("/api/classes")])}catch(e){return errorBox(e.message)}const teacher=["teacher","admin"].includes(state.user.role);return pageHead("BÀI ĐƯỢC GIAO","Assignments","Giáo viên đặt deadline và giới hạn số lần nộp.")+`${teacher?'<div class="panel"><h3>➕ Giao bài</h3><form id="assignmentForm" class="stack"><label>Lớp<select name="classId">'+cls.classes.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join('')+'</select></label><div class="form-grid"><label>Tiêu đề<input name="title" required></label><label>Môn<select name="subject">'+D.subjects.map(s=>'<option value="'+s.id+'">'+s.name+'</option>').join('')+'</select></label><label>Deadline<input type="datetime-local" name="deadline"></label><label>Số lần nộp<input type="number" min="1" value="1" name="maxAttempts"></label></div><button class="primary">Giao bài</button></form></div>':''}<div class="list-card">${j.assignments.map(a=>`<div class="lesson-row"><div class="lesson-ico">📌</div><div class="grow"><b>${esc(a.title)}</b><small>${subj(a.subject).name}${a.lessonId?" • "+esc(D.lessons.find(l=>l.lessonId===a.lessonId)?.title||a.lessonId):""} • deadline: ${a.deadline?new Date(a.deadline).toLocaleString("vi-VN"):"Không giới hạn"} • tối đa ${a.maxAttempts} lần</small></div>${state.user.role==="student"?`<button class="primary small" data-submit-assignment="${a.id}" data-assignment-subject="${a.subject}" data-lesson="${a.lessonId||""}">Làm bài</button>`:""}</div>`).join("")||'<div class="empty">Chưa có bài được giao.</div>'}</div>`}
async function notifications(){if(!state.user)return loginRequired();let j;try{j=await window.PerfLists.get("notifications","/api/notifications")}catch(e){return errorBox(e.message)}return pageHead("THÔNG BÁO","Trung tâm thông báo","Có thể bật Web Push để nhận nhắc học và deadline.")+`<div class="panel"><button class="primary" id="enablePush">🔔 Bật thông báo đẩy</button></div>${window.PerfLists.controls("notifications",j.pagination,{placeholder:"Tìm thông báo..."})}<div class="list-card">${j.notifications.map(n=>`<div class="simple-row"><span>🔔</span><div class="grow"><b>${esc(n.title)}</b><small>${esc(n.message)} • ${new Date(n.createdAt).toLocaleString("vi-VN")}</small></div></div>`).join("")||'<div class="empty">Chưa có thông báo.</div>'}</div>`}

async function questionBank(){
 if(!state.user||!["teacher","admin"].includes(state.user.role))return loginRequired("Chỉ giáo viên/Admin được quản lý ngân hàng câu hỏi.");
 let j={questions:[]};try{j=await window.PerfLists.get("questionBank","/api/question-bank")}catch(e){return errorBox(e.message)}
 const built=D.questions.filter(q=>q.subject==="math"&&[4,5].includes(q.grade));
 return pageHead("NGÂN HÀNG CÂU HỎI","Toán lớp 4–5","Có sẵn "+built.length+" câu hệ thống + câu import từ Excel/CSV.")+
 `<div class="metrics">${metric("4️⃣",D.questions.filter(q=>q.grade===4&&q.subject==="math").length,"Câu lớp 4")}${metric("5️⃣",D.questions.filter(q=>q.grade===5&&q.subject==="math").length,"Câu lớp 5")}${metric("📥",j.pagination?.total||j.questions.length,"Câu import")}${metric("📚",D.lessons.filter(l=>l.lessonId&&[4,5].includes(l.grade)).length,"Bài 30 câu")}</div>
 <div class="panel"><h3>📥 Nhập câu hỏi từ Excel/CSV</h3><p class="muted">Chỉ hỗ trợ file .xlsx, .xls, .csv (không hỗ trợ Word .docx). Nếu đề ở Word, hãy chuyển câu hỏi thành bảng Excel trước khi nhập.</p><p class="muted">Các cột: grade, lessonId, level, q, A, B, C, D, answer, explain.</p><form id="importQuestionForm" class="stack"><input id="questionFile" type="file" accept=".xlsx,.xls,.csv" required><button class="primary">Import câu hỏi</button></form></div>
 <div class="panel"><h3>10 bài trọng tâm</h3>${D.lessons.filter(l=>l.lessonId&&[4,5].includes(l.grade)).map(l=>`<div class="simple-row"><span>➗</span><div class="grow"><b>${esc(l.title)}</b><small>${esc(l.topic)} • 30 câu</small></div><button class="outline small" data-start="math" data-grade="${l.grade}" data-lesson="${l.lessonId}">Xem bài</button></div>`).join("")}</div>
 ${window.PerfLists.controls("questionBank",j.pagination,{placeholder:"Tìm câu hỏi..."})}<div class="panel"><h3>Câu đã import</h3><div class="table-wrap"><table><thead><tr><th>Lớp</th><th>Bài</th><th>Câu hỏi</th><th>Mức độ</th></tr></thead><tbody>${j.questions.map(q=>`<tr><td>${q.grade}</td><td>${esc(q.lessonId)}</td><td>${esc(q.q)}</td><td>${esc(q.level)}</td></tr>`).join("")||'<tr><td colspan="4">Chưa import thêm câu nào.</td></tr>'}</tbody></table></div></div>`
}
async function examRooms(){
 if(!state.user)return loginRequired("Đăng nhập để vào phòng thi.");
 let j;try{j=await API.get("/api/exam-rooms")}catch(e){return errorBox(e.message)}
 const teacher=["teacher","admin"].includes(state.user.role),lessons=D.lessons.filter(l=>l.lessonId&&[4,5].includes(l.grade));
 return pageHead("PHÒNG THI ONLINE","Thi Toán lớp 4–5","Giáo viên tạo mã phòng; học sinh nhập mã và làm đúng bài 30 câu đã chọn.")+
 `${teacher?`<div class="panel"><h3>➕ Tạo phòng thi</h3><form id="examRoomForm" class="stack"><div class="form-grid"><label>Tên phòng<input name="title" value="Thi Toán lớp 4–5" required></label><label>Bài<select name="lessonId">${lessons.map(l=>`<option value="${l.lessonId}" data-grade="${l.grade}">Lớp ${l.grade} — ${esc(l.title)}</option>`).join("")}</select></label><label>Lớp<select name="grade"><option>4</option><option>5</option></select></label><label>Thời gian (phút)<input name="durationMin" type="number" min="5" value="45"></label><label>Bắt đầu<input name="startsAt" type="datetime-local"></label><label>Kết thúc<input name="endsAt" type="datetime-local"></label></div><button class="primary">Tạo phòng</button></form></div>`:""}
 ${state.user.role==="student"?'<div class="panel"><h3>🔑 Nhập mã phòng</h3><form id="joinExamForm" class="chat-input"><input name="code" placeholder="Mã phòng thi" required><button class="primary">Vào phòng</button></form></div>':""}
 <div class="cards-3">${j.rooms.map(r=>`<article class="test-card"><h3>🧪 ${esc(r.title)}</h3><p>Lớp ${r.grade} • ${r.durationMin} phút</p><div class="test-meta"><span>Mã <b>${r.code}</b></span><span>👥 ${r.participants?.length||0}</span></div>${state.user.role==="student"?`<button class="primary full" data-room-start="${r.lessonId}" data-room-grade="${r.grade}">Bắt đầu 30 câu</button>`:""}</article>`).join("")||'<div class="empty">Chưa có phòng thi.</div>'}</div>`
}
const sinceOnline=t=>{
 if(!t)return "Chưa ghi nhận hoạt động";
 const d=new Date(t);return Number.isFinite(d.valueOf())?"Lần cuối: "+d.toLocaleString("vi-VN"):"Chưa ghi nhận hoạt động";
};
function liveBadge(status,available){
 const online=available&&!!status?.online,unknown=!available;
 const label=unknown?"⚪ Chưa có dữ liệu":online?"🟢 Online":"⚫ Offline";
 return '<span data-live-status class="admin-live-indicator '+(unknown?"unknown":online?"online":"offline")+'">'+label+'</span><small data-live-last>'+esc(unknown?"Cần PostgreSQL trên Vercel":sinceOnline(status?.lastSeenAt))+'</small>';
}
let adminPresenceRefresh=null;
function bindAdminPresence(){
 if(adminPresenceRefresh){clearInterval(adminPresenceRefresh);adminPresenceRefresh=null}
 if(state.route!=="adminUsers"||state.user?.role!=="admin")return;
 const panel=document.querySelector("#adminPresenceSummary");
 if(!panel||panel.dataset.available!=="1")return;
 async function refresh(){
  if(document.visibilityState!=="visible"||state.route!=="adminUsers")return;
  const nodes=[...document.querySelectorAll("[data-live-user]")];
  if(!nodes.length)return;
  const ids=nodes.map(n=>n.dataset.liveUser).filter(Boolean);
  try{
   const response=await API.get("/api/admin/presence?ids="+encodeURIComponent(ids.join(",")),{retries:0,cancelPrevious:false,timeout:8000});
   panel.textContent=response.available?"🟢 "+Number(response.onlineTotal||0)+" tài khoản đang online (toàn hệ thống)":"⚪ Chưa cấu hình theo dõi online";
   const onlineStat=document.querySelector("#adminUsersOnlineStat");if(onlineStat)onlineStat.textContent=response.available?Number(response.onlineTotal||0).toLocaleString("vi-VN"):"—";
   const states=new Map((response.users||[]).map(v=>[v.id,v]));
   for(const node of nodes){node.innerHTML=liveBadge(states.get(node.dataset.liveUser),response.available)}
  }catch{panel.textContent="⚪ Chưa cập nhật được trạng thái; sẽ thử lại"}
 }
 adminPresenceRefresh=setInterval(refresh,30000);
}
function adminUserFilterControls(){
 const f=window.PerfLists.state("adminUsers");
 const option=(value,current)=>value===current?"selected":"";
 return '<div class="admin-users-filterbar" role="group" aria-label="Bộ lọc tài khoản nâng cao">'+
 '<div class="admin-users-filter-title"><b>🎯 Bộ lọc nâng cao</b><small>Lọc theo vai trò và tình trạng tài khoản trên toàn hệ thống</small></div>'+
 '<label for="adminUsersRoleFilter">Vai trò<select id="adminUsersRoleFilter" aria-label="Lọc theo vai trò">'+
 '<option value="" '+option("",f.role||"")+'>Tất cả vai trò</option>'+
 '<option value="student" '+option("student",f.role||"")+'>Học sinh</option>'+
 '<option value="parent" '+option("parent",f.role||"")+'>Phụ huynh</option>'+
 '<option value="teacher" '+option("teacher",f.role||"")+'>Giáo viên</option>'+
 '<option value="admin" '+option("admin",f.role||"")+'>Quản trị viên</option></select></label>'+
 '<label for="adminUsersStatusFilter">Tình trạng<select id="adminUsersStatusFilter" aria-label="Lọc theo trạng thái khóa">'+
 '<option value="" '+option("",f.accountStatus||"")+'>Tất cả tài khoản</option>'+
 '<option value="active" '+option("active",f.accountStatus||"")+'>Đang hoạt động</option>'+
 '<option value="locked" '+option("locked",f.accountStatus||"")+'>Đã khóa</option></select></label>'+
 '<button type="button" class="outline" id="adminUsersResetFilters">↺ Xóa bộ lọc</button></div>';
}
function adminUserGrowth(series){
 if(!Array.isArray(series)||!series.length)return '<section class="panel admin-users-growth"><h3>📈 Đăng ký mới trong 6 tháng</h3><p class="muted">Chưa có dữ liệu thống kê đăng ký.</p></section>';
 const data=series.filter(x=>/^\d{4}-(0[1-9]|1[0-2])$/.test(String(x.month||""))).map(x=>({
  month:x.month,total:Math.max(0,Math.floor(Number(x.total)||0))
 }));
 if(!data.length)return "";
 const peak=Math.max(1,...data.map(x=>x.total));
 const total=data.reduce((sum,x)=>sum+x.total,0);
 return '<section class="panel admin-users-growth" aria-label="Đăng ký mới theo tháng">'+
  '<div class="admin-users-growth-head"><div><h3>📈 Đăng ký mới trong 6 tháng</h3><p>Số tài khoản tạo mới theo tháng (UTC), không phụ thuộc bộ lọc bên dưới.</p></div>'+
  '<span class="admin-users-growth-total"><b>'+total.toLocaleString("vi-VN")+'</b> đăng ký</span></div>'+
  '<div class="admin-users-growth-bars" role="list">'+data.map(x=>{
   const height=x.total?Math.max(5,Math.round(x.total/peak*100)):0;
   const label=x.month.slice(5)+'/'+x.month.slice(2,4);
   return '<div class="admin-users-growth-month" role="listitem" aria-label="Tháng '+label+': '+x.total+' đăng ký">'+
    '<strong>'+x.total.toLocaleString("vi-VN")+'</strong>'+
    '<div class="admin-users-growth-track"><span class="admin-users-growth-bar" style="height:'+height+'%" aria-hidden="true"></span></div>'+
    '<small>'+label+'</small></div>';
  }).join("")+'</div>'+
  '<p class="admin-users-growth-note">Tháng hiện tại là số liệu tạm tính. Tài khoản thiếu ngày tạo không được tính vào biểu đồ.</p></section>';
}
function adminUserStats(summary){
 const f=window.PerfLists.state("adminUsers"),roles=summary?.roles||{};
 const cards=[
  {key:"student",icon:"🎒",name:"Học sinh",value:roles.student||0,kind:"role"},
  {key:"teacher",icon:"👩‍🏫",name:"Giáo viên",value:roles.teacher||0,kind:"role"},
  {key:"parent",icon:"👨‍👩‍👧",name:"Phụ huynh",value:roles.parent||0,kind:"role"},
  {key:"admin",icon:"🛡️",name:"Quản trị viên",value:roles.admin||0,kind:"role"},
  {key:"active",icon:"✅",name:"Chưa khóa",value:summary?.unlocked||0,kind:"status"},
  {key:"locked",icon:"🔒",name:"Đã khóa",value:summary?.locked||0,kind:"status"}
 ];
 return '<section class="admin-users-role-section" aria-label="Thống kê vai trò và trạng thái tài khoản">'+
  '<div class="admin-users-role-heading"><div><h3>📊 Cơ cấu tài khoản</h3>'+
  '<p>Tổng toàn hệ thống • Bấm vào thẻ để lọc danh sách bên dưới</p></div></div>'+
  '<div class="admin-users-role-grid">'+cards.map(c=>{
   const attr=c.kind==="role"?'data-users-summary-role="'+c.key+'"':'data-users-summary-status="'+c.key+'"';
   const selected=(c.kind==="role"?f.role:f.accountStatus)===c.key;
   return '<button class="admin-users-role-card'+(selected?' is-selected':'')+'" type="button" '+
    attr+' aria-pressed="'+selected+'" aria-label="Lọc '+c.name+'"><span class="admin-users-role-icon" aria-hidden="true">'+c.icon+'</span>'+
    '<span class="admin-users-role-copy"><strong>'+Number(c.value).toLocaleString("vi-VN")+'</strong><small>'+c.name+'</small></span>'+
    '<span class="admin-users-role-arrow" aria-hidden="true">↗</span></button>';
  }).join("")+'</div></section>';
}
async function adminUsers(){
 if(state.user?.role!=="admin")return loginRequired("Chỉ Admin được quản lý tài khoản.");
 let j;try{const filters=window.PerfLists.state("adminUsers");j=await window.PerfLists.get("adminUsers","/api/admin/users",{role:filters.role||"",accountStatus:filters.accountStatus||""})}catch(e){return errorBox(e.message)}
 return '<div class="admin-users-page">'+pageHead("TRUNG TÂM QUẢN TRỊ","Tài khoản hệ thống","Quản lý thành viên, phân quyền và theo dõi hoạt động an toàn.")+
 '<section class="admin-users-summary" aria-label="Tổng quan tài khoản">'+
 '<article class="admin-users-stat"><span class="admin-users-stat-icon" aria-hidden="true">👥</span><div><small>Tổng tài khoản</small><strong>'+Number(j.allUsersTotal??j.pagination?.total??0).toLocaleString("vi-VN")+'</strong><span>Đã đăng ký trên hệ thống</span></div></article>'+
 '<article class="admin-users-stat admin-users-stat-online"><span class="admin-users-stat-icon" aria-hidden="true">🟢</span><div><small>Đang trực tuyến</small><strong id="adminUsersOnlineStat">'+(j.presenceAvailable?Number(j.onlineTotal||0).toLocaleString("vi-VN"):"—")+'</strong><span>Hoạt động trong 2 phút gần đây</span></div></article>'+
 '<article class="admin-users-stat"><span class="admin-users-stat-icon" aria-hidden="true">📋</span><div><small>Đang hiển thị</small><strong>'+Number(j.users?.length||0).toLocaleString("vi-VN")+'</strong><span>Tài khoản trong trang này</span></div></article>'+
 '</section>'+adminUserStats(j.accountSummary)+adminUserGrowth(j.accountGrowth)+(j.durable?"":'<div class="panel admin-users-warning" role="alert"><b>⚠️ Chưa có PostgreSQL dùng chung.</b><p>Trên Vercel, cần cấu hình DATABASE_URL trước khi khóa/mở khóa tài khoản. Không nên sử dụng JSON cục bộ để quản lý quyền thật.</p></div>')+`
 <div class="panel admin-presence-summary admin-users-live-banner" id="adminPresenceSummary" role="status" data-available="${j.presenceAvailable?"1":"0"}">${j.presenceAvailable?"🟢 "+Number(j.onlineTotal||0)+" tài khoản đang online (toàn hệ thống)":"⚪ Chưa bật giám sát online: Vercel cần DATABASE_URL"}. Trạng thái online là hoạt động trên website trong khoảng 2 phút gần nhất.</div>
 <section class="panel admin-users-grant"><div class="admin-users-grant-head"><span class="admin-users-grant-icon" aria-hidden="true">🛡️</span><div><h3>Cấp quyền quản trị viên</h3><p class="muted">${j.canGrantAdmin?"Bạn đang dùng tài khoản Admin chính. Có thể cấp quyền cho tài khoản Supabase đã liên kết.":"Chỉ Admin chính đã được cấu hình mới có thể cấp quyền này."} Tài khoản nhận quyền cần đăng ký và đăng nhập website ít nhất một lần.</p></div></div><form id="grantAdminForm" class="admin-users-grant-form"><label for="grantAdminEmail">Email tài khoản<input id="grantAdminEmail" name="email" type="email" autocomplete="email" placeholder="Nhập email tài khoản cần cấp quyền" required></label><button class="primary" type="submit" ${j.canGrantAdmin?"":"disabled title='Chỉ Admin chính được cấp quyền'"}>🛡️ Cấp quyền Admin</button></form></section>
 <section class="admin-users-directory"><div class="admin-users-directory-heading"><div><span class="admin-users-eyebrow">DANH SÁCH THÀNH VIÊN</span><h3>Quản lý người dùng</h3><p>Tìm kiếm, cập nhật vai trò và quản lý trạng thái tài khoản.</p></div><span class="admin-users-count">${Number(j.pagination?.total||0)} tài khoản khớp bộ lọc</span></div>${adminUserFilterControls()}${window.PerfLists.controls("adminUsers",j.pagination,{placeholder:"🔎 Tìm tên hoặc email..."})}<div class="panel admin-users-table-card"><div class="table-wrap" tabindex="0" aria-label="Bảng quản lý tài khoản, có thể cuộn ngang"><table><thead><tr><th>Tên</th><th>Email</th><th>Vai trò</th><th>Lớp</th><th>Tài khoản</th><th>Trực tuyến</th><th>Thao tác</th></tr></thead><tbody>${j.users.map(u=>`<tr class="${u.locked?"is-locked":""}"><td><div class="admin-user-identity"><span class="admin-user-avatar" aria-hidden="true">${esc(String(u.name||u.email||"U").trim().charAt(0).toLocaleUpperCase("vi-VN"))}</span><span class="admin-user-name">${esc(u.name||"Chưa có tên")}</span></div></td><td><span class="admin-user-email">${esc(u.email)}</span></td><td><select class="admin-user-role-select" aria-label="Vai trò của ${esc(u.name||u.email)}" data-user-role="${esc(u.id)}" data-current-role="${esc(u.role)}" data-user-email="${esc(u.email)}" data-can-grant-admin="${j.canGrantAdmin?"1":"0"}">${[["student","Học sinh"],["parent","Phụ huynh"],["teacher","Giáo viên"],["admin","Quản trị viên"]].map(([r,t])=>`<option value="${r}" ${r===u.role?"selected":""} ${r==="admin"&&u.role!=="admin"&&!j.canGrantAdmin?"disabled":""}>${t}</option>`).join("")}</select></td><td><span class="admin-user-grade">${u.grade?"Lớp "+Number(u.grade):"—"}</span></td><td><span class="admin-account-state ${u.locked?"locked":"active"}">${u.locked?"🔒 Đã khóa":"✓ Hoạt động"}</span></td><td data-live-user="${esc(u.id)}">${liveBadge(u.presence,j.presenceAvailable)}</td><td><div class="admin-user-actions"><button type="button" class="outline small admin-user-save" data-user-save="${esc(u.id)}">Lưu vai trò</button><button type="button" class="outline small admin-user-lock ${u.locked?"unlock":"lock"}" data-user-lock="${esc(u.id)}" data-user-email="${esc(u.email)}" data-locked="${u.locked?"1":"0"}" ${u.id===state.user.id?"disabled title='Không thể tự khóa tài khoản'":""}>${u.locked?"🔓 Mở khóa":"🔒 Khóa tài khoản"}</button><button type="button" class="outline small admin-user-devices" data-user-devices="${esc(u.id)}" aria-label="Xem IP và thiết bị của ${esc(u.name||u.email)}">🌐 Thiết bị / IP</button></div></td></tr>`).join("")||'<tr><td colspan="7" class="admin-users-empty">Không có tài khoản phù hợp với bộ lọc hiện tại.</td></tr>'}</tbody></table></div></div></section></div>`
}
async function storageHealth(){
 if(state.user?.role!=="admin")return loginRequired("Chỉ Admin.");
 let j;try{j=await API.get("/api/storage/health")}catch(e){return errorBox(e.message)}
 return pageHead("HẠ TẦNG","PostgreSQL & Redis","Khi có DATABASE_URL/REDIS_URL, hệ thống dùng adapter thật.")+
 `<div class="metrics">${metric("🐘",j.postgres.enabled?"ON":"OFF","PostgreSQL")}${metric("🔴",j.redis.enabled?"ON":"OFF","Redis session")}${metric("🧪",j.postgres.error?"Lỗi":"OK","Postgres health")}${metric("⚡",j.redis.error?"Lỗi":"OK","Redis health")}</div><div class="panel admin-storage-panel"><h3>📑 Chi tiết kết nối</h3><p class="muted">Dữ liệu trạng thái kỹ thuật từ máy chủ hiện tại.</p><pre>${esc(JSON.stringify(j,null,2))}</pre><button class="primary" id="migrateDb">🐘 Chạy migration PostgreSQL</button></div>`
}
function ai(){return pageHead("TRỢ GIẢNG","🤖 AI học tập")+`<div class="ai-layout"><div class="chat-card"><div class="chat-box" id="chatBox"><div class="msg bot">Chào em! Cô sẽ hướng dẫn từng bước. Em hỏi bài nhé.</div></div><form id="aiForm" class="chat-input"><input id="aiInput" placeholder="Ví dụ: Giải thích phân số 1/2"><button class="primary">Gửi</button></form></div><div class="panel"><h3>Gợi ý</h3>${["Giải thích phép nhân lớp 4 từng bước","Hướng dẫn phép chia lớp 4","Cách quy đồng hai phân số","Công thức hình tam giác, hình thang, hình tròn","Giải thích thể tích hình hộp lớp 5"].map(x=>`<button class="suggestion" data-prompt="${x}">${x}</button>`).join("")}</div></div>`}
async function profile(){if(!state.user)return loginRequired();if(!window.ProfilePage?.render)throw new Error("Hồ sơ mới chưa tải. Vui lòng cập nhật trang.");return await window.ProfilePage.render()}

async function parent(){if(!state.user||!["parent","admin"].includes(state.user.role))return loginRequired("Đăng nhập tài khoản phụ huynh.");let a=await analytics();return pageHead("PHỤ HUYNH","Theo dõi con","Liên kết bằng email tài khoản học sinh.")+`<div class="panel"><h3>🔗 Liên kết thêm học sinh</h3><form id="linkChildForm" class="chat-input"><input name="studentEmail" type="email" placeholder="Email học sinh" required><button class="primary">Liên kết</button></form></div>`+a}
async function teacher(){
 if(!state.user||!["teacher","admin"].includes(state.user.role))
  return loginRequired("Đăng nhập tài khoản giáo viên.");
 const tools=[
  ["questionBank","🧮","Ngân hàng câu hỏi","Tạo, chỉnh sửa và sắp xếp câu hỏi để xây dựng bài kiểm tra.","orange"],
  ["examRooms","🧪","Phòng thi","Tổ chức bài kiểm tra và quản lý phòng thi cho học sinh.","blue"],
  ["classes","🏫","Quản lý lớp","Tạo lớp, dùng mã lớp và theo dõi danh sách học sinh.","violet"],
  ["classInsights","📊","Thống kê lớp học","Theo dõi kết quả và tiến độ học tập của từng lớp.","green"],
  ["assignments","📌","Giao bài tập","Giao nhiệm vụ, đặt hạn nộp và quản lý bài được giao.","pink"],
  ["submissions","📝","Chấm bài","Xem bài học sinh đã nộp và xử lý việc chấm điểm.","amber"],
  ["materials","📂","Tài liệu học tập","Quản lý tài liệu hỗ trợ giảng dạy và ôn tập.","cyan"],
  ["notifications","🔔","Thông báo","Xem thông báo và cập nhật dành cho giáo viên.","rose"]
 ];
 return '<div class="teacher-dashboard">'+
  pageHead("KHÔNG GIAN GIẢNG DẠY","Bảng điều khiển giáo viên",
   "Quản lý lớp 4–5, tạo bài tập, tổ chức kiểm tra và theo dõi tiến bộ của học sinh.")+
  '<section class="teacher-overview" aria-label="Tổng quan công việc giáo viên">'+
  '<div class="teacher-overview-head"><div><span class="teacher-dashboard-kicker">DỮ LIỆU CỦA TÔI</span>'+
  '<h2>📊 Tổng quan công việc</h2><p>Chỉ tính các lớp và bài tập do tài khoản này phụ trách.</p></div>'+
  '<button type="button" id="teacherOverviewRefresh" class="outline" aria-label="Làm mới tổng quan giáo viên">↻ Làm mới</button></div>'+
  '<div class="teacher-overview-stats" aria-label="Thống kê công việc">'+
  [["🏫","Lớp phụ trách","classes","classes"],["👩‍🎓","Học sinh trong lớp","students","classes"],
   ["📚","Bài đã giao","assignments","assignments"],["📝","Bài cần chấm","pendingGrading","submissions"]]
   .map(([icon,label,key,route])=>
    '<button type="button" class="teacher-overview-stat teacher-overview-stat--'+key+
    '" data-route="'+route+'" aria-label="Mở '+label+'">'+
    '<span class="teacher-overview-stat-icon" aria-hidden="true">'+icon+'</span>'+
    '<span class="teacher-overview-stat-detail"><strong data-teacher-count="'+key+'">—</strong>'+
    '<small>'+label+'</small></span><span class="teacher-overview-stat-arrow" aria-hidden="true">↗</span></button>'
   ).join("")+'</div>'+
  '<div class="teacher-overview-recent"><div class="teacher-overview-recent-head">'+
  '<h3>🗂️ Bài tập mới giao</h3><button type="button" class="teacher-overview-view-all" data-route="assignments">Xem tất cả →</button></div>'+
  '<div id="teacherRecentAssignments" class="teacher-overview-recent-list" aria-live="polite">'+
  '<p class="teacher-overview-status">Đang tải dữ liệu mới nhất…</p></div></div>'+
  '<p id="teacherOverviewStatus" class="teacher-overview-status" role="status">Đang đồng bộ thống kê giáo viên…</p>'+
  '</section>'+
  '<section class="teacher-dashboard-workspace" aria-label="Công cụ giảng dạy">'+
  '<div class="teacher-dashboard-section-heading"><div>'+
  '<span class="teacher-dashboard-kicker">TRUY CẬP NHANH</span>'+
  '<h2>🎯 Công cụ giảng dạy</h2>'+
  '<p>Chọn một công cụ để bắt đầu công việc của bạn.</p>'+
  '</div><span class="teacher-dashboard-count">08 chức năng</span></div>'+
  '<div class="teacher-dashboard-grid">'+tools.map(([route,icon,title,description,tone],i)=>
   '<button type="button" class="teacher-tool-card teacher-tool--'+tone+'" data-route="'+route+
   '" aria-label="Mở '+title+'">'+
   '<span class="teacher-tool-icon" aria-hidden="true">'+icon+'</span>'+
   '<span class="teacher-tool-label"><strong>'+title+'</strong><span class="teacher-tool-arrow" aria-hidden="true">↗</span></span>'+
   '<span class="teacher-tool-description">'+description+'</span>'+
   '<span class="teacher-tool-footer"><span>Mở chức năng <span aria-hidden="true">→</span></span>'+
   '<span class="teacher-tool-index">'+String(i+1).padStart(2,"0")+'</span></span>'+
   '</button>'
  ).join("")+'</div>'+
  '<p class="teacher-dashboard-hint"><span aria-hidden="true">💡</span> Gợi ý: Bắt đầu với <b>Quản lý lớp</b>, sau đó chọn <b>Giao bài tập</b> để giao bài cho học sinh.</p>'+
  '</section></div>';
}
async function admin(){if(state.user?.role!=="admin")return loginRequired("Chỉ Admin được truy cập.");let j;try{j=await API.get("/api/admin/stats")}catch(e){return errorBox(e.message)}return pageHead("TRUNG TÂM ĐIỀU HÀNH","Bảng điều khiển Admin","Quản lý học sinh, theo dõi hoạt động và kiểm soát hệ thống trong một nơi.")+`<div class="metrics">${metric("👥",j.users,"Người dùng")}${metric("🧒",j.students,"Học sinh")}${metric("👩🏻‍🏫",j.teachers,"Giáo viên")}${metric("🏫",j.classes,"Lớp")}${metric("🟢",j.presenceAvailable?j.onlineTotal:"—","Đang online (2 phút)")}</div><div class="metrics">${metric("📌",j.assignments,"Bài giao")}${metric("📨",j.submissions,"Bài nộp")}${metric("📎",j.materials,"Tài liệu")}${metric("🛡️",j.audit.length,"Audit gần đây")}</div><div class="panel admin-dashboard-actions"><h3>⚙️ Lối tắt quản trị</h3><p class="muted">Truy cập nhanh các khu vực cần quản lý hằng ngày.</p><div class="admin-actions"><button class="outline" data-route="adminCenter">🧭 Trung tâm quản trị</button><button class="outline" data-route="adminUsers">👥 Quản lý user</button><button class="outline" data-route="adminResults">📊 Bảng điểm học sinh</button><button class="outline" data-route="questionBank">🧮 Ngân hàng câu hỏi</button><button class="outline" data-route="examRooms">🧪 Phòng thi</button><button class="outline" data-route="storageHealth">🐘 PostgreSQL / Redis</button><button class="outline" data-route="performanceMonitor">🚀 Hiệu năng API</button><button class="outline" data-route="adminAudit">📋 Nhật ký Admin</button><button class="outline" data-route="adminAlerts">🚨 Trung tâm cảnh báo</button></div></div><div class="panel admin-dashboard-security"><h3>🔐 Bảo mật Admin</h3><button class="outline" id="setup2fa">Thiết lập 2FA</button><div id="twofaInfo" class="tiny"></div></div><div class="panel admin-dashboard-audit"><h3>📋 Nhật ký hoạt động</h3><div class="table-wrap"><table><thead><tr><th>Thời gian</th><th>Action</th><th>User</th></tr></thead><tbody>${j.audit.map(a=>`<tr><td>${new Date(a.at).toLocaleString("vi-VN")}</td><td>${a.action}</td><td>${a.userId||"system"}</td></tr>`).join("")}</tbody></table></div></div>`}
function achievements(){return pageHead("THÀNH TÍCH","Huy hiệu & XP")+`<div class="badge-grid">${[["🌱","Khởi đầu"],["🔥","Chăm chỉ"],["⭐","100 điểm"],["🏆","Siêu học sinh"],["🎯","Chính xác"],["📚","Mọt sách"]].map((b,i)=>`<article class="achievement ${state.results.length>i?"unlocked":"locked"}"><div>${b[0]}</div><h3>${b[1]}</h3><p>Tiếp tục học để mở khóa.</p></article>`).join("")}</div>`}
function shop(){return pageHead("GAMIFICATION","Shop & phần thưởng","Khung chức năng XP/avatar; dữ liệu thanh toán Premium chưa bật nếu chưa cấu hình provider.")+`<div class="cards-3">${["🎓 Khung học giỏi","🐼 Thú cưng Panda","🌟 Avatar sao","🚀 Booster XP"].map((x,i)=>`<article class="test-card"><h3>${x}</h3><p>${(i+1)*100} XP</p><button class="outline">Đổi thưởng</button></article>`).join("")}</div>`}

function flashcards(){const cards=D.lessons.slice(0,8);return pageHead("FLASHCARD","Ôn nhanh kiến thức","Bấm vào thẻ để lật mặt sau, dùng giọng đọc của trình duyệt nếu cần.")+`<div class="cards-3">${cards.map((l,i)=>`<button class="test-card flashcard" data-flash="${i}" data-front="${esc(l.title)}" data-back="${esc(subj(l.subject).name+" • "+(l.topic||"Kiến thức trọng tâm"))}"><div class="subject-icon">${subj(l.subject).icon}</div><h3>${esc(l.title)}</h3><p>Chạm để lật</p></button>`).join("")}</div><div class="panel"><button class="outline" id="readFlash">🔊 Đọc thẻ đầu tiên</button></div>`}
function game(){return pageHead("MINI GAME","⚡ Toán nhanh","Trả lời liên tục để tăng combo và XP.")+`<div class="result-card"><div class="score-ring"><b id="gameScore">0</b><span>XP</span></div><div class="question-card"><h2 id="gameQ">Bấm Bắt đầu</h2><div class="options" id="gameOptions"></div></div><div class="quiz-actions"><button class="primary" id="startGame">Bắt đầu game</button></div></div>`}
async function submissions(){
 if(!state.user||!["teacher","admin"].includes(state.user.role))return loginRequired("Chỉ giáo viên/Admin được xem bài nộp.");
 let j;try{j=await window.PerfLists.get("submissions","/api/submissions")}catch(e){return errorBox(e.message)}
 return pageHead("CHẤM BÀI","Bài học sinh đã nộp","Chấm lần đầu trực tiếp. Sửa điểm đã chấm phải được Admin duyệt.")+
 '<div class="panel"><button type="button" class="outline" data-route="gradeReviews">📝 Xem yêu cầu sửa điểm</button></div>'+
 window.PerfLists.controls("submissions",j.pagination,{placeholder:"Tìm học sinh hoặc bài..."})+
 '<div class="list-card">'+(j.submissions||[]).map(x=>{
  const graded=x.score!==null&&x.score!==undefined&&x.score!=="";
  return '<div class="lesson-row"><div class="lesson-ico">📨</div><div class="grow">'+
   '<b>'+esc(x.student?.name||"Học sinh")+' — '+esc(x.assignment?.title||"Bài tập")+'</b>'+
   '<small>Điểm: '+(graded?Number(x.score)+"%":"Chưa chấm")+' • '+esc(x.submittedAt?new Date(x.submittedAt).toLocaleString("vi-VN"):"—")+'</small>'+
   '<button type="button" class="outline small" data-grade-toggle="'+esc(x.id)+'" aria-expanded="false">'+
   (graded?"Đề nghị sửa điểm":"Chấm lần đầu")+'</button>'+
   '<form class="grade-submission-form" data-grade-form="'+esc(x.id)+'" data-graded="'+(graded?"1":"0")+'" hidden>'+
   '<label>Điểm mới (0–100)<input type="number" name="score" min="0" max="100" step="0.5" value="'+(graded?Number(x.score):"")+'" required></label>'+
   (graded?'<label>Lý do sửa điểm (ít nhất 10 ký tự)<input name="reason" minlength="10" maxlength="500" required placeholder="Ví dụ: chấm nhầm câu số 3"></label>':
   '<label>Nhận xét<input name="feedback" maxlength="500" placeholder="Nhận xét cho học sinh"></label>')+
   '<button class="primary" type="submit">'+(graded?"Gửi yêu cầu duyệt":"Lưu điểm lần đầu")+'</button>'+
   '</form></div></div>';
 }).join("")+'</div>';
}

async function premium(){return window.DemoWallet?.render?.()||errorBox("Không tải được Ví demo")}

function today(){return window.StudentDashboard?.render(state.user)||errorBox("StudentDashboard chưa tải")}
function goals(){return window.StudentGoals?.render()||errorBox("StudentGoals chưa tải")}
function formulas(){return window.StudentFormulas?.render()||errorBox("StudentFormulas chưa tải")}
function vocab(){return window.StudentVocab?.render()||errorBox("StudentVocab chưa tải")}
function accessibility(){return window.StudentAccessibility?.render()||errorBox("StudentAccessibility chưa tải")}
function notes(){return window.StudentNotes?.render()||errorBox("StudentNotes chưa tải")}
function wrongReview(){return window.StudentReview?.render()||errorBox("StudentReview chưa tải")}
function quickPractice(){return window.StudentQuickPractice?.render()||errorBox("StudentQuickPractice chưa tải")}
function studyPath(){return window.StudentStudyPath?.render()||errorBox("StudentStudyPath chưa tải")}
function languageLab(){return window.StudentLanguage?.render()||errorBox("StudentLanguage chưa tải")}
function adaptive(){return window.StudentAdaptive?.render()||errorBox("StudentAdaptive chưa tải")}
function speech(){return window.StudentSpeech?.render()||errorBox("StudentSpeech chưa tải")}
function schedule(){return window.StudentSchedule?.render()||errorBox("StudentSchedule chưa tải")}
function worksheet(){return window.StudentWorksheet?.render()||errorBox("StudentWorksheet chưa tải")}
function profileStats(){return window.StudentProfileStats?.render()||errorBox("StudentProfileStats chưa tải")}
function missions(){return window.StudentMissions?.render()||errorBox("StudentMissions chưa tải")}
function bookmarks(){return window.StudentBookmarks?.render()||errorBox("StudentBookmarks chưa tải")}
function prepPlan(){return window.StudentPrepPlan?.render()||errorBox("StudentPrepPlan chưa tải")}
function writing(){return window.StudentWriting?.render()||errorBox("StudentWriting chưa tải")}
function handwriting(){return window.StudentHandwriting?.render()||errorBox("StudentHandwriting chưa tải")}
function sync(){return window.StudentSync?.render()||errorBox("StudentSync chưa tải")}
function targetScore(){return window.StudentTargetScore?.render()||errorBox("StudentTargetScore chưa tải")}
function topics(){return window.StudentTopics?.render()||errorBox("StudentTopics chưa tải")}
function targetScore(){return window.StudentTargetScore?.render()||errorBox("StudentTargetScore chưa tải")}
function topics(){return window.StudentTopics?.render()||errorBox("StudentTopics chưa tải")}
function mathWork(){return window.StudentMathWork?.render()||errorBox("StudentMathWork chưa tải")}

function renderSync(){const map={home,subjects,tests,materials,favorites,history,ai,profile,achievements,shop,flashcards,game,today,goals,formulas,vocab,accessibility,notes,wrongReview,quickPractice,studyPath,languageLab,adaptive,speech,schedule,worksheet,profileStats,missions,bookmarks,prepPlan,writing,handwriting,sync,targetScore,topics,mathWork};$("#content").innerHTML=(map[state.route]||home)();bind()}
async function render(){
 const sequence=++renderSequence,route=state.route;
 const adminViews=["gradeReviews","adminIntegrity","adminBackup","adminSecurity","adminAlerts","adminCenter","admin","adminUsers","adminResults","adminAudit","performanceMonitor","storageHealth","questionBank","submissions","examRooms"];
 const adminView=state.user?.role==="admin"?(route==="history"?"adminResults":adminViews.includes(route)?route:""):"";
 const container=$("#content");
 if(adminView)container.dataset.adminView=adminView;
 else delete container.dataset.adminView;
 try{
  // Recover from stale exam locks that hid the navigation without displaying an exam.
  if(window.ExamLock?.isActive?.()&&!document.querySelector(".locked-exam-shell"))window.ExamLock.exit();
  shell();
  // Do not fetch private-page scripts/styles before a verified role can use them.
  // Server APIs still perform their own authoritative authorization checks.
  const staffOnly=new Set(["classInsights","gradeReviews"]);
  if(staffOnly.has(route)&&!["teacher","admin"].includes(state.user?.role)){
   $("#content").innerHTML=loginRequired("Chỉ giáo viên/Admin được xem thống kê lớp học.");bind();return;
  }
  const adminOnly=new Set(["adminIntegrity","adminBackup","adminSecurity","adminAlerts","adminCenter","admin","adminUsers","adminResults","adminAudit","performanceMonitor","storageHealth"]);
  if(adminOnly.has(route)&&state.user?.role!=="admin"){
   $("#content").innerHTML=loginRequired("Chỉ quản trị viên được truy cập.");bind();return;
  }
  if(route==="profile"&&!state.user){
   $("#content").innerHTML=loginRequired("Đăng nhập để xem hồ sơ.");bind();return;
  }
  $("#content").innerHTML=window.PerfLoader?.skeleton?.(route)||'<div class="perf-skeleton" role="status">Đang tải dữ liệu…</div>';
  await window.PerfLoader?.ensureRoute(route,{isAdmin:state.user?.role==="admin",isStaff:["teacher","admin"].includes(state.user?.role)});
  if(sequence!==renderSequence||route!==state.route)return;
  if(route==="practice"){
   if(state.quiz?.questions?.length)quiz();
   else{
    $("#content").innerHTML=pageHead("BÀI TẬP","Chưa có bài tập đang làm","Hãy chọn bài trong Môn học để bắt đầu.")+
      '<div class="panel"><button class="primary" data-route="subjects">📚 Chọn bài tập</button></div>';
    bind()
   }
   return
  }
  if(window.StudentRegistry?.has(route)){
   const content=await window.StudentRegistry.render(route,{user:state.user});
   if(sequence!==renderSequence||route!==state.route)return;
   $("#content").innerHTML=content;bind();
   window.StudentRegistry.bind(route,{toast,nav,startCustom,render,user:state.user});window.StudentI18n?.apply?.();shell();return
  }
  const asyncMap={classes,assignments,classInsights:async()=>window.ClassInsights?.render(state.user)||errorBox("Thống kê lớp học chưa tải"),gradeReviews:async()=>window.GradeReviews?.render(state.user)||errorBox("Duyệt sửa điểm chưa tải"),notifications,analytics,parent,teacher,admin,submissions,premium,profile,questionBank,examRooms,adminUsers,adminCenter:async()=>window.AdminCenter?.render(state.user)||errorBox("Trung tâm Admin chưa tải"),adminAlerts:async()=>window.AdminAlerts?.render(state.user)||errorBox("Cảnh báo Admin chưa tải"),adminSecurity:async()=>window.AdminSecurity?.render(state.user)||errorBox("Bảo mật Admin chưa tải"),adminBackup:async()=>window.AdminBackup?.render(state.user)||errorBox("Sao lưu Admin chưa tải"),adminIntegrity:async()=>window.AdminIntegrity?.render(state.user)||errorBox("Kiểm tra dữ liệu chưa tải"),adminResults:async()=>window.AdminResults?.render(state.user)||errorBox("Bảng điểm Admin chưa tải"),adminAudit:async()=>window.AdminAudit?.render(state.user)||errorBox("Nhật ký Admin chưa tải"),performanceMonitor:async()=>window.PerformanceMonitor?.render(state.user)||errorBox("Giám sát API chưa tải"),history:async()=>{if(state.user?.role==="admin"){await window.PerfLoader.ensureRoute("adminResults");return window.AdminResults.render(state.user)}return history()},storageHealth,leaderboard:async()=>window.StudentLeaderboard?.render()||errorBox("StudentLeaderboard chưa tải")};
  if(asyncMap[route]){
   const content=await asyncMap[route]();
   if(sequence!==renderSequence||route!==state.route)return;
   $("#content").innerHTML=content;bind()
  }else renderSync();
  window.StudentI18n?.apply?.();shell()
 }catch(e){
  if(sequence===renderSequence&&route===state.route){
   if(route==="practice"&&state.quiz?.questions?.length&&window.PracticeFallback?.mount){
    const z=state.quiz;window.PracticeFallback.mount(z,{
     onAnswer:answer=>{z.answers[z.questions[z.i].id]=answer;persistQuiz();quiz()},
     onNext:delta=>{z.i=Math.max(0,Math.min(z.questions.length-1,z.i+delta));persistQuiz();quiz()},
     onSubmit:()=>{if(confirm("Bạn chắc chắn muốn nộp bài?"))finishQuiz()}
    });
   }else window.RuntimeGuard?.renderError?.(e,route)||($("#content").innerHTML=errorBox(e.message))
  }
 }
}
function filterLessons(){const q=norm($("#lessonSearch")?.value),g=$("#gradeFilter")?.value||"",lv=$("#levelFilter")?.value||"",s=state.subjectFilter;const a=D.lessons.filter(l=>(!q||norm(l.title+" "+subj(l.subject).name+" "+(l.topic||"")).includes(q))&&(!g||String(l.grade)===g)&&(!lv||l.level===lv)&&(!s||l.subject===s));$("#lessonResults").innerHTML=a.map(lessonRow).join("")||'<div class="empty">Không tìm thấy.</div>';bind()}
function persistQuiz(){if(!state.quiz)return;localStorage.setItem("bt_quiz",JSON.stringify(state.quiz));window.OfflineSyncQueue?.saveDraft?.({kind:"quiz",quiz:state.quiz})}
function openPractice(){
 if(!state.quiz?.questions?.length)return toast("Không tìm thấy câu hỏi của bài tập.");
 if(location.hash.slice(1)!=="practice")location.hash="practice";
 else{state.route="practice";render()}
}
function startCustom(qs,title="Luyện tập cá nhân",meta={}){if(!Array.isArray(qs)||!qs.length){toast("Chưa có câu phù hợp");return}const grade=meta.grade||qs.find(q=>q.grade)?.grade||state.user?.grade||4;state.quiz={subject:meta.subject||"mixed",grade,assignmentId:null,lessonId:"",examId:meta.examId||"",durationMin:meta.time||null,customTitle:title,questions:qs.slice(0,30),i:0,answers:{},marked:[],start:Date.now()};persistQuiz();openPractice()}
function shuffleExamQuestion(q){const pairs=q.options.map((o,i)=>({o,ok:i===q.answer})).sort(()=>Math.random()-.5);return {...q,options:pairs.map(x=>x.o),answer:pairs.findIndex(x=>x.ok)}}
function startExam(examId){const t=(D.examSets||[]).find(x=>x.examId===examId),raw=D.questions.filter(q=>q.examId===examId);if(!t||raw.length!==30){toast("Đề thi chưa đủ 30 câu");return}const qs=raw.map(shuffleExamQuestion).sort(()=>Math.random()-.5);state.quiz={subject:"mixed",grade:t.grade,assignmentId:null,lessonId:"",examId,questions:qs,i:0,answers:{},marked:[],start:Date.now()};window.StudentExamProctor?.start(t.time||60);persistQuiz();openPractice()}
function startQuiz(subject,grade,assignmentId=null,lessonId=""){
 let qs=lessonId?D.questions.filter(q=>q.lessonId===lessonId):D.questions.filter(q=>q.subject===subject&&q.grade===grade);
 if(!qs.length)qs=D.questions.filter(q=>q.subject===subject&&q.grade===grade);
 if(!qs.length)qs=D.questions.filter(q=>q.subject===subject);
 if(!qs.length)qs=D.questions.slice(0,30);
 state.quiz={subject,grade,assignmentId,lessonId,questions:qs.slice(0,30),i:0,answers:{},marked:[],start:Date.now()};
 persistQuiz();openPractice()
}
function quiz(){
 const z=state.quiz;if(!z?.questions?.length){state.quiz=null;localStorage.removeItem("bt_quiz");nav("subjects");return}z.i=Math.max(0,Math.min(z.questions.length-1,Number(z.i)||0));const q=z.questions[z.i],set=z.examId?(D.examSets||[]).find(t=>t.examId===z.examId):null,timeMin=Number(set?.time||z.time||15);
 if(z.examId)window.ExamLock?.enter({title:z.customTitle||set?.title||"Bài kiểm tra"});else window.ExamLock?.exit();
 const body=`<h2>${esc(q.q)}</h2><div class="options">${q.options.map((o,i)=>`<button class="${z.answers[q.id]===i?"selected":""}" data-answer="${i}"><span>${String.fromCharCode(65+i)}</span>${esc(o)}</button>`).join("")}</div>`;
 if(!window.LockedExamUI?.render){
  window.PracticeFallback?.mount?.(z,{
   onAnswer:answer=>{z.answers[q.id]=answer;persistQuiz();quiz()},
   onNext:delta=>{z.i=Math.max(0,Math.min(z.questions.length-1,z.i+delta));persistQuiz();quiz()},
   onSubmit:()=>{if(confirm("Bạn chắc chắn muốn nộp bài?"))finishQuiz()}
  });return
 }
 $("#content").innerHTML=window.LockedExamUI.render({
  title:z.customTitle||set?.title||(z.lessonId?(D.lessons.find(l=>l.lessonId===z.lessonId)?.title||`Bài kiểm tra lớp ${z.grade}`):`Đề kiểm tra lớp ${z.grade}`),
  subject:q.subject||z.subject,grade:z.grade,index:z.i,questions:z.questions,answers:z.answers,timeMin,bodyHtml:body,typeLabel:"Trắc nghiệm"
 });
 $$("[data-answer]").forEach(b=>b.onclick=()=>{z.answers[q.id]=Number(b.dataset.answer);persistQuiz();quiz()});
 $("#lockedPrev").onclick=()=>{if(z.i>0){z.i--;persistQuiz();quiz()}};
 $("#lockedNext").onclick=()=>{if(z.i<z.questions.length-1){z.i++;persistQuiz();quiz()}};
 $("#lockedSubmit").onclick=()=>{if(confirm("Bạn chắc chắn muốn nộp bài? Sau khi nộp sẽ không thể sửa đáp án."))finishQuiz()};
 $$(".locked-qnav").forEach(b=>b.onclick=()=>{z.i=Number(b.dataset.qindex);persistQuiz();quiz()});
 if(z.examId)window.StudentExamProctor?.attach($("#timer"),()=>finishQuiz(true));
}async function finishQuiz(auto=false){const z=state.quiz;let correct=0,wrong=[];z.questions.forEach(q=>{if(z.answers[q.id]===q.answer)correct++;else wrong.push(q.id)});state.lastWrong=z.questions.filter(q=>wrong.includes(q.id)).map(q=>({id:q.id,q:q.q,options:q.options,answer:q.answer,grade:q.grade,lessonId:q.lessonId,subject:q.subject,type:q.type,topic:D.lessons.find(l=>l.lessonId===q.lessonId)?.topic||(subj(q.subject).name+" • "+(q.type||"Tổng hợp")),explain:q.explain}));window.StudentReview?.add(state.lastWrong);const score=Math.round(correct/z.questions.length*100),durationSec=Math.round((Date.now()-z.start)/1000),proctor=z.examId?window.StudentExamProctor?.stop():null;window.StudentRewards?.earn(score,correct);window.StudentMastery?.record(z.questions,z.questions.filter(q=>z.answers[q.id]===q.answer).map(q=>q.id));const r={...(window.ResultAccount?.fromUser?.(state.user)||{}),id:Date.now(),title:z.customTitle||z.examId?((z.customTitle)||((D.examSets||[]).find(t=>t.examId===z.examId)?.title||`Đề tổng hợp lớp ${z.grade}`)):z.lessonId?(D.lessons.find(l=>l.lessonId===z.lessonId)?.title||`${subj(z.subject).name} lớp ${z.grade}`):`${subj(z.subject).name} lớp ${z.grade}`,subject:z.subject,grade:z.grade,correct,total:z.questions.length,score,points:correct*10,durationSec,date:new Date().toLocaleDateString("vi-VN"),isoDate:new Date().toISOString(),proctor};state.results.push(r);saveLocal();if(state.user?.role==="student"){try{r.clientSubmissionId=window.OfflineSyncQueue?.enqueueResult?.({...r,wrongQuestionIds:wrong});await window.OfflineSyncQueue?.flush?.();if(z.assignmentId)await API.post("/api/assignments/"+z.assignmentId+"/submit",{answers:z.answers,score})}catch(e){toast("Đã lưu local; sẽ tự đồng bộ khi có mạng")}}window.ExamLock?.exit();$("#content").innerHTML=`<section class="result-card"><div class="score-ring"><b>${score}%</b><span>${correct}/${z.questions.length} đúng</span></div><h1>${auto?"Hết giờ – bài đã tự nộp ⏰":score>=80?"Xuất sắc 🎉":score>=50?"Làm tốt 👍":"Ôn thêm nhé 💪"}</h1><div class="result-review">${z.questions.map((q,i)=>`<div class="review ${z.answers[q.id]===q.answer?"":"bad"}"><b>Câu ${i+1}: ${esc(q.q)}</b><p>Đáp án đúng: ${esc(q.options[q.answer])}</p><small>💡 ${esc(q.explain||"")}</small></div>`).join("")}</div><div class="quiz-actions"><button class="outline" id="analyzeWrong">🤖 AI phân tích câu sai</button><button class="outline" id="similarWrong">🔁 5 câu tương tự</button><button class="primary" id="goHistory">Xem kết quả</button></div><div id="wrongAnalysis"></div></section>`;$("#goHistory").onclick=()=>nav("history");$("#similarWrong").onclick=()=>{const src=z.questions.find(q=>wrong.includes(q.id));if(!src)return toast("Không có câu sai");startCustom(window.StudentAdaptive?.similar(src,5)||[],"5 câu tương tự")};$("#analyzeWrong").onclick=async()=>{const box=$("#wrongAnalysis");if(!state.lastWrong.length){box.innerHTML="<div class=\"panel\"><h3>🎉 Không có câu sai</h3><p>Em đã làm đúng toàn bộ bài này.</p></div>";return}if(!state.user){box.innerHTML="<div class=\"panel\"><p>Đăng nhập để AI lưu và phân tích lỗi sai theo tiến độ của em.</p></div>";return}box.innerHTML="<div class=\"panel\">Đang phân tích...</div>";try{const j=await API.post("/api/ai/analyze-wrong",{grade:z.grade,lessonId:z.lessonId,items:state.lastWrong});box.innerHTML=`<div class="panel"><h3>🎯 Chủ đề cần ôn: ${esc(j.weakTopic||"Toán")}</h3><p>${esc(j.summary||"")}</p>${j.ai?`<p>${esc(j.ai)}</p>`:""}<ol>${(j.plan||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ol></div>`}catch(e){box.innerHTML=`<div class="panel"><p>${esc(e.message)}</p></div>`}};state.quiz=null;localStorage.removeItem("bt_quiz");window.OfflineSyncQueue?.clearDraft?.()}
function openAuth(){return window.AuthUI?.open("login")}
function bind(){
 if(state.route==="teacher")window.TeacherOverview?.bind?.();
 bindAdminPresence();
 // Open immediately on mobile while preserving the direct-link fallback.
 const registerLink=$("#registerBtn");
 if(registerLink)registerLink.addEventListener("click",e=>{
  if(!window.AuthUI?.open)return;
  e.preventDefault();
  window.AuthUI.open("register");
 });
 window.PerfLists?.bind?.(state.route,render);
 if(state.route==="adminUsers"){
  for(const [selector,key] of [["#adminUsersRoleFilter","role"],["#adminUsersStatusFilter","accountStatus"]]){
   $(selector)?.addEventListener("change",e=>{
    const f=window.PerfLists.state("adminUsers");f[key]=e.currentTarget.value;f.page=1;render();
   });
  }
  $("#adminUsersResetFilters")?.addEventListener("click",()=>{
   const f=window.PerfLists.state("adminUsers");f.role="";f.accountStatus="";f.search="";f.page=1;render();
  });
  $$("[data-users-summary-role]").forEach(button=>button.addEventListener("click",()=>{
   const f=window.PerfLists.state("adminUsers"),role=button.dataset.usersSummaryRole;
   f.role=f.role===role?"":role;f.page=1;render();
  }));
  $$("[data-users-summary-status]").forEach(button=>button.addEventListener("click",()=>{
   const f=window.PerfLists.state("adminUsers"),status=button.dataset.usersSummaryStatus;
   f.accountStatus=f.accountStatus===status?"":status;f.page=1;render();
  }));
 }
 if(state.route==="performanceMonitor")window.PerformanceMonitor?.bind?.();
 if(state.route==="history"&&state.user?.role!=="admin"&&state.results.length>250){
  const rows=[...state.results].reverse();
  window.VirtualList?.mount?.($("#historyVirtualScroll"),{items:rows,rowHeight:75,renderRow:r=>
   '<div class="virtual-history-row" role="listitem"><span><strong>'+esc(r.title||"Bài tập")+'</strong><small>'+esc(window.ResultAccount?.describe?.(r)?.name||"Chưa xác định")+'</small></span><span>'+esc(subj(r.subject).name)+'</span><b>'+Number(r.score||0)+'%</b><small>'+esc(r.date||"")+'</small></div>'
  });
 }

 $("#historyPrev")?.addEventListener("click",()=>{state.historyPage=Math.max(1,state.historyPage-1);render()});
 $("#historyNext")?.addEventListener("click",()=>{state.historyPage++;render()});
 if(state.route==="adminResults"||(state.route==="history"&&state.user?.role==="admin"))window.AdminResults?.bind(toast,render);
 if(state.route==="adminAudit")window.AdminAudit?.bind(toast,render);
 if(state.route==="adminCenter")window.AdminCenter?.bind(render);
 if(state.route==="adminAlerts")window.AdminAlerts?.bind(render);
 if(state.route==="adminSecurity")window.AdminSecurity?.bind(render);
 if(state.route==="adminBackup")window.AdminBackup?.bind(render);
 if(state.route==="adminIntegrity")window.AdminIntegrity?.bind(render);
 if(state.route==="classInsights")window.ClassInsights?.bind(render);
 if(state.route==="gradeReviews")window.GradeReviews?.bind(toast,render);
 if(state.route==="submissions"){
  $$("[data-grade-toggle]").forEach(btn=>btn.addEventListener("click",()=>{
   const form=$$("[data-grade-form]").find(f=>f.dataset.gradeForm===btn.dataset.gradeToggle);
   if(!form)return;form.hidden=!form.hidden;btn.setAttribute("aria-expanded",String(!form.hidden));
  }));
  $$("[data-grade-form]").forEach(form=>form.addEventListener("submit",async e=>{
   e.preventDefault();const submit=form.querySelector('button[type="submit"]');
   const d=Object.fromEntries(new FormData(form)),graded=form.dataset.graded==="1";
   submit.disabled=true;
   try{
    if(graded)await API.post("/api/grade-reviews",{submissionId:form.dataset.gradeForm,newScore:Number(d.score),reason:d.reason});
    else await API.patch("/api/submissions/"+encodeURIComponent(form.dataset.gradeForm)+"/grade",{score:Number(d.score),feedback:d.feedback||""});
    toast(graded?"Đã gửi yêu cầu, chờ Admin duyệt.":"Đã lưu điểm lần đầu.");await render();
   }catch(error){toast(error.message||"Không lưu được điểm");submit.disabled=false}
  }));
 }
 $$("[data-route]").forEach(x=>x.onclick=()=>nav(x.dataset.route));$$("[data-subject]").forEach(x=>x.onclick=()=>{state.subjectFilter=x.dataset.subject;nav("subjects")});$$("[data-fav]").forEach(x=>x.onclick=()=>{const id=Number(x.dataset.fav);state.favorites=state.favorites.includes(id)?state.favorites.filter(a=>a!==id):[...state.favorites,id];saveLocal();render()});$$("[data-start]").forEach(x=>x.onclick=()=>startQuiz(x.dataset.start,Number(x.dataset.grade),null,x.dataset.lesson||""));$("#openLogin")?.addEventListener("click",openAuth);
 if(state.route==="tests")window.TermExamBank?.bind?.(startCustom);
 $("#globalSearchBtn")?.addEventListener("click",()=>{const q=$("#globalSearch").value;nav("subjects");setTimeout(()=>{$("#lessonSearch").value=q;filterLessons()},20)});$$(".quick-grades [data-grade]").forEach(x=>x.onclick=()=>{nav("subjects");setTimeout(()=>{$("#gradeFilter").value=x.dataset.grade;filterLessons()},20)});
 ["lessonSearch","gradeFilter","levelFilter"].forEach(id=>$("#"+id)?.addEventListener("input",filterLessons));$("#examGradeFilter")?.addEventListener("change",e=>{$$(".exam-card").forEach(c=>c.style.display=!e.target.value||c.dataset.examGrade===e.target.value?"":"none")});$$("[data-filter-subject]").forEach(x=>x.onclick=()=>{state.subjectFilter=x.dataset.filterSubject;filterLessons()});
 $("#classForm")?.addEventListener("submit",async e=>{e.preventDefault();try{await API.post("/api/classes",Object.fromEntries(new FormData(e.currentTarget)));toast("Đã tạo lớp");render()}catch(x){toast(x.message)}});
 $("#joinClassForm")?.addEventListener("submit",async e=>{e.preventDefault();try{await API.post("/api/classes/join",Object.fromEntries(new FormData(e.currentTarget)));toast("Đã tham gia lớp");render()}catch(x){toast(x.message)}});
 $("#assignmentForm")?.addEventListener("submit",async e=>{e.preventDefault();try{await API.post("/api/assignments",Object.fromEntries(new FormData(e.currentTarget)));toast("Đã giao bài");render()}catch(x){toast(x.message)}});
 $$("[data-submit-assignment]").forEach(x=>x.onclick=()=>startQuiz(x.dataset.assignmentSubject,state.user?.grade||1,x.dataset.submitAssignment,x.dataset.lesson||""));
 if(state.route==="materials")window.TeacherMaterialStorage?.bind(toast,()=>render());
 if(state.route==="premium")window.DemoWallet?.bind?.();
 if(state.route==="profile")window.ProfilePage?.bind?.(toast,render);
 $("#aiForm")?.addEventListener("submit",async e=>{e.preventDefault();const t=$("#aiInput").value.trim();if(!t)return;const box=$("#chatBox");box.innerHTML+=`<div class="msg user">${esc(t)}</div>`;$("#aiInput").value="";try{const j=await API.post("/api/ai",{prompt:t});box.innerHTML+=`<div class="msg bot">${esc(j.answer)}</div>`}catch(x){box.innerHTML+=`<div class="msg bot">⚠️ ${esc(x.message)}</div>`}box.scrollTop=box.scrollHeight});$$("[data-prompt]").forEach(x=>x.onclick=()=>{$("#aiInput").value=x.dataset.prompt;$("#aiForm").requestSubmit()});
 $("#verifyEmail")?.addEventListener("click",async()=>{try{const j=await API.post("/api/verify-email",{});state.user=j.user;toast("Đã xác minh");render()}catch(x){toast(x.message)}});

 $("#exportXlsx")?.addEventListener("click",()=>downloadProtected("/api/export/results.xlsx","ket-qua-hoc-tap.xlsx"));
 $("#exportPdf")?.addEventListener("click",()=>downloadProtected("/api/export/results.pdf","ket-qua-hoc-tap.pdf"));
 $("#importQuestionForm")?.addEventListener("submit",e=>{e.preventDefault();const f=$("#questionFile").files[0];if(!f)return;if(!/\.(xlsx|xls|csv)$/i.test(f.name)){alert("File "+f.name+" là định dạng không hỗ trợ. Vui lòng chọn Excel (.xlsx, .xls) hoặc CSV (.csv). File Word (.docx) cần chuyển sang bảng Excel trước.");$("#questionFile").value="";return;}const rd=new FileReader();rd.onload=async()=>{try{const j=await API.post("/api/questions/import-excel",{filename:f.name,dataUrl:rd.result});toast("Đã import "+j.count+" câu");render()}catch(x){toast(x.message)}};rd.readAsDataURL(f)});
 $("#examRoomForm")?.addEventListener("submit",async e=>{e.preventDefault();try{const d=Object.fromEntries(new FormData(e.currentTarget));await API.post("/api/exam-rooms",d);toast("Đã tạo phòng thi");render()}catch(x){toast(x.message)}});
 $("#joinExamForm")?.addEventListener("submit",async e=>{e.preventDefault();try{const j=await API.post("/api/exam-rooms/join",Object.fromEntries(new FormData(e.currentTarget)));toast("Đã vào phòng "+j.room.code);startQuiz("math",j.room.grade,null,j.room.lessonId)}catch(x){toast(x.message)}});
 $$("[data-room-start]").forEach(b=>b.onclick=()=>startQuiz("math",Number(b.dataset.roomGrade),null,b.dataset.roomStart));
 document.querySelectorAll("[data-user-devices]").forEach(b=>b.addEventListener("click",()=>{
  if(state.user?.role!=="admin")return;
  const id=b.dataset.userDevices;
  if(!id||id.length>128)return;
  window.AdminDeviceAccountFocus={userId:id};
  nav("adminSecurity");
 }));
 document.querySelectorAll("[data-user-save]").forEach(b=>b.onclick=async()=>{
   const select=$('[data-user-role="'+b.dataset.userSave+'"]');
   if(!select)return;
   const role=select.value,was=select.dataset.currentRole;
   if(role===was){toast("Vai trò chưa thay đổi");return}
   const promoting=role==="admin"&&was!=="admin";
   if(promoting&&select.dataset.canGrantAdmin!=="1"){toast("Chỉ Admin chính mới được cấp quyền quản trị viên.");return}
   if(promoting&&!confirm("Cấp quyền Admin cho "+select.dataset.userEmail+"? Người này sẽ có toàn quyền quản trị."))return;
   b.disabled=true;
   try{
    if(promoting){
     const result=await API.post("/api/admin/grant-admin",{email:select.dataset.userEmail});
     toast(result.message||"Đã cấp quyền Admin");
    }else{
     await API.patch("/api/admin/users/"+encodeURIComponent(b.dataset.userSave),{role});
     toast("Đã lưu vai trò thành công");
    }
    await render();
   }catch(x){toast(x.message||"Không lưu được vai trò")}
   finally{b.disabled=false}
 });
 $$("[data-user-lock]").forEach(b=>b.onclick=async()=>{
   const locked=b.dataset.locked==="1",email=b.dataset.userEmail||"tài khoản";
   if(!confirm((locked?"Mở khóa":"Khóa")+" tài khoản "+email+"? "+(locked?"Người dùng sẽ được phép truy cập trở lại.":"Người dùng sẽ bị chặn truy cập các API ngay lập tức.")))return;
   let reason="";
   if(!locked){const answer=prompt("Lý do khóa "+email+" (tối đa 250 ký tự):","Vi phạm quy định sử dụng");if(answer===null)return;reason=answer.trim();if(!reason||reason.length>250){toast("Vui lòng nhập lý do tối đa 250 ký tự");return}}
   b.disabled=true;
   try{await API.patch("/api/admin/users/"+encodeURIComponent(b.dataset.userLock),{locked:!locked,...(!locked?{reason}:{})});toast(locked?"Đã mở khóa tài khoản":"Đã khóa tài khoản");render()}catch(x){toast(x.message);b.disabled=false}
 });
 $("#grantAdminForm")?.addEventListener("submit",async e=>{e.preventDefault();const email=String(new FormData(e.currentTarget).get("email")||"").trim();if(!confirm("Cấp quyền Admin cho "+email+"? Người này sẽ có quyền quản trị hệ thống."))return;try{const j=await API.post("/api/admin/grant-admin",{email});alert(j.message||"Đã cấp quyền Admin");render()}catch(x){alert(x.message||"Không thể cấp quyền Admin")}});
 $("#migrateDb")?.addEventListener("click",async()=>{try{const j=await API.post("/api/storage/migrate",{});toast(j.postgres?"Migration thành công":"Chưa cấu hình DATABASE_URL");render()}catch(x){toast(x.message)}});
 $("#enablePush")?.addEventListener("click",async()=>{try{if(!("serviceWorker" in navigator)||!("PushManager" in window))throw new Error("Trình duyệt không hỗ trợ Web Push");const key=await API.get("/api/push/public-key"),reg=await navigator.serviceWorker.ready,perm=await Notification.requestPermission();if(perm!=="granted")throw new Error("Bạn chưa cho phép thông báo");const raw=atob(key.publicKey.replace(/-/g,"+").replace(/_/g,"/")),arr=Uint8Array.from([...raw].map(c=>c.charCodeAt(0))),sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:arr});await API.post("/api/push/subscribe",{subscription:sub});toast("Đã bật Web Push")}catch(x){toast(x.message)}});

 $("#setup2fa")?.addEventListener("click",async()=>{try{const j=await API.post("/api/2fa/setup",{});$("#twofaInfo").innerHTML="<p>Secret: <code>"+esc(j.secret)+"</code></p><p>Thêm secret này vào ứng dụng Authenticator, sau đó nhập mã 6 số:</p><div class='chat-input'><input id='twofaCode' maxlength='6' inputmode='numeric'><button class='primary' id='enable2fa'>Bật 2FA</button></div>";$("#enable2fa").onclick=async()=>{try{await API.post("/api/2fa/enable",{code:$("#twofaCode").value});toast("Đã bật 2FA")}catch(x){toast(x.message)}}}catch(x){toast(x.message)}});

 $("#profileAvatarInput")?.addEventListener("change",async e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>8*1024*1024){toast("Chọn ảnh JPG, PNG hoặc WebP dưới 8 MB");return}
  try{
   const picture=await createImageBitmap(file);
   const canvas=document.createElement("canvas");const dim=256;canvas.width=dim;canvas.height=dim;
   const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Không thể xử lý ảnh");
   const scale=Math.max(dim/picture.width,dim/picture.height);const w=picture.width*scale,h=picture.height*scale;
   ctx.drawImage(picture,(dim-w)/2,(dim-h)/2,w,h);picture.close?.();
   const dataUrl=canvas.toDataURL("image/jpeg",0.78);
   localStorage.setItem(avatarKey(state.user),dataUrl);
   let message="Đã đổi ảnh trên thiết bị này";
   if(window.SupabaseApp?.enabled?.()&&window.SupabaseStorage?.avatar){
    try{
     const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",0.78));
     if(!blob)throw new Error("Không tạo được ảnh JPEG");
     const uploaded=await window.SupabaseStorage.avatar(new File([blob],"avatar.jpg",{type:"image/jpeg"}));
     await API.patch("/api/profile/avatar",{path:uploaded.path});
     if(state.user){state.user.avatarUrl=uploaded.url;state.user.avatarPath=uploaded.path}
     message="Đã đồng bộ ảnh đại diện trên Supabase";
    }catch(uploadError){console.warn("Đồng bộ avatar chưa thành công",uploadError?.message||uploadError);message="Ảnh đã lưu trên máy; Supabase chưa đồng bộ: "+(uploadError?.message||"lỗi kết nối")}
   }
   shell();render();toast(message);
  }catch(err){toast("Không xử lý được ảnh, hãy thử ảnh JPG nhỏ hơn")}
 });
 const studentRerender=()=>render();
 if(state.route==="goals")window.StudentGoals?.bind(toast);
 if(state.route==="formulas")window.StudentFormulas?.bind();
 if(state.route==="vocab")window.StudentVocab?.bind(toast,studentRerender);
 if(state.route==="accessibility")window.StudentAccessibility?.bind();
 if(state.route==="notes")window.StudentNotes?.bind(toast,studentRerender);
 if(state.route==="wrongReview")window.StudentReview?.bind(startCustom,toast,studentRerender);
 if(state.route==="quickPractice")window.StudentQuickPractice?.bind(startCustom);
 if(state.route==="languageLab")window.StudentLanguage?.bind(toast);
 if(state.route==="adaptive")window.StudentAdaptive?.bind(startCustom);
 if(state.route==="speech")window.StudentSpeech?.bind(toast);
 if(state.route==="schedule")window.StudentSchedule?.bind(toast,studentRerender);
 if(state.route==="worksheet")window.StudentWorksheet?.bind();
 if(state.route==="bookmarks")window.StudentBookmarks?.bind(startCustom,studentRerender);
 if(state.route==="prepPlan")window.StudentPrepPlan?.bind();
 if(state.route==="writing")window.StudentWriting?.bind(toast);
 if(state.route==="handwriting")window.StudentHandwriting?.bind(toast);
 if(state.route==="sync")window.StudentSync?.bind(toast);
 if(state.route==="targetScore")window.StudentTargetScore?.bind(startCustom);
 if(state.route==="topics")window.StudentTopics?.bind(startCustom);
 if(state.route==="mathWork")window.StudentMathWork?.bind();
 if(state.route==="targetScore")window.StudentTargetScore?.bind(startCustom);
 if(state.route==="topics")window.StudentTopics?.bind(startCustom);
 if(state.route==="mathWork")window.StudentMathWork?.bind();
 window.StudentAccessibility?.apply?.();
 shell()
}
$("#retryRoleSync")?.addEventListener("click",async e=>{
 const button=e.currentTarget;button.disabled=true;
 try{
  const sess=await window.SupabaseApp?.session?.();
  if(!sess)throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  const u=await window.SupabaseApp.sync(sess);
  if(!u)throw new Error("Chưa nhận được hồ sơ tài khoản.");
  window.AppAuthBridge.setUser(u);
  toast("Đã đồng bộ quyền tài khoản");
 }catch(err){toast(err.message||"Không đồng bộ được tài khoản")}
 finally{button.disabled=false}
});
$("#menuBtn")?.addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#themeBtn")?.addEventListener("click",()=>{state.theme=state.theme==="light"?"dark":"light";document.documentElement.dataset.theme=state.theme;localStorage.setItem("bt_theme",state.theme)});
$("#authBtn")?.addEventListener("click",async()=>{if(state.user){await window.AuthUI?.logout();state.user=null;window.OfflineSyncQueue?.setOwner?.(null);nav("home")}else openAuth()});
window.addEventListener("hashchange",()=>{if(window.ExamLock?.isActive?.()&&!state.quiz)window.ExamLock.exit();if(window.ExamLock?.isActive?.()){window.ExamLock.restoreRoute();return}const next=location.hash.slice(1)||"home";if(!(next==="practice"&&state.quiz?.questions?.length))window.PerfLoader?.cleanupRoute?.();state.route=next;render();window.PerfLoader?.prefetch?.(state.route==="home"?"tests":"home")});
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
const qp=new URLSearchParams(location.search);if(qp.get("auth_token")){API.setToken(qp.get("auth_token"));history.replaceState(null,"",location.pathname+location.hash)}const savedQuiz=localStorage.getItem("bt_quiz");if(savedQuiz){try{state.quiz=JSON.parse(savedQuiz)}catch{}}window.AuthUI?.setBridge(window.AppAuthBridge);
// Display the requested page immediately, even if authentication services are slow.
render();
if(qp.get("auth")==="register"||qp.get("auth")==="login"){
 const authMode=qp.get("auth");
 history.replaceState(null,"",location.pathname+(location.hash||""));
 Promise.resolve().then(()=>window.AuthUI?.open(authMode)).catch(e=>{console.error("Cannot open registration",e);const m=document.querySelector("#toast");if(m)m.textContent="Không mở được biểu mẫu đăng ký. Vui lòng tải lại trang."});
}
(async()=>{try{await window.SupabaseApp?.init(u=>{const before=state.user?.role;state.user=u;window.OfflineSyncQueue?.setOwner?.(u);shell();if(before!==u?.role&&(!u||!u.pendingProfile))render()})}catch{}if(!state.user)await restore();window.OfflineSyncQueue?.setOwner?.(state.user);shell();if(state.user&&!state.user.pendingProfile)render()})();
})();