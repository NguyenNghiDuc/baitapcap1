# Bài Tập Cấp 1

Ứng dụng học tập dành cho học sinh lớp 1–5.

## 22 nhóm chức năng đã dựng
1. Trang chủ.
2. Hệ thống môn học.
3. Phân loại theo lớp/môn/chủ đề/độ khó.
4. Trang làm bài trắc nghiệm.
5. Chấm điểm tự động + giải thích đáp án.
6. Đề kiểm tra/thi thử.
7. Tài khoản học sinh + 3 vai trò demo.
8. Hồ sơ và lịch sử học tập.
9. Điểm thưởng, streak, huy hiệu.
10. Tìm kiếm và lọc.
11. Dữ liệu bài học mẫu.
12. Kho tài liệu.
13. Yêu thích.
14. Admin dashboard.
15. Admin tạo câu hỏi.
16. Tạo đề tự động.
17. Thống kê admin.
18. Khu vực phụ huynh.
19. Trợ giảng AI mô phỏng theo luật.
20. Responsive + light/dark mode.
21. Mô hình dữ liệu mẫu + JSON DB backend.
22. Backend bảo mật mẫu với scrypt, session token, rate limit và security headers.

## Chạy
Yêu cầu Node.js 18+.

```bash
npm start
```

Mở `http://localhost:3000`.

## Tài khoản demo giao diện
- Học sinh: `hocsinh@demo.vn`
- Admin: `admin@demo.vn`
- Phụ huynh: `phuhuynh@demo.vn`

Các tài khoản demo dùng localStorage để trình diễn nhanh. API `/api/register` và `/api/login` là luồng backend riêng có hash mật khẩu.
