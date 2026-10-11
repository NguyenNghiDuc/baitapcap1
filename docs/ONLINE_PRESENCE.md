# Online / Offline Live (Admin)

## Trải nghiệm
- Admin mở **Quản trị → Quản lý user** để xem từng tài khoản: **🟢 Online**, **⚫ Offline**, **Lần cuối hoạt động**.
- Admin Dashboard có tổng tài khoản online trên toàn hệ thống.
- Danh sách Admin cập nhật mỗi **30 giây** mà không làm mất vai trò đang chọn hay thao tác trong bảng.
- Trang chủ gửi heartbeat mỗi **35 giây** khi tab mở và đang hiển thị; trang `kiem-tra.html` và `kiem-tra-nang-cao.html` cũng gửi heartbeat.
- Mỗi tab có session ID ngẫu nhiên. Đóng một tab không làm tài khoản offline nếu tab khác vẫn đang dùng.
- Offline có nghĩa **không có heartbeat từ tab đang hoạt động trong 120 giây**, không có nghĩa Supabase JWT hết hạn hay người dùng đã bấm đăng xuất. Tắt tab hoặc ẩn tab sẽ gửi tín hiệu offline theo khả năng của trình duyệt.

## Database và bảo mật
- Phải thiết lập biến môi trường **DATABASE_URL** của Supabase PostgreSQL cho Vercel.
- Áp dụng migration `db/migrations/007_user_presence.sql` qua pipeline migration của repo hoặc hệ thống SQL migration được phép truy cập.
- Bảng `public.user_presence` có RLS bật và **không có policy public/authenticated**. Chỉ backend PostgreSQL tin cậy được đọc.
- Backend xác thực session và lấy user ID từ token. Không nhận ID tài khoản do client tự khai.
- Trạng thái chỉ truy cập được ở `GET /api/admin/users` và `GET /api/admin/presence` khi người gọi có quyền Admin.
- Trên Vercel **không có DATABASE_URL**, tính năng phải hiển thị **Chưa có dữ liệu**, không được đoán online/offline từ bộ nhớ riêng từng máy chủ.
- Không thu thập địa chỉ IP, nội dung trang, vị trí hay dữ liệu học tập để xác định trạng thái online.
- Cần áp dụng retention thực tế cho dữ liệu hiện diện; xóa toàn bộ record khi xóa user bằng `ON DELETE CASCADE`.

## Test và deploy
1. Chờ GitHub Actions **check** và **ui** đạt trên commit cuối.
2. Xác minh DATABASE_URL và migration 007 trên đúng Supabase production.
3. Deploy một lần lên Vercel Production.
4. Đăng nhập bằng hai trình duyệt/tài khoản; mở Admin /#adminUsers và xem trạng thái, thử ẩn/đóng tab rồi đợi tối đa 2 phút.
5. Xác minh học sinh không thể truy cập `/api/admin/presence`, Admin không thể xem hoạt động khi không có token.
