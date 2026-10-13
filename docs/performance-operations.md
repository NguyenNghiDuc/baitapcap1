# Vận hành hiệu năng và độ ổn định (mục 9–18)

## Cấu hình bắt buộc và tùy chọn

- `DATABASE_URL`: PostgreSQL/Supabase. Di chuyển schema bằng `npm run db:migrate` trước khi đưa phiên bản mới lên production. Migration 008 thêm chỉ mục cho bảng kết quả và thông báo.
- `REDIS_URL`: Redis dùng chung cho cache công khai và phiên đăng nhập. Không đặt cache Redis cho dữ liệu học sinh theo URL thuần khi chưa có quyền truy cập/namespace phù hợp. Khi Redis chưa cấu hình, cache công khai dùng bộ nhớ của từng instance và phiên fallback vẫn hoạt động theo cấu hình sẵn.
- `API_SLOW_MS` (mặc định 900): ngưỡng ghi nhật ký API chậm.
- `API_ALERT_THRESHOLD_MS` (mặc định 1800): ngưỡng cảnh báo độ trễ.
- `PERFORMANCE_ALERT_WEBHOOK_URL`: URL HTTPS nhận webhook cảnh báo (tùy chọn). Nếu không đặt, không gửi cảnh báo.
- `PG_SLOW_QUERY_MS` (mặc định 800): ghi truy vấn PostgreSQL chậm; log chỉ ghi mẫu câu truy vấn, không ghi tham số cá nhân.

Không đưa biến môi trường hoặc khóa truy cập vào repo.

## Những gì đã triển khai

1. Redis cache giới hạn TTL và dung lượng local, chống nhiều request cùng tính lại trong một tiến trình.
2. Tải song song các module route độc lập và `API.getMany` hỗ trợ đồng thời nhiều GET. Những module thi phụ thuộc thứ tự vẫn tải tuần tự.
3. API GET thử lại tối đa một lần với lỗi mạng tạm thời hoặc HTTP 502/503/504, không thử lại 401/403/429.
4. Virtual Scroll cho lịch sử thiết bị hơn 250 bài; lịch sử nhỏ vẫn có phân trang.
5. Hàng đợi kết quả offline riêng theo tài khoản; giữ bài chưa gửi cho đến khi server xác nhận. Hàng đợi cũ không tự gộp vì có thể thuộc người dùng khác. Vào Đồng bộ để chủ động khôi phục.
6. Nén ảnh bài viết tay phía trình duyệt trước khi tải lên; giới hạn loại file và kích thước vẫn được kiểm tra.
7. Admin tại `/#performanceMonitor` xem latency/P95 và trạng thái PostgreSQL, Redis (chỉ instance nhận request).
8. Cảnh báo API 5xx/chậm qua webhook nếu cấu hình; tự hạn chế gửi trùng theo tiến trình.
9. GitHub Actions `post-deploy.yml` chạy smoke test chỉ đọc cho deployment Production; có thể chạy thủ công với URL được ủy quyền.
10. Kịch bản chịu tải read-only `npm run perf:load` có giới hạn an toàn.

## Kiểm thử

```sh
npm ci
npm run check
npm test
npm run build
npm run test:ui -- --project=chromium
node scripts/post-deploy-smoke.js http://127.0.0.1:3000
```

Chỉ chạy benchmark vào môi trường bạn quản lý hoặc đã được cho phép:

```sh
LOAD_CONNECTIONS=100 LOAD_DURATION=15 npm run perf:load
```

Mặc định benchmark chỉ cho localhost. Khi có quyền kiểm thử môi trường ngoài, cần đặt rõ `ALLOW_REMOTE_LOAD_TEST=yes`, `LOAD_TEST_URL=https://...` và tuân theo giới hạn tốc độ của nhà cung cấp. Benchmark chỉ gọi các endpoint GET công khai.

## Giới hạn cần biết

- Cảnh báo, thống kê P95 và bộ đếm cache trên serverless hiện theo từng instance; nếu cần dashboard gộp toàn hệ thống, kết nối một nền tảng telemetry tập trung.
- Redis không tự được bật khi chưa cấu hình URL.
- Không bảo đảm thời gian tải hay số người dùng đồng thời cho đến khi đo trên hạ tầng thật.
- Không nên benchmark production giờ cao điểm; bắt đầu từ môi trường thử nghiệm.
