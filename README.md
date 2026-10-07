# Bài Tập Cấp 1

Ứng dụng học tập cho học sinh lớp 1–5 với 4 vai trò: **Student / Parent / Teacher / Admin**.

## Chạy local

```bash
npm start
```

Mở `http://localhost:3000`.

Muốn seed tài khoản demo:

**Windows CMD**
```bat
set SEED_DEMO=1
npm start
```

**PowerShell**
```powershell
$env:SEED_DEMO="1"
npm start
```

Mật khẩu chung: `Demo1234!`

- Học sinh: `hocsinh@demo.vn`
- Giáo viên: `giaovien@demo.vn`
- Phụ huynh: `phuhuynh@demo.vn`
- Admin: `admin@demo.vn`

## Các phần đã code

- Auth thật: register/login/logout/reset-password flow, email verify state.
- Google OAuth server-side flow có state chống CSRF (cần credentials).
- Admin TOTP 2FA.
- Role-based UI/API: student, parent, teacher, admin.
- Lớp học + mã lớp + học sinh tham gia.
- Giao bài + deadline + giới hạn số lần nộp.
- Nộp bài + giáo viên chấm điểm/nhận xét.
- Parent liên kết nhiều con.
- Bài tập, đề thi, chấm điểm, lời giải, lưu kết quả.
- Autosave bài đang làm.
- Analytics môn yếu/kết quả/thời gian.
- Flashcards, mini game, XP/huy hiệu/shop UI.
- Tìm kiếm không dấu + bộ lọc.
- Upload PDF/ảnh/audio.
- Notification center.
- Trợ giảng AI qua API provider cấu hình.
- Premium checkout redirect qua payment provider cấu hình.
- PWA + offline cache + responsive + dark mode + browser text-to-speech.
- Privacy / Terms / robots.txt / sitemap.xml.
- Docker + Render blueprint + GitHub Actions CI.
- PostgreSQL schema tham chiếu trong `db/schema.sql`.
- Rate limiting, security headers, audit log, upload size/MIME guard.
- Smoke tests.

Xem chi tiết: [FEATURES.md](FEATURES.md) và [docs/PRODUCTION.md](docs/PRODUCTION.md).

## Kiểm tra code

```bash
npm run check
npm test
```

GitHub Actions cũng chạy hai lệnh này trên mỗi push.

## Cấu hình dịch vụ thật

Copy `.env.example` thành biến môi trường trên server và điền:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `AI_API_URL`, `AI_API_KEY`, `AI_MODEL`
- `PAYMENT_CHECKOUT_URL`
- `PUBLIC_BASE_URL`
- `SMTP_URL` (phần gửi mail production cần nối SMTP provider)

> Trước khi có người dùng thật: chuyển JSON store sang PostgreSQL, session sang Redis/database + cookie HttpOnly/Secure, thêm CAPTCHA/Web Push/object storage và compliance dữ liệu trẻ em như checklist trong `docs/PRODUCTION.md`.
