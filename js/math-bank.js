(()=>{
const D=window.APP_DATA;if(!D)return;
const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b)[a,b]=[b,a%b];return a||1};
const frac=(n,d)=>{const g=gcd(n,d);return (n/g)+"/"+(d/g)};
const fmt=n=>Number.isInteger(n)?String(n):String(Math.round(n*1000)/1000).replace(".",",");
let id=400000;
function q(lessonId,grade,level,text,correct,wrong,explain,type="mcq"){
 const vals=[String(correct),...wrong.map(String)].filter((v,i,a)=>a.indexOf(v)===i).slice(0,4);
 while(vals.length<4) vals.push(String(Number(correct)||0 + vals.length+1));
 const pos=id%4,ans=vals.shift();vals.splice(pos,0,ans);
 return {id:id++,lessonId,subject:"math",grade,level,q:text,options:vals,answer:pos,explain,type};
}
function addLesson(meta,questions){D.lessons.push({...meta,subject:"math",count:30});D.questions.push(...questions.slice(0,30));D.tests.push({id:"test-"+meta.lessonId,title:meta.title+" — 30 câu",subject:"math",grade:meta.grade,time:45,count:30,difficulty:meta.level,lessonId:meta.lessonId});}
function mul4(){
 const a=[];for(let i=0;i<30;i++){const x=125+37*i,y=6+(i%15),r=x*y;a.push(q("g4-mul",4,i<10?"Dễ":i<22?"Trung bình":"Khó",`${x} × ${y} = ?`,r,[r+y,r-y,r+10],`Đặt tính rồi nhân từ phải sang trái. ${x} × ${y} = ${r}. Nếu có nhớ, cộng số nhớ vào hàng kế tiếp.`))}
 return a;
}
function div4(){
 const a=[];for(let i=0;i<30;i++){const d=3+(i%12),quo=24+7*i,n=d*quo;a.push(q("g4-div",4,i<10?"Dễ":i<22?"Trung bình":"Khó",`${n} : ${d} = ?`,quo,[quo+1,quo-1,quo+d],`Ta chia lần lượt từ hàng cao nhất. Vì ${d} × ${quo} = ${n} nên ${n} : ${d} = ${quo}. Kiểm tra lại bằng phép nhân: ${quo} × ${d} = ${n}.`))}
 return a;
}
function common4(){
 const a=[];for(let i=0;i<30;i++){const d1=2+(i%7),d2=3+((i*2)%8),n1=1+(i%(d1-1||1)),n2=1+(i%(d2-1||1)),l=d1*d2/gcd(d1,d2),m1=l/d1,m2=l/d2,ans=`${n1*m1}/${l} và ${n2*m2}/${l}`;a.push(q("g4-common",4,i<10?"Dễ":i<22?"Trung bình":"Khó",`Quy đồng hai phân số ${n1}/${d1} và ${n2}/${d2}. Chọn kết quả đúng.`,ans,[`${n1}/${l} và ${n2}/${l}`,`${n1*m2}/${l} và ${n2*m1}/${l}`,`${n1*d2}/${d1*d2} và ${n2*d1}/${d1+d2}`],`BCNN của ${d1} và ${d2} là ${l}. Nhân cả tử và mẫu của phân số thứ nhất với ${m1}; phân số thứ hai với ${m2}. Ta được ${ans}.`))}
 return a;
}
function fracOps4(){
 const a=[];for(let i=0;i<30;i++){const d1=2+(i%6),d2=3+((i*3)%7),n1=1+(i%d1),n2=1+((i+1)%d2),l=d1*d2/gcd(d1,d2),A=n1*(l/d1),B=n2*(l/d2),add=i%2===0,num=add?A+B:Math.abs(A-B),correct=frac(num,l);a.push(q("g4-frac-ops",4,i<10?"Dễ":i<22?"Trung bình":"Khó",`${n1}/${d1} ${add?"+":"−"} ${n2}/${d2} = ?`,correct,[frac(num+1,l),frac(Math.max(1,num-1),l),frac(num,d1+d2)],`Quy đồng mẫu số về ${l}: ${n1}/${d1} = ${A}/${l}, ${n2}/${d2} = ${B}/${l}. Sau đó ${add?"cộng":"trừ"} tử số: ${A} ${add?"+":"−"} ${B} = ${add?A+B:Math.abs(A-B)}. Rút gọn được ${correct}.`))}
 return a;
}
function geo4(){
 const a=[];for(let i=0;i<30;i++){const w=4+(i%10),h=6+((i*2)%11);if(i%3===0){const r=2*(w+h);a.push(q("g4-geometry",4,i<10?"Dễ":"Trung bình",`Hình chữ nhật dài ${h} cm, rộng ${w} cm. Chu vi bằng?`,r,[w*h,2*w+h,r+2],`Chu vi hình chữ nhật = (dài + rộng) × 2 = (${h} + ${w}) × 2 = ${r} cm.`))}else if(i%3===1){const r=w*h;a.push(q("g4-geometry",4,i<10?"Dễ":"Trung bình",`Hình chữ nhật dài ${h} cm, rộng ${w} cm. Diện tích bằng?`,r,[2*(w+h),r+w,r-h],`Diện tích hình chữ nhật = dài × rộng = ${h} × ${w} = ${r} cm².`))}else{const s=4+(i%12),r=s*s;a.push(q("g4-geometry",4,"Trung bình",`Hình vuông cạnh ${s} cm. Diện tích bằng?`,r,[4*s,2*s,r+s],`Diện tích hình vuông = cạnh × cạnh = ${s} × ${s} = ${r} cm².`))}}
 return a;
}
function decMul5(){
 const a=[];for(let i=0;i<30;i++){const x=(12+i*1.3),y=(1.2+(i%7)*0.4),r=Math.round(x*y*100)/100;a.push(q("g5-dec-mul",5,i<10?"Dễ":i<22?"Trung bình":"Khó",`${fmt(x)} × ${fmt(y)} = ?`,fmt(r),[fmt(r+0.1),fmt(r-0.1),fmt(r+1)],`Bỏ dấu phẩy và nhân như số tự nhiên, sau đó đếm tổng số chữ số ở phần thập phân của hai thừa số để đặt lại dấu phẩy. Kết quả: ${fmt(r)}.`))}
 return a;
}
function decDiv5(){
 const a=[];for(let i=0;i<30;i++){const d=1.2+(i%8)*0.2,quo=2.5+(i%10)*0.5,n=Math.round(d*quo*100)/100;a.push(q("g5-dec-div",5,i<10?"Dễ":i<22?"Trung bình":"Khó",`${fmt(n)} : ${fmt(d)} = ?`,fmt(quo),[fmt(quo+0.5),fmt(quo-0.5),fmt(quo+1)],`Dời dấu phẩy ở số chia sang phải để số chia thành số tự nhiên; dời dấu phẩy ở số bị chia cùng số chữ số. Sau đó chia như số tự nhiên. Vì ${fmt(d)} × ${fmt(quo)} = ${fmt(n)}, nên thương là ${fmt(quo)}.`))}
 return a;
}
function frac5(){
 const a=[];for(let i=0;i<30;i++){const d1=3+(i%8),d2=4+((i*2)%9),n1=1+(i%(d1-1)),n2=1+((i+2)%(d2-1)),mode=i%4,l=d1*d2/gcd(d1,d2),A=n1*(l/d1),B=n2*(l/d2);let text,correct,explain;if(mode===0){correct=frac(A+B,l);text=`${n1}/${d1} + ${n2}/${d2} = ?`;explain=`BCNN = ${l}. Quy đồng: ${A}/${l} + ${B}/${l} = ${A+B}/${l}; rút gọn được ${correct}.`}else if(mode===1){correct=frac(Math.abs(A-B),l);text=`${n1}/${d1} − ${n2}/${d2} (lấy hiệu dương) = ?`;explain=`BCNN = ${l}. Quy đồng thành ${A}/${l} và ${B}/${l}; lấy hiệu tử số rồi rút gọn được ${correct}.`}else if(mode===2){correct=frac(n1*n2,d1*d2);text=`${n1}/${d1} × ${n2}/${d2} = ?`;explain=`Nhân tử với tử, mẫu với mẫu: (${n1}×${n2})/(${d1}×${d2}) = ${n1*n2}/${d1*d2}; rút gọn được ${correct}.`}else{correct=frac(n1*d2,d1*n2);text=`${n1}/${d1} : ${n2}/${d2} = ?`;explain=`Chia cho phân số bằng nhân với phân số đảo ngược: ${n1}/${d1} × ${d2}/${n2} = ${n1*d2}/${d1*n2}; rút gọn được ${correct}.`}a.push(q("g5-frac-ops",5,i<8?"Dễ":i<22?"Trung bình":"Khó",text,correct,[frac((Number(correct.split("/")[0])||1)+1,Number(correct.split("/")[1])||1),frac(n1+n2,d1+d2),frac(Math.abs(n1-n2)||1,d1+d2)],explain))}
 return a;
}
function geoPlane5(){
 const a=[];for(let i=0;i<30;i++){if(i%3===0){const b=6+(i%10),h=4+(i%8),r=b*h/2;a.push(q("g5-geo-plane",5,"Trung bình",`Tam giác có đáy ${b} cm, chiều cao ${h} cm. Diện tích bằng?`,fmt(r),[fmt(b*h),fmt(b+h),fmt(r+2)],`Diện tích tam giác = đáy × chiều cao : 2 = ${b} × ${h} : 2 = ${fmt(r)} cm².`))}else if(i%3===1){const a1=5+(i%9),b1=9+(i%11),h=4+(i%7),r=(a1+b1)*h/2;a.push(q("g5-geo-plane",5,"Khó",`Hình thang có hai đáy ${a1} cm và ${b1} cm, cao ${h} cm. Diện tích bằng?`,fmt(r),[fmt((a1+b1)*h),fmt(a1*b1),fmt(r+h)],`Diện tích hình thang = (đáy lớn + đáy bé) × chiều cao : 2 = (${a1}+${b1})×${h}:2 = ${fmt(r)} cm².`))}else{const rad=2+(i%7),r=Math.round(3.14*rad*rad*100)/100;a.push(q("g5-geo-plane",5,"Khó",`Hình tròn bán kính ${rad} cm. Lấy π = 3,14. Diện tích bằng?`,fmt(r),[fmt(2*3.14*rad),fmt(r+3.14),fmt(rad*rad)],`Diện tích hình tròn = r × r × 3,14 = ${rad} × ${rad} × 3,14 = ${fmt(r)} cm².`))}}
 return a;
}
function geoVolume5(){
 const a=[];for(let i=0;i<30;i++){const l=5+(i%9),w=3+(i%7),h=2+(i%6);if(i%2===0){const r=l*w*h;a.push(q("g5-geo-volume",5,i<12?"Trung bình":"Khó",`Hình hộp chữ nhật dài ${l} cm, rộng ${w} cm, cao ${h} cm. Thể tích bằng?`,r,[2*(l*w+l*h+w*h),l*w,r+h],`Thể tích hình hộp chữ nhật = dài × rộng × cao = ${l} × ${w} × ${h} = ${r} cm³.`))}else{const s=2+(i%8),r=s*s*s;a.push(q("g5-geo-volume",5,"Trung bình",`Hình lập phương cạnh ${s} cm. Thể tích bằng?`,r,[6*s*s,s*s,4*s],`Thể tích hình lập phương = cạnh × cạnh × cạnh = ${s}³ = ${r} cm³.`))}}
 return a;
}
[
 [{lessonId:"g4-mul",id:401,grade:4,title:"Nhân số tự nhiên — 30 câu",topic:"Phép nhân",level:"Dễ → Khó",desc:"Nhân nhiều chữ số, đặt tính và kiểm tra kết quả"},mul4()],
 [{lessonId:"g4-div",id:402,grade:4,title:"Chia số tự nhiên — 30 câu",topic:"Phép chia",level:"Dễ → Khó",desc:"Chia và kiểm tra bằng phép nhân"},div4()],
 [{lessonId:"g4-common",id:403,grade:4,title:"Quy đồng mẫu số — 30 câu",topic:"Phân số",level:"Trung bình",desc:"BCNN, nhân cả tử và mẫu"},common4()],
 [{lessonId:"g4-frac-ops",id:404,grade:4,title:"Cộng trừ phân số — 30 câu",topic:"Phân số",level:"Trung bình",desc:"Quy đồng rồi cộng/trừ"},fracOps4()],
 [{lessonId:"g4-geometry",id:405,grade:4,title:"Hình học lớp 4 — 30 câu",topic:"Hình học",level:"Trung bình",desc:"Chu vi, diện tích hình chữ nhật và hình vuông"},geo4()],
 [{lessonId:"g5-dec-mul",id:501,grade:5,title:"Nhân số thập phân — 30 câu",topic:"Phép nhân",level:"Dễ → Khó",desc:"Nhân và đặt dấu phẩy"},decMul5()],
 [{lessonId:"g5-dec-div",id:502,grade:5,title:"Chia số thập phân — 30 câu",topic:"Phép chia",level:"Dễ → Khó",desc:"Dời dấu phẩy và thực hiện phép chia"},decDiv5()],
 [{lessonId:"g5-frac-ops",id:503,grade:5,title:"Phân số nâng cao — 30 câu",topic:"Phân số",level:"Trung bình → Khó",desc:"Quy đồng, cộng, trừ, nhân, chia"},frac5()],
 [{lessonId:"g5-geo-plane",id:504,grade:5,title:"Tam giác, hình thang, hình tròn — 30 câu",topic:"Hình học",level:"Trung bình → Khó",desc:"Diện tích các hình phẳng"},geoPlane5()],
 [{lessonId:"g5-geo-volume",id:505,grade:5,title:"Thể tích hình hộp & lập phương — 30 câu",topic:"Hình học",level:"Trung bình → Khó",desc:"Diện tích, thể tích hình khối"},geoVolume5()]
].forEach(([m,qs])=>addLesson(m,qs));
})();