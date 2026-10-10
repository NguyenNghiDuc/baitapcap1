# Nâng cấp 10 hạng mục — DỮ LIỆU THẬT (2026-10-10)

Nhánh: `feat/real-data-security-20261010`. **Chưa deploy Vercel Production và chưa tự chạy migrations trong Supabase thật.** Không dùng số liệu giả để thay thế khi cơ sở dữ liệu lỗi.

| # | Hạng mục | Thay đổi có thể kiểm tra trong code | Vẫn cần làm trước khi nhận là hoàn tất |
|---|---|---|---|
| 1 | PostgreSQL / Supabase | `007_real_account_data.sql`, tài khoản load theo Auth UID; hồ sơ, kết quả, đồng bộ học tập đọc/ghi bảng riêng | Áp migration vào đúng Supabase, kiểm thử đồng thời và hoàn toàn loại bỏ app_state khỏi những nghiệp vụ còn lại |
| 2 | Admin khóa tài khoản | `008_locked_accounts_rls.sql` chặn JWT còn hạn tại RLS, chặn role/score tự sửa; Admin API vẫn cần quyền chính chủ | Test khóa/mở khóa cả JWT cũ trên Supabase Production |
| 3 | Thiết bị/IP | `login_devices` ghi theo tài khoản, trang cá nhân hiển thị thiết bị và IP từ PostgreSQL | Chưa có khả năng thu hồi phiên Supabase trên từng thiết bị; lịch sử chỉ bắt đầu sau triển khai |
| 4 | Điểm/chấm bài | Ghi kết quả PostgreSQL trước khi trả thành công; idempotency; `verified=false` và `grading_status=self_reported` cho bài tự gửi | Cần pipeline chấm xác thực ở server/giáo viên mới có điểm verified |
| 5 | AI | Bỏ gắn verified cho lời giải sinh bởi mô hình và chỉ tự kiểm tra bằng mô hình | Cần benchmark thực tế, kiểm chứng Toán nâng cao và kết nối AI có hạn mức |
| 6 | Sao lưu | `pg-public-backup.js` dùng pg_dump, SHA256, metadata thật trong DB; restore đòi xác nhận/checksum | Backup chỉ public schema, không gồm Supabase Auth/Storage; chưa bật lịch tự động, chưa kiểm thử restore thật |
| 7 | Thông báo | Tạo thông báo riêng từng người nhận trong bảng PostgreSQL; giáo viên chỉ gửi học sinh lớp mình; API đánh dấu đã đọc | Email/push chưa bật thực, cần quyền phụ huynh và lịch gửi |
| 8 | Tốc độ/mobile | Module trang mới tải theo route; responsive; hoạt động DB qua query phân trang | Cần đo Core Web Vitals thực tế, tối ưu các trang còn dựa app_state |
| 9 | Quyền riêng tư | RLS ngăn tài khoản bị khóa, avatar private, IP chỉ chính chủ; export từ bảng PostgreSQL | Xóa tài khoản đa nguồn chưa được bảo đảm atomic, cần quy trình kiểm chứng, backup vùng riêng và chính sách retention |
| 10 | Giám sát Admin | `#systemMonitor`: tổng tài khoản, khóa, kết quả, hoạt động 7 ngày, lỗi 24h, nhật ký, bản backup đã ghi | Cần xác nhận quyền, giám sát alert thực tế và lịch sao lưu trong Production |

## Cấu hình bắt buộc cho dữ liệu thật

1. Supabase PostgreSQL: đặt `DATABASE_URL` an toàn trong **Vercel Environment Variables**. Không dán URL có mật khẩu lên GitHub/chat.
2. Supabase Auth: giữ `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`; Admin chính chỉ nhận qua `ADMIN_SUPABASE_UID` trùng Auth UID. Không lấy từ metadata, email hiển thị hay phía trình duyệt.
3. Backup: trên máy quản trị tin cậy đã cài `pg_dump` / `pg_restore`, chạy `node scripts/pg-public-backup.js`. Tệp chứa dữ liệu học sinh và thông tin nhạy cảm: lưu riêng tư, bảo vệ quyền truy cập và sao lưu ngoại vi. Khôi phục được mô tả trong `scripts/pg-public-restore.js`; chỉ dùng trên DB test trước.
4. Migration 007/008 là thay đổi quyền đọc/ghi: kiểm tra ảnh hưởng đến RLS và Storage trên môi trường test của **cùng** dự án Supabase trước khi chạy trên Production.
5. Đợi GitHub Actions PASS trên chính xác commit được chọn trước khi merge/deploy. Vercel Hobby từng đạt giới hạn deployment/ngày; tránh deploy thử mỗi commit.

## Hành vi dữ liệu thật và cảnh báo

- Các endpoint `/api/real/me/*` và `/api/real/admin/*` trả **503** khi không có PostgreSQL; không có bản ghi mock hoặc fallback giả.
- Trang **Hoạt động thực tế** chỉ truy cập kết quả/notification/thiết bị của tài khoản đã đăng nhập.
- Trang **Giám sát hệ thống** chỉ Admin được truy cập, số liệu lấy từ PostgreSQL thực.
- Điểm tự báo cáo có thể là số học sinh tự gửi, không có nghĩa đã được giáo viên xác minh.
- `app_state` JSON vẫn tồn tại cho vài module cũ, có rủi ro mất cập nhật khi nhiều server ghi đồng thời; migration sang database normalized chưa hoàn tất cho mọi chức năng.
- Backup của **public schema** không thay thế backup các bucket ảnh riêng tư, Auth và hệ thống khác của Supabase.
- IP là địa chỉ mạng kết nối, có thể thay đổi và không dùng để xác định vị trí tuyệt đối hoặc cấp quyền.
- Chưa được kiểm thử bằng tài khoản và dữ liệu thật của bạn. Đừng khẳng định đã hoàn tất 10 mục chỉ dựa trên CI.

## Gợi ý xác minh sau triển khai test

Đăng nhập Supabase trên hai máy, chỉnh Hồ sơ rồi tải lại; làm bài, xem kết quả đã ghi vào bảng `results`; kiểm tra `grading_status=self_reported`; kiểm tra Admin khóa tài khoản và thử JWT cũ qua endpoint Supabase trực tiếp; xem trang `#realActivity` và `#systemMonitor`; thực hiện một backup và restore trên database thử nghiệm. Nếu bất kỳ bước nào không đạt, giữ PR ở trạng thái Draft, không merge Production.
