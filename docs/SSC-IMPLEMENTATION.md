# Nâng cấp dashboard chung kết SSC 2026

## Kiến trúc và phạm vi

Repo vẫn là React 19 + TypeScript + Vite, CSS thuần, điều hướng bằng state trong `App.tsx`. Không chuyển sang Next.js/Tailwind: việc chuyển framework không cần thiết cho các tính năng này. `api/iot/[action].mjs` là Vercel Function Node; `server/` dùng chung cho Vercel, Vite dev và `npm start`. Build vẫn xuất `dist/` với đường dẫn tài nguyên tương đối.

`FinalRoundContext` giữ cấu hình trường, mẫu cân, nguồn sự kiện và phiên trình diễn. Phần phân tích cũ vẫn đọc dữ liệu từ `lib/analytics.mjs`; các quy tắc mới nằm trong `lib/final-round.mjs`, hợp đồng TypeScript tại `lib/contracts.ts`. Không có API key hoặc dịch vụ AI bên ngoài được thêm vào Vision trong trình duyệt.

## Hành vi có thể kiểm tra

- Header **🔴 Live Demo Chung Kết** mở dialog bốn bước. `1`: thẻ hợp lệ; `2`: thẻ dị ứng; `3`: thẻ chưa đăng ký; lặp `1`/`2`: thẻ đã nhận suất. `Space` hoặc `4`: hoạt ảnh 600 ms, nhận khay và kiểm định tự động. Bếp phê duyệt bằng nút, lịch sử không ghi lặp. Phím không chiếm ô nhập liệu; Space trên nút vẫn kích hoạt nút theo chuẩn bàn phím.
- **Đặt lại lượt demo** xóa bộ đếm/sự kiện/lịch sử mô phỏng, không đụng khay thực địa, khay phần cứng hoặc 1.280 khay nguồn. Bản production lưu app shell, ảnh khay tham chiếu và hiệu chuẩn vào Service Worker; badge “Sẵn sàng ngoại tuyến” chỉ hiện sau khi lưu xong. API không được cache. Cache này phục vụ sân khấu; ảnh món Portal chưa lưu sẵn sẽ hiện thông báo cần mạng khi ngoại tuyến. Bắt đầu ở 1.015 suất mô phỏng để hai thẻ hợp lệ đưa tổng lên 1.017. Dự kiến 10,6 kg và 265.000đ/ngày chỉ hiện cho kịch bản chỉnh khẩu phần.
- **Tổng quan** có phễu một ngày và kịch bản ESG. Phễu 1.004/986 và tác động ESG không được suy ra từ 1.280 khay. Giả định 30 ngày cho 318 kg được ghi riêng; phiếu giấy dùng 20 ngày học. Hệ số CO₂e 2,5 là giả định minh họa, chưa có kiểm chứng.
- **Phân tích thực đơn**: mở từng dòng/card trong 20 món, xem ảnh Portal thật và đúng ngày nguồn. Toggle hai lớp: cờ cơ địa trước, IQR sau (Q3 + 1,5 IQR, tối thiểu 10 mẫu). IQR không chẩn đoán dị ứng. Biểu đồ ngày chỉ hiện ngày có bản ghi; một món có một ngày nguồn không được tạo thêm ngày. So sánh 63,1 → 52,5 kg là kịch bản toàn căn tin.
- **Vision**: luồng IoT xem hàng đợi/kết quả; độ trễ chỉ hiện nếu worker gửi giá trị đo. Sandbox có **1 ảnh khay thật đã gán nhãn + 5 kịch bản số liệu**. Repo chưa có 6 ảnh khay thật độc lập. Ảnh món Portal không phải ảnh khay thừa. Ảnh tải lên khác bố cục hiệu chuẩn bị từ chối; chưa công bố độ chính xác. Việc dùng lại ảnh hiệu chuẩn là trình diễn, không phải kiểm định độc lập.
- **Ghi nhận**: NFC, QuickLog mẫu cân và ghi nhận thủ công. Mẫu cân tách khỏi các khay phân tích; hệ số bình phương tối thiểu qua gốc cập nhật ngay phần gram ở Vision. Diện tích → gram là ước lượng, không thay cân đối chứng.
- **Dữ liệu**: lọc món/ngày/từ khóa, phân trang và xuất CSV theo bộ lọc. Chọn nguồn Demo/Cá nhân/Phần cứng riêng biệt. Lịch sử can thiệp có CSV riêng. Lite/Standard/Pro thay nhãn đầu vào và badge mô-đun; chọn gói không tự kết nối Portal. Calculator dùng 38.500đ ở 1.017 × 20 ngày, co giãn theo số ảnh, ghi rõ Free Tier và các chi phí chưa tính.

