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
 return {exams,questions};
})();
