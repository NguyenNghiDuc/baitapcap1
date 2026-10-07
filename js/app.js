const menuToggle=document.getElementById("menuToggle");
const mainNav=document.getElementById("mainNav");
const searchForm=document.getElementById("searchForm");
const searchInput=document.getElementById("searchInput");
const searchNote=document.getElementById("searchNote");
const toast=document.getElementById("toast");

menuToggle?.addEventListener("click",()=>mainNav.classList.toggle("open"));
document.querySelectorAll(".main-nav a").forEach(a=>a.addEventListener("click",()=>mainNav.classList.remove("open")));

function showToast(message){
  toast.textContent=message;
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer=setTimeout(()=>toast.classList.remove("show"),2200);
}

function normalize(text){
  return (text||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}

function runSearch(raw){
  const q=normalize(raw.trim());
  const items=[...document.querySelectorAll("[data-keywords]")];
  if(!q){
    items.forEach(el=>el.classList.remove("hidden-by-search"));
    searchNote.textContent="";
    return;
  }
  let count=0;
  items.forEach(el=>{
    const matched=normalize(el.dataset.keywords+" "+el.textContent).includes(q);
    el.classList.toggle("hidden-by-search",!matched);
    if(matched) count++;
  });
  searchNote.textContent=count? `Tìm thấy ${count} nội dung phù hợp với “${raw}”.` : `Chưa tìm thấy nội dung phù hợp với “${raw}”.`;
  document.getElementById("subjects").scrollIntoView({behavior:"smooth",block:"start"});
}

searchForm?.addEventListener("submit",e=>{e.preventDefault();runSearch(searchInput.value)});
searchInput?.addEventListener("input",()=>{if(!searchInput.value.trim())runSearch("")});

document.querySelectorAll(".subject-card button").forEach(btn=>btn.addEventListener("click",()=>{
  const card=btn.closest(".subject-card");
  showToast(`Đang mở mục ${card.querySelector("h3").textContent}…`);
}));

document.querySelectorAll(".lesson-row").forEach(row=>row.addEventListener("click",()=>{
  showToast(`Đã chọn: ${row.querySelector(".lesson-name").textContent}`);
}));

document.querySelectorAll(".grade-grid button").forEach(btn=>btn.addEventListener("click",()=>{
  searchInput.value=`lớp ${btn.dataset.grade}`;
  runSearch(searchInput.value);
}));

document.querySelector(".login-btn")?.addEventListener("click",()=>showToast("Chức năng đăng nhập sẽ được bổ sung ở bước tiếp theo."));