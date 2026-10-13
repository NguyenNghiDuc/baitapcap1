"use strict";
window.AdminBackup=(()=>{
 const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const item=(label,passed,bad="Chưa sẵn sàng")=>'<div class="admin-backup-check"><span>'+esc(label)+'</span>'+
  '<strong class="'+(passed?"good":"needs-attention")+'">'+(passed?"✓ Sẵn sàng":"! "+esc(bad))+'</strong></div>';
 async function render(user){
  if(user?.role!=="admin")return '<section class="panel">Chỉ quản trị viên được xem trạng thái sao lưu.</section>';
  try{
   const d=await API.get("/api/admin/backup/status",{noCache:true,cancelPrevious:false});
   const db=d.database||{},crypto=d.snapshotEncryption||{},environment=d.environment||{};
   return '<div class="admin-backup-page">'+
    '<section class="page-head"><span class="eyebrow">ADMIN CHÍNH • DỮ LIỆU</span><h1>🗄️ Sao lưu & khôi phục an toàn</h1>'+
    '<p>Kiểm tra điều kiện sao lưu và hướng dẫn thao tác trên môi trường riêng. Không tải hoặc khôi phục dữ liệu học sinh qua trình duyệt.</p></section>'+
    '<div class="admin-backup-cards"><div><span>Phạm vi snapshot</span><strong>app_state</strong><small>Không phải toàn bộ PostgreSQL</small></div>'+
    '<div><span>Mã hóa</span><strong>'+esc(crypto.algorithm||"AES-256-GCM")+'</strong><small>Bản sao lưu mới phải được mã hóa</small></div>'+
    '<div><span>Khôi phục web</span><strong>Đã vô hiệu hóa</strong><small>Chỉ cho phép qua CLI có xác nhận</small></div></div>'+
    '<section class="panel admin-backup-panel"><div class="admin-backup-heading"><h2>Kiểm tra sẵn sàng</h2><button type="button" id="adminBackupReload" class="outline">↻ Làm mới</button></div>'+
    '<div class="admin-backup-checks">'+
     item("PostgreSQL đã cấu hình",db.configured)+
     item("PostgreSQL kết nối được",db.healthy)+
     item("Khóa mã hóa backup",crypto.configured,"Cần BACKUP_PASSPHRASE")+
     item("Máy chủ không phải serverless",!environment.serverless,"Vercel không lưu file bền vững")+
     '</div><p class="admin-backup-info">'+(d.manualBackupReady?"Có thể chạy lệnh sao lưu thủ công trên máy chủ phù hợp.":"Cần hoàn thiện điều kiện trước khi chạy sao lưu thủ công.")+'</p></section>'+
    '<section class="panel admin-backup-panel"><h2>Quy trình sao lưu trên máy tính/máy chủ riêng</h2>'+
    '<ol class="admin-backup-steps"><li>Cấu hình <code>DATABASE_URL</code> và <code>BACKUP_PASSPHRASE</code> (tối thiểu 16 ký tự) qua biến môi trường bảo mật.</li>'+
    '<li>Chạy <code>npm run db:backup</code>. File snapshot được mã hóa AES-256-GCM.</li>'+
    '<li>Kiểm tra file bằng <code>npm run db:restore -- backups/ten-file.enc.json --verify</code>. Chế độ này không ghi database.</li>'+
    '<li>Sao chép file mã hóa sang nơi lưu trữ riêng, có phân quyền và chính sách giữ bản sao.</li>'+
    '<li>Dùng Supabase managed backups hoặc <code>pg_dump</code> để sao lưu đầy đủ PostgreSQL; kiểm tra riêng Supabase Auth và Storage.</li></ol>'+
    '<p class="admin-backup-warning">'+esc(d.notice||"Snapshot không bao gồm toàn bộ cơ sở dữ liệu.")+'</p>'+
    '<p class="muted">Chưa xác minh bản sao lưu bên ngoài hoặc thời điểm backup gần nhất. Chức năng khôi phục trực tiếp từ Admin cố ý không được cung cấp.</p>'+
    '</section></div>';
  }catch(e){
   return '<section class="panel" role="alert"><h3>Không xem được trạng thái sao lưu</h3><p>'+esc(e?.message||"Có lỗi")+
    '</p><button type="button" id="adminBackupReload" class="outline">Thử lại</button></section>';
  }
 }
 function bind(render){document.querySelector("#adminBackupReload")?.addEventListener("click",render)}
 return {render,bind};
})();
