# Vision PTNK — dữ liệu, mô hình và API

## Phạm vi dữ liệu

35 ảnh nguồn trong `public/ptnk-trays/`, chụp 28–30/10/2026. `data/ptnk-trays.json` giữ nhãn phần còn lại ước lượng bằng mắt (bản gán lại v2 ngày 31/10, xem [RELABEL-V2.md](RELABEL-V2.md)), góc xoay, nhóm góc chụp lặp và các cờ nhiễu (`flags`, `soupBowl`, `note`, `comboConfidence`). 35 ảnh thuộc 29 khay độc lập (27 nếu bỏ hai mốc). `public/ptnk-normalized/` là bản 800×600 đã xoay theo metadata; ảnh gốc được giữ nguyên.

Hai mốc: `IMG_20261028_115429.jpg` = sạch 0%; `IMG_20261029_112146.jpg` = đầy 100%. Nhãn v2 của mọi ảnh khác là % so với ảnh đầy này. Nhãn gốc của ảnh đầy (100/95/90/90) được giữ riêng; trình huấn luyện dùng 100 cho cả bốn thành phần. Ảnh đầy không được đưa vào thống kê khay trả.

## Tái huấn luyện

```sh
python3 -m venv .venv-vision
.venv-vision/bin/pip install -r scripts/vision-requirements.txt
.venv-vision/bin/python scripts/train_ecotray_vision.py                    # đặc trưng từ Node jpeg-js (cần npm ci)
.venv-vision/bin/python scripts/train_ecotray_vision.py --features python  # bản port NumPy, không cần Node
```

Trình huấn luyện đọc mọi ảnh trong danh mục (tối thiểu 18, phải có hai mốc), không có trọng số hoặc số liệu đánh giá dự phòng. Mặc định Node `jpeg-js` trích xuất cùng bộ đặc trưng dùng trong suy luận; `--features python` dùng `scripts/ptnk_features.py`, cho kết quả trùng tới 1e-13 trên cùng pixel, chỉ khác bộ giải mã JPEG (Pillow). Artifact ghi `featureExtractor`. NumPy giải Ridge α=0,15, không phạt bias. Không có tăng cường ngẫu nhiên hoặc chia ảnh lặp sang hai tập khác nhau. Bộ trọng số, đặc trưng, kết quả dự đoán từng ảnh giữ lại và MAE được xuất vào `src/lib/ecotrayModels.json`.

Dự đoán là đầu ra Ridge thô (đơn vị %), cắt về 0–100. Bản v3 kéo giãn đầu ra giữa hai mốc `(pred − pred_0%)/(pred_100% − pred_0%)`; bước này làm sai số tăng gần gấp đôi và kém hơn cả việc đoán bằng trung bình nhãn (27,28 so với 22,8), nên đã bỏ ở v4. Hai mốc giờ là điểm huấn luyện thường. Đặc trưng ROI cố định không phân biệt nước kho với thức ăn, nên mô hình đọc ngăn món chính của khay sạch là ~70%; vì vậy khi chọn chính ảnh mốc, kết quả hiển thị theo nhãn mốc với `predictionSource: "anchor-label"`.

Kiểm định: bỏ lần lượt từng nhóm ảnh liên quan, giữ hai mốc trong tập huấn luyện và không chấm hai mốc. 33 ảnh / 27 nhóm được chấm; MAE hiện tại **14,60 điểm phần trăm** (Cơm 16,1 · Món chính 17,0 · Rau 13,1 · Canh 12,3), so với mốc đoán bằng trung bình nhãn 25,25 (`baselineMeanLabelMAE`). Món chính yếu nhất vì thịt thường bị gắp sang ngăn cơm. Đây là kiểm định có điều kiện trên bộ nhỏ, dùng nhãn thị giác do một người gán lại; chưa có tập cân độc lập. Không công bố MAE 5,8%, độ chính xác 94,2%, hoặc lấy `100 − MAE` làm độ chính xác phân loại.

