# Nâng cấp 10 hạng mục — trạng thái kỹ thuật

Ngày rà soát: 2026-10-10.

**Không deploy dồn dập:** Vercel Hobby đã báo giới hạn tạo deployment/ngày. Gộp commit, chạy kiểm thử, deploy 1 lần khi quota mở lại.

| # | Hạng mục | Hiện trạng / việc cần làm | Trạng thái |
|---|---|---|---|
| 1 | Bảo mật / phân quyền | Đã sửa khớp Supabase Auth theo UID, không theo email; bỏ luồng checkout thật không ký. Tiếp tục audit teacher/parent/admin và RLS. | Đang làm |
| 2 | Supabase và đa thiết bị | Đã giữ tên/lớp khi Auth đồng bộ; profile API đọc dữ liệu thật. Ảnh avatar local, cần Storage bucket/RLS; cần transaction DB chuẩn. | Đang làm |
| 3 | Hiệu năng | Đã bỏ chờ public-config trên mỗi route, lazy loading. Cần đo LCP/TTFB/API và kiểm thử môi trường thật. | Đang làm |
| 4 | Ví & VIP | Đã có demo-wallet do server xử lý. Chưa có Parent Lock, hạn mức đa instance, quyền lợi VIP được bảo vệ server; không hỗ trợ tiền thật. | Demo cơ bản |
| 5 | Hồ sơ | Có API sửa thông tin, tùy chọn thông báo, export và giao diện mới; đã sửa regex, thêm test. Chưa đồng bộ avatar và quản lý sessions. | Đang làm |
| 6 | Word/PDF / đề thi | Có import Excel/CSV, đề kiểm tra; cần parser Word/PDF, khâu kiểm tra câu hỏi trước khi lưu. | Chưa làm |
| 7 | AI Toán | Có math engine và bài đánh giá; cần benchmark tiếng Việt/Anh thực tế, đối chiếu phép tính, test provider. | Có nền tảng |
| 8 | Mobile | Đã có responsive mobile-fix và profile-dashboard; cần test trình duyệt điện thoại thực. | Cần kiểm thử |
| 9 | Thống kê | Đã có kết quả học tập và report; cần báo cáo tuần/tháng/học kỳ từ bản ghi xác minh. | Có nền tảng |
| 10 | Sao lưu / phục hồi | Đã có scripts/db-backup.js, db-restore.js; cần test restore trên DB riêng, lịch định kỳ, giám sát và quyền truy cập. | Có nền tảng |

## Thay đổi đã hoàn tất trong đợt này

- Chặn lỗi chiếm tài khoản Supabase qua địa chỉ email trùng; chỉ chấp nhận UID Auth đã xác minh.
- Giữ thông tin hồ sơ người dùng đã sửa khi đăng nhập lại (metadata đăng ký không ghi đè).
- Sửa regex số điện thoại và ngày sinh.
- Chặn endpoint checkout thật chưa ký và chưa có webhook xác nhận.
- Bổ sung kiểm thử hồi quy cho quyền, dữ liệu người dùng, kết quả và hồ sơ.

## Kiểm thử cần chạy trước deploy

```bash
npm ci
npm run check
npm test
npm run build
```

Đặc biệt kiểm tra `tests/auth-uid.test.js` và `tests/profile-overview.test.js`. Không đánh dấu PASS khi chưa chạy.

## Nguy cơ chưa xử lý

- Storage dùng một khối JSON/app_state; ở serverless nhiều instance có thể ghi đè. Không dùng ví demo cho tiền thật.
- Ảnh avatar chưa lưu bền vững vào Supabase Storage.
- Không được tự quảng cáo rằng mọi quyền VIP, nhắn tin và xuất PDF hoàn chỉnh.
- Không có bằng chứng test Vercel production mới nhất ở đợt này.
