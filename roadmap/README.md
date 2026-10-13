# Lộ trình 160 chức năng — kiểm kê và triển khai theo module

> **Trạng thái tại thời điểm tạo danh mục:** 160 đề xuất đã được ghi nhận, **không có mục nào được xác nhận hoàn thành chỉ vì tồn tại file code**. Không được quảng cáo "đã xong 160" nếu chưa có kiểm thử và đánh giá thực tế.

## Sử dụng

```bash
npm run roadmap:audit
npm run roadmap:audit:json
npm run check
npm test
npm run build
npm run test:ui -- --project=chromium
```

- `features-001-020.json` đến `features-141-160.json`: **8 file độc lập**, mỗi file 20 hạng mục.
- `evidence.json`: ánh xạ những mục có **mã nguồn liên quan**; đây là dấu hiệu cần rà, **không phải bằng chứng đã chạy đúng**.
- `scripts/audit-roadmap.js`: từ chối thiếu ID, trùng ID, thiếu code tham chiếu, trạng thái không hợp lệ, hoặc gắn nhãn `verified` mà chưa khai báo kiểm thử/người duyệt.
- `tests/roadmap-audit.test.js`: kiểm tra tự động được chạy trong `npm test`.

## Trạng thái

| Trạng thái | Ý nghĩa |
| --- | --- |
| `not-verified` | Chưa kiểm thử chức năng theo yêu cầu; có thể có code liên quan |
| `partial` | Đã kiểm tra và chứng minh được một phần; phải ghi giới hạn cụ thể |
| `verified` | Có kiểm thử tự động thực sự + người duyệt + xác nhận trên môi trường phù hợp |
| `blocked` | Thiếu cấu hình, API/provider hoặc yêu cầu dữ liệu/quyền của bên thứ ba |

Để đánh dấu `verified`: cập nhật `assessment` của mục, thêm `tests: ["tests/..."]` với file thực tồn tại và `verifiedBy` sau khi kiểm thử. Việc kiểm chứng endpoint có dữ liệu thật còn cần smoke test/kiểm thử staging và bằng chứng deployment; **CI pass không tự chứng minh tất cả tính năng**.

## Các lớp module

| Vùng | File/thư mục | Phạm vi |
| --- | --- | --- |
| Auth và quyền | `routes/supabase-auth.js`, `routes/account.js`, `server.js` | Supabase UUID, khóa user, vai trò; không tin metadata/email để tự cấp Admin |
| Quản lý học sinh | `routes/student.js`, `routes/analytics.js`, `js/student/` | Bài tập, phân tích, lịch sử học |
| Kiểm tra | `js/exams/`, `routes/exam-settings.js`, `routes/exam-drafts.js` | Ngân hàng đề, cấu hình và bài làm nháp |
| Quản lý Admin | `js/admin/`, `routes/admin-results.js`, `css/admin-*.css` | Bảng điểm, quản lý người dùng, hiệu năng |
| AI | `routes/ai.js`, `lib/ai/` | Giải bài và kiểm tra Toán; không được tự chấm điểm chính thức |
| Database và vận hành | `lib/postgres.js`, `db/migrations/`, `lib/cache.js`, `scripts/` | Truy vấn, backup, kiểm thử, monitoring |

Định hướng khi thêm module: **mỗi chức năng phải có route/service/UI/styles/tests riêng**, giới hạn phụ thuộc trực tiếp vào `server.js` và `js/app.js`; với backend, phải kiểm tra quyền trước khi truy cập hoặc thay đổi dữ liệu.

## Thứ tự triển khai an toàn

1. **Foundation**: đăng nhập, Admin chính, phân quyền, dữ liệu trẻ em, nhật ký, sao lưu/khôi phục, idempotency và bảo mật.
2. **Learning**: tài khoản, lớp học, ngân hàng đề, kiểm tra, chấm điểm, giáo viên và phụ huynh.
3. **AI**: đánh giá đáp án, tạo đề, an toàn nội dung, ẩn dữ liệu cá nhân và giới hạn chi phí.
4. **Scale**: khả năng chịu tải, nhiều trường, cơ sở dữ liệu, đa ngôn ngữ và trợ năng.

## Quy tắc bắt buộc trước khi merge mỗi chức năng

- Có mô tả hành vi, dữ liệu cần lưu và phạm vi quyền truy cập.
- Có kiểm thử đầu vào sai, kiểm thử không có quyền, tài khoản bị khóa, trường hợp lỗi mạng và thao tác lặp.
- Không cấp quyền Admin bằng cách tự tin email, role từ trình duyệt hoặc dữ liệu người dùng.
- Migration phải có kế hoạch rollback; backup và khôi phục phải được thử với dữ liệu không nhạy cảm.
- Không lưu secret trong GitHub, không ghi toàn bộ hồ sơ/trẻ em vào log, có giới hạn thời gian lưu.
- Giữ mã nguồn từng module độc lập; tránh file JS/CSS dài, tránh ghi đè selector dùng chung.
- Trước triển khai: `npm run roadmap:audit`, `npm run check`, `npm test`, `npm run build`, UI tests và smoke trên tên miền production.
- Nếu CI đỏ: sửa lỗi hoặc dừng phát hành chức năng mới; không tăng danh sách “đã xong”.
- Những tính năng cần SMTP, AI provider, Redis, VAPID, passkeys, multi-tenant, read replica… chỉ có thể xác minh sau khi có cấu hình, môi trường và quyết định triển khai.

## Giới hạn đợt này

Đợt này tạo **danh mục và hệ thống kiểm tra**, đồng thời triển khai độc lập **bộ xem nhật ký Admin (mục 2, một phần)** gồm `routes/admin-audit.js`, `js/admin/audit-log.js`, `css/admin-audit.css` và `tests/admin-audit.test.js`. Chức năng xem/tìm kiếm/phân trang đã có kiểm thử unit; tính đầy đủ của mọi sự kiện và khả năng hoạt động trên production vẫn cần xác minh. **Không thay thế cho việc triển khai 160 chức năng**.