Gallery giữ nguyên vùng đọc và mô hình Ridge đã kiểm định ở trên. Ảnh JPEG thiết bị và ảnh tải lên dùng bộ đọc diện tích pixel `ov2640-area-v1` trong `lib/station-vision.mjs`; **MAE 14,60 không áp dụng cho bộ đọc mới**.

Bố cục mặc định `ESP32_STANDARD_TOP_RICE` theo toàn khung hình: Cơm `(0.04,0.05)–(0.55,0.49)`, Canh `(0.57,0.05)–(0.89,0.49)`, Món chính `(0.31,0.52)–(0.62,0.94)`, Rau trái `(0.04,0.52)–(0.29,0.94)` hoặc Rau phải `(0.63,0.52)–(0.89,0.94)`. Đây là phương án tọa độ hiệu chuẩn được yêu cầu, không phải bộ phát hiện biên kim loại tổng quát: dải nền tối bên phải ngoài x=0,90 không tham gia phân tích; không cắt nền rồi áp tọa độ lần nữa.

So độ phủ cơm sáng và vành bát ở hai chiều, mặc định chiều cơm trên trái khi chưa rõ. Chiều 180° dùng phép biến đổi tọa độ chính xác `(1-x2,1-y2,1-x1,1-y1)` để giữ tính bất biến trên cùng ảnh thiết bị; gallery điện thoại giữ tọa độ và metadata cũ. Ảnh dọc xoay pixel 90° trước phân tích, rồi đưa bbox về hệ tọa độ ảnh gốc. Giao diện giữ đúng tỷ lệ ảnh. Hai ô rau được phân tích riêng; tỷ lệ và bbox cùng lấy ô có lượng thức ăn phát hiện cao hơn.

Cơm dùng Value ≥0,62, saturation <0,24 và độ sáng; phản xạ sáng dạng vệt dài được loại bằng thành phần liên thông, bóng tối trung tính và phản xạ cực mạnh được hạn chế. Món chính phối hợp màu ấm/tối và texture; rau phối hợp màu, texture và ngưỡng chống bóng tối. Canh chỉ đọc ellipse bên trong 80% bán kính bát, bỏ vành trắng. Đây là heuristic diện tích ảnh, chưa có tập cân độc lập; không đồng nhất diện tích với lượng còn lại theo thể tích/khối lượng. Khay lệch vị trí, bát khác kích thước, rau nhạt màu hoặc ánh sáng khác có thể làm sai kết quả; cần thêm mẫu thật và cân đối chiếu.

Ảnh ESP32 do người dùng cung cấp ngày 30/10 được giữ ở `data/vision-fixtures/esp32-top-rice.jpg` làm mẫu hồi quy riêng, không thêm vào gallery ảnh tham chiếu hoặc cohort IQR. Kết quả hiện tại Cơm 70,6%, Món chính 54,2%, Rau 56,5%, Canh 27,3% chỉ được đối chiếu khoảng ước lượng thị giác của người vận hành; không phải nhãn cân hoặc bằng chứng độ chính xác.

## Hiệu chỉnh và quyết định

Sandbox xử lý ảnh tải lên ngay trong trình duyệt; ảnh và phản hồi không gửi máy chủ. Bốn thanh trượt có bước 25%. Nút Active Learning cập nhật trọng số hồi quy trong phiên bằng sai số phản hồi; bước cập nhật được chiếu ra khỏi hai vector đặc trưng mốc nên dự đoán tại hai mốc không đổi. Khôi phục đưa về trọng số gốc; tải lại trang kết thúc phiên. Trọng số sau phản hồi chưa được kiểm định và không thay mô hình trạm. Với ảnh tải lên dùng bộ đọc OV2640, thanh trượt chỉ giữ hiệu chỉnh thủ công cho ảnh trong phiên; không cập nhật trọng số Ridge.

Gram suy từ định lượng giả định Cơm 200g / Món chính 110g / Rau 90g / Canh 150g. `W_min=85g` là chính sách bảo vệ thử nghiệm. Khóa giảm rau bất cứ khi nào lượng rau thực ăn ước tính dưới 85g, không cần thêm điều kiện phần trăm thừa. Không mô tả ngưỡng này là chuẩn y khoa hoặc lượng chất xơ.

