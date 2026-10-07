# Supabase PostgreSQL setup

App này dùng PostgreSQL trực tiếp, nên Supabase Database dùng được ngay.

## Cách nên dùng trên laptop Windows

Supabase Dashboard -> mở project -> bấm **Connect** -> chọn **Session pooler** -> copy nguyên connection string.

Session pooler phù hợp khi máy/network local chỉ có IPv4. Không tự ghép host pooler vì host được Supabase cấp theo project.

Tạo file `.env` từ `.env.example`, sau đó dán:

```env
DATABASE_URL=<CONNECTION STRING COPY TỪ SUPABASE>
PGSSL=1
PG_POOL_MAX=5
```

## Lệnh chạy ngày mai

```bash
git pull origin main
npm install
copy .env.example .env
```

Sau khi dán DATABASE_URL Supabase vào `.env`:

```bash
npm run db:check
npm run db:migrate
npm run db:seed
npm run db:check
```

Nếu cần chuyển dữ liệu hiện tại từ `data/db.json` lên Supabase:

```bash
npm run db:import-json
```

Sau đó chạy app:

```bash
npm start
```

## Kiểm tra trong Supabase

Mở **Table Editor**. Sau migration sẽ có các bảng:

- users
- classes
- class_students
- assignments
- submissions
- results
- notifications
- materials
- audit_logs
- question_bank
- exam_rooms
- exam_settings
- push_subscriptions
- feedback
- student_works
- schema_migrations

Admin seed:

- email: `admin@demo.vn`
- password: `27032006`

## Direct connection hay pooler?

- **Session pooler**: lựa chọn dễ dùng cho laptop/IPv4.
- **Direct connection**: phù hợp backend chạy lâu dài khi môi trường có IPv6 hoặc IPv4 add-on.
- **Transaction pooler**: hữu ích cho serverless/horizontal scaling; không phải lựa chọn đầu tiên để chạy migration trên laptop.

## SSL

Supabase hỗ trợ SSL cho Postgres. Repo đặt `PGSSL=1` cho kết nối Supabase. Production nên luôn dùng SSL.

## An toàn

- Không commit `.env`.
- Không gửi database password vào chat/GitHub.
- Nếu password có ký tự đặc biệt, dùng connection string do Supabase Dashboard cung cấp.
- Trước khi import JSON thật, backup `data/db.json`.
- Có thể chạy `npm run db:import-json` lại; các bảng chính dùng UPSERT/ON CONFLICT để giảm trùng dữ liệu.

## Docker local

Docker PostgreSQL vẫn còn trong `docker-compose.yml` nhưng chỉ là phương án phụ. Nếu dùng Supabase thì không cần chạy Docker PostgreSQL.
