# EcoTray — giao diện vận hành, 23/10/2026

Ưu tiên được người dùng xác nhận: mở Tổng quan để thấy việc cần xử lý và khuyến nghị cho bếp.

## Thay đổi

- Khuyến nghị và các món ưu tiên xuất hiện trước biểu đồ. Một nút chính mở ngay phân tích món đầu tiên.
- Thanh điều hướng nền trắng; trên điện thoại, cả năm mục luôn có mặt. Bỏ phần giới thiệu lớn và số thứ tự trang trí trên các chỉ số.
- Bộ lọc thu gọn, nhưng phạm vi hiện tại và nút xóa lọc luôn nhìn thấy. Giữ các bộ lọc món, ngày và kỳ 7/30 ngày.
- Số liệu dùng cùng hàm phân tích hiện có. Ghi rõ tỷ lệ trước lọc ở tổng quan, sau lọc ở chi tiết. Không có món ưu tiên về rau không đồng nghĩa đủ bằng chứng giữ nguyên mọi khẩu phần.
- Bảng món giữ chiều rộng đọc được và cuộn ngang trên màn hình nhỏ. Biểu đồ có bảng theo ngày trong mục mở rộng, dùng được bằng bàn phím.
- Năm tab, CSV, Vision, QuickLog, cấu hình Lite/Standard/Pro và demo chung kết được giữ. Không gian lưu cục bộ được ghi đúng, không giả lập tài khoản quản trị.

## Nguồn và giới hạn

README.md vẫn là nguồn chuẩn. Ảnh và tên món Portal PTNK là thật; số khay và phần còn lại của tập demo là mô phỏng. Các dự toán và kịch bản trước/sau tiếp tục có nhãn riêng. Không thay thuật toán, cơ chế xác thực IoT hoặc dữ liệu nguồn trong lần redesign này.

Impeccable 4.7.0 được tải từ https://github.com/pbakaus/impeccable, revision `5cb95ee`; bản skill nằm ở `.agents/skills/impeccable`. Áp dụng hướng dẫn Operate, distill, quieter và craft floor. PRODUCT.md ghi mục tiêu; DESIGN.md và `.impeccable/design.json` ghi hệ thống giao diện thực tế.

## Kiểm tra

- 48 kiểm thử nghiệp vụ/IoT/model đạt; model smoke đạt, không phải đo độ chính xác.
- Typecheck theo AGENTS.md và Vite production build đạt; đầu ra vẫn là `dist/`.
- Đã dùng BrowserSkill với Main Chrome, instance `48425945`, kiểm tra ở 1470×668, 768×1024 và 390×844.
- Kiểm tra bộ lọc, trạng thái trống, chi tiết món, Vision theo ảnh mẫu (50/100/100), tìm kiếm bản ghi, CSV xuất 1.280 dòng với `source=simulation`, đổi Lite/Pro và phím demo 1/1/2/3/4 cùng phê duyệt bằng Enter.
- Kiểm tra bằng Impeccable detector trên các file UI thay đổi: không có finding. Đây là kiểm tra tự động có phạm vi, không phải chứng nhận khả năng tiếp cận đầy đủ.
- Ảnh và CSV kiểm tra được lưu cục bộ trong `artifacts/redesign/` (không đưa vào Git).

Đợt này hoàn thiện giao diện và bản build local. Chưa xuất bản lên Vercel, chưa nghiệm thu thêm phần cứng hoặc triển khai khách hàng.
