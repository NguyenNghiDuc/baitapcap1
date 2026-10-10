/* Standalone exams use the same Supabase Auth origin and project as the home page.
   A cached UI identity or a token from another origin is not authentication. */
window.ExamAccountGate=(()=>{
 let pending=null,lastReason="missing";
 async function check(){
  if(pending)return pending;
  pending=(async()=>{
   if(!window.SupabaseApp){lastReason="sdk";return false}
   await window.SupabaseApp.ready();
   if(!window.SupabaseApp.enabled()){lastReason="config";return false}
   const client=window.SupabaseApp.client;
   let session=(await client.auth.getSession()).data?.session;
   if(!session){lastReason="missing";return false}
   let result=await client.auth.getUser();
   if(result.error||!result.data?.user?.id){
    // Refresh expired access tokens once instead of showing a false logout.
    const refreshed=await client.auth.refreshSession();
    if(refreshed.error||!refreshed.data?.session){lastReason="expired";return false}
    session=refreshed.data.session;
    result=await client.auth.getUser();
   }
   if(!result.data?.user?.id||result.error){lastReason="expired";return false}
   // A valid Supabase JWT does NOT override an Admin account lock.
   const status=await fetch("/api/me",{headers:{Authorization:"Bearer "+session.access_token},cache:"no-store"});
   if(status.status===423){lastReason="locked";return false}
   if(status.status===401){lastReason="profile";return false}
   if(!status.ok){lastReason="network";return false}
   lastReason="ok";return true;
  })().catch(e=>{console.warn("Exam account check:",e?.message||e);lastReason="network";return false})
    .finally(()=>{pending=null});
  return pending;
 }
 function prompt(container){
  const preview=/\\.github\\.dev$/i.test(location.hostname);
  const notice=preview
   ? '<p>Bạn đang mở bản chạy thử trên github.dev. Phiên đăng nhập trên Vercel không được chia sẻ với địa chỉ này.</p><p><a href="https://baitapcap1.vercel.app/kiem-tra.html">Mở đề trên website chính →</a></p>'
   : lastReason==="locked"
    ? '<p>Tài khoản đã bị quản trị viên khóa. Vui lòng liên hệ Admin để mở khóa trước khi làm bài.</p>'
   : lastReason==="config"||lastReason==="sdk"||lastReason==="network"
    ? '<p>Không kiểm tra được phiên đăng nhập do kết nối hoặc cấu hình Supabase. Hãy tải lại trang và thử lại.</p>'
    : '<p>Trang kiểm tra chưa nhận được phiên đăng nhập hợp lệ trên <b>'+location.host.replace(/[&<>"']/g,"")+'</b>. Hãy đăng nhập ở cùng địa chỉ này rồi trở lại làm bài.</p>';
  container.innerHTML='<section class="exam-auth-wall" role="status"><div class="exam-auth-symbol">🔒</div><h2>Chưa xác nhận được đăng nhập</h2>'+notice+'<div class="exam-auth-actions"><a href="/?auth=login">Đăng nhập tại đây</a><a class="secondary" href="/?auth=register">Tạo tài khoản</a></div><button type="button" id="examRetryLogin">↻ Kiểm tra lại đăng nhập</button><button type="button" id="examBackToList">← Xem danh sách đề</button></section>';
 }
 return {check,prompt,get reason(){return lastReason}};
})();
