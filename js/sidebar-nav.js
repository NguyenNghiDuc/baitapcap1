/* Keyboard-friendly sidebar search and role-aware collapsible sections. */
window.SidebarNav=(()=>{
 const sidebar=document.querySelector("#sidebar"),search=document.querySelector("#sidebarSearch");
 if(!sidebar||!search)return {refresh(){},init(){}};
 const groups=[...sidebar.querySelectorAll(".sidebar-nav-group")],
  links=[...sidebar.querySelectorAll(".sidebar-navigation a[href]")],
  noResults=document.querySelector("#sidebarNoResults"),
  storageKey="bt_sidebar_groups_v1";
 let role="",lastActive="",lastRole="",ready=false;
 const clean=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().replace(/[^a-z0-9]+/g,"");
 function allowed(link){
  return !(link.classList.contains("admin-only")&&role!=="admin")&&
   !(link.classList.contains("teacher-only")&&!["teacher","admin"].includes(role));
 }
 function activeHref(){return location.hash||"#home"}
 function isActive(link){
  const href=link.getAttribute("href");
  return href===activeHref();
 }
 function currentOpen(){
  try{const o=JSON.parse(localStorage.getItem(storageKey)||"{}");return o&&typeof o==="object"?o:{}}catch{return {}}
 }
 function persist(){
  const values={};groups.forEach(group=>{values[group.dataset.navGroup]=group.open});
  try{localStorage.setItem(storageKey,JSON.stringify(values))}catch{}
 }
 function refresh(user){
  if(user!==undefined)role=String(user?.role||"");
  const term=clean(search.value),href=activeHref(),count={value:0};
  for(const link of links){
   const group=link.closest(".sidebar-nav-group"),category=(group?.querySelector(".sidebar-nav-toggle")?.textContent||"")+" "+(link.closest("[data-admin-section]")?.querySelector(".admin-nav-section-label")?.textContent||"");
   const match=!term||clean(link.textContent+" "+category).includes(term);
   const visible=allowed(link)&&match;
   link.hidden=!visible;
   const current=isActive(link);
   link.classList.toggle("is-active",current&&allowed(link));
   if(current&&allowed(link))link.setAttribute("aria-current","page");
   else link.removeAttribute("aria-current");
   if(visible)count.value++;
  }
  // Hide Admin subcategories with no visible links; keep search and keyboard navigation accurate.
  sidebar.querySelectorAll("[data-admin-section]").forEach(section=>{
   section.hidden=![...section.querySelectorAll("a[href]")].some(link=>!link.hidden);
  });
  for(const group of groups){
   const adminGroup=group.dataset.navGroup==="admin";
   group.hidden=adminGroup&&role!=="admin";
   if(group.hidden)continue;
   const matches=[...group.querySelectorAll(".sidebar-nav-items a")].some(a=>!a.hidden);
   if(term){group.hidden=!matches;group.open=matches}
   else if(!matches)group.hidden=true;
  }
  if(!term&&(href!==lastActive||role!==lastRole)){
   const active=links.find(link=>isActive(link)&&allowed(link));
   const group=active?.closest(".sidebar-nav-group");
   if(group&&!group.hidden)group.open=true;
  }
  lastActive=href;lastRole=role;
  noResults.hidden=count.value>0;
 }
 function init(){
  if(ready)return;ready=true;
  const saved=currentOpen();
  for(const group of groups){
   const name=group.dataset.navGroup;
   if(typeof saved[name]==="boolean")group.open=saved[name];
   group.addEventListener("toggle",()=>{if(!search.value.trim())persist()});
  }
  search.addEventListener("input",()=>refresh());
  search.addEventListener("keydown",e=>{
   if(e.key==="Escape"){search.value="";refresh();search.blur()}
   if(e.key==="Enter"){
    const first=links.find(link=>!link.hidden&&!link.closest(".sidebar-nav-group[hidden]"));
    if(first){e.preventDefault();first.click()}
   }
  });
  document.addEventListener("keydown",e=>{
   const tag=e.target?.tagName?.toLowerCase();
   if(e.key==="/"&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&!["input","textarea","select"].includes(tag)&&!e.target?.isContentEditable){
    e.preventDefault();search.focus();search.select();
   }
  });
  sidebar.addEventListener("click",e=>{
   const link=e.target.closest?.("a[href]");
   if(!link||!sidebar.contains(link))return;
   if(window.matchMedia("(max-width:900px)").matches)sidebar.classList.remove("open");
   if(search.value){search.value="";refresh()}
  });
  window.addEventListener("hashchange",()=>refresh());
  refresh();
 }
 init();
 return {init,refresh};
})();