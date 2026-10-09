(()=>{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],D=window.APP_DATA||{subjects:[],lessons:[],questions:[],tests:[],materials:[]};
const state={user:null,route:location.hash.slice(1)||"home",theme:localStorage.getItem("bt_theme")||"light",results:JSON.parse(localStorage.getItem("bt_results")||"[]"),favorites:JSON.parse(localStorage.getItem("bt_favs")||"[]"),quiz:null,lastWrong:[]};
let renderSequence=0;
window.AppAuthBridge={setUser(u){state.user=u;render()},toast,render};
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
function shell(){const u=state.user;$("#sideName").textContent=u?.name||"Khách";$("#sideRole").textContent=u?({student:"Học sinh",parent:"Phụ huynh",teacher:"Giáo viên",admin:"Quản trị viên"}[u.role]||u.role):"Học sinh";$("#sideAvatar").textContent=u?.avatar||"👧🏻";$("#authBtn").textContent=u?"Đăng xuất":"Đăng nhập";const rb=$("#registerBtn");if(rb)rb.hidden=!!u;$$(".admin-only").forEach(x=>x.style.display=u?.role==="admin"?"flex":"none");$$(".teacher-only").forEach(x=>x.style.display=["teacher","admin"].includes(u?.role)?"flex":"none")}
function pageHead(k,t,p=""){return `<section class="page-head"><span class="eyebrow">${k}</span><h1>${t}</h1><p>${p}</p></section>`}
function hero(){return `<section class="hero"><div class="hero-copy"><span class="pill">✨ HỌC VUI MỖI NGÀY</span><h1>Bài Tập <em>Cấp 1</em></h1><h2>Học vui – Luyện giỏi – Tiến bộ mỗi ngày</h2><p>Học theo lớp, làm bài, xem tiến bộ, tham gia lớp của giáo viên và nhận gợi ý học tập cá nhân.</p><div class="hero-search"><input id="globalSearch" placeholder="Tìm bài học, môn học, tài liệu..."><button id="globalSearchBtn">Tìm kiếm</button></div><div class="quick-grades">${[1,2,3,4,5].map(g=>`<button data-grade="${g}">Lớp ${g}</button>`).join("")}</div></div><div class="hero-art"><div class="bubble">⭐ Học mỗi ngày</div><div class="big-kid">👧🏻📚</div><div class="bubble second">🏆 Tiến bộ</div></div></section>`}
function lessonRow(l){const s=subj(l.subject),fav=state.favorites.includes(l.id);return `<div class="lesson-row"><div class="lesson-ico">${s.icon}</div><div class="grow"><b>${esc(l.title)}</b><small>${s.name} • Lớp ${l.grade} • ${l.topic||""} • ${l.level||""}</small></div><button class="heart" data-fav="${l.id}">${fav?"❤️":"🤍"}</button><button class="outline small" data-start="${l.subject}" data-grade="${l.grade}" data-lesson="${l.lessonId||""}">Luyện tập</button></div>`}
function mathFocus(){const a=D.lessons.filter(l=>l.subject==="math"&&[4,5].includes(l.grade)&&l.lessonId);return `<section class="section"><div class="section-head"><div><span class="eyebrow">TRỌNG TÂM LỚP 4–5</span><h2>🧮 Toán 30 câu mỗi bài</h2></div><button class="link-btn" data-route="examRooms">Phòng thi →</button></div><div class="cards-3">${a.map(l=>`<article class="test-card"><div class="test-top"><span class="subject-icon mini pink">➗</span><span class="badge">Lớp ${l.grade}</span></div><h3>${esc(l.title)}</h3><p>${esc(l.desc||l.topic||"")}</p><div class="test-meta"><span>❓ 30 câu</span><span>💡 Có giải thích</span></div><button class="primary full" data-start="math" data-grade="${l.grade}" data-lesson="${l.lessonId}">Làm 30 câu</button></article>`).join("")}</div></section>`}
function home(){const avg=state.results.length?Math.round(state.results.reduce((a,b)=>a+b.score,0)/state.results.length):0;return hero()+mathFocus()+`<section class="metrics">${metric("📝",state.results.length,"Bài đã làm")}${metric("🎯",avg+"%","Điểm trung bình")}${metric("❤️",state.favorites.length,"Bài đã lưu")}${metric("🔥","3","Ngày liên tiếp")}</section><section class="section"><div class="section-head"><div><span class="eyebrow">KHÁM PHÁ</span><h2>Môn học nổi bật</h2></div></div><div class="subject-grid">${D.subjects.map(s=>`<article class="subject-card ${s.color}"><div class="subject-icon">${s.icon}</div><h3>${s.name}</h3><p>${s.desc||""}</p><button class="primary small" data-subject="${s.id}">Xem bài tập →</button></article>`).join("")}</div></section><section class="section split"><div><div class="section-head"><h2>⭐ Bài tập mới</h2></div><div class="list-card">${D.lessons.slice(0,6).map(lessonRow).join("")}</div></div><div class="panel"><h3>⚡ Truy cập nhanh</h3><div class="admin-actions"><button class="outline" data-route="classes">🏫 Lớp học</button><button class="outline" data-route="assignments">📌 Bài được giao</button><button class="outline" data-route="analytics">📊 Phân tích</button><button class="outline" data-route="notifications">🔔 Thông báo</button><button class="outline" data-route="liveClassroom">📡 Live Classroom</button><button class="outline" data-route="submissions">📨 Chấm bài</button></div></div></section>`}
function subjects(){return pageHead("THƯ VIỆN","Môn học & bài tập","Tìm không dấu, lọc theo lớp/môn/mức độ.")+`<section class="filterbar"><input id="lessonSearch" placeholder="🔎 Tìm bài..."><select id="gradeFilter"><option value="">Tất cả lớp</option>${[1,2,3,4,5].map(g=>`<option>${g}</option>`).join("")}</select><select id="levelFilter"><option value="">Mọi mức độ</option><option>Dễ</option><option>Trung bình</option><option>Khó</option></select></section><section class="subject-grid compact">${D.subjects.map(s=>`<button class="subject-filter ${s.color}" data-filter-subject="${s.id}"><span>${s.icon}</span><b>${s.name}</b></button>`).join("")}</section><div id="lessonResults" class="list-card">${D.lessons.map(lessonRow).join("")}</div>`}
function tests(){const exams=D.examSets||[];return pageHead("KIỂM TRA","40 đề tổng hợp lớp 4–5","Mỗi đề 30 câu: 10 Toán + 10 Tiếng Việt + 10 Tiếng Anh, thời gian 60 phút.")+`<div class="metrics">${metric("🧮",400,"Câu Toán")}${metric("📖",400,"Câu Tiếng Việt")}${metric("ABC",400,"Câu Tiếng Anh")}${metric("📝",40,"Đề tổng hợp")}</div><div class="filterbar"><select id="examGradeFilter"><option value="">Cả lớp 4 & 5</option><option value="4">Lớp 4</option><option value="5">Lớp 5</option></select></div><div id="examGrid" class="cards-3">${exams.map(t=>`<article class="test-card exam-card" data-exam-grade="${t.grade}"><div class="test-top"><span class="subject-icon mini blue">📝</span><span class="badge">Lớp ${t.grade}</span></div><h3>${esc(t.title)}</h3><p>Toán 10 • Tiếng Việt 10 • Tiếng Anh 10</p><div class="test-meta"><span>⏱ 60 phút</span><span>❓ 30 câu</span></div><button class="primary full" data-exam="${t.examId}">Bắt đầu đề</button></article>`).join("")}</div>`}
function materials(){return pageHead("TÀI LIỆU","Kho tài liệu","Giáo viên/Admin có thể tải PDF, ảnh và audio lên backend.")+`<div class="panel teacher-only"><h3>⬆️ Upload tài liệu</h3><form id="uploadForm" class="stack"><label>Tiêu đề<input name="title" required></label><label>File<input id="uploadFile" type="file" accept=".pdf,image/png,image/jpeg,audio/mpeg,audio/wav" required></label><button class="primary">Tải lên</button></form></div><div class="list-card" id="materialList">${D.materials.map(m=>`<div class="material-row"><div class="pdf">PDF</div><div class="grow"><b>${esc(m.title)}</b><small>${m.subject||""} • Lớp ${m.grade||""} • ${m.size||""}</small></div><button class="outline">Xem</button></div>`).join("")}</div>`}
function favorites(){const a=D.lessons.filter(x=>state.favorites.includes(x.id));return pageHead("ĐÃ LƯU","Yêu thích")+`<div class="list-card">${a.length?a.map(lessonRow).join(""):'<div class="empty">Chưa có bài yêu thích.</div>'}</div>`}
function history(){const a=[...state.results].reverse(),avg=a.length?Math.round(a.reduce((x,y)=>x+y.score,0)/a.length):0;return pageHead("TIẾN ĐỘ","Kết quả học tập","Xuất báo cáo Excel/PDF khi đã đăng nhập.")+`<div class="panel"><button class="outline" id="exportXlsx">📊 Xuất Excel</button> <button class="outline" id="exportPdf">📄 Xuất PDF</button></div>`+`<div class="metrics">${metric("📝",a.length,"Lượt làm")}${metric("🎯",avg+"%","Trung bình")}${metric("⭐",a.reduce((x,y)=>x+(y.points||0),0),"Điểm thưởng")}${metric("⏱",Math.round(a.reduce((x,y)=>x+(y.durationSec||0),0)/60)+"p","Thời gian")}</div><div class="panel"><div class="table-wrap"><table><thead><tr><th>Bài</th><th>Môn</th><th>Điểm</th><th>Ngày</th></tr></thead><tbody>${a.map(r=>`<tr><td>${esc(r.title)}</td><td>${subj(r.subject).name}</td><td><b>${r.score}%</b></td><td>${r.date||""}</td></tr>`).join("")||'<tr><td colspan="4">Chưa có dữ liệu.</td></tr>'}</tbody></table></div></div>`}
async function analytics(){if(!state.user)return loginRequired("Đăng nhập để xem phân tích.");let j;try{j=await API.get("/api/analytics")}catch(e){return errorBox(e.message)}return pageHead("PHÂN TÍCH","Điểm mạnh & điểm cần ôn","Dữ liệu tính từ kết quả đã lưu trên server.")+`<div class="metrics">${metric("📝",j.totalAttempts,"Lượt làm")}${metric("🎯",j.average+"%","Trung bình")}${metric("⏱",j.totalMinutes,"Phút học")}${metric("💡",j.weakest?.name||"—","Môn cần ôn")}</div><div class="panel"><h3>Theo môn</h3>${j.subjects.map(s=>`<div class="simple-row"><span>${subj(s.id).icon}</span><div class="grow"><b>${s.name}</b><small>${s.attempts} lượt • ${s.wrong} câu sai</small></div><strong>${s.avg}%</strong></div>`).join("")||"<p>Chưa có dữ liệu.</p>"}</div>`}
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
 <div class="panel"><h3>📥 Import Excel/CSV</h3><p class="muted">Cột hỗ trợ: grade, lessonId, level, q, A, B, C, D, answer, explain.</p><form id="importQuestionForm" class="stack"><input id="questionFile" type="file" accept=".xlsx,.xls,.csv" required><button class="primary">Import câu hỏi</button></form></div>
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
async function adminUsers(){
 if(state.user?.role!=="admin")return loginRequired("Chỉ Admin được quản lý tài khoản.");
 let j;try{j=await window.PerfLists.get("adminUsers","/api/admin/users")}catch(e){return errorBox(e.message)}
 return pageHead("QUẢN LÝ USER","Tài khoản hệ thống","Khóa/mở tài khoản và đổi vai trò.")+
 `${window.PerfLists.controls("adminUsers",j.pagination,{placeholder:"Tìm tên, email, vai trò..."})}<div class="panel"><div class="table-wrap"><table><thead><tr><th>Tên</th><th>Email</th><th>Vai trò</th><th>Lớp</th><th>Trạng thái</th><th></th></tr></thead><tbody>${j.users.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td><select data-user-role="${u.id}">${["student","parent","teacher","admin"].map(r=>`<option ${r===u.role?"selected":""}>${r}</option>`).join("")}</select></td><td>${u.grade||"—"}</td><td>${u.locked?"🔒 Khóa":"✅ Hoạt động"}</td><td><button class="outline small" data-user-save="${u.id}" data-locked="${u.locked?"1":"0"}">${u.locked?"Mở khóa":"Lưu & khóa?"}</button></td></tr>`).join("")}</tbody></table></div></div>`
}
async function storageHealth(){
 if(state.user?.role!=="admin")return loginRequired("Chỉ Admin.");
 let j;try{j=await API.get("/api/storage/health")}catch(e){return errorBox(e.message)}
 return pageHead("HẠ TẦNG","PostgreSQL & Redis","Khi có DATABASE_URL/REDIS_URL, hệ thống dùng adapter thật.")+
 `<div class="metrics">${metric("🐘",j.postgres.enabled?"ON":"OFF","PostgreSQL")}${metric("🔴",j.redis.enabled?"ON":"OFF","Redis session")}${metric("🧪",j.postgres.error?"Lỗi":"OK","Postgres health")}${metric("⚡",j.redis.error?"Lỗi":"OK","Redis health")}</div><div class="panel"><pre>${esc(JSON.stringify(j,null,2))}</pre><button class="primary" id="migrateDb">Chạy migration PostgreSQL</button></div>`
}
function ai(){return pageHead("TRỢ GIẢNG","🤖 AI học tập","Khi server được cấu hình AI_API_URL/API_KEY, câu hỏi sẽ gửi đến provider thật.")+`<div class="ai-layout"><div class="chat-card"><div class="chat-box" id="chatBox"><div class="msg bot">Chào em! Cô sẽ hướng dẫn từng bước. Em hỏi bài nhé.</div></div><form id="aiForm" class="chat-input"><input id="aiInput" placeholder="Ví dụ: Giải thích phân số 1/2"><button class="primary">Gửi</button></form></div><div class="panel"><h3>Gợi ý</h3>${["Giải thích phép nhân lớp 4 từng bước","Hướng dẫn phép chia lớp 4","Cách quy đồng hai phân số","Công thức hình tam giác, hình thang, hình tròn","Giải thích thể tích hình hộp lớp 5"].map(x=>`<button class="suggestion" data-prompt="${x}">${x}</button>`).join("")}</div></div>`}
function profile(){if(!state.user)return loginRequired();const u=state.user;return pageHead("TÀI KHOẢN","Hồ sơ")+`<div class="profile-card"><div class="avatar huge">${u.avatar}</div><div><h2>${esc(u.name)}</h2><p>${esc(u.email)}</p><span class="badge">${u.role} ${u.grade?"• Lớp "+u.grade:""}</span></div></div><div class="panel"><h3>Bảo mật tài khoản</h3><p>Email: <b>${u.emailVerified?"Đã xác minh":"Chưa xác minh"}</b></p>${!u.emailVerified?'<button class="primary" id="verifyEmail">Xác minh email (demo backend)</button>':""}</div>`}
async function parent(){if(!state.user||!["parent","admin"].includes(state.user.role))return loginRequired("Đăng nhập tài khoản phụ huynh.");let a=await analytics();return pageHead("PHỤ HUYNH","Theo dõi con","Liên kết bằng email tài khoản học sinh.")+`<div class="panel"><h3>🔗 Liên kết thêm học sinh</h3><form id="linkChildForm" class="chat-input"><input name="studentEmail" type="email" placeholder="Email học sinh" required><button class="primary">Liên kết</button></form></div>`+a}
async function teacher(){if(!state.user||!["teacher","admin"].includes(state.user.role))return loginRequired("Đăng nhập tài khoản giáo viên.");return pageHead("GIÁO VIÊN","Bảng điều khiển giáo viên","Tập trung Toán lớp 4–5: ngân hàng câu hỏi, phòng thi, giao bài và chấm điểm.")+`<div class="admin-actions"><button class="outline" data-route="questionBank">🧮 Ngân hàng câu hỏi</button><button class="outline" data-route="examRooms">🧪 Phòng thi</button><button class="outline" data-route="classes">🏫 Quản lý lớp</button><button class="outline" data-route="assignments">📌 Giao bài</button><button class="outline" data-route="submissions">📨 Chấm bài</button><button class="outline" data-route="materials">📎 Tài liệu</button><button class="outline" data-route="notifications">🔔 Thông báo</button></div>`}
async function admin(){if(state.user?.role!=="admin")return loginRequired("Chỉ Admin được truy cập.");let j;try{j=await API.get("/api/admin/stats")}catch(e){return errorBox(e.message)}return pageHead("QUẢN TRỊ","Admin Dashboard","Thống kê và audit log phía server.")+`<div class="metrics">${metric("👥",j.users,"Người dùng")}${metric("🧒",j.students,"Học sinh")}${metric("👩🏻‍🏫",j.teachers,"Giáo viên")}${metric("🏫",j.classes,"Lớp")}</div><div class="metrics">${metric("📌",j.assignments,"Bài giao")}${metric("📨",j.submissions,"Bài nộp")}${metric("📎",j.materials,"Tài liệu")}${metric("🛡️",j.audit.length,"Audit gần đây")}</div><div class="panel"><h3>⚙️ Quản trị nâng cao</h3><div class="admin-actions"><button class="outline" data-route="adminUsers">👥 Quản lý user</button><button class="outline" data-route="questionBank">🧮 Ngân hàng câu hỏi</button><button class="outline" data-route="examRooms">🧪 Phòng thi</button><button class="outline" data-route="storageHealth">🐘 PostgreSQL / Redis</button></div></div><div class="panel"><h3>🔐 Bảo mật Admin</h3><button class="outline" id="setup2fa">Thiết lập 2FA</button><div id="twofaInfo" class="tiny"></div></div><div class="panel"><h3>Audit log</h3><div class="table-wrap"><table><thead><tr><th>Thời gian</th><th>Action</th><th>User</th></tr></thead><tbody>${j.audit.map(a=>`<tr><td>${new Date(a.at).toLocaleString("vi-VN")}</td><td>${a.action}</td><td>${a.userId||"system"}</td></tr>`).join("")}</tbody></table></div></div>`}
function achievements(){return pageHead("THÀNH TÍCH","Huy hiệu & XP")+`<div class="badge-grid">${[["🌱","Khởi đầu"],["🔥","Chăm chỉ"],["⭐","100 điểm"],["🏆","Siêu học sinh"],["🎯","Chính xác"],["📚","Mọt sách"]].map((b,i)=>`<article class="achievement ${state.results.length>i?"unlocked":"locked"}"><div>${b[0]}</div><h3>${b[1]}</h3><p>Tiếp tục học để mở khóa.</p></article>`).join("")}</div>`}
function shop(){return pageHead("GAMIFICATION","Shop & phần thưởng","Khung chức năng XP/avatar; dữ liệu thanh toán Premium chưa bật nếu chưa cấu hình provider.")+`<div class="cards-3">${["🎓 Khung học giỏi","🐼 Thú cưng Panda","🌟 Avatar sao","🚀 Booster XP"].map((x,i)=>`<article class="test-card"><h3>${x}</h3><p>${(i+1)*100} XP</p><button class="outline">Đổi thưởng</button></article>`).join("")}</div>`}

function flashcards(){const cards=D.lessons.slice(0,8);return pageHead("FLASHCARD","Ôn nhanh kiến thức","Bấm vào thẻ để lật mặt sau, dùng giọng đọc của trình duyệt nếu cần.")+`<div class="cards-3">${cards.map((l,i)=>`<button class="test-card flashcard" data-flash="${i}" data-front="${esc(l.title)}" data-back="${esc(subj(l.subject).name+" • "+(l.topic||"Kiến thức trọng tâm"))}"><div class="subject-icon">${subj(l.subject).icon}</div><h3>${esc(l.title)}</h3><p>Chạm để lật</p></button>`).join("")}</div><div class="panel"><button class="outline" id="readFlash">🔊 Đọc thẻ đầu tiên</button></div>`}
function game(){return pageHead("MINI GAME","⚡ Toán nhanh","Trả lời liên tục để tăng combo và XP.")+`<div class="result-card"><div class="score-ring"><b id="gameScore">0</b><span>XP</span></div><div class="question-card"><h2 id="gameQ">Bấm Bắt đầu</h2><div class="options" id="gameOptions"></div></div><div class="quiz-actions"><button class="primary" id="startGame">Bắt đầu game</button></div></div>`}
async function submissions(){if(!state.user||!["teacher","admin"].includes(state.user.role))return loginRequired("Chỉ giáo viên/Admin được xem bài nộp.");let j;try{j=await window.PerfLists.get("submissions","/api/submissions")}catch(e){return errorBox(e.message)}return pageHead("CHẤM BÀI","Bài học sinh đã nộp","Chỉnh điểm và nhận xét trực tiếp.")+`${window.PerfLists.controls("submissions",j.pagination,{placeholder:"Tìm học sinh hoặc bài..."})}<div class="list-card">${j.submissions.map(x=>`<div class="lesson-row"><div class="lesson-ico">📨</div><div class="grow"><b>${esc(x.student?.name||"Học sinh")} — ${esc(x.assignment?.title||"Bài tập")}</b><small>Điểm: ${x.score}% • ${new Date(x.submittedAt).toLocaleString("vi-VN")}</small></div><button class="outline small" data-grade-submission="${x.id}" data-current-score="${x.score}">Chấm</button></div>`).join("")||'<div class="empty">Chưa có bài nộp.</div>'}</div>`}
async function premium(){let i={premium:false};try{i=await API.get("/api/integrations")}catch{}return pageHead("PREMIUM","Nâng cấp tài khoản","Checkout chỉ hoạt động khi server được cấu hình PAYMENT_CHECKOUT_URL.")+`<div class="cards-3"><article class="test-card"><h3>Free</h3><p>Bài tập cơ bản, lịch sử học, lớp học.</p><button class="outline full" disabled>Đang dùng</button></article><article class="test-card"><h3>⭐ Premium</h3><p>Khung cho tài liệu nâng cao, AI quota, báo cáo mở rộng.</p><button class="primary full" id="premiumBtn" ${i.premium?"":"disabled"}>${i.premium?"Thanh toán an toàn":"Chưa cấu hình cổng thanh toán"}</button></article></div>`}

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
 try{
  // Recover from stale exam locks that hid the navigation without displaying an exam.
  if(window.ExamLock?.isActive?.()&&!document.querySelector(".locked-exam-shell"))window.ExamLock.exit();
  shell();
  $("#content").innerHTML='<div class="perf-skeleton"><span></span><span></span><span></span></div>';
  await window.PerfLoader?.ensureRoute(route);
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
  const asyncMap={classes,assignments,notifications,analytics,parent,teacher,admin,submissions,premium,questionBank,examRooms,adminUsers,storageHealth,leaderboard:async()=>window.StudentLeaderboard?.render()||errorBox("StudentLeaderboard chưa tải")};
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
function startCustom(qs,title="Luyện tập cá nhân"){if(!Array.isArray(qs)||!qs.length){toast("Chưa có câu phù hợp");return}const grade=qs.find(q=>q.grade)?.grade||state.user?.grade||4;state.quiz={subject:"mixed",grade,assignmentId:null,lessonId:"",examId:"",customTitle:title,questions:qs.slice(0,30),i:0,answers:{},marked:[],start:Date.now()};persistQuiz();openPractice()}
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
}async function finishQuiz(auto=false){const z=state.quiz;let correct=0,wrong=[];z.questions.forEach(q=>{if(z.answers[q.id]===q.answer)correct++;else wrong.push(q.id)});state.lastWrong=z.questions.filter(q=>wrong.includes(q.id)).map(q=>({id:q.id,q:q.q,options:q.options,answer:q.answer,grade:q.grade,lessonId:q.lessonId,subject:q.subject,type:q.type,topic:D.lessons.find(l=>l.lessonId===q.lessonId)?.topic||(subj(q.subject).name+" • "+(q.type||"Tổng hợp")),explain:q.explain}));window.StudentReview?.add(state.lastWrong);const score=Math.round(correct/z.questions.length*100),durationSec=Math.round((Date.now()-z.start)/1000),proctor=z.examId?window.StudentExamProctor?.stop():null;window.StudentRewards?.earn(score,correct);window.StudentMastery?.record(z.questions,z.questions.filter(q=>z.answers[q.id]===q.answer).map(q=>q.id));const r={id:Date.now(),title:z.customTitle||z.examId?((z.customTitle)||((D.examSets||[]).find(t=>t.examId===z.examId)?.title||`Đề tổng hợp lớp ${z.grade}`)):z.lessonId?(D.lessons.find(l=>l.lessonId===z.lessonId)?.title||`${subj(z.subject).name} lớp ${z.grade}`):`${subj(z.subject).name} lớp ${z.grade}`,subject:z.subject,grade:z.grade,correct,total:z.questions.length,score,points:correct*10,durationSec,date:new Date().toLocaleDateString("vi-VN"),isoDate:new Date().toISOString(),proctor};state.results.push(r);saveLocal();if(state.user?.role==="student"){try{r.clientSubmissionId=window.OfflineSyncQueue?.enqueueResult?.({...r,wrongQuestionIds:wrong});await window.OfflineSyncQueue?.flush?.();if(z.assignmentId)await API.post("/api/assignments/"+z.assignmentId+"/submit",{answers:z.answers,score})}catch(e){toast("Đã lưu local; sẽ tự đồng bộ khi có mạng")}}window.ExamLock?.exit();$("#content").innerHTML=`<section class="result-card"><div class="score-ring"><b>${score}%</b><span>${correct}/${z.questions.length} đúng</span></div><h1>${auto?"Hết giờ – bài đã tự nộp ⏰":score>=80?"Xuất sắc 🎉":score>=50?"Làm tốt 👍":"Ôn thêm nhé 💪"}</h1><div class="result-review">${z.questions.map((q,i)=>`<div class="review ${z.answers[q.id]===q.answer?"":"bad"}"><b>Câu ${i+1}: ${esc(q.q)}</b><p>Đáp án đúng: ${esc(q.options[q.answer])}</p><small>💡 ${esc(q.explain||"")}</small></div>`).join("")}</div><div class="quiz-actions"><button class="outline" id="analyzeWrong">🤖 AI phân tích câu sai</button><button class="outline" id="similarWrong">🔁 5 câu tương tự</button><button class="primary" id="goHistory">Xem kết quả</button></div><div id="wrongAnalysis"></div></section>`;$("#goHistory").onclick=()=>nav("history");$("#similarWrong").onclick=()=>{const src=z.questions.find(q=>wrong.includes(q.id));if(!src)return toast("Không có câu sai");startCustom(window.StudentAdaptive?.similar(src,5)||[],"5 câu tương tự")};$("#analyzeWrong").onclick=async()=>{const box=$("#wrongAnalysis");if(!state.lastWrong.length){box.innerHTML="<div class=\"panel\"><h3>🎉 Không có câu sai</h3><p>Em đã làm đúng toàn bộ bài này.</p></div>";return}if(!state.user){box.innerHTML="<div class=\"panel\"><p>Đăng nhập để AI lưu và phân tích lỗi sai theo tiến độ của em.</p></div>";return}box.innerHTML="<div class=\"panel\">Đang phân tích...</div>";try{const j=await API.post("/api/ai/analyze-wrong",{grade:z.grade,lessonId:z.lessonId,items:state.lastWrong});box.innerHTML=`<div class="panel"><h3>🎯 Chủ đề cần ôn: ${esc(j.weakTopic||"Toán")}</h3><p>${esc(j.summary||"")}</p>${j.ai?`<p>${esc(j.ai)}</p>`:""}<ol>${(j.plan||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ol></div>`}catch(e){box.innerHTML=`<div class="panel"><p>${esc(e.message)}</p></div>`}};state.quiz=null;localStorage.removeItem("bt_quiz");window.OfflineSyncQueue?.clearDraft?.()}
function openAuth(){return window.AuthUI?.open("login")}
function bind(){
 // Open immediately on mobile while preserving the direct-link fallback.
 const registerLink=$("#registerBtn");
 if(registerLink)registerLink.addEventListener("click",e=>{
  if(!window.AuthUI?.open)return;
  e.preventDefault();
  window.AuthUI.open("register");
 });
 window.PerfLists?.bind?.(state.route,render);
 $$("[data-route]").forEach(x=>x.onclick=()=>nav(x.dataset.route));$$("[data-subject]").forEach(x=>x.onclick=()=>{state.subjectFilter=x.dataset.subject;nav("subjects")});$$("[data-fav]").forEach(x=>x.onclick=()=>{const id=Number(x.dataset.fav);state.favorites=state.favorites.includes(id)?state.favorites.filter(a=>a!==id):[...state.favorites,id];saveLocal();render()});$$("[data-start]").forEach(x=>x.onclick=()=>startQuiz(x.dataset.start,Number(x.dataset.grade),null,x.dataset.lesson||""));$("#openLogin")?.addEventListener("click",openAuth);
 $("#globalSearchBtn")?.addEventListener("click",()=>{const q=$("#globalSearch").value;nav("subjects");setTimeout(()=>{$("#lessonSearch").value=q;filterLessons()},20)});$$(".quick-grades [data-grade]").forEach(x=>x.onclick=()=>{nav("subjects");setTimeout(()=>{$("#gradeFilter").value=x.dataset.grade;filterLessons()},20)});
 ["lessonSearch","gradeFilter","levelFilter"].forEach(id=>$("#"+id)?.addEventListener("input",filterLessons));$("#examGradeFilter")?.addEventListener("change",e=>{$$(".exam-card").forEach(c=>c.style.display=!e.target.value||c.dataset.examGrade===e.target.value?"":"none")});$$("[data-filter-subject]").forEach(x=>x.onclick=()=>{state.subjectFilter=x.dataset.filterSubject;filterLessons()});
 $("#classForm")?.addEventListener("submit",async e=>{e.preventDefault();try{await API.post("/api/classes",Object.fromEntries(new FormData(e.currentTarget)));toast("Đã tạo lớp");render()}catch(x){toast(x.message)}});
 $("#joinClassForm")?.addEventListener("submit",async e=>{e.preventDefault();try{await API.post("/api/classes/join",Object.fromEntries(new FormData(e.currentTarget)));toast("Đã tham gia lớp");render()}catch(x){toast(x.message)}});
 $("#assignmentForm")?.addEventListener("submit",async e=>{e.preventDefault();try{await API.post("/api/assignments",Object.fromEntries(new FormData(e.currentTarget)));toast("Đã giao bài");render()}catch(x){toast(x.message)}});
 $$("[data-submit-assignment]").forEach(x=>x.onclick=()=>startQuiz(x.dataset.assignmentSubject,state.user?.grade||1,x.dataset.submitAssignment,x.dataset.lesson||""));
 if(state.route==="materials")window.TeacherMaterialStorage?.bind(toast,()=>render());
 $("#aiForm")?.addEventListener("submit",async e=>{e.preventDefault();const t=$("#aiInput").value.trim();if(!t)return;const box=$("#chatBox");box.innerHTML+=`<div class="msg user">${esc(t)}</div>`;$("#aiInput").value="";try{const j=await API.post("/api/ai",{prompt:t});box.innerHTML+=`<div class="msg bot">${esc(j.answer)}</div>`}catch(x){box.innerHTML+=`<div class="msg bot">⚠️ ${esc(x.message)}</div>`}box.scrollTop=box.scrollHeight});$$("[data-prompt]").forEach(x=>x.onclick=()=>{$("#aiInput").value=x.dataset.prompt;$("#aiForm").requestSubmit()});
 $("#verifyEmail")?.addEventListener("click",async()=>{try{const j=await API.post("/api/verify-email",{});state.user=j.user;toast("Đã xác minh");render()}catch(x){toast(x.message)}});

 $("#exportXlsx")?.addEventListener("click",()=>downloadProtected("/api/export/results.xlsx","ket-qua-hoc-tap.xlsx"));
 $("#exportPdf")?.addEventListener("click",()=>downloadProtected("/api/export/results.pdf","ket-qua-hoc-tap.pdf"));
 $("#importQuestionForm")?.addEventListener("submit",e=>{e.preventDefault();const f=$("#questionFile").files[0];if(!f)return;const rd=new FileReader();rd.onload=async()=>{try{const j=await API.post("/api/questions/import-excel",{filename:f.name,dataUrl:rd.result});toast("Đã import "+j.count+" câu");render()}catch(x){toast(x.message)}};rd.readAsDataURL(f)});
 $("#examRoomForm")?.addEventListener("submit",async e=>{e.preventDefault();try{const d=Object.fromEntries(new FormData(e.currentTarget));await API.post("/api/exam-rooms",d);toast("Đã tạo phòng thi");render()}catch(x){toast(x.message)}});
 $("#joinExamForm")?.addEventListener("submit",async e=>{e.preventDefault();try{const j=await API.post("/api/exam-rooms/join",Object.fromEntries(new FormData(e.currentTarget)));toast("Đã vào phòng "+j.room.code);startQuiz("math",j.room.grade,null,j.room.lessonId)}catch(x){toast(x.message)}});
 $$("[data-room-start]").forEach(b=>b.onclick=()=>startQuiz("math",Number(b.dataset.roomGrade),null,b.dataset.roomStart));
 $$("[data-user-save]").forEach(b=>b.onclick=async()=>{const role=$('[data-user-role="'+b.dataset.userSave+'"]').value,locked=b.dataset.locked!=="1";try{await API.patch("/api/admin/users/"+b.dataset.userSave,{role,locked});toast("Đã cập nhật user");render()}catch(x){toast(x.message)}});
 $("#migrateDb")?.addEventListener("click",async()=>{try{const j=await API.post("/api/storage/migrate",{});toast(j.postgres?"Migration thành công":"Chưa cấu hình DATABASE_URL");render()}catch(x){toast(x.message)}});
 $("#enablePush")?.addEventListener("click",async()=>{try{if(!("serviceWorker" in navigator)||!("PushManager" in window))throw new Error("Trình duyệt không hỗ trợ Web Push");const key=await API.get("/api/push/public-key"),reg=await navigator.serviceWorker.ready,perm=await Notification.requestPermission();if(perm!=="granted")throw new Error("Bạn chưa cho phép thông báo");const raw=atob(key.publicKey.replace(/-/g,"+").replace(/_/g,"/")),arr=Uint8Array.from([...raw].map(c=>c.charCodeAt(0))),sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:arr});await API.post("/api/push/subscribe",{subscription:sub});toast("Đã bật Web Push")}catch(x){toast(x.message)}});

 $("#setup2fa")?.addEventListener("click",async()=>{try{const j=await API.post("/api/2fa/setup",{});$("#twofaInfo").innerHTML="<p>Secret: <code>"+esc(j.secret)+"</code></p><p>Thêm secret này vào ứng dụng Authenticator, sau đó nhập mã 6 số:</p><div class='chat-input'><input id='twofaCode' maxlength='6' inputmode='numeric'><button class='primary' id='enable2fa'>Bật 2FA</button></div>";$("#enable2fa").onclick=async()=>{try{await API.post("/api/2fa/enable",{code:$("#twofaCode").value});toast("Đã bật 2FA")}catch(x){toast(x.message)}}}catch(x){toast(x.message)}});

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
$("#menuBtn")?.addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#themeBtn")?.addEventListener("click",()=>{state.theme=state.theme==="light"?"dark":"light";document.documentElement.dataset.theme=state.theme;localStorage.setItem("bt_theme",state.theme)});
$("#authBtn")?.addEventListener("click",async()=>{if(state.user){await window.AuthUI?.logout();state.user=null;nav("home")}else openAuth()});
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
(async()=>{try{await window.SupabaseApp?.init(u=>{state.user=u;shell()})}catch{}if(!state.user)await restore();shell();if(state.user)render()})();
})();