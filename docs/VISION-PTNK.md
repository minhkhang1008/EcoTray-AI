# Vision PTNK — dữ liệu, mô hình và API

## Phạm vi dữ liệu

18 ảnh nguồn trong `public/ptnk-trays/`, chụp 28–29/10/2026. `data/ptnk-trays.json` giữ nhãn phần còn lại ước lượng bằng mắt do nhóm cung cấp, góc xoay và nhóm góc chụp lặp. Không coi 18 ảnh là 18 khay độc lập. `public/ptnk-normalized/` là bản 800×600 đã xoay theo metadata; ảnh gốc được giữ nguyên.

Hai mốc cố định: `IMG_20261028_115429.jpg` = sạch 0%; `IMG_20261029_112146.jpg` = đầy 100%. Nhãn gốc của ảnh đầy (100/95/90/90) được giữ riêng; mô hình chuẩn hóa tất cả thành phần về mốc đầy 100%. Ảnh đầy không được đưa vào thống kê khay trả.

## Tái huấn luyện

```sh
python3 -m venv .venv-vision
.venv-vision/bin/pip install -r scripts/vision-requirements.txt
.venv-vision/bin/python scripts/train_ecotray_vision.py
```

Trình huấn luyện yêu cầu đủ 18 ảnh, không có trọng số hoặc số liệu đánh giá dự phòng. Node `jpeg-js` trích xuất cùng bộ đặc trưng dùng trong suy luận; NumPy giải Ridge α=0,15, không phạt bias. Không có tăng cường ngẫu nhiên hoặc chia ảnh lặp sang hai tập khác nhau. Bộ trọng số, đặc trưng, kết quả dự đoán từng ảnh giữ lại và MAE được xuất vào `src/lib/ecotrayModels.json`.

Kiểm định: bỏ lần lượt từng nhóm ảnh liên quan, giữ hai mốc hiệu chuẩn trong tập huấn luyện và không chấm hai mốc. 16 ảnh được chấm; MAE hiện tại **27,28 điểm phần trăm**. Đây là kiểm định có điều kiện trên bộ nhỏ, dùng nhãn thị giác và hai mốc biết trước; chưa có tập cân độc lập. Không công bố MAE 5,8%, độ chính xác 94,2%, hoặc lấy `100 − MAE` làm độ chính xác phân loại.

Vùng đọc cố định cùng bộ lọc màu/texture giảm ảnh hưởng inox, đũa tối và nước kho phẳng. Đây là heuristic, không phải bộ phân đoạn đã được xác thực. Ảnh mới cần đúng bố cục, góc chụp và điều kiện ánh sáng; không suy ra phần trăm từ kích thước JPEG.

## Hiệu chỉnh và quyết định

Sandbox xử lý ảnh tải lên ngay trong trình duyệt; ảnh và phản hồi không gửi máy chủ. Bốn thanh trượt có bước 25%. Nút Active Learning cập nhật trọng số hồi quy trong phiên bằng sai số phản hồi, bảo toàn hai mốc hiệu chuẩn. Khôi phục đưa về trọng số gốc; tải lại trang kết thúc phiên. Trọng số sau phản hồi chưa được kiểm định và không thay mô hình trạm.

Gram suy từ định lượng giả định Cơm 200g / Món chính 110g / Rau 90g / Canh 150g. `W_min=85g` là chính sách bảo vệ thử nghiệm. Khóa giảm rau bất cứ khi nào lượng rau thực ăn ước tính dưới 85g, không cần thêm điều kiện phần trăm thừa. Không mô tả ngưỡng này là chuẩn y khoa hoặc lượng chất xơ.

IQR chỉ so khay độc lập cùng ngày và cùng thực đơn, cần ít nhất 10 khay nền. Hai góc chụp cùng nhóm tính một khay. Cờ NFC tách mẫu trước phép tính; mẫu đã có cờ ngoại lai cũng không tham gia tập nền. Không coi “mọi ngăn >75%” là phép kiểm định IQR hay chẩn đoán dị ứng. Bộ ảnh tham chiếu hiện chưa đủ 10 mẫu độc lập cùng thực đơn/ngày. Luồng thiết bị tích lũy tối đa 100 quan sát gần nhất trong Redis; cần gắn thực đơn/ngày để lập tập nền.

## API triển khai

