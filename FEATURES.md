# Feature matrix

## Hoạt động ngay
- Trang chủ responsive, dark mode, PWA/offline cache.
- Môn/lớp, tìm kiếm không dấu, lọc, yêu thích.
- Trắc nghiệm, chấm điểm, giải thích, lịch sử local + server, autosave bài đang làm.
- Flashcard, mini game, giọng đọc trình duyệt.
- Đăng ký/đăng nhập, reset password dev flow, email verified state.
- Student / Parent / Teacher / Admin.
- Giáo viên tạo lớp, mã lớp, giao bài, deadline, giới hạn số lần nộp, xem/chấm bài.
- Phụ huynh liên kết nhiều học sinh và xem analytics.
- Upload PDF/ảnh/audio tối đa 5MB.
- Notifications, analytics môn yếu, audit log.
- Admin TOTP 2FA.
- AI endpoint qua provider cấu hình.
- Google OAuth server-side flow qua credentials cấu hình.
- Premium checkout redirect qua provider cấu hình.
- Docker, Render blueprint, GitHub Actions CI, smoke tests.
- PostgreSQL schema tham chiếu, privacy, terms, robots, sitemap.

## Cần credential/dịch vụ ngoài để hoạt động production
- Google Login: GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + redirect URI.
- AI thật: AI_API_URL + AI_API_KEY + AI_MODEL.
- Thanh toán Premium: PAYMENT_CHECKOUT_URL hoặc thay bằng SDK/webhook của cổng thanh toán.
- Email verify/reset thật: SMTP_URL + mail sender implementation.
- Push notification khi trình duyệt đóng: cần VAPID/Web Push provider.
- Object storage/CDN: cần S3-compatible credentials.
- Domain/HTTPS: cấu hình ở nền tảng deploy/DNS.

## Cần nâng cấp trước khi có người dùng thật
- Thay JSON store bằng PostgreSQL theo db/schema.sql.
- Session Redis/database + HttpOnly Secure cookie thay bearer token localStorage.
- CSRF khi chuyển sang cookie auth.
- CAPTCHA provider sau nhiều lần login sai.
- Virus/malware scan cho upload.
- Payment webhook ký số phía server.
- Backup, monitoring, structured logs và alert.
- Kiểm thử accessibility và quy định bảo vệ dữ liệu trẻ em.