IQR chỉ so khay độc lập cùng ngày và cùng thực đơn, cần ít nhất 10 khay nền. Hai góc chụp cùng nhóm tính một khay. Cờ NFC tách mẫu trước phép tính; mẫu đã có cờ ngoại lai cũng không tham gia tập nền. Không coi “mọi ngăn >75%” là phép kiểm định IQR hay chẩn đoán dị ứng. Bộ ảnh tham chiếu hiện chưa đủ 10 mẫu độc lập cùng thực đơn/ngày. Luồng thiết bị tích lũy tối đa 100 quan sát gần nhất trong Redis. Thứ tự gắn thực đơn: header tường minh → lựa chọn vận hành cùng ngày → tên món của lượt NFC hợp lệ trong cùng ngày, cách lúc chụp tối đa 2 giờ → combo mặc định PTNK “Thịt kho trứng + Bắp cải xào + Canh bầu”. Trường khác không tự nhận combo PTNK. Ngày mặc định suy từ thời điểm chụp theo UTC+7. Không lấy cờ dị ứng của NFC gần nhất gán cho khay không có liên kết danh tính.

Dropdown thực đơn và ngày phục vụ cho phép sửa liên kết ảnh hiện tại và chọn thực đơn mặc định cho các ảnh tiếp theo cùng ngày; header của thiết bị vẫn ưu tiên cao hơn. Nút đổi chiều 180° phân tích lại pixel, không chỉ đổi nhãn bbox; nút tự nhận khôi phục heuristic. Thao tác sửa giữ ID/thời điểm chụp, thay đúng một dòng cohort, không tạo thêm mẫu IQR. Nếu trạm gửi ảnh mới trong lúc sửa, CAS trả 409; không ghi đè ảnh mới.

Không chèn 64 khay giả, không mượn 1.280 khay mô phỏng làm nền thiết bị và không hiển thị tỷ lệ lọc 4,2% cố định. UI hiển thị số mẫu nền hợp lệ thực có và số mẫu có cờ bị tách; tối thiểu 10 khay cùng thực đơn/ngày mới thực hiện kiểm định. Cờ thống kê không xác nhận nguyên nhân dị ứng.

## API triển khai

Kho dùng React/Vite, `dist/`, Vercel Node Functions `api/ai/analyze-tray.mjs`. Tệp `src/app/api/ai/analyze-tray/route.ts` xuất Web Request/Response tương thích, không phụ thuộc Next.js. Vite và `npm start` nối cùng handler với production. `jpeg-js` là dependency runtime.

- `GET /api/ai/analyze-tray?schoolId=ptnk`: `{ok,source:"hardware",schoolId,revision,analysis,latestImageUrl}`. Chưa có sự kiện: analysis/image là null. API kết nối không chứng minh phần cứng online. Client kiểm tra trường học và dữ liệu, thăm dò sau mỗi 1,5s, không chạy chồng request, có timeout và hủy khi unmount.
- `POST` JSON `{sampleId}`: phân tích mẫu có trong danh mục, trả source `sandbox`, không ghi đè luồng thiết bị. Có thể gửi `{featureVectors,comboName,menuDate,allergyFlags}`; bốn vector phải có 6 số hữu hạn theo featureOrder trong artifact. Phản hồi thủ công không được xuất bản thành kết quả thiết bị.
- `POST image/jpeg`: giải mã pixel thực, yêu cầu 800×600 hoặc 600×800; tối đa 250KB và giới hạn bộ nhớ giải mã. Kèm `X-School-Id`, `X-Station-Id`, `X-Captured-At` (UTC), `Idempotency-Key`. Để IQR theo thực đơn, thêm `X-Menu-Name` (encodeURIComponent UTF-8 cho tên tiếng Việt) và `X-Menu-Date` (`YYYY-MM-DD`). Không tự lấy cờ dị ứng của lượt quét NFC gần nhất gán cho mọi khay.
- `POST` JSON `{action:"reanalyze",revision,comboName,menuDate,orientation:"auto"|0|180}` kèm `X-School-Id` và `Idempotency-Key`: chỉ sửa ảnh JPEG hiện tại; cần revision khớp. Trả 409 khi ảnh đã thay đổi hoặc hết hạn. Tọa độ và phần trăm được tính lại từ JPEG gốc; ảnh không bị xoay vật lý trên máy chủ. Lựa chọn thực đơn được giữ theo ngày trong state Redis, còn chiều khay chỉ áp dụng ảnh hiện tại. Thử lại cùng khóa/nội dung trả cùng revision; dùng lại khóa cho nội dung khác trả 409. Không tăng số khay và không gia hạn vòng đời JPEG.
- Worker gửi vector có thể dùng JSON với `publish:true` và cùng bốn header trên. Ảnh danh mục không được publish. Chưa có ảnh đi kèm vector thì GET trả latestImageUrl null.
- Lỗi `{error:{code,message,details}}`, HTTP 400/403/409/413/415/503. Khóa dùng lại cùng nội dung trả cùng revision; khác nội dung/header ngữ nghĩa trả 409. CAS của Redis cập nhật latest, tập nền và receipt nguyên tử; receipt có hạn 48h. Ảnh JPEG lưu riêng, tự hết hạn sau 30 ngày. Không lưu UID thô hoặc tên học sinh.