Kho dùng React/Vite, `dist/`, Vercel Node Functions `api/ai/analyze-tray.mjs`. Tệp `src/app/api/ai/analyze-tray/route.ts` xuất Web Request/Response tương thích, không phụ thuộc Next.js. Vite và `npm start` nối cùng handler với production. `jpeg-js` là dependency runtime.

- `GET /api/ai/analyze-tray?schoolId=ptnk`: `{ok,source:"hardware",schoolId,revision,analysis,latestImageUrl}`. Chưa có sự kiện: analysis/image là null. API kết nối không chứng minh phần cứng online. Client kiểm tra trường học và dữ liệu, thăm dò sau mỗi 1,5s, không chạy chồng request, có timeout và hủy khi unmount.
- `POST` JSON `{sampleId}`: phân tích mẫu có trong danh mục, trả source `sandbox`, không ghi đè luồng thiết bị. Có thể gửi `{featureVectors,comboName,menuDate,allergyFlags}`; bốn vector phải có 6 số hữu hạn theo featureOrder trong artifact. Phản hồi thủ công không được xuất bản thành kết quả thiết bị.
- `POST image/jpeg`: giải mã pixel thực, yêu cầu 800×600; tối đa 250KB và giới hạn bộ nhớ giải mã. Kèm `X-School-Id`, `X-Station-Id`, `X-Captured-At` (UTC), `Idempotency-Key`. Để IQR theo thực đơn, thêm `X-Menu-Name` (encodeURIComponent UTF-8 cho tên tiếng Việt) và `X-Menu-Date` (`YYYY-MM-DD`). Không tự lấy cờ dị ứng của lượt quét NFC gần nhất gán cho mọi khay.
- Worker gửi vector có thể dùng JSON với `publish:true` và cùng bốn header trên. Ảnh danh mục không được publish. Chưa có ảnh đi kèm vector thì GET trả latestImageUrl null.
- Lỗi `{error:{code,message,details}}`, HTTP 400/403/409/413/415/503. Khóa dùng lại cùng nội dung trả cùng revision; khác nội dung/header ngữ nghĩa trả 409. CAS của Redis cập nhật latest, tập nền và receipt nguyên tử; receipt có hạn 48h. Ảnh JPEG lưu riêng, tự hết hạn sau 30 ngày. Không lưu UID thô hoặc tên học sinh.

Production yêu cầu `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN` đã dùng cho IoT, không dùng biến RAM giữa các serverless instance. Mặc định schoolId từ `IOT_SCHOOL_ID` hoặc `ptnk`; giao diện dùng `VITE_IOT_SCHOOL_ID` tương ứng. RAM chỉ cho máy phát triển; production thiếu Redis trả 503. API công khai theo hợp đồng IoT hiện tại.

## Tương tác vận hành

Không có nút sân khấu hoặc bảng hướng dẫn phím trên UI. Gallery và sandbox đứng đầu Vision; luồng IoT và phê duyệt có ở Vision/Phân tích thực đơn. NFC ở Ghi nhận khay, phễu trực tiếp ở Tổng quan. Header chỉ báo trạng thái quan sát được, không tự gắn online cho nguồn dự phòng.

Phím nền: 1/2/3 = NFC hợp lệ/dị ứng/chưa đăng ký; lặp 1/2 kiểm tra trùng thẻ. Space/4 luân phiên 18 ảnh tham chiếu; 5 ghi phê duyệt; R đặt lại nguồn dự phòng. Không can thiệp input/select/textarea hoặc tổ hợp Ctrl/Alt/Meta. Space trên button/link/summary giữ hành vi gốc. Nguồn tham chiếu vẫn được ghi rõ trên UI và không cộng vào dữ liệu phần cứng, bản ghi thực địa hay bộ 1.280 khay mô phỏng.

Phê duyệt luồng Vision lưu trong phiên trình duyệt, giữ nguồn và chống nhấn lặp; chưa phải lệnh gửi tới bếp hoặc cấu hình thực đơn lưu trên máy chủ. 18 ảnh chuẩn hóa được cache ngoại tuyến cùng mã ứng dụng. Không cache API.

## Kiểm chứng

`npm test`, `npm run test:model`, typecheck theo AGENTS.md (bổ sung src/lib và route compatibility), `npm run build`. Không có cấu hình ESLint/lệnh lint trong kho. Build thành công không tự xác nhận triển khai Vercel, kết nối Redis thực, AWS worker, hoặc nghiệm thu ESP32/NFC vật lý.
