(()=>{
const D=window.APP_DATA;if(!D)return;let id=950000;
function q(grade,subject,type,text,correct,wrong,explain){const vals=[String(correct),...wrong.map(String)].filter((v,i,a)=>a.indexOf(v)===i);while(vals.length<4)vals.push("Khác "+vals.length);const a=vals.shift(),pos=id%4;vals.splice(pos,0,a);return{id:id++,grade,subject,type,level:"Nâng cao",q:text,options:vals.slice(0,4),answer:pos,explain}}
const out=[];
for(let i=1;i<=60;i++){const g=i<=30?4:5,mode=i%8;
 if(mode===0){const h=1+i%5,m=15+(i*5)%45,total=h*60+m;out.push(q(g,"math","time",`${h} giờ ${m} phút bằng bao nhiêu phút?`,total,[h*60,m,total+60],`Đổi giờ ra phút: ${h}×60=${h*60}; cộng ${m} được ${total} phút.`))}
 if(mode===1){const price=12000+(i%8)*3000,n=2+i%5,r=price*n;out.push(q(g,"math","money",`Mua ${n} quyển vở giá ${price.toLocaleString("vi-VN")}đ/quyển. Cần trả?`,r,[price+n,r-price,r+price],`Tiền phải trả = ${price}×${n}=${r} đồng.`))}
 if(mode===2){const a=2+i%4,b=3+i%5;out.push(q(g,"math","ratio",`Tỉ số của ${a*7} và ${b*7} là:`,`${a}/${b}`,[`${b}/${a}`,`${a+b}/7`,`${a*7}/${b}`],`Chia cả hai số cho 7, được tỉ số ${a}:${b} = ${a}/${b}.`))}
 if(mode===3){const base=100+20*(i%5),p=10+5*(i%6),r=base*p/100;out.push(q(g,"math","percent",`${p}% của ${base} bằng:`,r,[base-p,p,r+10],`${p}% × ${base} = ${p}/100 × ${base} = ${r}.`))}
 if(mode===4){const v=30+5*(i%6),t=2+i%3,r=v*t;out.push(q(g,"math","speed",`Xe đi với vận tốc ${v} km/h trong ${t} giờ. Quãng đường?`,r,[v+t,r-v,r+t],`S = v×t = ${v}×${t} = ${r} km.`))}
 if(mode===5){const child=8+i%5,diff=28,r=child+diff;out.push(q(g,"math","age",`Con ${child} tuổi, bố hơn con ${diff} tuổi. Bố bao nhiêu tuổi?`,r,[diff-child,child*2,r+child],`${child}+${diff}=${r} tuổi.`))}
 if(mode===6){const sum=60+i*2,diff=10+(i%6)*2,big=(sum+diff)/2,small=(sum-diff)/2;out.push(q(g,"math","find-two",`Hai số có tổng ${sum}, hiệu ${diff}. Số lớn là:`,big,[small,sum-diff,big+diff],`Số lớn = (tổng + hiệu) : 2 = (${sum}+${diff}):2 = ${big}.`))}
 if(mode===7){const a=20+i,b=15+i,c=10+i,max=Math.max(a,b,c);out.push(q(g,"math","chart",`Biểu đồ ghi: Thứ Hai ${a} quyển, Thứ Ba ${b}, Thứ Tư ${c}. Ngày nhiều nhất có bao nhiêu quyển?`,max,[Math.min(a,b,c),a+b+c,Math.round((a+b+c)/3)],`So sánh ba giá trị; lớn nhất là ${max}.`))}
}
const viTypes=["sentence-writing","spelling-fix","long-reading","main-idea","homonym","relation-word","adverbial"];
for(let i=0;i<70;i++){const g=i<35?4:5,t=viTypes[i%viTypes.length];
 if(t==="sentence-writing")out.push(q(g,"vietnamese",t,"Câu nào diễn đạt đầy đủ, rõ ý?","Buổi sáng, em cùng mẹ đi bộ trong công viên.",["Buổi sáng trong công viên.","Em cùng mẹ.","Đi bộ rất."],"Câu đúng có đủ thành phần và diễn đạt trọn ý."));
 if(t==="spelling-fix")out.push(q(g,"vietnamese",t,"Chọn cách viết đúng:","suy nghĩ",["xuy nghĩ","suy nghỉ","xuy nghỉ"],"“Suy nghĩ” là cách viết đúng chính tả."));
 if(t==="long-reading")out.push(q(g,"vietnamese",t,"Đọc: “Nam chăm sóc cây non mỗi sáng. Dù trời nắng, em vẫn tưới vừa đủ nước và nhổ cỏ quanh gốc. Sau vài tuần, cây lớn nhanh.” Vì sao cây lớn nhanh?","Nam chăm sóc cây đều đặn",["Cây tự lớn","Vì trời luôn mưa","Vì không có nắng"],"Đoạn văn cho biết Nam tưới nước và nhổ cỏ đều đặn."));
 if(t==="main-idea")out.push(q(g,"vietnamese",t,"Ý chính của đoạn kể về một bạn nhỏ giúp người già qua đường là gì?","Biết giúp đỡ người khác",["Đi nhanh ngoài đường","Không cần quan tâm ai","Chỉ giúp bạn bè"],"Hành động chính thể hiện sự quan tâm và giúp đỡ."));
 if(t==="homonym")out.push(q(g,"vietnamese",t,"Từ “đường” trong “đường đi” và “đường ăn” là hiện tượng:","Từ đồng âm",["Từ đồng nghĩa","Từ trái nghĩa","Từ láy"],"Cùng âm nhưng nghĩa khác nhau nên là từ đồng âm."));
 if(t==="relation-word")out.push(q(g,"vietnamese",t,"Điền quan hệ từ: “___ trời mưa, em vẫn đi học đúng giờ.”","Mặc dù",["Vì","Và","Hoặc"],"“Mặc dù... vẫn...” biểu thị quan hệ tương phản."));
 if(t==="adverbial")out.push(q(g,"vietnamese",t,"Trong câu “Buổi sáng, chúng em tập thể dục.” trạng ngữ là:","Buổi sáng",["chúng em","tập thể dục","chúng em tập"],"“Buổi sáng” bổ sung thông tin về thời gian."));
}
const enTypes=["listening","phonics","stress","communication","topic-vocab","grammar"];
for(let i=0;i<70;i++){const g=i<35?4:5,t=enTypes[i%enTypes.length];
 if(t==="listening")out.push(q(g,"english",t,"Listen/read: “Tom goes to school by bus.” How does Tom go to school?","By bus",["By bike","On foot","By car"],"The sentence says “by bus”."));
 if(t==="phonics")out.push(q(g,"english",t,"Which word has the /ʃ/ sound?","shop",["cat","dog","pen"],"“shop” begins with the /ʃ/ sound."));
 if(t==="stress")out.push(q(g,"english",t,"Which word is stressed on the first syllable?","TAble",["beGIN","aBOUT","reLAX"],"“table” has first-syllable stress."));
 if(t==="communication")out.push(q(g,"english",t,"A: How are you? B: ___","I'm fine, thank you.",["I'm ten years old.","It's Monday.","At school."],"This is the natural reply to “How are you?”"));
 if(t==="topic-vocab")out.push(q(g,"english",t,"Which word belongs to the school topic?","notebook",["banana","tiger","river"],"A notebook is used at school."));
 if(t==="grammar")out.push(q(g,"english",t,g===5?"She ___ her homework yesterday.":"He ___ English every Monday.",g===5?"did":"studies",g===5?["does","do","doing"]:["study","studying","studied"],g===5?"“Yesterday” needs past simple: did.":"Singular subject “He” takes studies."));
}
D.questions.push(...out);D.advancedQuestions=out;
})();