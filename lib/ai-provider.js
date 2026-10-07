const tracking=require("./error-tracking");
function enabled(){return !!(process.env.AI_API_URL&&process.env.AI_API_KEY)}
async function request(messages,{model,vision=false,temperature=0.2}={}){
 if(!enabled())throw new Error("AI provider chưa cấu hình");
 const payload={model:model||(vision?process.env.AI_VISION_MODEL:process.env.AI_MODEL)||"gpt-4.1-mini",messages,temperature};
 const r=await fetch(process.env.AI_API_URL,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.AI_API_KEY},body:JSON.stringify(payload)});
 const j=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(j.error?.message||j.error||"AI provider error");tracking.capture(e,{status:r.status});throw e}
 return j.choices?.[0]?.message?.content||j.output_text||"";
}
async function chat(prompt,system){return request([{role:"system",content:system},{role:"user",content:prompt}])}
async function vision(dataUrl,prompt){return request([{role:"system",content:"Bạn là giáo viên tiểu học lớp 4-5. Đọc chính xác nội dung ảnh, không bịa khi ảnh mờ; giải thích từng bước ngắn gọn."},{role:"user",content:[{type:"text",text:prompt},{type:"image_url",image_url:{url:dataUrl}}]}],{vision:true})}
module.exports={enabled,request,chat,vision};