/* Client-side access gate for standalone practice exams.
   Production exam submissions must additionally verify user identity on the server. */
window.ExamAccountGate=(()=>{
 let pending=null;
 async function check(){
  if(pending)return pending;
  pending=(async()=>{
   if(!window.SupabaseApp)return false;
   await window.SupabaseApp.ready();
   if(!window.SupabaseApp.enabled())return false;
   const session=await window.SupabaseApp.session();
   if(!session?.access_token)return false;
   const result=await window.SupabaseApp.client.auth.getUser(session.access_token);
   return Boolean(result?.data?.user?.id&&!result.error);
  })().catch(()=>false).finally(()=>{pending=null});
  return pending;
 }
 function prompt(container){
  const isPreview=/\.github\.dev$/i.test(location.hostname);
  const notice=isPreview
   ? '<p>Bạn đang mở bản chạy thử trên github.dev. Phiên đăng nhập ở baitapcap1.vercel.app không tự chuyển sang đây.</p><p><a href="https://baitapcap1.vercel.app/kiem-tra.html">Mở bài kiểm tra trên website chính →</a></p>'
   : '<p>Hãy đăng nhập vào Bài Tập Cấp 1 trên cùng địa chỉ website này trước khi bắt đầu.</p>';
  container.innerHTML='<section class="exam-auth-wall" role="status"><div class="exam-auth-symbol">🔒</div><h2>Đăng nhập để làm bài kiểm tra</h2>'+notice+'<div class="exam-auth-actions"><a href="/?auth=register">Tạo tài khoản mới</a><a class="secondary" href="/?auth=login">Đã có tài khoản? Đăng nhập</a></div><button type="button" id="examBackToList">← Xem danh sách đề</button></section>';
 }
 return {check,prompt};
})();
