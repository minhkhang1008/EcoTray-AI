# Kiểm tra giao diện theo hình tham chiếu · 02/11/2026

Phạm vi: cập nhật giao diện hiện có; không sửa auth, API, dữ liệu, quy tắc quyết định hoặc khóa lưu trữ. Không thêm nút thông báo giả, số liệu tăng/giảm chưa tính được hoặc phần chú giải thiết kế phía dưới ảnh vào sản phẩm.

- Build và typecheck: PASS. Typecheck dùng danh sách src/*.ts và src/*.tsx được PowerShell mở rộng, với các cờ --noEmit --allowJs --checkJs false --jsx react-jsx --module ESNext --target ES2022 --moduleResolution Bundler --skipLibCheck.
- npm test: PASS, 88/88.
- npm run test:model: PASS, runtime smoke 256 đặc trưng hữu hạn; không phải phép đo accuracy.
- git diff --check: PASS.
- Layout: PASS, kiểm tra năm tab tại viewport 320/768/1600; không tràn ngang toàn trang. Bảng rộng cuộn trong vùng riêng.
- Điều hướng và bàn phím: PASS, chuyển năm tab, mở món ưu tiên và đóng dialog bằng Escape; mở bộ lọc có select/date/preset thật. Không thêm điều khiển cần handler mới.
- Nguồn và số liệu: PASS, mô phỏng có thông báo rõ; 1.280 khay, 14,6% phần còn lại, 81,5% quan sát hợp lệ đều lấy từ logic hiện có. Không sao chép các delta giả định trong ảnh.
- Mục đích thị giác: PASS, palette, khung bo, bóng nhẹ và lá theo ảnh người dùng; tên và logo trường theo tài khoản; giữ ảnh PTNK thực. Lá chỉ trang trí, không chứa dữ liệu.
- Chuyển động: PASS theo kiểm tra nguồn CSS, giữ reduced-motion và không thêm animation.

Giới hạn: chưa nghiệm thu NFC/camera/cloud thật, chưa đo Lighthouse hoặc chứng nhận WCAG toàn sản phẩm. Giữ thanh tỷ lệ theo thành phần thay donut để không diễn giải sai mẫu số. Họa tiết lá là vector, không phải ảnh chụp cây giống từng pixel của ảnh mẫu.

## Responsive và thanh cuộn

Khung desktop bỏ giới hạn 1.800px để dùng tốt màn hình rộng; tablet chuyển thanh điều hướng lên trên, điện thoại xếp lại bộ lọc và biểu mẫu. Ở 320px, các thẻ chỉ số thành một cột. Biểu đồ có vùng cuộn riêng, nhãn lớn và khoảng trục đủ chỗ; bảng không làm tràn toàn trang. Thanh cuộn dùng track trong suốt, thumb xanh xám; trên sidebar dùng xanh nhạt để nhìn được trên nền tối. Chế độ forced-colors trả về màu native.

Kiểm tra trình duyệt: PASS, năm tab × năm viewport 320/390/768/1024/1920 không tràn ngang toàn trang; computed scrollbarColor xác nhận track alpha 0 và thumb màu riêng trên sidebar. Typecheck, build và git diff --check đều PASS. Không thêm kiểm thử logic cho thay đổi trình bày.
