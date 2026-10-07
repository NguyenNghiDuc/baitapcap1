# Bảo mật

Backend demo đã có các lớp bảo vệ cơ bản:

- Hash mật khẩu bằng `crypto.scrypt` + salt ngẫu nhiên.
- So sánh hash bằng `timingSafeEqual`.
- Token phiên ngẫu nhiên 256-bit, có thời hạn.
- Giới hạn số lần đăng nhập/đăng ký theo IP.
- Giới hạn kích thước JSON request.
- Security headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
- Tách vai trò student / parent / admin ở giao diện.

## Khi triển khai production
Chuyển JSON DB sang PostgreSQL/MySQL; session sang Redis/database; bật HTTPS; CSRF protection; email verification; audit log; backup; secret management; kiểm thử XSS/SQLi/IDOR và phân quyền ở server cho mọi API admin.