Production yêu cầu `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN` đã dùng cho IoT, không dùng biến RAM giữa các serverless instance. Mặc định schoolId từ `IOT_SCHOOL_ID` hoặc `ptnk`; giao diện dùng `VITE_IOT_SCHOOL_ID` tương ứng. RAM chỉ cho máy phát triển; production thiếu Redis trả 503. API công khai theo hợp đồng IoT hiện tại.

## Thử ESP32-CAM

Xem [firmware và hướng dẫn thử ảnh thật](../firmware/esp32_cam_gate/README.md). Firmware mặc định dùng POST JPEG tại API này, kèm đầy đủ header và khóa thử lại ổn định. IO0 là chân XCLK, không dùng BOOT để chụp; dùng lệnh Serial `c`, nút ngoài tùy chọn hoặc cảm biến GPIO13. Không dùng ảnh gallery để tạo bằng chứng thiết bị trên production.

## Tương tác vận hành

Không có nút sân khấu hoặc bảng hướng dẫn phím trên UI. Vision mở màn trạm; gallery và hiệu chỉnh ảnh ở mục Kiểm tra ảnh, ví dụ mô phỏng ở mục Thử kịch bản. Luồng IoT và ghi nhận quyết định có ở màn trạm, không chèn vào phân tích thực đơn. NFC ở Ghi nhận khay, phễu trực tiếp ở Tổng quan. Header chỉ báo trạng thái quan sát được, không tự gắn online cho nguồn dự phòng.

Phím nền: 1/2/3 = NFC hợp lệ/dị ứng/chưa đăng ký; lặp 1/2 kiểm tra trùng thẻ. Space/4 luân phiên ảnh tham chiếu; 5 ghi phê duyệt; R đặt lại nguồn dự phòng. Không can thiệp input/select/textarea hoặc tổ hợp Ctrl/Alt/Meta. Space trên button/link/summary giữ hành vi gốc. Nguồn tham chiếu vẫn được ghi rõ trên UI và không cộng vào dữ liệu phần cứng, bản ghi thực địa hay bộ 1.280 khay mô phỏng.

Quyết định luồng Vision lưu chung tại Dữ liệu → Lịch sử quyết định trên trình duyệt, giữ nguồn và chống nhấn lặp; chưa phải lệnh gửi tới bếp hoặc cấu hình thực đơn lưu trên máy chủ. Ảnh chuẩn hóa được cache ngoại tuyến cùng mã ứng dụng. Không cache API.

## Kiểm chứng

`npm test`, `npm run test:model`, typecheck theo AGENTS.md (bổ sung src/lib và route compatibility), `npm run build`. Không có cấu hình ESLint/lệnh lint trong kho. Build thành công không tự xác nhận triển khai Vercel, kết nối Redis thực, AWS worker, hoặc nghiệm thu ESP32/NFC vật lý.
