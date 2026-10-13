window.PerformanceMonitor={
 async render(user){
  if(user?.role!=="admin")return '<section class="panel">Chỉ quản trị viên được xem hiệu năng API.</section>';
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  try{
   const [metrics,health]=await API.getMany(["/api/admin/performance","/api/admin/system-health"],{noCache:true});
   if(metrics.status!=="fulfilled")throw metrics.reason;
   const d=metrics.value,h=health.status==="fulfilled"?health.value:null;
   const yes=x=>x?"🟢 Kết nối":"🔴 Chưa sẵn sàng";
   const healthPanel='<section class="panel"><h3>🔍 Kiểm tra máy chủ</h3>'+
    '<p>PostgreSQL: <b>'+(h?.database?.enabled?yes(h.database.healthy):"Chưa cấu hình")+'</b> • Redis: <b>'+(h?.redis?.enabled?yes(h.redis.healthy):"Chưa cấu hình")+'</b></p>'+
    '<p>Cache Redis: '+(h?.cache?.redisConnected?"Đang kết nối":"Không kết nối")+' • Bộ nhớ Node: '+(h?.process?.heapUsedMB??"—")+' MB • Cảnh báo webhook: '+(h?.alertingConfigured?"Đã cấu hình":"Chưa cấu hình")+'</p>'+
    '<p class="muted">Các trạng thái là ảnh chụp từ một máy chủ Vercel tại thời điểm yêu cầu, không phản ánh toàn bộ cụm.</p></section>';
   const rows=(d.routes||[]).map(r=>'<tr><td><strong>'+esc(r.route)+'</strong></td><td>'+Number(r.calls)+'</td><td>'+Number(r.avgMs)+' ms</td><td><b>'+Number(r.p95Ms)+' ms</b></td><td>'+Number(r.maxMs)+' ms</td><td>'+Number(r.slow)+'</td><td>'+Number(r.errors)+'</td></tr>').join("");
   return '<section class="page-head"><span class="eyebrow">QUẢN TRỊ • HIỆU NĂNG</span><h1>🚀 Hiệu năng API</h1><p>Theo dõi độ trễ từng API để tìm nguyên nhân tải chậm.</p></section>'+
    healthPanel+
    '<section class="panel"><h3>Thống kê '+Number(d.windowMinutes||15)+' phút gần nhất</h3><p><strong>'+Number(d.sampleCount||0)+'</strong> yêu cầu được ghi nhận • Ngưỡng API chậm: '+Number(d.slowThresholdMs||900)+' ms</p><p class="muted">Số liệu nằm trong bộ nhớ của một phiên máy chủ hiện tại. Trên Vercel nhiều instance hoặc cold start, đây không phải thống kê toàn hệ thống.</p><button type="button" class="primary small" data-route="performanceMonitor">↻ Làm mới</button></section>'+
    '<section class="panel"><h3>API theo thời gian phản hồi P95</h3><div class="table-wrap"><table><thead><tr><th>API</th><th>Lượt</th><th>Trung bình</th><th>P95</th><th>Cao nhất</th><th>Chậm</th><th>Lỗi 5xx</th></tr></thead><tbody>'+(rows||'<tr><td colspan="7">Chưa có số liệu API ở phiên máy chủ này.</td></tr>')+'</tbody></table></div></section>';
  }catch(e){return '<section class="panel"><h3>Không tải được báo cáo API</h3><p>'+esc(e.message)+'</p><button data-route="performanceMonitor" class="outline">Thử lại</button></section>'}
 }
};