# Production checklist

- Chuyển JSON store sang PostgreSQL theo `db/schema.sql`.
- Lưu session trong Redis/database và dùng cookie HttpOnly Secure SameSite.
- Bật HTTPS tại reverse proxy/platform.
- Cấu hình email thật cho verify/reset password.
- Cấu hình Google OAuth bằng GOOGLE_CLIENT_ID/SECRET.
- Cấu hình AI provider bằng AI_API_URL/AI_API_KEY/AI_MODEL.
- Nếu bật Premium, tích hợp cổng thanh toán chính thức và webhook xác minh phía server.
- Chuyển uploads sang object storage (S3-compatible), scan file, giới hạn MIME/kích thước.
- Thêm CAPTCHA sau nhiều lần đăng nhập sai.
- Bật backup database, monitoring, structured logging và alert.
- Thay example.com trong sitemap/robots bằng domain thật.
- Kiểm thử bảo mật, privacy/compliance cho dữ liệu trẻ em trước khi phát hành công khai.
