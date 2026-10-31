# EcoTray AI – SSC 2026 (Master Context & Final Round Blueprint)

<aside>
🎯

**KẾT LUẬN CỐT LÕI & ĐỊNH VỊ DỰ ÁN (THESIS)**

**EcoTray AI** không phải là hệ thống chỉ “dùng camera AI để phát hiện thức ăn thừa”, cũng không định vị là “một Winnow giá rẻ”. Tại Trường Phổ thông Năng khiếu (PTNK CSĐH), có cố định **1.017 học sinh** ăn bán trú mỗi ngày (~183.000 suất/năm), nên tổng nhu cầu nền gần như đã biết trước. Khoảng trống vận hành thực tế là: **1.017 suất được phân bổ giữa 4 món như thế nào, bao nhiêu suất thực sự được nhận, và từng thành phần (Cơm – Rau – Món chính) trên khay bị bỏ lại ở mức nào**.

EcoTray khép kín vòng phản hồi **Registered (Đăng ký) → Served (Thực nhận qua NFC) → Consumed/Wasted (Phân tích khay qua Camera AI) → Decision (Đề xuất điều chỉnh)** để giúp căn tin phân biệt chính xác **dư do số suất (Quantity Problem)** với **dư do khẩu phần/cách chế biến (Portion/Menu Problem)**, đồng thời đóng gói thành các mô-đun độc lập để nhân rộng cho các trường học có quy trình khác nhau.

**Slogan:** *“Mỗi khay lên tiếng, mỗi bữa ăn tốt hơn.”*

</aside>

## 1. Trạng thái hiện tại & Chuyển dịch chiến lược Vòng Chung kết

### 1.1. Bối cảnh cuộc thi & Thành tích hiện tại

- **Cuộc thi:** Sáng kiến Xây dựng Xã hội Bền vững – Sustainable Society Challenge (SSC) 2026 do Trường ĐH Quốc tế (ĐHQG-HCM) và Sở GD&ĐT TP.HCM tổ chức, chủ đề *“Green Solutions for Sustainable Communities”*.
- **Trạng thái:** Đội **Va Lo Ran** đã vượt qua Vòng Loại (xét duyệt thuyết minh) và Vòng Sơ khảo (Top 20 thuyết trình) để lọt vào **TOP 8 Bảng THPT bước vào Vòng Chung kết**.
- **Thể lệ Vòng Chung kết:** 08g00–12g00, Thứ Bảy 7 tháng 11, 2026 tại ĐH Quốc tế; **05 phút thuyết trình trực tiếp** + **10 phút trả lời câu hỏi phản biện từ BGK**.
- **Trọng số chấm điểm Chung kết (100 điểm):** Phân tích vấn đề địa phương (20đ) + **Tính khả thi, sáng tạo, phạm vi nhân rộng & sản phẩm mẫu thực tiễn (35đ)** + **Kế hoạch hành động 3 năm & tính bền vững (20đ)** + Tác động bền vững & SDGs (15đ) + Hình thức slide & phản biện (10đ).

### 1.2. Chuyển dịch chiến lược từ Vòng 2 sang Vòng Chung kết

