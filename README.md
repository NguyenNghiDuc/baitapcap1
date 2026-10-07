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

Mật khẩu demo học sinh / giáo viên / phụ huynh: `Demo1234!`

- Học sinh: `hocsinh@demo.vn`
- Giáo viên: `giaovien@demo.vn`
- Phụ huynh: `phuhuynh@demo.vn`
- Admin: `admin@demo.vn` — mật khẩu: `27032006`

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


## Toán lớp 4–5 trọng tâm

Hệ thống có **10 bài Toán × 30 câu = 300 câu**, mỗi câu có đáp án và lời giải từng bước:

- Lớp 4: nhân số tự nhiên, chia số tự nhiên, quy đồng mẫu số, cộng/trừ phân số, hình chữ nhật & hình vuông.
- Lớp 5: nhân số thập phân, chia số thập phân, phân số nâng cao, tam giác/hình thang/hình tròn, hình hộp chữ nhật & hình lập phương.

Giáo viên/Admin có thể import thêm câu bằng Excel/CSV theo mẫu `templates/questions-template.csv`.

## 8 chức năng trọng tâm đã nối

1. Import câu hỏi Excel/CSV.
2. Ngân hàng câu hỏi Toán lớp 4–5.
3. Phòng thi online có mã phòng.
4. Xuất kết quả Excel/PDF.
5. AI phân tích câu sai và gợi ý ôn tập.
6. Web Push (cần VAPID keys khi deploy).
7. Admin quản lý tài khoản, vai trò, khóa/mở user.
8. Redis session + PostgreSQL adapter/migration khi có `REDIS_URL` và `DATABASE_URL`.

CI kiểm tra số lượng câu, lời giải, import, phòng thi, export và API quản trị.
