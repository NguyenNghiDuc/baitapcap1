const engine=require("./math-engine");
function n(v){return Number(String(v).replace(/\s/g,"").replace(",", "."))}
function fmt(v){return Number.isInteger(v)?String(v):String(Number(v.toFixed(12)))}
function unit(prompt){const text=" "+String(prompt).toLowerCase()+" ";const m=text.match(/(?:^|\s)(mm|cm|dm|km|kg|ml|m|g|l|giây|phút|giờ)(?=\s|$|[.,;:])/i);return m?m[1]:""}
function percent(prompt=""){
 const p=String(prompt);
 let m=p.match(/(?:tính\s+)?([0-9]+(?:[.,][0-9]+)?)\s*%\s*(?:của|of)\s*([0-9]+(?:[.,][0-9]+)?)/i);
 if(m){const pct=n(m[1]),base=n(m[2]),value=base*pct/100;return {kind:"percent-of",answer:fmt(value),explain:[`${pct}% = ${pct}/100`,`${base} × ${pct}/100 = ${fmt(value)}`]}}
 m=p.match(/(?:tăng|increase)\s*([0-9]+(?:[.,][0-9]+)?)\s*%.*?([0-9]+(?:[.,][0-9]+)?)/i);
 if(m){const pct=n(m[1]),base=n(m[2]),value=base*(1+pct/100);return {kind:"percent-increase",answer:fmt(value),explain:[`Mức tăng = ${base} × ${pct}% = ${fmt(base*pct/100)}`,`Giá trị mới = ${fmt(value)}`]}}
 m=p.match(/(?:giảm|decrease|discount|giảm giá)\s*([0-9]+(?:[.,][0-9]+)?)\s*%.*?([0-9]+(?:[.,][0-9]+)?)/i);
 if(m){const pct=n(m[1]),base=n(m[2]),value=base*(1-pct/100);return {kind:"percent-decrease",answer:fmt(value),explain:[`Mức giảm = ${base} × ${pct}% = ${fmt(base*pct/100)}`,`Giá trị còn lại = ${fmt(value)}`]}}
 m=p.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:là|is)\s*([0-9]+(?:[.,][0-9]+)?)\s*%\s*(?:của|of)\s*(?:số|number)?/i);
 if(m){const part=n(m[1]),pct=n(m[2]);if(pct!==0){const base=part*100/pct;return {kind:"percent-base",answer:fmt(base),explain:[`Số cần tìm = ${part} × 100 ÷ ${pct} = ${fmt(base)}`]}}}
 m=p.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:trên|out of|of)\s*([0-9]+(?:[.,][0-9]+)?).*?(?:bao nhiêu phần trăm|what percent|%)/i);
 if(m){const part=n(m[1]),base=n(m[2]);if(base!==0){const pct=part/base*100;return {kind:"percent-ratio",answer:fmt(pct)+"%",explain:[`Tỉ lệ = ${part} ÷ ${base} × 100% = ${fmt(pct)}%`]}}}
 return null
}
function average(prompt=""){
 const p=String(prompt),m=p.match(/(?:trung bình(?: cộng)?|average|mean)\s*(?:của|of)?\s*[:：]?\s*([0-9.,;\s-]+)/i);if(!m)return null;
 const nums=(m[1].match(/-?[0-9]+(?:[.,][0-9]+)?/g)||[]).map(n);if(nums.length<2)return null;const sum=nums.reduce((a,b)=>a+b,0),value=sum/nums.length;
 return {kind:"average",answer:fmt(value),explain:[`Tổng = ${fmt(sum)}`,`Có ${nums.length} số`,`Trung bình = ${fmt(sum)} ÷ ${nums.length} = ${fmt(value)}`]}
}
function geometry(prompt=""){
 const p=String(prompt),u=unit(p)||"đơn vị";
 let m=p.match(/hình chữ nhật.*?(?:dài|length)\s*([0-9]+(?:[.,][0-9]+)?).*?(?:rộng|width)\s*([0-9]+(?:[.,][0-9]+)?)/i);
 if(m){const a=n(m[1]),b=n(m[2]);if(/chu vi|perimeter/i.test(p))return {kind:"rectangle-perimeter",answer:fmt(2*(a+b))+" "+u,explain:[`P = 2 × (dài + rộng)`,`P = 2 × (${a} + ${b}) = ${fmt(2*(a+b))} ${u}`]};if(/diện tích|area/i.test(p))return {kind:"rectangle-area",answer:fmt(a*b)+" "+u+"²",explain:[`S = dài × rộng`,`S = ${a} × ${b} = ${fmt(a*b)} ${u}²`]}}
 m=p.match(/hình vuông.*?(?:cạnh|side)\s*([0-9]+(?:[.,][0-9]+)?)/i);
 if(m){const a=n(m[1]);if(/chu vi|perimeter/i.test(p))return {kind:"square-perimeter",answer:fmt(4*a)+" "+u,explain:[`P = 4 × cạnh = 4 × ${a} = ${fmt(4*a)} ${u}`]};if(/diện tích|area/i.test(p))return {kind:"square-area",answer:fmt(a*a)+" "+u+"²",explain:[`S = cạnh × cạnh = ${a} × ${a} = ${fmt(a*a)} ${u}²`]}}
 m=p.match(/tam giác.*?(?:đáy|base)\s*([0-9]+(?:[.,][0-9]+)?).*?(?:cao|height)\s*([0-9]+(?:[.,][0-9]+)?)/i);
 if(m&&/diện tích|area/i.test(p)){const a=n(m[1]),h=n(m[2]),v=a*h/2;return {kind:"triangle-area",answer:fmt(v)+" "+u+"²",explain:[`S = đáy × chiều cao ÷ 2`,`S = ${a} × ${h} ÷ 2 = ${fmt(v)} ${u}²`]}}
 m=p.match(/hình thang.*?(?:đáy lớn|base1)\s*([0-9]+(?:[.,][0-9]+)?).*?(?:đáy (?:bé|nhỏ)|base2)\s*([0-9]+(?:[.,][0-9]+)?).*?(?:cao|height)\s*([0-9]+(?:[.,][0-9]+)?)/i);
 if(m&&/diện tích|area/i.test(p)){const a=n(m[1]),b=n(m[2]),h=n(m[3]),v=(a+b)*h/2;return {kind:"trapezoid-area",answer:fmt(v)+" "+u+"²",explain:[`S = (đáy lớn + đáy bé) × cao ÷ 2`,`S = (${a} + ${b}) × ${h} ÷ 2 = ${fmt(v)} ${u}²`]}}
 m=p.match(/hình tròn.*?(?:đường kính|diameter)\s*([0-9]+(?:[.,][0-9]+)?)/i);
 if(m){const d=n(m[1]),r=d/2,pi=3.14;if(/chu vi|circumference/i.test(p))return {kind:"circle-circumference-diameter",answer:fmt(pi*d)+" "+u,explain:[`C = 3,14 × d = 3,14 × ${d} = ${fmt(pi*d)} ${u}`]};if(/diện tích|area/i.test(p))return {kind:"circle-area-diameter",answer:fmt(pi*r*r)+" "+u+"²",explain:[`r = d ÷ 2 = ${fmt(r)} ${u}`,`S = 3,14 × r² = ${fmt(pi*r*r)} ${u}²`]}}
 m=p.match(/hình tròn.*?(?:bán kính|radius)\s*([0-9]+(?:[.,][0-9]+)?)/i);
 if(m){const r=n(m[1]),pi=3.14;if(/chu vi|circumference/i.test(p))return {kind:"circle-circumference",answer:fmt(2*pi*r)+" "+u,explain:[`C = 2 × 3,14 × r = ${fmt(2*pi*r)} ${u}`]};if(/diện tích|area/i.test(p))return {kind:"circle-area",answer:fmt(pi*r*r)+" "+u+"²",explain:[`S = 3,14 × r² = 3,14 × ${r}² = ${fmt(pi*r*r)} ${u}²`]}}
 m=p.match(/hình lập phương.*?(?:cạnh|side)\s*([0-9]+(?:[.,][0-9]+)?)/i);
 if(m){const a=n(m[1]);if(/thể tích|volume/i.test(p))return {kind:"cube-volume",answer:fmt(a*a*a)+" "+u+"³",explain:[`V = cạnh³ = ${a}³ = ${fmt(a*a*a)} ${u}³`]};if(/diện tích toàn phần|surface area/i.test(p))return {kind:"cube-surface",answer:fmt(6*a*a)+" "+u+"²",explain:[`S = 6 × cạnh² = 6 × ${a}² = ${fmt(6*a*a)} ${u}²`]}}
 m=p.match(/hình hộp chữ nhật.*?(?:dài|length)\s*([0-9]+(?:[.,][0-9]+)?).*?(?:rộng|width)\s*([0-9]+(?:[.,][0-9]+)?).*?(?:cao|height)\s*([0-9]+(?:[.,][0-9]+)?)/i);
 if(m&&/thể tích|volume/i.test(p)){const a=n(m[1]),b=n(m[2]),h=n(m[3]),v=a*b*h;return {kind:"cuboid-volume",answer:fmt(v)+" "+u+"³",explain:[`V = dài × rộng × cao`,`V = ${a} × ${b} × ${h} = ${fmt(v)} ${u}³`]}}
 return null
}
function motion(prompt=""){
 const p=String(prompt);
 let m=p.match(/(?:vận tốc|speed)\s*([0-9]+(?:[.,][0-9]+)?)\s*(km\/h|km\/giờ|m\/s).*?(?:thời gian|time)\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:giờ|h)/i);
 if(m&&/quãng đường|distance/i.test(p)){const v=n(m[1]),t=n(m[3]),d=v*t;return {kind:"distance",answer:fmt(d)+" km",explain:[`s = v × t = ${v} × ${t} = ${fmt(d)} km`]}}
 m=p.match(/(?:quãng đường|distance)\s*([0-9]+(?:[.,][0-9]+)?)\s*km.*?(?:thời gian|time)\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:giờ|h)/i);
 if(m&&/vận tốc|speed/i.test(p)){const d=n(m[1]),t=n(m[2]),v=d/t;return {kind:"speed",answer:fmt(v)+" km/h",explain:[`v = s ÷ t = ${d} ÷ ${t} = ${fmt(v)} km/h`]}}
 return null
}
function conversion(prompt=""){
 const p=String(prompt),m=p.match(/([0-9]+(?:[.,][0-9]+)?)\s*(mm|cm|dm|m|km|g|kg|ml|l)\s*(?:bằng|=|to|sang)\s*(?:bao nhiêu\s*)?(mm|cm|dm|m|km|g|kg|ml|l)/i);if(!m)return null;
 const value=n(m[1]),from=m[2].toLowerCase(),to=m[3].toLowerCase(),groups=[["mm","cm","dm","m","km"],["g","kg"],["ml","l"]],factor={mm:.001,cm:.01,dm:.1,m:1,km:1000,g:1,kg:1000,ml:1,l:1000};
 if(!groups.some(g=>g.includes(from)&&g.includes(to)))return null;const out=value*factor[from]/factor[to];return {kind:"unit-conversion",answer:fmt(out)+" "+to,explain:[`${value} ${from} = ${fmt(out)} ${to}`]}
}
function ratio(prompt=""){
 const p=String(prompt),m=p.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:sản phẩm|quyển|cái|kg|m|phần).*?([0-9]+(?:[.,][0-9]+)?)\s*(?:đồng|nghìn|k)?[\s,;.]+.*?([0-9]+(?:[.,][0-9]+)?)\s*(?:sản phẩm|quyển|cái|kg|m|phần)/i);
 if(!m)return null;const q1=n(m[1]),cost=n(m[2]),q2=n(m[3]);if(!q1)return null;const unitCost=cost/q1,total=unitCost*q2;return {kind:"direct-proportion",answer:fmt(total),explain:[`1 đơn vị = ${fmt(cost)} ÷ ${fmt(q1)} = ${fmt(unitCost)}`,`${fmt(q2)} đơn vị = ${fmt(unitCost)} × ${fmt(q2)} = ${fmt(total)}`]}
}
function solveWordProblem(prompt){
 return percent(prompt)||average(prompt)||geometry(prompt)||motion(prompt)||conversion(prompt)||ratio(prompt)||null
}
module.exports={percent,average,geometry,motion,conversion,ratio,solveWordProblem};