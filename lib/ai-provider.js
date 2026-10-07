const tracking=require("./error-tracking");
const MAX=Math.max(1,Number(process.env.AI_MAX_CONCURRENCY||4)),MAX_QUEUE=Math.max(1,Number(process.env.AI_MAX_QUEUE||40));let active=0;const queue=[];
function enabled(){return !!(process.env.AI_API_URL&&process.env.AI_API_KEY)}
function acquire(){if(active<MAX){active++;return Promise.resolve()}if(queue.length>=MAX_QUEUE)return Promise.reject(new Error("AI đang bận, vui lòng thử lại sau"));return new Promise(resolve=>queue.push(resolve)).then(()=>{active++})}
function release(){active=Math.max(0,active-1);const next=queue.shift();if(next)next()}
async function request(messages,{model,vision=false,temperature=0.2}={}){
 if(!enabled())throw new Error("AI provider chưa cấu hình");await acquire();
 try{
  const payload={model:model||(vision?process.env.AI_VISION_MODEL:process.env.AI_MODEL)||"gpt-4.1-mini",messages,temperature},ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),Number(process.env.AI_TIMEOUT_MS||45000));
  let r;try{r=await fetch(process.env.AI_API_URL,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.AI_API_KEY},body:JSON.stringify(payload),signal:ctrl.signal})}finally{clearTimeout(timer)}
  const j=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(j.error?.message||j.error||"AI provider error");tracking.capture(e,{status:r.status});throw e}
  return j.choices?.[0]?.message?.content||j.output_text||""
 }catch(e){if(e.name==="AbortError")throw new Error("AI phản hồi quá chậm, thử lại sau");throw e}finally{release()}
}
async function chat(prompt,system){return request([{role:"system",content:system},{role:"user",content:prompt}])}
async function vision(dataUrl,prompt){return request([{role:"system",content:"Bạn là giáo viên tiểu học lớp 4-5. Đọc chính xác nội dung ảnh, không bịa khi ảnh mờ; giải thích từng bước ngắn gọn."},{role:"user",content:[{type:"text",text:prompt},{type:"image_url",image_url:{url:dataUrl}}]}],{vision:true})}
function stats(){return {active,queued:queue.length,max:MAX,maxQueue:MAX_QUEUE}}
module.exports={enabled,request,chat,vision,stats};