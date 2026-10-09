window.AdvancedExamBank=(() => {
 const D=window.APP_DATA||{},subjects={math:"Toán",vietnamese:"Tiếng Việt",english:"Tiếng Anh"};
 const exams=[];
 for(const grade of [4,5])for(const subject of Object.keys(subjects))for(let variant=1;variant<=3;variant++){
  exams.push({id:`adv-${grade}-${subject}-${variant}`,grade,subject,variant,title:`Nâng cao ${subjects[subject]} lớp ${grade} – Đề ${variant}`,time:60,advanced:true});
 }
 function questions(id){
  const exam=exams.find(e=>e.id===id);
  if(!exam)return [];
  const pool=(D.advancedQuestions||[]).filter(q=>q.grade===exam.grade&&q.subject===exam.subject);
  if(pool.length<30)return [];
  const seed=exam.variant*7+exam.grade;
  return pool.map((q,i)=>({q,index:(i*17+seed)%pool.length})).sort((a,b)=>a.index-b.index).slice(0,30).map(x=>({...x.q}));
 }
 const challenge=[
  ["Tìm x: x : 4 = 3 216",["804","12 864","3 220","12 644"],1,"Nhân hai vế với 4: x = 3 216 × 4 = 12 864."],
  ["Tính: (25 630 + 14 370) : 8",["4 000","5 000","6 000","5 500"],1,"Tổng bằng 40 000; chia 8 được 5 000."],
  ["Tổng hai số là 196, hiệu là 48. Số lớn bằng:",["122","74","148","124"],0,"Số lớn = (196 + 48) : 2 = 122."],
  ["Hiệu là 1 580. Nếu tăng số trừ thêm 280 thì hiệu mới bằng:",["1 860","1 300","1 580","1 400"],1,"Tăng số trừ 280 làm hiệu giảm 280: 1 300."],
  ["Tính x: 8 × x + 3 × x = 165",["11","13","15","18"],2,"11x = 165 nên x = 15."],
  ["Một cửa hàng có 125 kg gạo, bán 3/5 số gạo. Còn lại bao nhiêu kg?",["50","75","45","60"],0,"Đã bán 75 kg, còn 125 − 75 = 50 kg."],
  ["Một hình vuông có chu vi 48 cm. Diện tích là:",["96 cm²","144 cm²","192 cm²","576 cm²"],1,"Cạnh bằng 48 : 4 = 12 cm; diện tích = 144 cm²."],
  ["Đổi: 4 tấn 25 kg = ... kg",["425","4 025","4 250","40 025"],1,"4 tấn là 4 000 kg, cộng 25 kg được 4 025 kg."],
  ["Một số có 3 chữ số, lớn hơn 296 và nhỏ hơn 302. Có mấy số chẵn?",["2","3","4","5"],0,"Các số chẵn thỏa mãn: 298, 300."],
  ["Tính nhanh: 25 × 37 × 4",["925","3 700","370","1 480"],1,"25 × 4 × 37 = 100 × 37 = 3 700."],
  ["Trung bình cộng của 18, 24, 36 và 42 là:",["28","30","32","34"],1,"(18 + 24 + 36 + 42) : 4 = 30."],
  ["Một đội đi 3 giờ, mỗi giờ 45 km, rồi đi tiếp 25 km. Tổng quãng đường là:",["135 km","150 km","160 km","180 km"],2,"45 × 3 + 25 = 160 km."],
  ["Tính: 12 500 − 8 400 : 7",["11 300","4 100","12 300","10 900"],0,"Thực hiện chia trước: 8 400 : 7 = 1 200; lấy 12 500 − 1 200 = 11 300."],
  ["Số lớn nhất gồm các chữ số 0, 2, 4, 6, 8, mỗi chữ số dùng một lần là:",["86 420","84 620","86 402","80 642"],0,"Xếp chữ số theo thứ tự giảm dần."],
  ["Nếu 6 hộp chứa 144 chiếc bút, 9 hộp cùng loại chứa bao nhiêu chiếc?",["196","216","224","240"],1,"Mỗi hộp 144 : 6 = 24 bút; 9 hộp có 216 bút."],
  ["3 giờ 25 phút bằng bao nhiêu phút?",["185","205","225","325"],1,"3 × 60 + 25 = 205 phút."],
  ["Góc lớn hơn góc vuông nhưng nhỏ hơn góc bẹt gọi là:",["Góc nhọn","Góc tù","Góc bẹt","Góc vuông"],1,"Góc tù có số đo lớn hơn 90° và nhỏ hơn 180°."],
  ["Biểu thức 240 + 360 : 6 × 3 có giá trị:",["300","420","540","900"],1,"360 : 6 × 3 = 180; cộng 240 được 420."],
  ["Số tự nhiên nhỏ nhất khi chia cho 7 được thương 25, dư 3 là:",["175","178","182","179"],1,"Số bị chia = 7 × 25 + 3 = 178."],
  ["Một mảnh vườn hình chữ nhật dài 28 m, rộng bằng một nửa chiều dài. Chu vi là:",["42 m","56 m","84 m","392 m"],2,"Chiều rộng 14 m; chu vi = (28 + 14) × 2 = 84 m."]
 ];
 exams.unshift({id:"adv-vietjack-inspired-4-20",grade:4,subject:"math",variant:0,title:"Toán nâng cao lớp 4 – 20 câu thử thách (tham khảo dạng VietJack)",time:45,advanced:true,challenge:true});
 const originalQuestions=questions;
 function getQuestions(id){
  if(id==="adv-vietjack-inspired-4-20")return challenge.map(([q,options,answer,explain],i)=>({id:"challenge-4-"+(i+1),grade:4,subject:"math",q,options,answer,explain,examType:"mcq"}));
  return originalQuestions(id);
 }
 return {exams,questions:getQuestions};
})();