## Nguồn dữ liệu và lưu trữ

| Nguồn | Nơi lưu | Tham gia phân tích |
| --- | --- | --- |
| 1.280 khay mô phỏng nguồn | `data/`, `lib/analytics.mjs` | Chỉ không gian Demo |
| Ghi nhận cá nhân | `ecotray-records` | Chỉ dữ liệu của tôi |
| Sự kiện sân khấu | Reducer trong RAM | Không cộng vào bộ khay nào |
| Mẫu cân | `ecotray-calibration-v1` | Chỉ quy đổi gram |
| Cấu hình trường | `ecotray-adapter-v1` | Đổi mô-đun/nhãn |
| Bếp duyệt | `ecotray-interventions-v1` (tối đa 500) | Lịch sử riêng, có `source` |
| Phần cứng | Redis dùng chung; trình duyệt đọc snapshot | Không gian phần cứng, 100 khay gần nhất |

Lịch sử bếp duyệt hiện lưu trên thiết bị, chưa đồng bộ giữa nhiều máy. Không dùng localStorage làm kho IoT phía server. Ảnh JPEG nhận trực tiếp được lưu khóa riêng có TTL tối đa 30 ngày; metadata chỉ giữ 100 khay gần nhất. Đối với vận hành cả trường, nên dùng pipeline AWS/S3 của nhóm để lưu ảnh và gửi URL/kết quả; bật lifecycle xóa S3 sau 30 ngày. Cầu nối Redis nhận ảnh phù hợp kiểm thử tích hợp, chi phí Redis chưa nằm trong dự toán AWS của README.

## Xác minh và giới hạn bàn giao

Chạy `npm test`, `npm run test:model`, typecheck theo AGENTS và `npm run build`. `npm run test:iot:redis` là kiểm tra tùy chọn, cần `redis-server` và `redis-cli` cài trên máy; chạy Lua CAS thật với nhiều service gửi lại đồng thời. Không có script lint.

BrowserSkill dùng đúng **Main Chrome 48425945** để kiểm tra UI; không dùng profile khác khi profile này mất kết nối. Kiểm tra bàn phím, phê duyệt thường/ngoại lai, drawer/toggle, QuickLog → gram Vision, CSV có `source=simulation`, adapter/calculator và chiều rộng 320/768/1024/1440. Các mẫu cân thử phải xóa sau kiểm tra.

Chưa xác minh phần cứng ESP32-CAM, thẻ NFC/NDEF trên Android, AWS worker thật hoặc bản deploy Vercel. Xem [IOT.md](IOT.md) để cấu hình, các ví dụ POST và yêu cầu tích hợp. Không có thao tác push/deploy tự động trong thay đổi này.

Kiểm tra phụ thuộc: `npm audit --omit=dev --audit-level=high` không báo high/critical, còn 3 mục mức moderate trong chuỗi có sẵn `@tensorflow/tfjs → argparse → sprintf-js` (GHSA-hp3w-g68c-fv3c). Không chạy `audit fix --force`: npm đề xuất hạ TensorFlow về 2.1.0, làm thay đổi model/runtime. TF.js không có trong bundle UI chính hiện tại; vẫn được dùng bởi model smoke và các thành phần Vision cũ. Theo dõi bản vá tương thích và rà soát lại trước 01/11/2026; không coi audit là đã hoàn toàn sạch.
