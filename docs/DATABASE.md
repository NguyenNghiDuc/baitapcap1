# PostgreSQL setup

## Cách dễ nhất trên máy Windows

1. Cài Docker Desktop.
2. Trong thư mục dự án chạy:
   ```bash
   docker compose up -d postgres
   ```
3. Copy `.env.example` thành `.env`.
4. Dùng DATABASE_URL:
   ```env
   DATABASE_URL=postgresql://baitapcap1:baitapcap1_dev_password@127.0.0.1:5432/baitapcap1
   PGSSL=0
   ```
5. Cài package:
   ```bash
   npm install
   ```
6. Tạo bảng:
   ```bash
   npm run db:migrate
   ```
7. Tạo tài khoản demo:
   ```bash
   npm run db:seed
   ```
8. Nếu đang có dữ liệu trong `data/db.json`, chuyển sang PostgreSQL:
   ```bash
   npm run db:import-json
   ```
9. Kiểm tra kết nối:
   ```bash
   npm run db:check
   ```

Admin demo sau seed:
- email: `admin@demo.vn`
- password: `27032006`

## Dùng database cloud

Nếu dùng Render PostgreSQL, Neon, Supabase hoặc Railway PostgreSQL, chỉ cần thay `DATABASE_URL` bằng connection string của dịch vụ đó. Với cloud PostgreSQL thường để `PGSSL=1`.

## Lưu ý

- Không commit file `.env`.
- Không dùng password dev ở production.
- Trước khi import dữ liệu thật nên backup `data/db.json`.
- Script import dùng UPSERT/ON CONFLICT để có thể chạy lại an toàn hơn.
