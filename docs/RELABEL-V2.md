# Gán nhãn lại bộ ảnh khay PTNK — v2 (31/10/2026)

## Tóm tắt

- Đã xem lại **toàn bộ 35 ảnh** trong `public/ptnk-trays/` (repo cũ chỉ gán nhãn 18 ảnh; 17 ảnh ngày 29–30/10 chưa có nhãn).
- Góc xoay và vị trí ngăn rau (`rotation`, `veg_pos`) của 18 ảnh cũ **đều đúng**, không cần sửa. 17 ảnh mới đã được gán đủ hai trường này và kiểm tra bằng cách vẽ khung ROI lên ảnh đã chuẩn hóa.
- Sửa 13/16 ảnh cũ có chênh ≥10 điểm, chủ yếu do **thang đo không nhất quán**: ví dụ cơm ở 114612 bị ghi 75% trong khi lượng cơm chỉ khoảng một nửa ảnh mốc 100%; cơm ở 112201 (gần đầy) lại bị ghi 55%.
- Thêm các trường mô tả tình huống gây nhiễu: `soupBowl`, `flags`, `note`, `comboConfidence`, `previousY`.

**Phát hiện quan trọng nhất:** nhãn không phải nút thắt chính. Bước hiệu chuẩn theo hai mốc trong `train_ecotray_vision.py` làm sai số tăng gần gấp đôi (xem mục "Đánh giá").

## Quy ước nhãn v2

`y = [cơm, món chính, rau, canh]`, đơn vị là % còn lại so với ảnh mốc đầy `IMG_20261029_112146.jpg`. Đây là ước lượng thị giác, **không phải số cân**.

| Thành phần | 100% nghĩa là |
|---|---|
| Cơm | Ngăn lớn đầy, có vun (chỉ tính ngăn lớn; phần cơm thừa ở ngăn nhỏ của ảnh mốc nằm ngoài ROI) |
| Món chính | Khẩu phần chuẩn: khoảng 2 miếng (hoặc 2 miếng thịt + 1 trứng) kèm nước kho |
| Rau | Ngăn rau đầy ngang miệng |
| Canh | Bát đầy khoảng 85% |

Các quy tắc khác:

- **Nhãn theo món, không theo ngăn.** Thịt nằm trên cơm vẫn tính cho món chính, và ảnh được gắn cờ `main_on_rice`. Mô hình đọc theo ngăn nên những ảnh có cờ này luôn gây nhiễu.
- **Xương và nước sốt không tính là thức ăn thừa.** Ảnh có xương ở ngăn tròn mang cờ `bones`.
- **Canh = 0 có ba nghĩa khác nhau**, phân biệt bằng `soupBowl`: `absent` (không lấy bát), `empty` (bát đã ăn hết), `present` (bát còn canh).
- **Rau = 0** khi cả hai ngăn nhỏ đều trống mang cờ `veg_slot_uncertain`, vì không phân biệt được "đã ăn hết" với "không lấy rau".

## Bảng nhãn