- **Ở Vòng 1 & Vòng 2:** Nhóm ưu tiên chứng minh quy trình thu thập thủ công tạo ra insight đúng và chỉ dừng ở [Dashboard Prototype](https://ecotray-ai.vercel.app/).
- **Ở Vòng Chung kết:** Để chinh phục 35 điểm “Tính khả thi & Minh chứng sản phẩm mẫu” và 10 phút Q&A chuyên sâu, nhóm **hiện thực hóa toàn bộ phần cứng – đám mây – phần mềm chạy thực tế (End-to-End Live Product)** ngay trên sân khấu, đồng thời giải quyết triệt để 3 vấn đề BGK đặt ra ở Vòng 2.

| Phản hồi / Câu hỏi của BGK ở Vòng 2 | Giải pháp nâng cấp triệt để ở Vòng Chung kết |
| --- | --- |
| **1. Sai lệch dữ liệu do yếu tố cá nhân** — Dị ứng đậu phộng, lactose, cá, hải sản… hoặc ốm đau. Nếu học sinh bỏ thức ăn vì dị ứng mà hệ thống tính vào tỷ lệ thừa chung thì sẽ đề xuất sai cho bếp. | Áp dụng **Cơ chế Lọc nhiễu 2 Lớp (2-Layer Allergy & Outlier Defense)**: 
  • **Lớp 1 — Trước bữa ăn, NFC Gate:** gắn cờ dị ứng cá nhân vào hồ sơ thẻ NFC để cảnh báo cô phát cơm không múc thành phần gây dị ứng ngay từ đầu. 
  • **Lớp 2 — Sau bữa ăn, thuật toán IQR Trimming:** tự động phát hiện và tách các mẫu khay ngoại lai cá biệt — bỏ nguyên 100% thành phần trong khi >90% học sinh khác ăn hết — khỏi công thức tính trung bình điều chỉnh khẩu phần. |
| **2. Rào cản lớn nhất khi phát triển và triển khai dự án?** | Rào cản lớn nhất không phải thuật toán AI mà là **Độ ma sát vận hành giờ cao điểm (Peak-Hour Operational Friction — 1.017 học sinh ăn trong 30–45 phút)** và **sự khác biệt quy trình giữa các trường**. Giải pháp: (1) quét thẻ NFC nhận suất <0,5 giây; (2) trạm lướt khay ESP32-CAM tự chụp bằng cảm biến tiệm cận <0,5 giây, không bấm nút và chống chụp lặp; (3) đề xuất 1 chạm cho bếp duyệt; (4) đóng gói **3 cấp độ mô-đun Lite / Standard / Pro**. |
| **3. BGK muốn xem kỹ hơn tất cả các mục bên trong Web Dashboard.** | Nâng cấp toàn diện cả **5 tab chức năng** trên [ecotray-ai.vercel.app](https://ecotray-ai.vercel.app/) — Tổng quan, Phân tích thực đơn, EcoTray Vision, Ghi nhận khay/Cổng NFC, Dữ liệu & Cấu hình nhân rộng — kèm **Chế độ Trình diễn Sân khấu (Live Stage Mode)** để BGK bấm vào bất kỳ đâu trong 10 phút Q&A đều có dữ liệu sâu và tương tác sống. |

## 2. Hệ thống dữ liệu: Phân tách rõ “Dữ liệu Thực địa” và “Dữ liệu Mô phỏng”

<aside>
⚠️

**Quy tắc bất di bất dịch cho cả Nhóm và AI:** Tuyệt đối không trộn lẫn số liệu đã đo thực tế tại PTNK với số liệu mô phỏng trên Dashboard; khi thuyết trình và hiển thị trên web phải gắn nhãn minh bạch.

</aside>

### 2.1. Dữ liệu Thực địa tại PTNK CSĐH — `REAL DATA`

#### 1. Quy mô vận hành căn tin

- Tổng số suất cố định: **1.017 suất ăn/ngày × 180 ngày ăn/năm ≈ 183.000 suất ăn/năm**.
- Cơ cấu thực đơn: **4 món/ngày**, thường gồm 3 món mặn/nước + 1 món chay.
- Thặng dư sản xuất tại bếp (Overproduction): chỉ dư khoảng **5–7 suất/món/ngày** theo trao đổi với quản lý căn tin.
- Đứt gãy quy trình hiện tại: Học sinh đăng ký món qua Portal/Form của trường → trường in và phát phiếu ăn giấy → học sinh nộp phiếu nhận cơm, có tình trạng đăng ký nhưng không nhận hoặc dùng phiếu sai ngày → thức ăn thừa đổ chung vào thùng thu gom để chuyển đi chăn nuôi, hoàn toàn không được cân đo hay phản hồi lại theo món cho bếp.

#### 2. Dữ liệu đo lường khay trả thực tế của nhóm

- **Đợt Pilot 1 — 7 tháng 10, 2026; 51 khay quan sát bước đầu:** Có **18/51 khay (35,3%)** ăn hết sạch; **33/51 khay (64,7%)** còn thức ăn thừa; trong đó **29/51 khay (56,9%)** chắc chắn còn thừa rau.
- **Tổng hợp Thực địa Vòng 2 — 114–144 khay thu thập dữ liệu:**
    - Khối lượng thức ăn thừa ước tính trung bình: **~44g/khay** → quy đổi trên 183.000 suất/năm tại PTNK tương đương **~8,0 tấn thức ăn thừa/năm**.
    - Tỷ lệ thức ăn còn lại trung bình theo từng thành phần: **Rau: 28,8% | Cơm: 6,3% | Món chính: 5,2%**.
    - **Insight cốt lõi:** Vấn đề lớn nhất tại PTNK không phải bếp nấu dư số suất — vì chỉ dư 5–7 suất/món — mà là **Plate Waste tập trung đột biến ở thành phần Rau (28,8%)** và biến động mạnh theo từng món ăn cụ thể.

### 2.2. Dữ liệu Mô phỏng trên Prototype Dashboard — `DEMO / SIMULATION DATA`

Được xây dựng dựa trên **20 món ăn có thật kèm hình ảnh thật từ Portal PTNK** trong tháng 10/2026 để minh họa vòng phản hồi quyết định qua nhiều chu kỳ phục vụ.

- **Quy mô tập dữ liệu Demo:** **1.280 khay ghi nhận** trong 5 ngày thực đơn nguồn, từ 12 tháng 10, 2026 → 16 tháng 10, 2026, gồm **3.131 quan sát thành phần** — 81,5% quan sát hợp lệ — tỷ lệ phần còn lại trung bình **14,6%**, phát hiện **11/20 món cần xem xét**, ưu tiên thành phần rau.
- **Top 5 món có tỷ lệ thừa cao nhất trên Dashboard — 64 khay/món:**
    1. *Heo lát chay kho thơm:* Cơm **12,5%** | Rau **46,5%** | Món chính **9,5%**. Đề xuất: khảo sát khẩu vị/cách chế biến và giảm 12% khẩu phần rau.
    2. *Nấm rơm kho tiêu:* Cơm **8,7%** | Rau **43,5%** | Món chính **6,3%**.
    3. *Đậu hũ kho củ cải muối chay:* Cơm **10,2%** | Rau **43,0%** | Món chính **7,3%**.
    4. *Chả lụa chay kho tiêu:* Cơm **8,3%** | Rau **38,9%** | Món chính **5,3%**.
    5. *Vịt kho gừng:* Cơm **6,7%** | Rau **36,5%** | Món chính **6,6%**.
- **Kịch bản Mô phỏng Trước & Sau Can thiệp:**
    - **Trước điều chỉnh:** Cơm 16,8 kg + Rau 31,4 kg + Món chính 14,9 kg = **Tổng 63,1 kg/ngày**.
    - **Can thiệp từ đề xuất EcoTray:** Giảm 12% khẩu phần rau ở nhóm món đánh dấu đỏ, giữ nguyên tổng số suất.
    - **Sau điều chỉnh:** Cơm 16,1 kg + Rau 21,9 kg + Món chính 14,5 kg = **Tổng 52,5 kg/ngày** → **Giảm 16,8% lượng thức ăn thừa**, tức giảm 10,6 kg/ngày.

## 3. Logic Ra Quyết định — School-Canteen Decision Loop

Hệ thống kết nối 3 lớp dữ liệu đầu vào để tách bạch nguyên nhân lãng phí và đề xuất hành động cụ thể cho người quản lý bếp phê duyệt.

| Quan sát dữ liệu đầu vào | Chẩn đoán của EcoTray AI | Quyết định đề xuất cho nhà bếp |
| --- | --- | --- |
| **1. Registered cao, nhưng Served/NFC thấp** | Lệch nhu cầu số suất — Demand / Quantity Mismatch | Điều chỉnh giảm số suất chuẩn bị hoặc giảm hệ số dự phòng (safety buffer) của món đó ở lần phục vụ tới. |
| **2. Registered ≈ Served, nhưng Plate Waste cao ở 1 thành phần** | Vấn đề Khẩu phần / Thực đơn — Portion / Menu Problem | **Giữ nguyên tổng số suất nấu**; giảm định lượng thành phần bị thừa, ví dụ giảm 10–12% rau ăn kèm, hoặc thay đổi cách chế biến/nêm nếm rồi đo lại ở chu kỳ sau. |
| **3. Khay cá biệt bỏ lại 100% món chính/rau trong khi >90% khay khác ăn hết** | Nhiễu ngoại lai do Dị ứng / Cơ địa cá nhân — Dietary / Allergy Outlier | Tự động gắn nhãn `Outlier` và **loại trừ khỏi công thức tính trung bình khẩu phần chung** để tránh cắt giảm nhầm khẩu phần của toàn trường. |
| **4. Registered ≈ Served và tỷ lệ thừa thấp ở cả 3 thành phần** | Hệ thống vận hành tối ưu — Optimal | **Giữ nguyên định lượng và công thức hiện tại**; không can thiệp. |

## 4. Kiến trúc Kỹ thuật Thực chiến Vòng Chung kết

Để phục vụ màn **Live Demo trong 5 phút thuyết trình** và trả lời BGK doanh nghiệp về bài toán chi phí, toàn bộ hệ thống được thiết kế theo 4 khối liên hoàn.

### 4.1. Khối 1: Cổng Xác thực Nhận suất NFC — Paperless NFC Redemption Gate

- **Vai trò chiến lược:** Điền biến số còn khuyết `Suất thực tế được nhận (Served / Actual Redemption)` vào chuỗi dữ liệu, đồng thời xóa bỏ 183.000 phiếu ăn giấy/năm tại PTNK và kích hoạt cảnh báo dị ứng cá nhân trước khi múc thức ăn.
- **Cơ chế kỹ thuật:** Tận dụng chip NFC đã có sẵn bên trong thẻ học sinh PTNK. Không cần can thiệp hệ thống cơ sở dữ liệu nội bộ của trường; thiết bị đọc — điện thoại Android chạy **Web NFC API** hoặc mạch đọc **ESP32 + PN532/RC522** — đọc **mã định danh phần cứng duy nhất (Hardware UID)** của thẻ trong `0,5 giây` và đối chiếu với bảng đăng ký món trên hệ thống.
- **Trạng thái trả về tức thì:**
    1. `HỢP LỆ (Xanh)`: Hiển thị món đã đăng ký, ví dụ *Vịt kho gừng*, và tăng bộ đếm `Suất thực nhận`.
    2. `CẢNH BÁO DỊ ỨNG (Vàng)`: Hiển thị rõ cảnh báo, ví dụ *⚠️ Dị ứng đậu phộng / Lactose – Không múc sốt phụ*, để ngăn thức ăn thừa phát sinh ngay từ quầy phát.
    3. `ĐÃ NHẬN SUẤT / SAI THẺ (Đỏ)`: Chặn gian lận quẹt thẻ 2 lần hoặc dùng sai phiếu như hiện trạng cũ.

### 4.2. Khối 2: Trạm Thị giác Máy tính Chụp Khay Tự động — ESP32-CAM Pass-Through Station

- **Thiết kế vật lý — Phú Thịnh & Viết Bảo phụ trách:** Khung giá đỡ chữ L đặt ngay trên mặt bàn trượt kế bên thùng thu gom thức ăn thừa. Camera **ESP32-CAM (OV2640)** gắn ở đỉnh khung, hướng thẳng góc 90° từ trên xuống ở độ cao `35–40 cm`, bao quát trọn vẹn 5 ô của khay inox mà **tuyệt đối không quay dính khuôn mặt học sinh — đảm bảo 100% quyền riêng tư**.
- **Thuật toán Máy trạng thái Chống chụp lặp & Chống ùn tắc — State Machine Debounce; Minh Khang & Viết Bảo phụ trách:**
    - Sử dụng cảm biến khoảng cách hồng ngoại / laser — `IR Obstacle / VL53L0X / HC-SR04` — gắn ở chân khung để phát hiện khay inox lướt qua.
    - `State 0 — IDLE`: Không có vật cản → camera ở chế độ chờ.
    - `State 1 — DETECTED & DEBOUNCE`: Khi khay đưa vào vùng cảm biến và giữ ổn định trong `300ms`, bỏ qua nhiễu khi quơ tay nhanh → bật đèn LED trợ sáng → chụp **đúng 01 khung hình JPEG — 800×600, ~45KB** → phát tiếng *bíp* ngắn báo hiệu học sinh có thể đổ khay ngay; tổng thời gian `<0,5 giây`.
    - `State 2 — LOCKED`: Khóa cứng camera, không chụp thêm ảnh dù khay vẫn nằm trên bàn. Chỉ khi cảm biến xác nhận khay đã được lấy ra khỏi vùng quét liên tục `>1.000ms` thì mới mở khóa về `IDLE` để đón học sinh tiếp theo.

### 4.3. Khối 3: Hạ tầng Đám mây AWS Serverless & Bài toán Kinh tế

- **Kiến trúc AWS tối ưu chi phí — Minh Khang phụ trách:**
    - Căn tin chỉ phát sinh dữ liệu trả khay trong khoảng 45–60 phút buổi trưa; 23 giờ còn lại hệ thống nghỉ. Vì vậy, **không dùng EC2 chạy 24/7** mà dùng kiến trúc **Serverless Event-Driven — chỉ trả tiền theo mili-giây xử lý thực tế**.

```
ESP32-CAM
    ↓ HTTP POST
AWS API Gateway
    ↓
AWS Lambda + Amazon S3 (30-day Lifecycle)
    ↓
AI Vision Inference
(Bóc tách % Cơm / Rau / Món chính + Lọc Outlier)
    ↓
Database & Vercel Dashboard
```

#### Bảng tính Chi phí — BOM & Cloud OPEX

- **CAPEX phần cứng:** **~290.000 VNĐ/trạm Vision** — ESP32-CAM + đế nạp: 135.000đ; cảm biến tiệm cận + LED + Buzzer: 45.000đ; nguồn 5V + khung giá đỡ chữ L: 110.000đ. Nếu dùng thêm mạch đọc NFC rời: +195.000đ; hoặc **0đ** nếu tận dụng điện thoại Android sẵn có.
- **OPEX AWS hàng tháng — 1.017 học sinh ≈ 20.340 ảnh/tháng, ~0,9 GB:**
    - AWS API Gateway + AWS Lambda: **$0,00/tháng**, nằm trong AWS Free Tier 1 triệu requests/tháng.
    - Amazon S3, tự động xóa ảnh thô sau 30 ngày và chỉ giữ dữ liệu số: **~$0,02/tháng**, khoảng 500 VNĐ.
    - Xử lý AI Vision & Database: **~$1,40/tháng**, khoảng 35.000–38.000 VNĐ.
    - **Tổng OPEX đám mây: <45.000 VNĐ/tháng/trường**, tương đương giá 1 suất cơm trưa mỗi tháng.
- **Hiệu quả hoàn vốn — ROI:** Tại PTNK, bỏ 183.000 phiếu ăn giấy/năm giúp tiết kiệm ngay **~5,5 triệu VNĐ/năm** tiền in ấn; giảm 15% lượng thức ăn thừa — ~1,2 tấn thực phẩm/năm trên tổng 8 tấn — giúp nhà bếp tiết kiệm **~30 triệu VNĐ/năm** chi phí nguyên liệu. **Thời gian hoàn vốn <1 tháng**.

### 4.4. Khối 4: Nền tảng Web Dashboard

[ecotray-ai.vercel.app](https://ecotray-ai.vercel.app/) — Sơn Hoàng phụ trách. Trang web gồm **Chế độ Trình diễn Sân khấu — `🔴 Live Demo Chung Kết`** và **5 tab chuyên sâu**:

1. **Live Stage Demo:** Gom 4 bước lên 1 màn hình: (1) quét thẻ NFC nhận suất & kiểm tra dị ứng → (2) nhận ảnh trực tiếp từ ESP32-CAM qua AWS → (3) kiểm định lọc nhiễu Outlier → (4) đưa ra đề xuất và nút `[Bếp Phê Duyệt]`. Tích hợp **Fallback Hotkeys `1`, `2`, `3`, `Space`** để bảo đảm an toàn nếu Wi‑Fi hội trường bị nghẽn.
2. **Tab 1 — Tổng quan vận hành:** Phễu dữ liệu 3 bước — `Đăng ký 1.017` → `Thực nhận NFC` → `Khay phân tích AI` — xu hướng phần thừa theo ngày/thành phần, và dải chỉ số tác động kinh tế–môi trường: VNĐ tiết kiệm, số phiếu giấy xóa bỏ, kg CO₂e giảm thiểu.
3. **Tab 2 — Phân tích thực đơn:** Danh mục 20 món ăn thật từ Portal PTNK; bấm từng món mở bảng phân tích sâu kèm số mẫu ngoại lai dị ứng đã lọc bỏ và biểu đồ Trước–Sau can thiệp.
4. **Tab 3 — EcoTray Vision:** Hiển thị luồng ảnh thực tế từ trạm ESP32-CAM và Sandbox đọc đồng thời 3 thành phần `Cơm – Rau – Món chính` theo mốc `0 – 25 – 50 – 75 – 100%`, quy đổi ra gram.
5. **Tab 4 — Ghi nhận khay & Cổng NFC:** Giao diện quét thẻ học sinh NFC cho cô phát cơm và QuickLog để nhập dữ liệu cân mẫu hiệu chuẩn.
6. **Tab 5 — Dữ liệu & Cấu hình Nhân rộng:** Lịch sử bản ghi, xuất CSV/PDF, công cụ tính chi phí AWS theo quy mô học sinh, và **Bộ chuyển đổi Mô-đun Trường học — Lite / Standard / Pro**.

## 5. Kiến trúc Mô-đun Hóa: PTNK và Nhân rộng

<aside>
💡

**Lưu ý chiến lược:** Không phải trường học nào cũng có thẻ học sinh gắn chip NFC hoặc cổng Portal đăng ký món như PTNK. Để đạt điểm tối đa về khả năng áp dụng và nhân rộng, EcoTray tách rõ cấu hình tại PTNK và cấu hình cho các trường khác qua **3 Gói Mô-đun Plug-and-Play**.

</aside>

| Cấp độ mô-đun | Đối tượng trường học | Đầu vào trước bữa ăn | Đầu ra sau bữa ăn | Mục tiêu & Giá trị cốt lõi |
| --- | --- | --- | --- | --- |
| **Gói 1: EcoTray Lite**
*Nhân rộng đại trà* | Trường bán trú truyền thống, không có NFC và không đặt món trước. | Quản lý bếp nhập thực đơn ngày & tổng số suất nấu, hoặc tải file Excel thực đơn tuần trong 1 phút. | **Trạm ESP32-CAM** chụp khay tự động + AI phân tích tỷ lệ thừa Cơm/Rau/Món chính. | Phát hiện món/thành phần bị bỏ thừa nhiều để điều chỉnh khẩu phần và công thức nấu. |
| **Gói 2: EcoTray Standard**
*Nhân rộng trường công lập* | Trường quản lý suất ăn theo đơn vị lớp, báo sĩ số ăn bán trú đầu giờ sáng. | Lớp trưởng/GVCN nhập nhanh sĩ số nhận suất trên web hoặc quét 1 mã QR đại diện cho cả lớp. | **Trạm ESP32-CAM**  • đối chiếu sĩ số báo sáng với lượng thức ăn thừa theo món. | Giải quyết cả lệch sĩ số nhận suất và dư khẩu phần mà không cần thẻ cá nhân. |
| **Gói 3: EcoTray Pro**
*Đang thí điểm tại PTNK* | Trường có Portal học sinh và thẻ NFC như PTNK. | Đồng bộ thực đơn từ Portal + **quét thẻ NFC cá nhân**, xóa phiếu giấy & cảnh báo dị ứng. | **Trạm ESP32-CAM**  • lọc nhiễu dị ứng + vòng phản hồi tự động toàn diện. | Chuyển đổi số 100% căn tin không giấy tờ, cá nhân hóa an toàn dị ứng và tối ưu nguyên liệu tối đa. |

### Lộ trình Hành động 3 Năm — 36 Tháng

- **Năm 1 — Tháng 1–12; Thí điểm chuyên sâu tại PTNK, EcoTray Pro:** Ghi nhận và hiệu chuẩn ≥1.000 khay bằng cân mẫu, vận hành cho 1.017 học sinh/ngày; xóa bỏ 100% phiếu ăn giấy bằng NFC; can thiệp thực tế giúp giảm **15–20%** chỉ số thức ăn thừa ở các thành phần đánh dấu đỏ mà không gây thiếu suất.
- **Năm 2 — Tháng 13–24; Chuẩn hóa Bộ Kit & Mở rộng 3–5 trường, EcoTray Lite/Standard:** Đóng gói ESP32-CAM thành bộ Kit lắp trong 30 phút; thử nghiệm tại 3–5 trường THCS/THPT bán trú tại TP.HCM, khoảng 4.000–5.000 học sinh; hoàn thiện SOP.
- **Năm 3 — Tháng 25–36; Nhân rộng 10+ trường, ≥10.000 học sinh & Tự chủ bền vững:** Mở rộng mạng lưới 10+ trường, tổng hợp xu hướng khẩu vị học đường liên trường — Cross-school Menu Benchmarking; duy trì dự án bằng khoản phí SaaS siêu nhỏ trích từ chi phí nguyên liệu tiết kiệm được và chuyển giao kỹ thuật cho các thế hệ học sinh kế cận.
- **Đóng góp SDGs:** Trọng tâm là **SDG 12 — mục tiêu 12.3**, kết hợp **SDG 3** về dinh dưỡng & an toàn dị ứng học đường, **SDG 4** về giáo dục tiêu dùng bền vững và **SDG 13** về giảm phát thải từ rác hữu cơ và giấy.

## 6. Kịch bản Thuyết trình & Biểu diễn Trực tiếp 5 Phút

<aside>
⏱️

**Chiến thuật 300 giây:** Rút gọn phần giới thiệu lý thuyết để dành **2 phút 30 giây giữa bài cho màn Live Hardware + Web Demo** ngay trên sân khấu.

</aside>

### Phần 1 — 0:00–0:50 | Vấn đề thực địa & Khoảng trống dữ liệu

- Mở đầu bằng hình ảnh thật tại khu thu gom thức ăn thừa PTNK CSĐH: 1.017 suất/ngày → 44g thừa/khay → **8 tấn thức ăn thừa/năm**.
- Phá vỡ ngộ nhận: Khảo sát 144 khay thực tế cho thấy bếp chỉ nấu dư 5–7 suất/món, nhưng thức ăn bỏ lại tập trung tới **28,8% ở Rau**, trong khi Cơm 6,3% và Món chính 5,2%.
- Chỉ ra đứt gãy: Căn tin có dữ liệu trước bữa ăn, nhưng phiếu giấy làm đứt chuỗi và hoàn toàn mù mờ sau bữa ăn.

### Phần 2 — 0:50–3:20 | LIVE DEMO TOÀN TRÌNH

- **Bước 1 — 0:50–1:35; Quét NFC nhận suất:** Thành viên chạm thẻ học sinh PTNK vào thiết bị đọc → Dashboard tăng `Suất thực nhận`, hiển thị món đã đăng ký — *Heo lát chay kho thơm* / *Vịt kho gừng* — và bật **Cảnh báo dị ứng đậu phộng** để cô phát cơm điều chỉnh ngay.
- **Bước 2 — 1:35–2:30; Đưa khay qua ESP32-CAM:** Thành viên đổi từ khay cơm nguyên vẹn sang khay inox còn nhiều rau, ít cơm → đẩy lướt dưới khung ESP32-CAM. Cảm biến tự kích hoạt đèn, chụp ảnh trong `0,5 giây`, kêu *bíp* và khóa chống chụp lặp.
- **Bước 3 — 2:30–3:20; AWS AI phân tích & Khuyến nghị:** Ảnh hiện trên Dashboard sau 1–2 giây → AI bóc tách `Cơm 10% | Rau 60% | Món chính 5%`, kiểm định không phải nhiễu dị ứng, rồi đề xuất: *“Giữ nguyên số suất nấu, giảm 12% khẩu phần rau ăn kèm và điều chỉnh cách chế biến.”* Người thuyết trình bấm `[✓ Bếp Phê Duyệt]`.

### Phần 3 — 3:20–5:00 | Khác biệt, Unit Economics & Nhân rộng

- Khẳng định khác biệt với Winnow: đổi mới nằm ở **School-Canteen Decision Loop**, chi phí phần cứng **290.000đ/trạm** và AWS Serverless **<45.000đ/tháng/trường**, giúp căn tin tiết kiệm ~35 triệu đồng/năm.
- Trình bày **3 gói Lite / Standard / Pro** giúp nhân rộng từ 1.017 học sinh PTNK ở Năm 1 lên **10+ trường — ≥10.000 học sinh** ở Năm 3 dù các trường khác không dùng NFC hay Portal.
- Chốt: *“EcoTray AI – Mỗi khay lên tiếng, mỗi bữa ăn tốt hơn.”*

## 7. Danh sách Thành viên — Đội Va Lo Ran & Phân công Tác chiến

- **Trường:** Trường Phổ thông Năng khiếu, ĐHQG-HCM — Lớp 11 Tin-LN.
- **Giáo viên hướng dẫn:** Thầy Nguyễn Phạm Bá Duy — `npbduy@ptnk.edu.vn` — `0348839271`.

| Thành viên | Vai trò | Nhiệm vụ trọng tâm Vòng Chung kết — 21/10–07/11/2026 |
| --- | --- | --- |
| **1. Lê Viết Bảo**
*Đội trưởng* | Quản lý Dự án, Lắp ráp Phần cứng & Kinh tế/Vận hành |   • Đầu mối làm việc với BTC SSC 2026, nộp hồ sơ Word và tham gia nhóm Zalo Top 8.
  • Lắp ráp ESP32-CAM + cảm biến khoảng cách + đèn/còi + thiết bị đọc NFC.
  • Phụ trách Kế hoạch hành động 3 năm & Unit Economics cho buổi tập huấn 24/10. |
| **2. Nguyễn Hoàng Minh Khang** | Trưởng phụ trách Kỹ thuật — AWS Cloud, AI & IoT Firmware |   • Xây dựng AWS Serverless: API Gateway + Lambda + S3 + AI Vision model.
  • Lập trình firmware C++ cho ESP32-CAM: State Machine chụp tự động 0,5 giây, chống chụp lặp; code đọc UID NFC.
  • Kết nối API thời gian thực với Web Dashboard của Sơn. |
| **3. Thái Hoàng Sơn** | Phát triển Web Dashboard — `ecotray-ai.vercel.app` |   • Xây dựng `🔴 Live Demo Chung Kết`, 4 bước liên hoàn + hotkeys `1, 2, 3, Space`.
  • Nâng cấp 5 tab: lọc dị ứng Outlier, Lite/Standard/Pro, bảng tính AWS.
  • Xây dựng API Routes: `/api/iot/nfc-scan`, `/api/iot/tray-capture`, `/api/iot/status`. |
| **4. Đoàn Phú Thịnh** | Thiết kế Khung Giá đỡ, Thực địa & Slide/Media |   • Chế tạo khung chữ L cao 35–40cm cho ESP32-CAM.
  • Chuẩn bị 2 khay inox + thức ăn mẫu trước/sau và chụp thêm ảnh khay thực tế.
  • Thiết kế Slide Chung kết, nộp PDF trước 03/11, và quay video thực nghiệm. |

## Lịch trình Tác chiến & Checklist Bắt buộc — 21/10–07/11/2026

- [x]  **21/10–22/10 — Làm việc online:** Hoàn thiện file Word Tóm tắt dự án + thu thập CCCD 4 thành viên & GVHD; Khang & Sơn khởi tạo cấu trúc API AWS–Web Dashboard; chuẩn bị Kế hoạch 3 năm cho tập huấn.
- [ ]  **23 tháng 10, 2026 — Gặp trực tiếp tại trường:**
    - Chụp ảnh tập thể Va Lo Ran tỷ lệ 4:3, concept cầm phần cứng + khay inox + mở Dashboard; **gửi email nộp File Word + Link Google Drive ảnh cho BTC**.
    - Chụp bổ sung nhiều ảnh khay cơm thừa top-down tại căn tin PTNK.
    - Quét UID thật của 4 thẻ học sinh PTNK để nạp vào CSDL demo NFC.
- [ ]  **24 tháng 10, 2026 9:00 — Tập huấn tại SIHUB, 123 Trương Định:** Trình bày Kế hoạch 3 năm, Lite/Standard/Pro và bài toán chi phí AWS để nhận góp ý từ chuyên gia.
- [ ]  **26 tháng 10, 2026 → 30 tháng 10, 2026 — Tuần học trực tiếp tại PTNK:**
    - Hoàn thiện khung chữ L + ESP32-CAM + cảm biến chống lặp.
    - Kết nối toàn luồng: `Quẹt NFC` → `Khay qua ESP32-CAM` → `AWS xử lý` → `Web Dashboard hiển thị`.
    - Quay video 15–20 giây cảnh học sinh PTNK quẹt thẻ và lướt khay tại căn tin để chèn vào slide.
- [ ]  **Trước 3 tháng 11, 2026:** Hoàn thiện và nộp file thuyết trình Chung kết PDF qua link BTC.
- [ ]  **4 tháng 11, 2026 → 6 tháng 11, 2026:** Tổng duyệt 5 lần kịch bản 05 phút + biểu diễn phần cứng và luyện phản biện 10 phút Q&A.
- [ ]  **7 tháng 11, 2026 8:00 — ĐH Quốc tế, ĐHQG-HCM:** **THI ĐẤU VÒNG CHUNG KẾT & TRAO GIẢI — MỤC TIÊU TOP 1!**
## 8. Triển khai dashboard trong repository

Dashboard giữ React/Vite/CSS thuần và output `dist/`. Bản nâng cấp bổ sung Live Demo ngoại tuyến, drawer thực đơn, kiểm định IQR, QuickLog cân mẫu, cấu hình Lite/Standard/Pro, dự toán chi phí và Vercel Functions cho IoT. Dữ liệu sân khấu, bộ khay mô phỏng và phần cứng được tách riêng.

Xem [Phạm vi triển khai & kiểm chứng](docs/SSC-IMPLEMENTATION.md) và [Hợp đồng IoT v1 / cấu hình môi trường](docs/IOT.md). Các mục chiến lược phía trên là yêu cầu dự án, không tự xác nhận phần cứng hoặc AWS/Vercel đã được triển khai. Kho có 35 ảnh PTNK ngày 28–30/10/2026 (27 khay độc lập ngoài hai mốc 0%/100%), gồm các góc chụp lặp. Nhãn phần còn lại là ước lượng bằng mắt (gán lại v2 ngày 31/10), chưa đối chiếu phép cân. Ridge được huấn luyện từ pixel ảnh chuẩn hóa, kiểm định bỏ từng nhóm ảnh liên quan (không chấm hai mốc) có MAE khoảng 14,5 điểm phần trăm trên 33 ảnh (15 ảnh lệch khung được căn 4 góc khay), so với 25,25 nếu chỉ đoán bằng trung bình nhãn. Chưa có bằng chứng cho MAE 5,8% hay độ chính xác 94,2%. Chi phí là dự toán, tác động trước/sau là mô phỏng theo nguồn đã nêu.


### Vision thực địa và luồng thiết bị

Tab EcoTray Vision mở Trạm căn tin; Kiểm tra ảnh giữ gallery 35 ảnh và hiệu chỉnh bốn thành phần, Thử kịch bản giữ các ví dụ mô phỏng riêng. Phản hồi cập nhật trọng số trong phiên trình duyệt; không thay trọng số máy chủ hoặc kết quả kiểm định gốc. Khối lượng là ước tính từ khẩu phần giả định 200/110/90/150 g (Cơm/Món chính/Rau/Canh), chưa phải số đo cân. W_min = 85 g là chính sách bảo vệ thử nghiệm, chưa phải chuẩn dinh dưỡng xác thực.

Luồng `/api/ai/analyze-tray` tích hợp trong tab Vision, thăm dò mỗi 1,5 giây. Màn trạm hiển thị một kết quả mới nhất từ API này hoặc callback worker IoT; ảnh dự phòng luôn có nhãn riêng. NFC và phễu vận hành sử dụng nguồn riêng. Không có nút hoặc màn hình sân khấu; các phím dự phòng chạy nền và luôn giữ nguồn tham chiếu/mô phỏng tách biệt. Không xác nhận thiết bị online chỉ vì API trả 200.

Xem [hợp đồng Vision và tái huấn luyện](docs/VISION-PTNK.md) và [firmware ESP32-CAM / hướng dẫn thử ảnh thiết bị](firmware/esp32_cam_gate/README.md). Vercel vẫn dùng React/Vite, `api/*` và output `dist/`; `src/app/api/ai/analyze-tray/route.ts` chỉ là điểm vào tương thích Web Request/Response, không làm dự án thành Next.js.

### Tinh giản giao diện vận hành (29/10/2026)

Thực đơn mặc định dùng danh sách gọn; ví dụ phối món và thử định lượng chuyển sang Vision → Thử kịch bản. Chi tiết món chỉ hiển thị số liệu riêng, không chèn ví dụ 90 g rau hoặc kịch bản 63,1 → 52,5 kg. Một ngày dữ liệu hiển thị bảng thay cho biểu đồ xu hướng.

Dữ liệu → Thông tin dự án chứa minh chứng, lộ trình, kịch bản trước/sau và dự toán. Cấu hình trường giữ bộ chọn Lite/Standard/Pro. Ghi nhận quyết định từ Vision và worker dùng chung lịch sử trên trình duyệt, chống lặp và giữ ba nguồn `hardware`, `simulation`, `reference-fallback`. Tải lại trang giữ lịch sử; R đặt lại sự kiện và lịch sử dự phòng, giữ quyết định phần cứng. Đây chưa phải lệnh gửi tới bếp.

Mẫu cân dùng để quy đổi gram trong Vision → Thử kịch bản; mô hình PTNK vẫn dùng định lượng giả định, không tự thay trọng số hoặc kết quả kiểm định từ mẫu cân. Các màn UI cũ không còn được App mở đã được gỡ; các thư viện, test và script model vẫn giữ nguyên mục đích.
