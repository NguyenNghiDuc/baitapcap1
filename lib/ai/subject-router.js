function norm(s=""){return String(s).replace(/[đĐ]/g,"d").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}
function detect(prompt=""){
 const p=norm(prompt),scores={math:0,english:0,vietnamese:0,general:0};
 const mathWords=["tinh","toan","phuong trinh","phan so","hinh hoc","dien tich","chu vi","the tich","ti le","phan tram","so hoc","dai so","can bac","luy thua","giai bai","equation","calculate","geometry","fraction","algebra"];
 const enWords=["english","tieng anh","grammar","vocabulary","toeic","pronunciation","translate into english","verb","tense","preposition","synonym","antonym"];
 const viWords=["tieng viet","ngu van","chinh ta","chu ngu","vi ngu","tu loai","dong nghia","trai nghia","doc hieu","cau van","dau cau"];
 for(const w of mathWords)if(p.includes(w))scores.math+=2;
 for(const w of enWords)if(p.includes(w))scores.english+=2;
 for(const w of viWords)if(p.includes(w))scores.vietnamese+=2;
 if(/[0-9][\s]*(?:[+\-*/^=×÷]|sqrt)/i.test(p))scores.math+=4;
 if(/\b(am|is|are|was|were|have|has|do|does|did|would|should|could)\b/.test(p))scores.english++;
 const subject=Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];
 return {subject:subject[1]>0?subject[0]:"general",scores}
}
module.exports={detect};