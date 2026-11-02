# Đặc tả dữ liệu tab Thực đơn → Phân tích

Logic nằm ở `lib/menu-analysis.mjs`, giao diện ở `src/MenuAnalysis.tsx`. Tab dùng chung bộ lọc món, thời gian và món số của `Thống kê`. Tab `Thống kê` tra số liệu; tab `Phân tích` trả lời số liệu đang nói gì.

## Định nghĩa

| Khái niệm | Cách tính |
|---|---|
| Khay hợp lệ | Khay có ít nhất một giá trị Cơm, Rau hoặc Món chính khác `null` |
| Quan sát hợp lệ của một thành phần | Khay có giá trị khác `null` ở thành phần đó |
| % còn lại của thành phần | Trung bình cộng các quan sát hợp lệ của thành phần, trước khi lọc ngoại lai; không phải khối lượng |
| Tổng thể | Trung bình trên mọi quan sát hợp lệ của ba thành phần (`overall`) |
| Món cần xem xét | Mức ưu tiên Cao hoặc Trung bình theo `Dữ liệu & cấu hình → Cấu hình ngưỡng` |
| Xếp hạng món | Chỉ gồm món có số quan sát của thành phần đang chọn không ít hơn số quan sát tối thiểu |
| Thời gian | Theo ngày phục vụ; chưa gộp theo tuần vì dữ liệu còn ít |
| Dữ liệu thiếu | Hiện `—`, không tính là 0%. Món nước thường không có quan sát Cơm và Rau |

## Thành phần màn hình

1. **KPI:** món còn lại cao nhất theo thành phần đang chọn, % rau trung bình, số món cần xem xét, số khay hợp lệ.
2. **Xếp hạng:** thanh ngang, 8 món cao nhất, đổi được Cơm, Rau, Món chính, Tổng thể. Bấm thanh để mở chi tiết món.
3. **Cơ cấu theo món:** thanh chồng Cơm, Rau, Món chính. Ba tỷ lệ có mẫu số khác nhau, nên độ dài chỉ để so sánh tương đối, không phải một tổng 100%.
4. **Xu hướng:** đường theo ngày; một ngày dữ liệu hiện bảng thay cho đường.
5. **Nhận định và gợi ý:** sinh bằng quy tắc, không dùng mô hình sinh văn bản.

## Quy tắc nhận định

- Thành phần còn lại cao nhất được đếm trên các món có ít nhất hai thành phần đủ số quan sát tối thiểu.
- Món cao nhất lấy theo thành phần đang chọn.
- Dưới 10 ngày phục vụ: ghi rõ chưa đủ để kết luận xu hướng dài hạn. Từ 2 ngày trở lên: so nửa đầu và nửa sau của kỳ bằng `trend`.
- Gợi ý là việc để bếp xem xét, không phải lệnh. Không đề xuất giảm khẩu phần trực tiếp vì ở đây chưa lọc mẫu ngoại lai dị ứng; chi tiết món là nơi xem số sau lọc.

Dữ liệu PTNK hiện là bộ minh họa, nên màn hình phải ghi rõ khi đang dùng bộ này.
