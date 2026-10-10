# Bốn đợt hoàn thiện Bài Tập Cấp 1

Cập nhật: 2026-10-10. Các commit trong repo không đồng nghĩa đã triển khai Vercel.

## 1. Sửa lỗi, phân quyền Admin và kiểm thử
- Giao diện Quản lý user có nút **Lưu vai trò** và **Khóa/Mở khóa** riêng biệt. Khóa yêu cầu xác nhận và lý do; lưu audit.
- API chặn Admin tự khóa, bảo vệ UID của Admin chính, không cho Admin thường cấp Admin mới.
- Tài khoản bị khóa nhận HTTP 423 với tất cả API yêu cầu xác thực, kể cả phiên còn hạn và trang bài kiểm tra độc lập.
- Khi có DATABASE_URL, API đọc trạng thái khóa/vai trò từ bảng users PostgreSQL dùng chung, không tin cache từng máy chủ.
- Trong Vercel nếu không có DATABASE_URL, thao tác khóa báo 503 để không tạo cảm giác khóa đã thành công.
- Không tính các đăng nhập thành công vào hạn mức **đăng nhập sai**.
- Bổ sung kiểm thử khóa/mở khóa, Supabase UID, tính riêng tư hồ sơ.

## 2. Dữ liệu thực và đồng bộ Supabase
- Hồ sơ dùng API xác thực, không tạo số liệu mẫu; không ghi đè tên/lớp đã sửa từ metadata đăng ký.
- Thêm avatar riêng tư trong bucket Supabase `avatars`: lưu `<Supabase Auth UID>/avatar.jpg`, yêu cầu RLS đọc/ghi chỉ chính chủ.
- Thêm `db/migrations/006_private_avatars.sql`, thay bucket avatar thành private và dùng URL có chữ ký tạm thời; nếu chưa cấu hình, giao diện báo ảnh chỉ lưu trên thiết bị.
- Danh sách thiết bị đăng nhập và IP chỉ trả về cho chủ tài khoản.
- **Còn cần kiểm tra:** thiết lập DATABASE_URL, bucket/RLS, khôi phục dữ liệu, kiểm thử khi nhiều instance ghi đồng thời. `app_state` vẫn là JSON nguyên khối nên chưa đủ bảo đảm cho ví tiền thật hay giao dịch đồng thời.

## 3. Chất lượng học tập
- Đề học kỳ / ôn hằng ngày vẫn tách riêng Toán, Tiếng Việt, Tiếng Anh.
- Bộ đề có nhiều hình thức: trắc nghiệm, đúng/sai, điền đáp án, tự luận và nối cặp.
- Đề Toán có dạng hình học theo phạm vi chương trình của kỳ tương ứng.
- Bộ đề học kỳ 30 biến thể mỗi tổ hợp lớp, kỳ, giai đoạn và môn; phân trang 24 đề/lượt.
- **Còn cần kiểm chứng thêm:** nội dung câu hỏi với giáo viên, chất lượng AI thực tế, chấm điểm tự luận có giám sát, PDF/Word importer.

## 4. Giao diện, mobile, PWA và tốc độ
- Loại các module đề/hồ sơ nặng khỏi danh sách script khởi chạy; tải khi mở chức năng.
- Chỉ dựng 24 thẻ đề trên một trang; có lọc/pagination.
- CSS responsive cho danh sách đề, hồ sơ và nút quản trị.
- **Còn cần kiểm thử:** mobile Safari/Chrome, offline->online, phiên đăng nhập sau update, TTFB và tải Supabase trên Production.

## Trước khi triển khai
1. Kiểm tra GitHub Actions **CI check** và **UI** đều thành công trên đúng commit muốn triển khai.
2. Cấu hình `DATABASE_URL` của Supabase PostgreSQL cho môi trường Production trong Vercel (không đưa mật khẩu lên GitHub).
3. Chạy migration DB và áp dụng `006_private_avatars.sql` vào đúng Supabase project bằng cơ chế migration được cấp quyền. Xác nhận bucket `avatars` private và policy RLS.
4. Nếu cần Ví demo, giữ `WALLET_DEMO=1` chỉ cho thử nghiệm; tiền thật chưa được hỗ trợ.
5. Deploy **một lần** sau khi hết hạn mức Vercel Hobby; kiểm tra API khóa, mở khóa, đăng nhập, Avatar, 30 câu đề, mobile và rollback.

## Lưu ý khi khóa tài khoản
- Khóa là trạng thái **trong ứng dụng**, không có nghĩa xóa tài khoản khỏi Supabase Auth.
- Supabase JWT cũ vẫn có thể tồn tại trong trình duyệt, nhưng API app từ chối với HTTP 423.
- Nếu các bảng Supabase khác được truy cập trực tiếp bằng JWT, cần RLS độc lập kiểm tra trạng thái khóa ở từng bảng. Đừng coi khóa API là vô hiệu hóa toàn bộ quyền truy cập Supabase.
- IP và ảnh của trẻ là dữ liệu nhạy cảm. Không công bố IP, không tạo bucket avatar công khai và không ghi log chứa token.
