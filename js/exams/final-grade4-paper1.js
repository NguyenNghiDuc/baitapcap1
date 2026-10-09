(()=>{
const questions=[
{q:"Phép chia 480 : 6 có kết quả là:",options:["80","800","60","8"],answer:0,explain:"480 : 6 = 80."},
{q:"Tổng hai số là 37, số lớn hơn số bé 19 đơn vị. Số lớn là:",options:["56","28","19","9"],answer:1,explain:"Số lớn = (37 + 19) : 2 = 28."},
{q:"Hình vuông có mấy cặp cạnh vuông góc với nhau?",options:["4","3","2","1"],answer:0,explain:"Hình vuông có bốn góc vuông, tương ứng bốn cặp cạnh kề vuông góc."},
{q:"3 tấn 5 kg = ... kg.",options:["3500","3005","3050","305"],answer:1,explain:"3 tấn = 3000 kg, cộng 5 kg thành 3005 kg."}
];
let answers={};const host=document.querySelector("#paperFinalApp");
function show(){
host.innerHTML='<h2>Đề số 1 – Cuối học kỳ 1 Toán lớp 4</h2><p>Bản nhập hiện có 4 câu trắc nghiệm bạn cung cấp. Phần tự luận và các câu còn lại đang chờ nội dung đầy đủ.</p>'+questions.map((q,i)=>'<section class="card"><h3>Câu '+(i+1)+'. '+q.q+'</h3><div class="choices">'+q.options.map((o,j)=>'<label><input name="q'+i+'" type="radio" value="'+j+'" '+(answers[i]===j?'checked':'')+'> '+String.fromCharCode(65+j)+'. '+o+'</label>').join("")+'</div></section>').join("")+'<button id="mark">Chấm 4 câu đã nhập</button>';
host.querySelectorAll('input[type="radio"]').forEach(x=>x.onchange=()=>{answers[Number(x.name.slice(1))]=Number(x.value)});
host.querySelector("#mark").onclick=()=>{
let correct=questions.filter((q,i)=>answers[i]===q.answer).length;
host.innerHTML='<h2>Kết quả phần đã nhập: '+correct+'/4 câu</h2><p>Đây chưa phải điểm toàn bài.</p>'+questions.map((q,i)=>'<article class="card"><h3>Câu '+(i+1)+'</h3><p>Em chọn: '+(answers[i]===undefined?'Chưa chọn':String.fromCharCode(65+answers[i]))+'</p><p>Đáp án đúng: '+String.fromCharCode(65+q.answer)+'</p><p>'+q.explain+'</p></article>').join("")+'<button id="again">Làm lại</button>';
host.querySelector("#again").onclick=()=>{answers={};show()};
};
}
show();
})();