# Dữ liệu cân cho bộ đọc trạm (ESP32-CAM / OV2640)

**Mục đích.** Bộ đọc trạm `ov2640-area-v1` (`lib/station-vision.mjs`) hiện **chưa có sai số đo được**. Kho chỉ có 1 khung ESP32 và khoảng ước lượng bằng mắt của người vận hành. Tài liệu này mô tả cách thu thập bộ dữ liệu có cân để con số đó có thể kiểm chứng. Không trích dẫn MAE của Ridge trên ảnh điện thoại (xem [VISION-PTNK.md](VISION-PTNK.md)) cho bộ đọc này.

## Cổng trích dẫn

Một con số sai số của bộ đọc trạm chỉ được công bố khi đồng thời có:

| Điều kiện | Ngưỡng | Hằng số trong mã |
| --- | --- | --- |
| Số khay có cân | ≥ 100 | `STATION_GATE.minTrays` |
| Điều kiện ánh sáng khác nhau | ≥ 3 | `STATION_GATE.minLightingConditions` |
| Mục tiêu MAE tổng | < 10 điểm phần trăm | `STATION_GATE.targetOverallMAE` |

Hai điều kiện đầu quyết định có được *nêu số* hay không; điều kiện thứ ba quyết định số đó có *đạt mục tiêu* hay không. `node scripts/evaluate-station.mjs` in rõ trạng thái này. Khi chưa có dữ liệu, lệnh báo “chưa có dữ liệu cân” và thoát mã 0.

## Quy trình thu thập

1. **Cố định camera.** Gắn ESP32-CAM cố định trên giá, cùng góc và độ cao như lúc triển khai, khung 800×600. Không chụp bằng điện thoại. Ghi lại chiều khay (cơm trên trái là mặc định).
2. **Một khung khay trống cho mỗi phiên.** Đầu mỗi phiên chụp khay sạch, khô, đúng vị trí, đặt tên `frames/<phiên>-khay-trong.jpg`. Khung này dùng cho tùy chọn `reference` của `analyzeStationPixels`. Nếu dời camera, mở phiên mới và chụp lại khay trống.
3. **Cân trước và sau.** Với mỗi khay, cân từng ngăn (cơm, món chính, rau, canh) khi múc (`servedGrams`) và sau khi trả (`leftoverGrams`), bằng cân bếp có độ chia 1 g. Trừ khối lượng khay và bát. Chụp khay trả đúng một lần, bằng chính camera trạm.
4. **Phủ điều kiện.** Ít nhất 3 điều kiện sáng khác nhau (ví dụ ánh sáng ngày, đèn huỳnh quang, trời tối/đèn yếu), nhiều thực đơn và nhiều mức thừa từ 0% đến 100%. Không chỉ chọn khay “dễ”.
5. **Quyền riêng tư.** Không chụp khuôn mặt, không ghi tên học sinh, không lưu UID thẻ thô. `id` khay là mã ẩn danh vô nghĩa. `parseManifest` từ chối mọi trường ngoài danh sách cho phép.
6. **Lưu giữ ảnh.** Ảnh thô tuân quy tắc hết hạn 30 ngày; giữ `frames/` ngoài git (đã ignore) và xóa sau khi xuất báo cáo. `manifest.json` chỉ chứa mã ẩn danh và gram nên có thể giữ lại.
7. **Không dùng lại ảnh.** Ảnh trong bộ này chỉ để đánh giá. Chỉ khi có quyết định riêng mới đem một phần sang huấn luyện, và khi đó phải giữ phần giữ-lại không đụng tới.

## Cấu trúc

```
data/station-weighed/
  manifest.json          # bạn tạo; xem manifest.example.json
  frames/                # JPEG từ camera trạm; đã nằm trong .gitignore, không commit
```

`manifest.json` (schemaVersion 1):

- `sessions[]`: `id`, `date` (`YYYY-MM-DD`), `lighting` (nhãn tự do, mỗi nhãn tính một điều kiện), `emptyFrame` (tùy chọn nhưng nên có).
- `trays[]`: `id`, `sessionId`, `frame`, `servedGrams{rice,main,veg,soup}`, `leftoverGrams{...}`; tùy chọn `menu`, `note`.

Đường dẫn là tương đối, phải là `.jpg`/`.jpeg`, không chứa `..`. Phần còn lại thực = `leftoverGrams / servedGrams × 100` cho từng ngăn.

## Đánh giá

```sh
node scripts/evaluate-station.mjs                 # đọc data/station-weighed/manifest.json
node scripts/evaluate-station.mjs --manifest path/to/manifest.json --out report.json
```

Báo cáo gồm MAE từng ngăn và tổng, mốc “đoán bằng trung bình nhãn cân” (bỏ-một-khay), MAE theo từng điều kiện sáng, và nếu phiên có khung khay trống thì so sánh có/không dùng khung đó. Đây là cách duy nhất trong kho để biết diện tích ảnh sai bao nhiêu so với khối lượng thật, kể cả hiệu ứng nước kho và vị trí thức ăn.

## Giới hạn hiện tại

- Chưa có dữ liệu thật, nên chưa có số nào. Thử nghiệm trên ảnh điện thoại (`scripts/experiment-embeddings.mjs`) không thay thế cổng này.
- Khung khay trống mới có ở mức thư viện và công cụ đánh giá. API `POST image/jpeg` chưa nạp khung này; cần lưu khung theo trạm (Redis hoặc tệp) trước khi bật ở sản xuất.
- Khung khay trống loại được chi tiết có sẵn trên khay sạch (phản xạ đèn cố định, vân khay, vết bẩn cố định). Nước kho và thức ăn đều khác khay sạch nên phương pháp này không phân biệt được hai thứ đó.
