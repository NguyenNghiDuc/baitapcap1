# Lộ trình nâng cấp 12 chức năng — Bài Tập Cấp 1

Cập nhật: 2026-10-10. Đây là lộ trình triển khai, **không phải tuyên bố các tính năng đã hoàn tất**.

## Kết quả rà soát bước đầu

- Trợ giảng AI: đã có `routes/ai.js`, `js/student/ai-question.js` và bộ giải Toán cục bộ. Chưa xác nhận đánh giá chất lượng AI trực tiếp với provider.
- Nhập câu hỏi: backend `server.js` có API Excel/CSV; Word/PDF chưa có pipeline nhập đề được kiểm chứng.
- Tạo đề: đã có ngân hàng câu hỏi, đề cá nhân hóa (`js/student/personal-exam.js`), phòng thi và đề học kỳ. Cần quy trình giáo viên tạo, duyệt, xuất bản đề.
- Bài kiểm tra hàng ngày: đã có bộ đề theo kỳ/ngày; cần lịch phát đề, hạn nộp, chống trùng theo người học.
- Phân tích tiến độ: đã có trang kết quả, phân tích và hồ sơ học tập; cần phân tích câu sai dựa trên dữ liệu phía server.
- Nhắn tin: đã có thông báo và lớp học nhưng chưa xác nhận nhắn tin riêng giáo viên–phụ huynh hoàn chỉnh.
- Chấm bài ảnh: có mô-đun ảnh bài làm và OCR/AI; cần đánh giá độ chính xác, duyệt điểm bằng giáo viên.
- Quản trị: đã có API quản lý người dùng và cấp Admin theo tài khoản Supabase; đang tăng cường phân quyền Super Admin.
- Đồng bộ: đã có Supabase Auth, nhưng ảnh đại diện hiện lưu trong localStorage; cần Supabase Storage/RLS và tiến độ theo user ID.
- Thông báo: đã có trang thông báo và Web Push; cần lịch nhắc có kiểm soát.
- Thi đấu: đã có phòng thi và bảng xếp hạng; chưa có hệ thống thi đấu thời gian thực được kiểm chứng.
- PWA: có Service Worker và offline cache; cần kiểm thử cập nhật, đồng bộ/khôi phục phiên và chế độ ngoại tuyến.

## Thứ tự thực hiện

| Giai đoạn | Ưu tiên | Hạng mục | Điều kiện nghiệm thu |
|---|---|---|---|
| 1 | P0 | Super Admin, quyền truy cập, nhật ký; đồng bộ Supabase | User không thể tự cấp Admin; không lộ dữ liệu học sinh; có kiểm thử 401/403, RLS, đăng nhập nhiều thiết bị |
| 2 | P0 | Nhập Word/PDF; tạo đề tự động | Đọc được DOCX/PDF văn bản; giáo viên duyệt từng câu/đáp án trước khi lưu; file sai có thông báo |
| 3 | P0 | AI giải bài từ ảnh; chấm bài bằng ảnh | OCR có xác nhận nội dung; Toán được đối chiếu tính toán; AI không tự ghi điểm chính thức |
| 4 | P1 | Kiểm tra mỗi ngày; phân tích điểm, gợi ý ôn tập | Lịch thi theo lớp/môn, lưu lịch sử trên DB và thống kê câu sai chính xác |
| 5 | P1 | Nhắn tin giáo viên–phụ huynh; thông báo tự động | Chỉ các bên được liên kết mới đọc được; chống spam, lịch sử tin và kiểm soát thông báo |
| 6 | P2 | Thi đấu kiến thức; PWA nâng cao | Xếp hạng dựa trên điểm được xác minh, kiểm thử offline/online và cập nhật không mất phiên |

## Nguyên tắc kỹ thuật

1. Mỗi tính năng tách module UI/API/validation/migration/test, không chồng mã vào `js/app.js` nếu không cần.
2. Cấp quyền dựa trên Supabase Auth UID phía server. Không tin role trong metadata tự đăng ký và không nhúng mật khẩu/secret vào GitHub.
3. Điểm thi, dữ liệu lớp và hồ sơ học sinh phải gắn user ID; chính sách RLS phải kiểm thử trước khi đưa lên production.
4. Quy trình import Word/PDF phải hỗ trợ kiểm tra thủ công trước khi xuất bản; không đoán đáp án từ file thiếu dữ liệu.
5. AI có chế độ fallback, giới hạn chi phí và kiểm chứng đáp số; ghi log an toàn, không lưu thông tin nhạy cảm.
6. Triển khai từng giai đoạn, chạy `npm test`, `npm run build`, kiểm tra Vercel Ready rồi smoke test thực tế.

## Tiến độ

- [x] Kiểm tra sơ bộ cấu trúc và phát hiện các mô-đun đã tồn tại.
- [x] Bước đầu chặn Admin thường chỉnh sửa/khóa Admin khác; ngăn tự khóa tài khoản đang dùng.
- [ ] Kiểm thử API Super Admin và các trường hợp quyền.
- [ ] Xác minh DB bền vững và RLS cho các tính năng hiện có.
- [ ] Bắt đầu pipeline import DOCX/PDF theo giai đoạn 2.
