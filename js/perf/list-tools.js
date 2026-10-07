window.PerfLists=(()=>{
 const states=new Map();
 function state(route){if(!states.has(route))states.set(route,{page:1,limit:30,search:""});return states.get(route)}
 async function get(route,endpoint,extra={}){
  const st=state(route),q=new URLSearchParams({...extra,page:String(st.page),limit:String(st.limit)});if(st.search)q.set("search",st.search);
  return API.get(endpoint+"?"+q.toString(),{key:"list:"+route})
 }
 function controls(route,pagination,{placeholder="Tìm kiếm..."}={}){
  const st=state(route),p=pagination||{page:1,pages:1,total:0};
  return `<div class="perf-list-controls"><input class="perf-search" data-list-route="${route}" value="${String(st.search||"").replace(/"/g,"&quot;")}" placeholder="${placeholder}"><div class="perf-pager"><button class="outline small perf-page" data-route="${route}" data-page="${Math.max(1,p.page-1)}" ${p.page<=1?"disabled":""}>←</button><span>Trang ${p.page}/${Math.max(1,p.pages)} • ${p.total} mục</span><button class="outline small perf-page" data-route="${route}" data-page="${Math.min(Math.max(1,p.pages),p.page+1)}" ${!p.hasMore?"disabled":""}>→</button></div></div>`
 }
 function bind(route,rerender){
  let timer;document.querySelectorAll(`.perf-search[data-list-route="${route}"]`).forEach(i=>i.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(()=>{const st=state(route);st.search=i.value.trim();st.page=1;rerender()},350)}));
  document.querySelectorAll(`.perf-page[data-route="${route}"]`).forEach(b=>b.onclick=()=>{state(route).page=Number(b.dataset.page)||1;rerender()})
 }
 return {state,get,controls,bind}
})();