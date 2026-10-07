(()=>{
const D=window.APP_DATA;if(!D)return;
let qid=800000;
const pick=(a,i)=>a[((i%a.length)+a.length)%a.length];
function make(examId,grade,subject,type,text,correct,wrong,explain){
 const vals=[String(correct),...wrong.map(String)].filter((v,i,a)=>a.indexOf(v)===i);
 while(vals.length<4)vals.push("Đáp án "+(vals.length+1));
 const ans=vals.shift(),pos=qid%4;vals.splice(pos,0,ans);
 return {id:qid++,examId,subject,grade,type,level:"Tổng hợp",q:text,options:vals.slice(0,4),answer:pos,explain};
}
function mathQs(examId,grade,e){
 const a=[];
 // 1 nhân
 {const x=128+e*7,y=6+(e%9),r=x*y;a.push(make(examId,grade,"math","multiplication",`${x} × ${y} = ?`,r,[r+y,r-y,r+10],`Nhân từ phải sang trái: ${x} × ${y} = ${r}. Có thể kiểm tra bằng ${r} : ${y} = ${x}.`))}
 // 2 chia
 {const d=4+(e%8),q=35+e,n=d*q;a.push(make(examId,grade,"math","division",`${n} : ${d} = ?`,q,[q+1,q-1,q+d],`Vì ${d} × ${q} = ${n} nên ${n} : ${d} = ${q}.`))}
 // 3 biểu thức
 {const x=40+e,y=7+(e%6),z=3+(e%4),r=x+y*z;a.push(make(examId,grade,"math","expression",`${x} + ${y} × ${z} = ?`,r,[(x+y)*z,x+y+z,r-z],`Thực hiện nhân trước: ${y} × ${z} = ${y*z}; rồi cộng ${x} + ${y*z} = ${r}.`))}
 // 4 phân số quy đồng
 {const d1=2+(e%5),d2=3+((e*2)%6),n1=1,n2=1+(e%2),g=(a,b)=>b?g(b,a%b):a,l=d1*d2/g(d1,d2),m1=l/d1,m2=l/d2,ans=`${n1*m1}/${l} và ${n2*m2}/${l}`;a.push(make(examId,grade,"math","fraction-common",`Quy đồng ${n1}/${d1} và ${n2}/${d2} được:`,ans,[`${n1}/${l} và ${n2}/${l}`,`${n1*m2}/${l} và ${n2*m1}/${l}`,`${n1*d2}/${d1*d2} và ${n2*d1}/${d1+d2}`],`BCNN của ${d1} và ${d2} là ${l}. Nhân cả tử và mẫu lần lượt với ${m1} và ${m2}, được ${ans}.`))}
 // 5 cộng phân số
 {const d=4+(e%5),n1=1+(e%2),n2=1+((e+1)%2),num=n1+n2;a.push(make(examId,grade,"math","fraction-add",`${n1}/${d} + ${n2}/${d} = ?`,`${num}/${d}`,[`${num}/${d*2}`,`${n1*n2}/${d}`,`${num+1}/${d}`],`Hai phân số cùng mẫu nên cộng tử: ${n1} + ${n2} = ${num}, giữ mẫu ${d}.`))}
 // 6 đổi đơn vị
 {const m=2+(e%7),cm=m*100;a.push(make(examId,grade,"math","unit",`${m} m bằng bao nhiêu cm?`,cm,[m*10,m*1000,cm+100],`1 m = 100 cm nên ${m} m = ${m} × 100 = ${cm} cm.`))}
 // 7 trung bình cộng
 {const x=20+e,y=30+e,z=40+e,r=(x+y+z)/3;a.push(make(examId,grade,"math","average",`Trung bình cộng của ${x}, ${y}, ${z} là:`,r,[r+5,r-5,x+y+z],`Cộng ba số: ${x+y+z}; chia cho 3: ${x+y+z} : 3 = ${r}.`))}
 // 8 bài toán lời văn
 {const boxes=4+(e%6),each=12+(e%9),r=boxes*each;a.push(make(examId,grade,"math","word-problem",`Có ${boxes} hộp, mỗi hộp ${each} quyển vở. Có tất cả bao nhiêu quyển?`,r,[boxes+each,r-each,r+boxes],`Số vở = số hộp × số vở mỗi hộp = ${boxes} × ${each} = ${r}.`))}
 // 9 hình học
 if(grade===4){const l=8+(e%6),w=4+(e%5),r=l*w;a.push(make(examId,grade,"math","geometry",`Hình chữ nhật dài ${l} cm, rộng ${w} cm. Diện tích là:`,r,[2*(l+w),r+l,r-w],`Diện tích hình chữ nhật = dài × rộng = ${l} × ${w} = ${r} cm².`))}
 else {const b=8+(e%6),h=5+(e%5),r=b*h/2;a.push(make(examId,grade,"math","geometry",`Tam giác có đáy ${b} cm, cao ${h} cm. Diện tích là:`,r,[b*h,b+h,r+h],`Diện tích tam giác = đáy × cao : 2 = ${b} × ${h} : 2 = ${r} cm².`))}
 // 10 lớp 5 thập phân/ lớp4 chu vi
 if(grade===5){const x=(12+e/10),y=2.5,r=Math.round(x*y*100)/100;a.push(make(examId,grade,"math","decimal",`${String(x).replace(".",",")} × 2,5 = ?`,String(r).replace(".",","),[String(r+0.5).replace(".",","),String(r-0.5).replace(".",","),String(r+5).replace(".",",")],`Nhân như số tự nhiên rồi đặt dấu phẩy theo tổng số chữ số thập phân. Kết quả là ${String(r).replace(".",",")}.`))}
 else {const s=5+(e%8),r=4*s;a.push(make(examId,grade,"math","perimeter",`Hình vuông cạnh ${s} cm. Chu vi là:`,r,[s*s,2*s,r+s],`Chu vi hình vuông = cạnh × 4 = ${s} × 4 = ${r} cm.`))}
 return a;
}
function viQs(examId,grade,e){
 const a=[];
 const nouns=["học sinh","cây bàng","dòng sông","ngôi trường"],verbs=["chạy","đọc","viết","hát"],adjs=["chăm chỉ","xanh biếc","cao lớn","yên tĩnh"];
 a.push(make(examId,grade,"vietnamese","word-class",`Từ nào là động từ?`,pick(verbs,e),[pick(nouns,e),pick(adjs,e),pick(nouns,e+1)],`Động từ chỉ hoạt động hoặc trạng thái. “${pick(verbs,e)}” chỉ hoạt động.`));
 a.push(make(examId,grade,"vietnamese","word-class",`Từ nào là tính từ?`,pick(adjs,e+1),[pick(verbs,e),pick(nouns,e),pick(verbs,e+1)],`Tính từ chỉ đặc điểm, tính chất. “${pick(adjs,e+1)}” là tính từ.`));
 const syn=[["siêng năng","chăm chỉ"],["dũng cảm","gan dạ"],["vui vẻ","hân hoan"],["yên tĩnh","im ắng"]];
 {const p=pick(syn,e);a.push(make(examId,grade,"vietnamese","synonym",`Từ đồng nghĩa với “${p[0]}” là:`,p[1],["lười biếng","ồn ào","buồn bã"],`“${p[0]}” và “${p[1]}” có nghĩa gần giống nhau.`))}
 const ant=[["cao","thấp"],["nhanh","chậm"],["sáng","tối"],["chăm","lười"]];
 {const p=pick(ant,e);a.push(make(examId,grade,"vietnamese","antonym",`Từ trái nghĩa với “${p[0]}” là:`,p[1],["đẹp","to","xa"],`“${p[0]}” và “${p[1]}” có nghĩa đối lập.`))}
 const spell=[["xôn xao","xôn sao","sôn xao","sôn sao"],["chăm chỉ","chăm chĩ","trăm chỉ","chăm chỷ"],["rực rỡ","dực dỡ","rực rở","dực rỡ"],["sạch sẽ","xạch sẽ","sạch sẻ","sạch xẽ"]];
 {const p=pick(spell,e);a.push(make(examId,grade,"vietnamese","spelling","Chọn từ viết đúng chính tả:",p[0],p.slice(1),`Cách viết đúng là “${p[0]}”.`))}
 a.push(make(examId,grade,"vietnamese","subject-predicate",`Trong câu “Lan chăm chú đọc sách.”, chủ ngữ là:`,"Lan",["chăm chú","đọc sách","chăm chú đọc sách"],`Chủ ngữ trả lời câu hỏi “Ai?”. Ở đây là “Lan”.`));
 a.push(make(examId,grade,"vietnamese","punctuation",`Dấu câu thích hợp cuối câu “Bạn đã làm xong bài chưa” là:`,"?",[".",",","!"],`Đây là câu hỏi nên dùng dấu chấm hỏi (?).`));
 const compounds=[["học tập","từ ghép"],["long lanh","từ láy"],["xe đạp","từ ghép"],["lấp lánh","từ láy"]];
 {const p=pick(compounds,e);a.push(make(examId,grade,"vietnamese","compound-redup",`“${p[0]}” thuộc loại:`,p[1],[p[1]==="từ ghép"?"từ láy":"từ ghép","danh từ riêng","thành ngữ"],`${p[0]} được xếp vào ${p[1]}.`))}
 const passages=[
  ["Buổi sáng, Minh dậy sớm tưới cây rồi mới đến trường.","Minh làm gì trước khi đến trường?","Tưới cây",["Ăn sáng ở trường","Đá bóng","Ngủ tiếp"]],
  ["Trời mưa lớn nhưng Lan vẫn che ô và đi học đúng giờ.","Lan dùng gì khi trời mưa?","Ô",["Mũ bảo hiểm","Khăn","Áo len"]],
  ["Cây phượng trước sân trường nở đỏ rực báo hiệu mùa hè đến.","Hoa phượng báo hiệu mùa nào?","Mùa hè",["Mùa đông","Mùa xuân","Mùa thu"]],
  ["Nam mượn sách ở thư viện và hứa sẽ trả đúng hạn.","Nam mượn sách ở đâu?","Thư viện",["Nhà sách","Lớp học","Công viên"]]
 ];
 {const p=pick(passages,e);a.push(make(examId,grade,"vietnamese","reading",`Đọc: “${p[0]}”\n${p[1]}`,p[2],p[3],`Thông tin được nêu trực tiếp trong đoạn: ${p[2]}.`))}
 const idioms=[["Có công mài sắt, có ngày nên kim","Kiên trì sẽ thành công"],["Uống nước nhớ nguồn","Biết ơn người đi trước"],["Đoàn kết là sức mạnh","Cùng nhau sẽ mạnh hơn"],["Đi một ngày đàng, học một sàng khôn","Đi nhiều giúp mở mang hiểu biết"]];
 {const p=pick(idioms,e);a.push(make(examId,grade,"vietnamese","meaning",`Ý nghĩa phù hợp với câu “${p[0]}” là:`,p[1],["Không cần cố gắng","Chỉ nên học ở nhà","Làm việc một mình tốt hơn"],`Câu này nhắc chúng ta: ${p[1].toLowerCase()}.`))}
 return a;
}
function enQs(examId,grade,e){
 const a=[];
 const names=["Mai","Nam","Tom","Linda"],places=["school","park","library","market"],foods=["rice","noodles","bread","chicken"];
 {const n=pick(names,e);a.push(make(examId,grade,"english","present-simple",`${n} ___ to school every day.`,"goes",["go","going","went"],`With a singular subject in the present simple, “go” becomes “goes”.`))}
 a.push(make(examId,grade,"english","present-continuous","Look! The children ___ football now.","are playing",["play","plays","played"],`“Now” signals the present continuous: are + verb-ing.`));
 a.push(make(examId,grade,"english","preposition","The book is ___ the table.","on",["at","from","with"],`We use “on” for something resting on a surface.`));
 a.push(make(examId,grade,"english","question-word","___ do you go to school? — By bike.","How",["What","Where","Who"],`“By bike” tells the means of transport, so the question word is “How”.`));
 {const f=pick(foods,e);a.push(make(examId,grade,"english","vocabulary",`Which word is a food?`,f,[pick(places,e),"teacher","beautiful"],`${f} is a kind of food.`))}
 a.push(make(examId,grade,"english","pronoun","This is Lan. ___ is my friend.","She",["He","It","They"],`Lan is a girl, so we use the pronoun “She”.`));
 a.push(make(examId,grade,"english","plural","The plural of “child” is:","children",["childs","childes","childrens"],`“Child” has the irregular plural “children”.`));
 if(grade===5)a.push(make(examId,grade,"english","past-simple","Yesterday, we ___ to the zoo.","went",["go","goes","going"],`“Yesterday” signals the past simple. The past form of “go” is “went”.`));
 else a.push(make(examId,grade,"english","can","Birds can ___.","fly",["flies","flying","flew"],`After “can”, use the base form of the verb: fly.`));
 const readings=[
  ["Lucy gets up at six thirty. She has breakfast and walks to school.","How does Lucy go to school?","She walks.",["By bus.","By car.","By bike."]],
  ["Peter likes science because he enjoys doing experiments.","Why does Peter like science?","He enjoys experiments.",["It is easy.","His friend likes it.","He has no homework."]],
  ["Anna has a small dog named Coco. Coco is brown and very friendly.","What color is Coco?","Brown",["Black","White","Yellow"]],
  ["The school library opens at eight and closes at four thirty.","What time does the library open?","At eight",["At seven","At nine","At four thirty"]]
 ];
 {const p=pick(readings,e);a.push(make(examId,grade,"english","reading",`Read: “${p[0]}”\n${p[1]}`,p[2],p[3],`The answer is stated directly in the passage: ${p[2]}`))}
 const arrange=[
  ["I / usually / do / homework / after dinner.","I usually do homework after dinner."],
  ["She / is / reading / a book / now.","She is reading a book now."],
  ["We / went / to / the beach / yesterday.","We went to the beach yesterday."],
  ["My brother / can / swim / very well.","My brother can swim very well."]
 ];
 {const p=pick(arrange,e);a.push(make(examId,grade,"english","sentence-order",`Choose the correct sentence: ${p[0]}`,p[1],["Usually I homework do after dinner.","I do after dinner usually homework.","Homework I usually after dinner do."],`Correct English word order gives: “${p[1]}”`))}
 return a;
}
D.examSets=[];
for(let i=1;i<=40;i++){
 const grade=i<=20?4:5,examId="mix-"+String(i).padStart(2,"0"),title=`Đề tổng hợp số ${String(i).padStart(2,"0")} — Lớp ${grade}`;
 const qs=[...mathQs(examId,grade,i),...viQs(examId,grade,i),...enQs(examId,grade,i)];
 D.questions.push(...qs);
 const test={id:examId,title,subject:"mixed",grade,time:60,count:30,difficulty:"Tổng hợp",examId,breakdown:{math:10,vietnamese:10,english:10}};
 D.tests.push(test);D.examSets.push(test);
}
})();