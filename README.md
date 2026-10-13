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
- Admin: không tạo sẵn trên production; cấp tài khoản qua quy trình quản trị an toàn.

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

**Danh mục mở rộng 1–160:** [roadmap/README.md](roadmap/README.md). Các hạng mục mới được kiểm kê riêng, không coi là hoàn thành cho đến khi có kiểm thử. Chạy `npm run roadmap:audit` để kiểm tra danh mục và bằng chứng mã nguồn.

**Nhật ký Admin:** chỉ Admin có thể xem và lọc nhật ký; metadata nhạy cảm không được hiển thị.

**Trung tâm kiểm tra dữ liệu:** `/#adminIntegrity` dành cho Admin, sử dụng API chỉ đọc để xem sự tồn tại của các bảng quan trọng, tình trạng migration, điểm bất thường và bài kiểm tra thiếu tài khoản. Kết quả có thể là *Đạt / Cần kiểm tra / Cảnh báo / Chưa xác minh*. Không trả bản ghi học sinh, không tự sửa hoặc chạy migration; kết quả không thay thế cho kiểm toán đầy đủ.

**Trung tâm sao lưu:** `/#adminBackup` chỉ dành cho Admin chính và chỉ **xem trạng thái sẵn sàng**. Lệnh CLI được nâng cấp tạo snapshot `app_state` mã hóa AES-256-GCM (`BACKUP_PASSPHRASE` tối thiểu 16 ký tự). Kiểm tra an toàn: `npm run db:restore -- backups/file.enc.json --verify`; không dùng nút khôi phục trên website. Lưu ý snapshot không bao gồm các bảng PostgreSQL độc lập, Supabase Auth hoặc Storage; phải bổ sung bản sao lưu đầy đủ bằng dịch vụ quản trị Supabase/`pg_dump`. Khôi phục thực tế yêu cầu `--confirm-restore` và biến `RESTORE_CONFIRMATION=I_UNDERSTAND_RESTORE_MAY_OVERWRITE_DATA`, sau khi đã có bản sao dự phòng và lịch bảo trì. File backup v1 chưa mã hóa chỉ được xác minh với `--allow-legacy` và checksum đúng.

**Trung tâm bảo mật Admin:** `/#adminSecurity` hiển thị quyền Admin chính/phụ (xác minh qua `ADMIN_SUPABASE_UID`) và lịch sử **thiết bị của chính tài khoản đang đăng nhập**, không trả thông tin thiết bị của học sinh. Đây là lịch sử ghi nhận, không phải danh sách phiên đang hoạt động; chưa hỗ trợ thu hồi phiên từ xa.

**Trung tâm cảnh báo:** vào **Admin → Hệ thống → Trung tâm cảnh báo** để kiểm tra lỗi API, PostgreSQL/Redis từ một instance. Đây là ảnh chụp tại thời điểm truy vấn, chưa phải cảnh báo lưu trữ lâu dài.

**Xuất bảng điểm:** vào **Admin → Bảng điểm học sinh**, lọc các bài kiểm tra, bấm **Xuất CSV mở bằng Excel**; chỉ dành cho Admin và giới hạn tối đa 2.000 bản ghi để tránh lộ dữ liệu hoặc tải quá nặng.

**Trung tâm quản trị:** mở [#adminCenter](https://baitapcap1.vercel.app/#adminCenter) sau khi đăng nhập Admin. Menu được chia 8 nhóm và chỉ liên kết các trang giao diện đã tồn tại. Danh mục 160 mục chỉ biểu thị tình trạng kiểm kê (không đồng nghĩa hoàn thiện).

Nguồn dữ liệu công khai **không chứa thông tin học sinh**: `assets/admin-feature-catalog.json`, đồng bộ từ `roadmap/features-*.json` bằng `npm run admin:catalog:sync`; CI chạy `npm run admin:catalog:check` để phát hiện lệch dữ liệu.

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


## Supabase PostgreSQL

Database production được chuẩn bị để chạy trực tiếp trên Supabase PostgreSQL.

Thiết lập nhanh:

```bash
git pull origin main
npm install
copy .env.example .env
npm run db:check
npm run db:migrate
npm run db:seed
npm run db:check
```

Trước khi chạy các lệnh DB, dán connection string từ **Supabase Dashboard -> Connect -> Session pooler** vào `DATABASE_URL` trong `.env`.

Nếu cần chuyển dữ liệu JSON hiện tại:

```bash
npm run db:import-json
```

Chi tiết xem `docs/DATABASE.md`.
