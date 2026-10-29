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

## Giao diện sản phẩm (23/10/2026)

Mặc định mở dashboard vận hành với dữ liệu mẫu có nhãn nguồn, không tự mở chế độ sân khấu. Nút **Chế độ demo** mở Live Demo Chung Kết riêng; hotkeys, reducer và cách ly dữ liệu vẫn giữ nguyên.

- Tổng quan: vòng phản hồi, bộ lọc, chỉ số, xu hướng, thành phần, danh sách món ưu tiên và khuyến nghị. Phễu ngày giả định và tác động ước tính nằm trong mục mở rộng ở cuối trang.
- Thực đơn: chọn thẻ món có ảnh Portal hoặc danh sách; cả hai mở cùng bảng chi tiết/lọc IQR. Không hiển thị trùng cả hai cách xem.
- Vision: phân tích ảnh là màn chính, kết nối trạm là mục riêng; năm kịch bản số liệu nằm trong mục mở rộng. Nhãn nêu rõ ảnh hiệu chuẩn chưa phải kiểm định độc lập.
- Ghi nhận: mặc định là nhập khay thủ công; NFC và cân mẫu vẫn truy cập qua các mục riêng. Bản ghi mới lưu vào dữ liệu cá nhân, không cộng vào bộ mô phỏng.
- Dữ liệu: tách bản ghi khay, lịch sử can thiệp và cấu hình trường; bộ lọc khay chỉ xuất hiện khi xem bản ghi.

`src/product.css` điều chỉnh giao diện sản phẩm trên các thành phần hiện có; `ProductContext.tsx` trình bày vòng phản hồi theo cấu hình trường. Vẫn dùng CSS thuần và output `dist/`. Ảnh báo cáo được chụp từ bản build local tại `artifacts/product/`, không chứng minh phần cứng hoặc triển khai production. Ảnh Tổng quan/Thực đơn/Dữ liệu dùng số liệu mô phỏng; ảnh Vision dùng ảnh hiệu chuẩn đã gán nhãn.

## Bổ sung hỗ trợ quyết định (27/10/2026)

Giữ màn vận hành mặc định; mở riêng **Live Demo Chung Kết** từ header. Gói Lite/Standard/Pro có bộ chọn nhanh và dòng mô-đun đang cấu hình. Phím `5` duyệt, `R` reset; `3` vẫn là thẻ chưa đăng ký theo hợp đồng hiện tại, lặp `1`/`2` để kiểm tra chống nhận suất hai lần.

`DecisionSupport.tsx` cung cấp ma trận Cơm/Món chính/Rau/Canh, thử quy tắc định lượng, thông tin kiểm chứng và lộ trình. Các cặp món ngày 13/10 và 16/10, 310 suất, tỷ lệ rau/canh nằm riêng trong `lib/decision-scenarios.ts` với `source: simulation`. Chưa có bằng chứng Portal xác nhận các cặp rau/canh trong bộ 20 món; chi tiết món ghi “Chưa xác minh cặp món”, không tự gán kịch bản vào dữ liệu nguồn. CSV cũ tiếp tục nhập được; bản ghi mới có tên Cơm/Rau/Canh và tỷ lệ canh tùy chọn, được lưu và xuất/nhập lại. Không thêm số canh giả để thay đổi 3.131 quan sát hay 81,5%. Chỉ số tổng hợp nguồn vẫn dùng ba thành phần; canh hiển thị riêng trong bản ghi và drawer. IQR có thêm hàng rào riêng cho canh khi có đủ 10 quan sát canh.

`nutritionAudit` tính thực ăn = định lượng × (1 − % thừa), chưa làm tròn khi quyết định. Không có định lượng cân thì khóa đề xuất giảm rau. Dưới ngưỡng thì đổi cách chế biến/cặp món, giữ lượng rau; đủ ngưỡng và thừa cao thì đề xuất thử định lượng ≥ngưỡng và đo lại. Mẫu ngoại lai và thiếu mẫu vẫn được xử lý trước quy tắc khẩu phần. Stage dùng 90 g, 46,5% thừa → 48,15 g thực ăn ước tính. Bảng thử nhánh còn lại dùng 120 g, 25% → 90 g thực ăn, đề xuất thử 95 g. Không khẳng định can thiệp bảo đảm giữ nguyên lượng ăn vào.

