# Rà soát tác động kinh tế (02/11/2026)

Trang `/project` đã được hạ mức tuyên bố theo bản rà soát nội bộ.

- Mọi ô tiền/khối lượng lấy từ `economicScenario(level)` (`lib/final-round.mjs`): Thận trọng 5%, Cơ sở 10%, Lạc quan 16,8% (cận trên). Mốc nền 44 g/khay × 1.017 × 180 ngày ≈ 8,0 tấn (ước tính, chưa cân, chưa tính canh); 20 ngày/tháng.
- Tiền chỉ tính phần bếp mua ít đi; đơn giá 25.000đ/kg là giả định áp cho khối lượng chín, cần thay bằng giá nhập thật.
- Kịch bản −12% rau bị gỡ (vi phạm W_min = 85 g và 3958/QĐ-BYT); thay bằng đổi cặp rau-canh, giữ lượng rau.
- Bỏ "hoàn vốn < 1 tháng" và CO₂e. Lộ trình: PTNK → 1-2 trường → 3-5 trường, có điều kiện chuyển năm.

Việc còn cần dữ liệu căn tin (chưa làm): cân thùng thừa 2-3 tuần, bảng giá nhập, mô hình hợp đồng căn tin, thử Web NFC với thẻ PTNK, lưu lượng khay trả, tập cân 10-15 khay cho trạm ESP32. Đặt W_min mặc định 85 g hay 100 g là quyết định của nhóm, chưa đổi.
