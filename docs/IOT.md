# Hợp đồng IoT v1 và kết nối dashboard

## Cấu hình

Dùng `api/iot/[action].mjs` trên Vercel, output frontend vẫn là `dist`. Thiết lập các biến trong `.env.example` ở môi trường server. Không đặt khóa trong biến `VITE_*`.

- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`: Redis dùng chung cho mọi Vercel instance. Thao tác state + idempotency dùng Lua compare-and-set nguyên tử, không dùng biến toàn cục để giả lập cơ sở dữ liệu.
- `IOT_SCHOOL_ID`: mặc định `ptnk`. API chỉ chấp nhận trường được cấu hình. Đặt `VITE_IOT_SCHOOL_ID` cùng giá trị khi build frontend; `VITE_SCHOOL_NAME` là tên hiển thị công khai.
- `IOT_UID_HMAC_SECRET`: bí mật HMAC SHA-256, chỉ cần khi nhận UID từ Web NFC. Chuẩn hóa UID bỏ `:`/`-`, chuyển chữ thường trước HMAC.
- `IOT_PROFILES_JSON`: mảng `{ "schoolId", "cardUidHash", "menuId", "menuName", "allergyFlags": [] }`. Chỉ giữ hash, không tên học sinh/ảnh định danh. Không có hồ sơ thẻ thật đi kèm repo. Đưa registry vào cơ sở dữ liệu quản lý khi triển khai nhiều trường.
- `IOT_IMAGE_ORIGINS`: danh sách origin HTTPS cho ảnh đã lưu tại S3, cách nhau dấu phẩy. Server không tải URL tùy ý.

Dev: sao chép `.env.example` sang `.env.local` và bật `IOT_LOCAL_MEMORY=true` nếu chưa có Redis. Chạy `npm run dev`, hoặc `npm run build` rồi `npm start`. Bộ nhớ dev mất khi restart, chỉ dùng local; Vercel luôn vô hiệu hóa fallback RAM. Thiếu Redis trên Vercel trả 503, không nhận giả thành công.

Trong Live Demo/Vision/NFC, chọn **Kết nối phần cứng**; dashboard, Web NFC, ESP32 và worker đều gọi API trực tiếp mà không cần khóa truy cập. Web NFC chỉ đọc được thẻ NDEF tương thích trên Android Chrome, không bảo đảm đọc UID của mọi thẻ MIFARE trường học. Đầu đọc ESP32/PN532 là lựa chọn cho thẻ không tương thích.

Tài liệu nền: [Vercel Node Functions](https://vercel.com/docs/functions/runtimes/node-js), [Upstash REST](https://upstash.com/docs/redis/features/restapi), [Redis Lua atomicity](https://redis.io/docs/latest/develop/programmability/eval-intro/), [Web NFC trên Android](https://developer.chrome.com/docs/capabilities/nfc).

## Quy ước chung

Mọi endpoint đều mở công khai và không yêu cầu header `Authorization`. Mỗi POST vẫn cần `Idempotency-Key` ổn định cho cùng một sự kiện, chữ/số/`_`/`-`, tối đa 100 ký tự. Giữ nguyên cả body và thời gian khi thử lại. Khóa đã dùng với body khác trả 409 `IDEMPOTENCY_CONFLICT`. `eventId` NFC cũng được bảo vệ khỏi gửi lại dưới khóa khác. Biên nhận giữ 48 giờ; sau cửa sổ này thiết bị phải đối soát, không tự gửi lại sự kiện cũ.

Thời gian ISO-8601 UTC dạng `2026-10-22T04:00:00.000Z`. Lỗi: `{ "error": { "code", "message", "details": null } }`. JSON/binary tối đa 250 KB; JPEG tối đa 150 KB, 800×600; thiết bị nên gửi khoảng 45 KB. Body được giới hạn tại adapter HTTP.

## POST /api/iot/nfc-scan

```json
{
  "eventId": "nfc-20261022-001",
  "schoolId": "ptnk",
  "stationId": "gate-1",
  "cardUidHash": "<64 lowercase hex HMAC characters>",
  "scannedAt": "2026-10-22T04:00:00.000Z"
}
```

Trả 200:

```json
{
  "eventId": "nfc-20261022-001",
  "status": "VALID",
  "servedCount": 1,
  "menu": { "menuId": "vit", "name": "Vịt kho gừng" },
  "allergyFlags": [],
  "recordedAt": "2026-10-22T04:00:00.000Z",
  "cardUidHash": "<hash>"
}
```

Trạng thái `VALID|ALLERGY_WARNING|ALREADY_REDEEMED|UNKNOWN_CARD`. Hai trạng thái đầu cộng suất; quét trùng hoặc thẻ lạ không cộng. Thẻ lạ có `menu: null`. Phụ trợ Web NFC: chấp nhận `{ "uid": "04:A2:8F:19", "timestamp": "..." }`; HMAC ở server rồi mới lưu. Không lưu UID gốc hoặc log body. Thiết bị gửi hash trực tiếp phải dùng cùng bí mật/chuẩn hóa với registry.

## POST /api/iot/tray-capture

Body raw `image/jpeg`, header bắt buộc:

```text
X-School-Id: ptnk
X-Station-Id: cam-1
X-Captured-At: 2026-10-22T04:10:00.000Z
Idempotency-Key: tray-20261022-001
```

Trả 202 `{ "captureId", "status": "QUEUED", "statusUrl" }`. Dashboard không tự sinh phần trăm từ ảnh vừa nhận. Worker AWS của nhóm phải lấy ảnh/xử lý rồi gửi callback. GET `statusUrl` trả snapshot với `latestCapture` được chọn theo `captureId`.

Tương thích payload từ Lambda đã phân tích: JSON `{ "schoolId": "ptnk", "stationId": "cam-1", "capturedAt": "...", "dishId": "vit", "imageUrl": "https://<approved-S3-origin>/tray.jpg", "riceLeftoverPct": 8, "vegLeftoverPct": 62, "mainLeftoverPct": 5, "isOutlier": false, "latencyMs": 680 }`. `imageBase64` JPEG có thể dùng thay `imageUrl`. Phần trăm bắt buộc đủ cả ba và trong 0–100; không tin số phần trăm gửi từ client công cộng. 202 là biên nhận tiếp nhận; snapshot đã là `COMPLETED` nếu Lambda cung cấp kết quả hợp lệ.

URL ảnh không được lưu kèm khuôn mặt; cấu hình lifecycle S3 xóa ảnh thô sau 30 ngày. Bridge Redis giữ JPEG TTL 30 ngày. API ảnh bridge là GET `/api/iot/image?schoolId=ptnk&captureId=...`, mở công khai. Ảnh hết TTL trả 404, metadata vẫn đọc được trong snapshot gần nhất. URL S3 ký sẵn hết hạn phải do pipeline AWS cấp lại.

## POST /api/iot/capture-result

Worker gọi với `Idempotency-Key` riêng cho mỗi lần chuyển trạng thái:

```json
{
  "schoolId": "ptnk",
  "stationId": "cam-1",
  "captureId": "cap-...",
  "dishId": "vit",
  "status": "COMPLETED",
  "riceLeftoverPct": 8,
  "vegLeftoverPct": 62,
  "mainLeftoverPct": 5,
  "isOutlier": false,
  "latencyMs": 680
}
```

Trạng thái `PROCESSING|COMPLETED|FAILED`. Worker cần gửi `dishId` để ghép khay cùng món; không tính đề xuất chung từ những khay chưa gắn món. Mẫu có cờ cơ địa phải gắn `isOutlier` bởi pipeline của nhóm; UI còn kiểm định IQR trên khay cùng món. Trạng thái cuối không bị ghi đè; retry dùng đúng khóa cũ trả biên nhận cũ. Không có worker AI chạy nền bên trong Vercel Function này; không có cơ chế tự tiêu thụ hàng đợi được triển khai ở repo dashboard.

## GET /api/iot/status?schoolId=ptnk&since=<ISO-8601>

Trả `{ "online", "lastUpdatedAt", "servedCount", "latestNfc", "latestCapture", "captures", "source": "hardware" }`.

- `online`: có sự kiện gửi tới trong 30 giây, không phải ping đo sức khỏe ESP32. Trạm nhàn rỗi có thể hiện chưa có tín hiệu.
- `servedCount`: bộ đếm ngày hiện tại, bắt đầu từ 0, không tự gán baseline 1.017.
- `latestCapture.status`: `QUEUED|PROCESSING|COMPLETED|FAILED`; hoàn tất có `{rice,vegetables,main,isOutlier,recommendation}`. Một mẫu đơn không đủ cơ sở điều chỉnh chung.
- `captures`: tối đa 100 khay gần nhất, lọc theo `since` dựa trên thời gian cập nhật. Các trường latest vẫn là snapshot mới nhất để kết nối lại được. Đây không phải kho lịch sử toàn trường; lưu analytics dài hạn ở AWS/database riêng.
- Dashboard polling mỗi giây sau khi xong lần gọi trước, không chồng yêu cầu; có timeout và hủy khi rời chế độ nghe. Mất mạng giữ snapshot cuối kèm trạng thái lỗi; người trình diễn có thể chuyển sang fallback riêng.

## Hợp đồng cảm biến của firmware (đội phần cứng triển khai)

Không có firmware thay thế được cài lên thiết bị từ repo này. Thiết bị phải giữ ổn định 300 ms, chụp đúng một frame, khóa, chỉ mở lại khi cảm biến vắng liên tục >1.000 ms. 600 ms trên màn hình sân khấu là hoạt ảnh mô phỏng, không phải chứng cứ đạt độ trễ cảm biến.

## Kiểm thử tích hợp trước sân khấu

1. Điền registry hash và bí mật, thiết lập Redis, cấu hình S3 lifecycle và origin ảnh. Chỉ dùng hồ sơ được nhà trường cho phép; không đưa tên hoặc UID gốc vào log.
2. Gửi cùng NFC event nhiều lần và đồng thời: chỉ cộng một suất. Thử lại với nội dung khác phải 409. Thẻ dị ứng hiển thị cảnh báo, thẻ lạ/trùng không cộng.
3. Gửi JPEG đúng header → 202/QUEUED; worker gửi PROCESSING rồi COMPLETED hoặc FAILED. Thử lại giữ nguyên trạng thái cuối.
4. Mở dashboard, kiểm tra cập nhật tự động, ảnh và ba thành phần; mẫu lạ không làm cắt khẩu phần chung. Thử ngắt Wi-Fi, chạy `1`, `2`, `3`, `Space/4`, reset.
5. Xác minh trên Vercel sau deployment; test local không chứng minh production, NFC thật hoặc AWS worker thật đã hoạt động.

### Thành phần canh tùy chọn

Kết quả JSON và `capture-result` có thể gửi thêm `soupLeftoverPct` (số hữu hạn 0–100). Khi có trường này, `status.latestCapture.result.soup` và các capture tương ứng giữ giá trị đó để hiển thị; thiếu trường nghĩa là chưa đo, không phải 0%. Ba trường Cơm/Rau/Món chính vẫn theo hợp đồng cũ. Không suy ra gram canh từ phần trăm hoặc trộn vào baseline ba thành phần.