**Xung đột cần ghi nhận:** yêu cầu đính kèm gọi 85 g là chuẩn bắt buộc; nguồn chính thức không chứng minh mức này áp dụng chung. [Hướng dẫn Bộ Y tế 3958/QĐ-BYT, bản trên cổng giáo dục](https://f1.hcm.edu.vn/data/doc/2026/hssv/uyen/2026_1/21/3958-byt-hdan-dinh-duong-bua-an-hoc-duong-25-12-25_211202610.pdf) nêu 80–120 g rau cho tiểu học, 100–150 g cho THCS/THPT trong bữa chính. Vì vậy 85 g chỉ là giả định kịch bản; chưa phải cấu hình dinh dưỡng được phê duyệt cho PTNK. Gram rau không phải gram chất xơ. Không công bố MAE 6,8% / độ chính xác 93,2%, tỷ lệ ngoại lai 4,2%, xác nhận CITT hay cải thiện thực ăn +24% khi chưa có hồ sơ đối chứng.

API giữ hợp đồng IoT v1, xác thực và atomic idempotency. Callback/kết quả JSON có thêm `soupLeftoverPct` tùy chọn (0–100); snapshot trả `result.soup`. Client kiểm tra cùng miền giá trị. Trường này không bắt buộc với thiết bị cũ và không nhập vào thống kê ba thành phần nguồn. Raw JPEG tiếp tục chờ worker; không tạo kết quả AI giả hoặc hứa độ trễ dưới một giây.

Calculator thêm đầu đọc tùy chọn, CAPEX, OPEX chín tháng học, tiết kiệm phiếu theo gói và hoàn vốn dự kiến. Chi phí vẫn là giả định README, chưa phải báo giá/invoice mới. Lộ trình ghi mục tiêu 4/12 trường là mốc đề xuất trong phạm vi 3–5/10+ của README; tác động là kế hoạch, không phải đã đạt.

Rà soát độc lập yêu cầu bổ sung và đã sửa: nhập tổ hợp mới/CSV; canh 0% hiển thị trạng thái tốt; chữ quyết định sân khấu 20–24 px và giá trị rau 30 px; Vision có công tắc IQR tính lại trên 20 mẫu nền mô phỏng + mẫu thanh trượt. Bộ 21 mẫu này chỉ phục vụ thử độ nhạy, không cộng vào 1.280 khay hoặc dữ liệu thực địa.

### Kết quả kiểm tra bản bổ sung

Ngày 27/10/2026: `npm test` đạt **54/54**, model smoke đạt (256 features hữu hạn, không phải kiểm định độ chính xác), typecheck theo AGENTS đạt, `npm run build` đạt và sinh offline cache 7 tài nguyên; Vercel vẫn xuất `dist/`. `git diff --check` không có lỗi; không có tham chiếu `demo-data/` trong mã nguồn/runtime được kiểm tra. Không có script lint để công bố.

Main Chrome 48425945: đã kiểm tra nhận thẻ lặp, cảnh báo cơ địa/ngoại lai, chụp → khóa giảm rau → phím 5 phê duyệt → R reset; chọn Lite/Pro; ma trận chọn A/B và hai nhánh định lượng; công tắc IQR đổi 20/21 thành 21/21 mẫu và tính lại trung bình. Kiểm tra kích thước 320/390/768/1024/1440 px; đo trang cấu hình không tràn ngang tại các mốc 320/768/1024, bảng rộng cuộn riêng. Bản production local tại 127.0.0.1:8766 chạy được stage và phê duyệt, không có thông báo console mới sau khi tải bản cuối. Không tạo khay thử vào dữ liệu thực địa.

Reviewer độc lập Impeccable: `ship` cho bốn sửa đổi được chấm (tổ hợp mới/CSV, phân cấp sân khấu, canh theo tỷ lệ, IQR Vision). Không coi verdict này là chứng nhận toàn bộ sản phẩm. Đối chiếu thiết kế lưu tại `.impeccable/review/design-conformance.md`; giữ DESIGN.md hiện có. Detector chỉ báo advisory; timestamp sidecar đã cũ từ trước và không được sửa ngoài phạm vi. Chưa tổng duyệt khả năng đọc ở 15 m, chưa kiểm chứng phần cứng/AWS/Vercel, chưa push/deploy.

## Hiện trạng sau tinh giản giao diện (30/10/2026)

Các mô tả UI theo ngày phía trên là lịch sử. Hiện tại Thực đơn mở danh sách trước; mỗi hàng mobile hiển thị số khay và ba tỷ lệ, không buộc kéo ngang. Không đặt luồng camera, bảng phối món hoặc ví dụ định lượng lên trước danh mục. Drawer chỉ giữ số liệu món; một ngày dùng bảng gọn. Kịch bản toàn căn tin chuyển sang Dữ liệu → Thông tin dự án cùng minh chứng, lộ trình và dự toán.

Vision có ba mục: Trạm căn tin, Kiểm tra ảnh, Thử kịch bản. Màn trạm dùng chung phép chọn sự kiện mới nhất cho cả hiển thị và phím 5; phân tích trực tiếp và callback worker không dựng hai màn cạnh tranh. Phím 1/2/3, Space/4, 5 và R vẫn chạy nền. Quyết định lưu chung trên trình duyệt với nguồn phần cứng, mô phỏng NFC hoặc ảnh tham chiếu; ghi lặp cùng sự kiện không tạo thêm hàng. Mỗi sự kiện tham chiếu mới có revision riêng, kể cả sau tải lại trang. R chỉ đặt lại dữ liệu dự phòng, giữ quyết định phần cứng.

Mẫu cân cập nhật quy đổi tại Thử kịch bản. Mô hình PTNK giữ định lượng giả định và kết quả kiểm định gốc. Đã gỡ các UI cũ không còn được App gọi; vẫn giữ thư viện, script và kiểm thử model. Không thay đổi API triển khai hoặc tự xác nhận nghiệm thu phần cứng.