| Ảnh | Ngày | Cơm | Món chính | Rau | Canh | Nhãn cũ | Bát canh | Cờ |
|---|---|---|---|---|---|---|---|---|
| 20261028_114612 | 10-28 | 50 | 90 | 85 | 0 | 75/85/85/0 | absent |  |
| 20261028_114613 | 10-28 | 50 | 90 | 85 | 0 | 75/84/85/0 | absent |  |
| 20261028_114807 | 10-28 | 55 | 65 | 80 | 0 | 75/80/80/0 | absent | main_on_rice |
| 20261028_114814 | 10-28 | 20 | 30 | 30 | 0 | 30/25/35/0 | absent | rice_in_main, veg_in_soup_slot |
| 20261028_115429 | 10-28 | 0 | 0 | 0 | 0 | 0/0/0/0 | absent | sauce_only_main, anchor_empty |
| 20261028_115432 | 10-28 | 25 | 65 | 15 | 45 | 45/75/20/50 | present | main_on_rice, rice_in_soup |
| 20261028_115435 | 10-28 | 85 | 70 | 45 | 0 | 90/65/50/0 | empty | soup_veg_on_rice |
| 20261028_115435_1 | 10-28 | 85 | 70 | 45 | 0 | 90/65/48/0 | empty | soup_veg_on_rice |
| 20261028_115444 | 10-28 | 85 | 80 | 85 | 60 | 85/70/85/65 | present | food_outside_roi |
| 20261028_115444_1 | 10-28 | 85 | 80 | 85 | 60 | 85/70/85/65 | present | food_outside_roi |
| 20261028_115445 | 10-28 | 85 | 80 | 85 | 60 | 84/70/85/65 | present | food_outside_roi |
| 20261028_115447 | 10-28 | 15 | 45 | 25 | 60 | 25/60/30/45 | present | veg_in_main |
| 20261029_112143 | 10-29 | 55 | 75 | 3 | 85 | 65/75/2/80 | present | main_on_rice |
| 20261029_112146 | 10-29 | 100 | 100 | 100 | 100 | 100/95/90/90 | present | anchor_full, extra_rice_unused_slot |
| 20261029_112148 | 10-29 | 35 | 70 | 85 | 0 | 35/60/85/0 | absent | main_on_rice |
| 20261029_112154 | 10-29 | 60 | 70 | 70 | 0 | 65/65/75/0 | absent | main_on_rice |
| 20261029_112159 | 10-29 | 50 | 85 | 60 | 0 | 55/60/60/0 | absent | bones |
| 20261029_112201 | 10-29 | 75 | 65 | 75 | 75 | 55/65/80/75 | present | main_on_rice, cropped_frame |
| 20261029_113321 | 10-29 | 15 | 75 | 75 | 0 | mới | absent | main_on_rice, bones |
| 20261029_113324 | 10-29 | 3 | 3 | 3 | 0 | mới | absent | bones, near_clean |
| 20261029_113326 | 10-29 | 2 | 3 | 0 | 0 | mới | absent | bones, near_clean, sauce_only_main, veg_slot_uncertain |
| 20261030_112909 | 10-30 | 55 | 70 | 70 | 0 | mới | absent | main_on_rice |
| 20261030_112911 | 10-30 | 45 | 55 | 65 | 70 | mới | present | condiment |
| 20261030_112912 | 10-30 | 45 | 55 | 65 | 70 | mới | present | condiment |
| 20261030_112922 | 10-30 | 35 | 15 | 0 | 65 | mới | present | veg_slot_uncertain |
| 20261030_112923 | 10-30 | 55 | 45 | 45 | 15 | mới | present | main_in_other_slot |
| 20261030_112925 | 10-30 | 40 | 3 | 0 | 0 | mới | empty |  |
| 20261030_112927 | 10-30 | 20 | 40 | 70 | 0 | mới | absent | main_on_rice |
| 20261030_112927_1 | 10-30 | 20 | 40 | 70 | 0 | mới | absent | main_on_rice |
| 20261030_112930 | 10-30 | 50 | 85 | 75 | 0 | mới | absent | main_in_other_slot |
| 20261030_112933 | 10-30 | 85 | 75 | 65 | 70 | mới | present | main_in_other_slot, cropped_frame, other_tray_in_frame |
| 20261030_112937 | 10-30 | 40 | 50 | 55 | 70 | mới | present | main_on_rice |
| 20261030_112939 | 10-30 | 40 | 60 | 70 | 0 | mới | absent |  |
| 20261030_113406 | 10-30 | 50 | 85 | 70 | 0 | mới | absent |  |
| 20261030_113412 | 10-30 | 70 | 50 | 0 | 70 | mới | present | main_in_other_slot, other_tray_in_frame, veg_slot_uncertain |

Nhóm ảnh trùng khay (`group`): 114612/114613, 115435/115435_1, 115444/115444_1/115445, 112911/112912 và 112927/112927_1. Tổng cộng 35 ảnh thuộc 29 khay độc lập (27 khay nếu bỏ hai ảnh mốc).

Món chính lấy theo thực đơn PTNK do nhóm cung cấp: 28/10 *Thịt kho tàu* hoặc *Cá nục kho rục xương*; 29/10 *Gà kho gừng*; 30/10 *Ba rọi vàng giòn sốt mắm tỏi* (cả 16 ảnh ngày 30/10 đều là ba rọi da giòn, tỏi phi, hành tây; không thấy thơm của món *Sườn kho thơm*; 112927 và 113412 có miếng còn xương sườn nhưng vẫn tính là ba rọi). Rau và canh không có trong danh sách thực đơn nên vẫn là **đoán từ ảnh**; ba ảnh 113326, 112922, 113412 không xác định được rau. Trường `comboConfidence: "main-from-menu; sides-visual"` ghi rõ điều này.

## Áp dụng trong repo

- `data/ptnk-trays.json` giữ đủ 35 ảnh theo schema v2. Ảnh mốc đầy vẫn giữ nhãn gốc 100/95/90/90 (trình huấn luyện dùng 100).
- `public/ptnk-normalized/` có thêm 17 ảnh chuẩn hóa mới.
- `scripts/train_ecotray_vision.py` (model v4): bỏ hiệu chuẩn hai mốc, bỏ giới hạn 18 ảnh, ghi thêm `baselineMeanLabelMAE`, `independentTrays`, `featureExtractor`; có `--features python` (`scripts/ptnk_features.py`) khi không có Node.
- `lib/ptnk-vision.mjs`: dự đoán Ridge trực tiếp; hai ảnh mốc hiển thị theo nhãn mốc (`anchor-label`); sửa lỗi IQR so giá trị chưa làm tròn với cohort đã làm tròn.
- Ảnh rà soát nhãn có khung ROI: `docs/relabel-v2/review-sheet-1..3.jpg`.

## Đánh giá

Số liệu dưới đây chạy bằng bản port NumPy (`scripts/ptnk_features.py`, trùng JS tới 1e-13 trên cùng pixel). Với nhãn cũ bản port cho MAE 27,24, khớp con số 27,28 của script gốc.

