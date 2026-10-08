const math=require("./math-engine"),skills=require("./math-skills"),natural=require("./math-natural");
function norm(s=""){return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}
const lessons=[
 {keys:["phep nhan","nhan lop 4","multiplication"],answer:[
  "PHÉP NHÂN – cách làm từng bước","",
  "1. Đặt tính sao cho các chữ số cùng hàng thẳng cột.",
  "2. Nhân lần lượt từ phải sang trái.",
  "3. Nếu tích từ 10 trở lên, viết hàng đơn vị và nhớ hàng chục.",
  "4. Cộng số nhớ vào lượt nhân tiếp theo.",
  "5. Kiểm tra lại bằng phép chia.","",
  "Ví dụ: 324 × 6",
  "- 6 × 4 = 24, viết 4 nhớ 2.",
  "- 6 × 2 = 12, cộng 2 = 14, viết 4 nhớ 1.",
  "- 6 × 3 = 18, cộng 1 = 19.",
  "→ 324 × 6 = 1.944.","",
  "Kiểm tra: 1.944 ÷ 6 = 324."
 ]},
 {keys:["phep chia","chia lop 4","division"],answer:[
  "PHÉP CHIA – cách làm từng bước","",
  "1. Chia từ trái sang phải.",
  "2. Chia → nhân → trừ → hạ chữ số tiếp theo.",
  "3. Lặp lại đến hết.",
  "4. Nếu có số dư thì số dư phải nhỏ hơn số chia.","",
  "Ví dụ: 936 ÷ 4",
  "- 9 ÷ 4 = 2, dư 1.",
  "- Hạ 3 được 13; 13 ÷ 4 = 3, dư 1.",
  "- Hạ 6 được 16; 16 ÷ 4 = 4.",
  "→ 936 ÷ 4 = 234.","",
  "Kiểm tra: 234 × 4 = 936."
 ]},
 {keys:["quy dong","mau so chung","common denominator"],answer:[
  "QUY ĐỒNG HAI PHÂN SỐ","",
  "Mục tiêu: đưa hai phân số về cùng mẫu số nhưng không đổi giá trị.","",
  "Ví dụ: 1/3 và 1/4",
  "- BCNN(3,4) = 12.",
  "- 1/3 = 4/12.",
  "- 1/4 = 3/12.",
  "→ Sau quy đồng: 4/12 và 3/12.","",
  "Nhớ: nhân mẫu với số nào thì phải nhân tử với đúng số đó."
 ]},
 {keys:["cong phan so","tru phan so","fraction addition","fraction subtraction"],answer:[
  "CỘNG / TRỪ PHÂN SỐ","",
  "- Cùng mẫu: giữ nguyên mẫu, cộng hoặc trừ tử.",
  "Ví dụ: 3/7 + 2/7 = 5/7.","",
  "- Khác mẫu: quy đồng trước.",
  "Ví dụ: 1/2 + 1/3 = 3/6 + 2/6 = 5/6.","",
  "Cuối cùng rút gọn nếu có thể."
 ]},
 {keys:["nhan phan so","fraction multiplication"],answer:["NHÂN PHÂN SỐ","","a/b × c/d = (a×c)/(b×d).","","Ví dụ: 2/3 × 5/4 = 10/12 = 5/6.","Mẹo: rút gọn chéo trước khi nhân nếu được."]},
 {keys:["chia phan so","fraction division"],answer:["CHIA PHÂN SỐ","","a/b ÷ c/d = a/b × d/c.","","Ví dụ: 2/3 ÷ 4/5 = 2/3 × 5/4 = 5/6."]},
 {keys:["dien tich tam giac","cong thuc tam giac"],answer:["DIỆN TÍCH TAM GIÁC","","S = đáy × chiều cao ÷ 2.","Ví dụ: đáy 8 cm, cao 5 cm → S = 8 × 5 ÷ 2 = 20 cm²."]},
 {keys:["hinh thang","cong thuc hinh thang"],answer:["HÌNH THANG","","S = (đáy lớn + đáy bé) × chiều cao ÷ 2.","Ví dụ: (12 + 8) × 5 ÷ 2 = 50 cm²."]},
 {keys:["hinh tron","cong thuc hinh tron"],answer:["HÌNH TRÒN","","Chu vi: C = 2 × 3,14 × r = 3,14 × d.","Diện tích: S = 3,14 × r × r.","Trong đó d = 2r."]},
 {keys:["the tich hinh hop","hinh hop chu nhat"],answer:["HÌNH HỘP CHỮ NHẬT","","V = dài × rộng × cao.","Ví dụ: 5 × 4 × 3 = 60 cm³."]},
 {keys:["phan tram","percent"],answer:["PHẦN TRĂM","","x% = x/100.","Muốn tìm x% của A: A × x ÷ 100.","Ví dụ: 25% của 360 = 360 × 25 ÷ 100 = 90."]},
 {keys:["trung binh cong","average"],answer:["TRUNG BÌNH CỘNG","","Trung bình cộng = Tổng các số ÷ Số lượng số.","Ví dụ: (8 + 10 + 12) ÷ 3 = 10."]}
];
const english=[
 {keys:["hien tai don","present simple"],answer:["THÌ HIỆN TẠI ĐƠN","","I/You/We/They + V.","He/She/It + V-s/es.","Phủ định: do/does not + V.","Ví dụ: She goes to school every day.","Dấu hiệu: always, usually, often, sometimes, every day."]},
 {keys:["hien tai tiep dien","present continuous"],answer:["THÌ HIỆN TẠI TIẾP DIỄN","","S + am/is/are + V-ing.","Dùng cho hành động đang xảy ra ngay lúc nói.","Ví dụ: I am studying English now."]},
 {keys:["bi dong","passive voice"],answer:["CÂU BỊ ĐỘNG","","Công thức chung: S + be + V3/ed (+ by O).","Ví dụ: The office is cleaned every Monday.","Be phải được chia theo thì của câu."]}
];
const vietnamese=[
 {keys:["chu ngu vi ngu","chu ngu","vi ngu"],answer:["CHỦ NGỮ – VỊ NGỮ","","Chủ ngữ: trả lời Ai? Cái gì? Con gì?","Vị ngữ: cho biết chủ ngữ làm gì, thế nào, là gì.","Ví dụ: Lan đang học bài.","- Chủ ngữ: Lan.","- Vị ngữ: đang học bài."]},
 {keys:["tu loai","danh tu dong tu tinh tu"],answer:["TỪ LOẠI CƠ BẢN","","Danh từ: chỉ người, vật, sự vật.","Động từ: chỉ hoạt động, trạng thái.","Tính từ: chỉ đặc điểm, tính chất."]}
];
function find(prompt,list){const p=norm(prompt);let best=null,score=0;for(const item of list){let s=0;for(const k of item.keys)if(p.includes(norm(k)))s+=norm(k).length;if(s>score){score=s;best=item}}return score?best:null}
function explainMath(prompt){
 const solved=natural.solve(prompt)||skills.solveWordProblem(prompt)||math.deterministic(prompt);
 if(solved){const a=natural.answer(solved);if(a)return a}
 const x=find(prompt,lessons);return x?x.answer.join("\n"):null
}
function answer(prompt,subject="general"){
 if(subject==="math"){const a=explainMath(prompt);if(a)return {answer:a,engine:"local-tutor",verified:true}}
 if(subject==="english"){const x=find(prompt,english);if(x)return {answer:x.answer.join("\n"),engine:"local-tutor",verified:true}}
 if(subject==="vietnamese"){const x=find(prompt,vietnamese);if(x)return {answer:x.answer.join("\n"),engine:"local-tutor",verified:true}}
 const m=explainMath(prompt);if(m)return {answer:m,engine:"local-tutor",verified:true,subject:"math"};
 const e=find(prompt,english);if(e)return {answer:e.answer.join("\n"),engine:"local-tutor",verified:true,subject:"english"};
 const v=find(prompt,vietnamese);if(v)return {answer:v.answer.join("\n"),engine:"local-tutor",verified:true,subject:"vietnamese"};
 return null
}
module.exports={answer,explainMath};
