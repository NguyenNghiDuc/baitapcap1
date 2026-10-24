const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup(random=()=>0){
 const storage=new Map(),math=Object.create(Math);math.random=random;
 const context=vm.createContext({window:{},Math:math,localStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)||null,removeItem:k=>storage.delete(k)},document:{querySelector:()=>({}),querySelectorAll:()=>[]}});
 const run=file=>vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/exams/',file),'utf8'),context);
 run('interaction.js');return {context,run,storage,I:context.window.ExamInteraction};
}
test('shuffling preserves the correct option by its original index, including duplicates',()=>{
 const {I}=setup();
 for(let answer=0;answer<4;answer++){
  const q={id:'q',options:['same','same','C','D'],answer};
  const before=JSON.stringify(q),[shuffled]=I.prepareQuestions([q]);
  assert.equal(JSON.stringify(q),before);
  assert.notEqual(shuffled.options,q.options);
  assert.equal(shuffled.answer,[3,0,1,2][answer]);
  assert.equal(I.correctText(shuffled),q.options[answer]);
  for(let i=0;i<4;i++)assert.equal(I.isCorrect(shuffled,i),i===shuffled.answer);
 }
});
test('a new attempt uses fresh randomness and leaves other question types intact',()=>{
 let random=0;const {I}=setup(()=>random);
 const source=[{options:['A','B','C','D'],answer:2},...['truefalse','fill','shortanswer','essay','matching'].map(examType=>({examType,answerText:'73',correctValue:'true',pairs:[['x','y']]}))];
 const first=I.prepareQuestions(source);random=.999;const second=I.prepareQuestions(source);
 assert.notEqual(JSON.stringify(first[0].options),JSON.stringify(second[0].options));
 for(let i=1;i<source.length;i++)assert.equal(JSON.stringify(first[i]),JSON.stringify(source[i]));
});
test('runner persists shuffled choices and resumes without reshuffling',()=>{
 const {context,run,storage,I}=setup();
 context.window.LockedExamUI={render:()=>''};context.window.ExamLock={isActive:()=>true,enter:()=>{}};
 run('runner.js');
 const source=Array.from({length:30},(_,i)=>({id:String(i),q:'Question',options:['A','B','C','D'],answer:0}));
 context.window.ExamRunner.start(source,'Test');
 const saved=storage.get('bt_term_quiz'),quiz=JSON.parse(saved);
 assert.equal(quiz.questions[0].answer,3);
 assert.equal(quiz.questions[0].options[3],'A');
 assert.equal(source[0].answer,0);
 I.prepareQuestions=()=>{throw new Error('must not shuffle on resume')};
 assert.equal(context.window.ExamRunner.resume(),true);
 assert.equal(storage.get('bt_term_quiz'),saved);
});