Phương pháp: bỏ ra từng nhóm ảnh (leave-one-group-out). Đơn vị là MAE theo điểm phần trăm, so với nhãn thị giác.

| Cấu hình | Cơm | Món chính | Rau | Canh | Tổng |
|---|---|---|---|---|---|
| Hiện tại (Ridge + hiệu chuẩn 2 mốc), nhãn cũ, 18 ảnh | 20,2 | 42,4 | 27,1 | 19,3 | **27,2** |
| Mốc so sánh: luôn đoán bằng trung bình nhãn (không nhìn ảnh) | | | | | 22,8 |
| Ridge, **bỏ hiệu chuẩn 2 mốc**, nhãn cũ, 18 ảnh | 16,8 | 13,8 | 18,3 | 11,0 | 15,0 |
| Ridge, bỏ hiệu chuẩn, nhãn v2, 35 ảnh | 16,1 | 17,0 | 13,1 | 12,3 | 14,6 |
| Hồi quy tuyến tính 1 đặc trưng/món, nhãn v2, 35 ảnh | 14,9 | 15,8 | 13,2 | 12,5 | 14,1 |
| **Model v4 đang dùng** (Ridge, bỏ hiệu chuẩn, nhãn v2, 35 ảnh) | 16,1 | 17,0 | 13,1 | 12,3 | **14,6** (mốc trung bình 25,3) |

Cách đọc bảng:

1. **Mô hình hiện tại còn kém hơn việc đoán bằng giá trị trung bình** (27,2 so với 22,8). Nguyên nhân là bước `(pred − pred_empty) / (pred_full − pred_empty) × 100` trong `predict()`: nó kéo giãn đầu ra theo hai ảnh mốc, mà hai ảnh này lại khác hẳn các ảnh còn lại (ảnh mốc 100% có thêm một phần cơm ở ngăn nhỏ, chụp ngày khác, món khác). Chỉ cần bỏ bước này, sai số đã giảm khoảng 45%.
2. Nhãn v2 cộng thêm 17 ảnh mới giúp cải thiện rõ ở **rau** (18 → 13) và **canh**. Riêng món chính tăng nhẹ, do ảnh ngày 30/10 thường có thịt nằm lẫn sang ngăn khác.
3. Đặc trưng đơn lẻ tương quan khá tốt với nhãn v2: tỷ lệ trắng ↔ cơm r=0,74; texture có màu ↔ rau r=0,85; tỷ lệ không phải kim loại ↔ canh r=0,85. Như vậy tín hiệu có tồn tại; vấn đề nằm ở cách hiệu chuẩn và ở ROI cố định.
4. Mọi con số trên đều so với nhãn thị giác do cùng một người gán, nên chỉ có giá trị so sánh tương đối giữa các cấu hình. Đây không phải độ chính xác thực tế.

## Góp ý cải thiện (theo thứ tự tác động)

1. **Bỏ hoặc thay bước hiệu chuẩn 2 mốc** trong `train_ecotray_vision.py` và chỗ dùng tương ứng khi suy luận. Nếu vẫn muốn giữ mốc, hãy dùng chúng như các điểm dữ liệu bình thường (đã có sẵn trong tập train), không dùng để kéo giãn đầu ra.
2. **ROI cố định không khớp với ảnh chụp bằng điện thoại.** Các ảnh 112933, 112925, 112939, 112201 có khay lệch hoặc bị cắt, khiến khung ROI rơi ra ngoài ngăn thật. Nên gán thêm **4 góc khay** cho mỗi ảnh rồi nắn phối cảnh (homography) về khung chuẩn trước khi cắt ROI. Việc này nhanh hơn vẽ polygon từng ngăn và sửa được phần lớn sai lệch vị trí. Với ESP32 gắn cố định thì vấn đề nhẹ hơn, nhưng vẫn nên có.
3. **Thức ăn bị chuyển ngăn** (15/35 ảnh có `main_on_rice` hoặc `main_in_other_slot`). Có hai hướng: (a) chuyển sang nhãn theo ngăn, tức đo "ngăn này còn bao nhiêu thức ăn" bất kể món gì, rồi suy ra món ở tầng logic; hoặc (b) khi ghi dữ liệu, loại các ảnh có cờ này khỏi tập đánh giá mà vẫn giữ trong tập train.
4. **Ảnh mốc 100% không đại diện**: khác ngày, khác món và có phần cơm ở ngăn phụ. Nên chụp một khay đầy chuẩn cho mỗi ngày hoặc mỗi thực đơn, và nếu được thì cân luôn.
5. **Quy trình chụp**: chụp thẳng từ trên xuống, cả khay nằm trong khung, không để khay khác lọt vào, nhấc đũa/muỗng ra trước khi chụp. Ảnh chụp liên tiếp của cùng một khay chỉ tính là một mẫu.
6. **Nhãn có cân**: chỉ cần 10–15 khay được cân từng ngăn (trước và sau bữa ăn) là đã có được thước đo thật để kiểm chứng toàn bộ nhãn thị giác ở trên.
