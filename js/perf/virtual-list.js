"use strict";
window.VirtualList=(()=>{
 let stop=null;
 function mount(root,{items=[],rowHeight=68,overscan=5,renderRow}={}){
  stop?.();if(!root||typeof renderRow!=="function")return;
  const count=items.length,viewport=document.createElement("div"),above=document.createElement("div"),rows=document.createElement("div"),below=document.createElement("div");
  viewport.className="virtual-viewport";viewport.tabIndex=0;viewport.setAttribute("role","list");
  above.setAttribute("aria-hidden","true");below.setAttribute("aria-hidden","true");
  viewport.append(above,rows,below);root.replaceChildren(viewport);
  let start=-1,end=-1,frame=0;
  const render=()=>{
   frame=0;
   const nextStart=Math.max(0,Math.floor(viewport.scrollTop/rowHeight)-overscan);
   const nextEnd=Math.min(count,Math.ceil((viewport.scrollTop+viewport.clientHeight)/rowHeight)+overscan);
   if(start===nextStart&&end===nextEnd)return;
   start=nextStart;end=nextEnd;
   above.style.height=(start*rowHeight)+"px";below.style.height=((count-end)*rowHeight)+"px";
   rows.innerHTML=items.slice(start,end).map((item,i)=>renderRow(item,start+i)).join("");
  };
  const handle=()=>{if(!frame)frame=requestAnimationFrame(render)};
  viewport.addEventListener("scroll",handle,{passive:true});
  render();
  stop=()=>{viewport.removeEventListener("scroll",handle);if(frame)cancelAnimationFrame(frame)};
  return stop;
 }
 return {mount};
})();