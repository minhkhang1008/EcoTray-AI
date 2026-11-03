# Trạm ESP32-CAM → EcoTray Vision

Firmware mẫu cho **AI Thinker ESP32-CAM / OV2640 có PSRAM**, không phải chương trình AI chạy trên ESP32. ESP32 chụp JPEG; Vercel phân tích pixel bằng mô hình PTNK hiện tại rồi lưu Redis; dashboard thăm dò kết quả. Mô hình có giới hạn trong [VISION-PTNK.md](../../docs/VISION-PTNK.md); ảnh từ camera mới chưa được kiểm định độc lập.

## Chọn đúng luồng

| Đích gửi ảnh | Kết quả | Điều kiện |
| --- | --- | --- |
| `/api/ai/analyze-tray` (mặc định) | HTTP 200, phân tích trực tiếp, cập nhật Vision | Redis production, JPEG 800×600 |
| `/api/iot/tray-capture` | HTTP 202, `QUEUED` | Redis và worker bên ngoài để xử lý/callback |

Hai luồng có snapshot riêng. Gửi ảnh vào IoT không tự cập nhật snapshot Vision; giao diện còn nhận callback IoT riêng. Không sửa endpoint sang IoT rồi chờ Vercel tự chạy AWS. Không có đường dẫn riêng `/live-demo`; mở tab **EcoTray Vision → Trạm căn tin** trên trang chính. Không khôi phục màn sân khấu đã gỡ.

## Cấu hình và nạp

1. Cài Arduino IDE và **esp32 by Espressif Systems 3.3.2** (phiên bản dùng để kiểm tra biên dịch). Chọn **AI Thinker ESP32-CAM**, PSRAM bật, partition Huge APP, baud nạp 115200. Sketch nằm tại `esp32_cam_gate.ino` cùng thư mục này.
2. Sao chép `config.example.h` thành `config.h`. Điền Wi-Fi 2,4 GHz, trường và mã trạm; `config.h` đã được gitignore. `ROOT_CA` phải chứa PEM CA gốc của chuỗi chứng thư endpoint đang dùng. Xác minh chuỗi bằng trình duyệt/hệ thống CA tin cậy rồi lấy CA từ tổ chức cấp; không tin chứng thư vừa tải qua kết nối chưa xác minh. Dùng `setCACert`, không bỏ kiểm tra TLS. Khi đổi nhà cấp chứng thư cần cập nhật CA.
3. `config.example.h` mặc định bật `USE_HCSR04=true` (cảm biến siêu âm của nhóm; đấu dây ở mục dưới). Vẫn chụp thủ công được bằng Serial `c`. Giữ flash tắt ban đầu vì inox phản chiếu mạnh. Điền tên thực đơn đã URL encode và ngày nếu biết; để trống nếu chưa biết, không gán ngày/thực đơn giả.
4. Cắm đế nạp USB, cấp nguồn 5V đủ dòng theo thông số board. Nếu cần chế độ nạp thủ công: nối IO0-GND khi reset để nạp, **tháo nối rồi reset sau khi nạp**. Không nhấn BOOT/IO0 để chụp: IO0 được dùng làm XCLK của camera.
5. Mở Serial Monitor 115200. Gõ `t` để thử lấy JPEG tại chỗ, không cần Wi-Fi/CA và không gửi API. Chờ Wi-Fi và NTP; gõ `c` để chụp và gửi. Không có cam kết độ trễ 0,5s: cần đo thực tế cả chụp, TLS, tải lên và suy luận.

Nguồn chính thức: [sơ đồ chân CameraWebServer](https://github.com/espressif/arduino-esp32/blob/3.3.2/libraries/ESP32/examples/Camera/CameraWebServer/camera_pins.h), [ESP32 camera driver](https://github.com/espressif/esp32-camera), [TLS client](https://github.com/espressif/arduino-esp32/blob/3.3.2/libraries/NetworkClientSecure/src/NetworkClientSecure.h).

## Đấu dây HC-SR04

| HC-SR04 | ESP32-CAM (AI Thinker) | Ghi chú |
| --- | --- | --- |
| VCC | 5V | Bản HC-SR04 thường cần 5V; cấp đủ dòng, chung nguồn với board |
| GND | GND | Chung GND với ESP32-CAM |
| TRIG | GPIO14 | ESP32 xuất 3,3V, HC-SR04 đọc được |
| ECHO | GPIO13 **qua chia áp** | ECHO ra 5V: nối ECHO → R1 1 kΩ → GPIO13, và GPIO13 → R2 2 kΩ → GND. Bản HC-SR04P/3,3V nối thẳng |

- Mặc định `HCSR04_TRIG_PIN=14`, `HCSR04_ECHO_PIN=13` trong `config.h`. Hai chân này rảnh khi không dùng microSD. Sketch từ chối biên dịch (`static_assert`) nếu TRIG/ECHO trùng chân camera, UART0 (GPIO1/3), PSRAM (GPIO16) hoặc flash (GPIO4); chân khởi động GPIO2/12/15 chỉ được cảnh báo trên Serial. Nút thử nếu cần đặt `TEST_BUTTON_PIN=15` (GPIO15 → nút → GND), không dùng GPIO14.
- Không đưa ECHO 5V trực tiếp vào GPIO13: sai điện áp có thể làm hỏng ESP32.
- Cảm biến số khác (IR obstacle, active LOW, GPIO13) vẫn dùng được: đặt `USE_HCSR04=false`, `USE_EXTERNAL_SENSOR=true`. Chỉ bật một loại.
- Reader NFC không thuộc sketch này và cần sơ đồ chân riêng.

### Hiệu chỉnh khoảng cách tại chỗ

1. Nạp sketch, mở Serial 115200. Khi khởi động sketch đo thử 5 lần và in `[SR04] Đo thử ...`. Nếu cả 5 lần là "không có echo" mà trước cảm biến có vật trong 4 m, kiểm tra VCC 5V, GND chung, TRIG/ECHO có bị đảo, và mạch chia áp.
2. Gắn cảm biến và camera ở vị trí thật, gõ `d` để xem khoảng cách liên tục (`CÓ KHAY`/`trống`). Đưa khay inox vào đúng vị trí chụp rồi lấy ra; inox nghiêng có thể phản xạ lệch hoặc mất echo.
3. Chỉnh `TRAY_ENTER_CM` (mặc định 25 cm theo tài liệu SSC) sao cho khay đặt đúng chỗ luôn nhỏ hơn mức này còn người đứng phía sau thì lớn hơn. `TRAY_LEAVE_CM` lớn hơn 1–3 cm để biên không rung. Dưới `SENSOR_MIN_CM` (2 cm) là vùng mù, bị coi như không hợp lệ.
4. Cảm biến đo mỗi 60 ms; nhiễu lẻ được lọc bằng trung vị 3 mẫu. Vì vậy từ lúc khay vào vùng đến lúc chụp khoảng 360–420 ms (300 ms giữ ổn định cộng độ trễ lọc), không phải đúng 300,0 ms. Khay chỉ lướt qua dưới 0,3 s sẽ **không** được chụp: đặt khay xuống bàn trước cảm biến.

## Hành vi và thử lại

- Cảm biến giữ khay 300ms mới kích hoạt; giữ nguyên khay không chụp lặp; vắng khay liên tục **hơn** 1.000ms mới mở khóa. Hai khay cách nhau dưới 1 giây chỉ được chụp một lần (ưu tiên không chụp trùng hơn là chụp thừa). Nút ngoài có debounce 50ms và giữ nút không chụp lặp. Lệnh `c` là yêu cầu chụp thủ công; khi dùng cảm biến, nó cũng khóa lượt tự động hiện tại. Lệnh `d` bật/tắt xem khoảng cách HC-SR04.
- Trong lúc tải ảnh lên (có thể vài giây) trạm không đọc cảm biến; khay đến lúc đó có thể bị bỏ lỡ.
- Bắt buộc PSRAM và JPEG 800×600; không tự hạ xuống VGA rồi gửi ảnh sai hợp đồng. Giới hạn firmware 150KB phù hợp cả hai endpoint.
- Header đầy đủ: `X-School-Id`, `X-Station-Id`, `X-Captured-At` UTC và `Idempotency-Key`. Không cần token truy cập API.
- Nếu HTTP lỗi hoặc mất phản hồi, giữ JPEG, thời điểm và khóa trong RAM và **tự gửi lại** chính sự kiện đó sau 3 s, rồi 6 s, 12 s... tối đa 30 s giữa hai lần (hoặc gõ `r` ngay). Sau 10 phút vẫn không gửi được thì bỏ ảnh đó để trạm không kẹt vĩnh viễn; ảnh bỏ là mất, không thay khóa hay chụp lại. Chặn chụp mới khi còn ảnh chờ. HTTP 409 cần kiểm tra cấu hình/body, 503 cần kiểm tra Redis. Không thay key chỉ để né lỗi. Biên nhận API có hạn 48h; không retry sau cửa sổ này khi chưa đối soát.
- Tắt nguồn/reset làm mất ảnh đang chờ trong RAM. Đây chưa phải hàng đợi lưu bền trên thiết bị. Wi-Fi/NTP/TLS là điều kiện của luồng thật; fallback ngoại tuyến của web vẫn là nguồn riêng và không tạo dữ liệu phần cứng.
- HTTP 200 của API Vision là xử lý thành công tại API; 202 của IoT chỉ là tiếp nhận. Xác minh ảnh, revision và kết quả trên dashboard trước khi kết luận toàn luồng hoạt động.

## Thử API với ảnh mới từ thiết bị

Các lệnh sau ghi vào luồng phần cứng. Chỉ dùng **ảnh khay mới thực sự từ thiết bị**, không có người/khuôn mặt. Ảnh gallery PTNK là ảnh tham chiếu, không đăng lên production rồi mô tả thành sự kiện ESP32.

```sh
# Tạo một lần cho một ảnh; giữ nguyên các biến và nội dung ảnh khi retry.
ECOTRAY_IMAGE='/absolute/path/to/new-device-tray.jpg'
ECOTRAY_CAPTURED_AT=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
ECOTRAY_EVENT_KEY="tray-$(uuidgen)"
curl --fail-with-body --max-time 30 \
  'https://ecotray-ai.vercel.app/api/ai/analyze-tray' \
  -H 'Content-Type: image/jpeg' \
  -H 'X-School-Id: ptnk' \
  -H 'X-Station-Id: PTNK-ESP32CAM-01' \
  -H "X-Captured-At: $ECOTRAY_CAPTURED_AT" \
  -H "Idempotency-Key: $ECOTRAY_EVENT_KEY" \
  --data-binary "@$ECOTRAY_IMAGE"
curl --fail-with-body \
  'https://ecotray-ai.vercel.app/api/ai/analyze-tray?schoolId=ptnk'
```

Kỳ vọng POST 200, GET cùng revision và ảnh mới. Để thử `/api/iot/tray-capture`, đổi URL POST và dùng khóa mới cho sự kiện mới; kỳ vọng 202, sau đó đọc `statusUrl`. Chỉ có worker callback mới chuyển từ QUEUED sang COMPLETED.

NFC là luồng riêng: [hợp đồng NFC](../../docs/IOT.md). Không gửi mỗi `{uid}` từ reader ESP32; dùng eventId, schoolId, stationId, cardUidHash, scannedAt và Idempotency-Key. Web NFC hỗ trợ thẻ NDEF tương thích, không bảo đảm đọc được thẻ PTNK; cần thử thẻ thật. Không đưa UID gốc hoặc tên học sinh vào log.

## Kiểm tra máy trạng thái trên máy tính

```sh
for t in tray_gate_test hcsr04_presence_test; do
  c++ -std=c++11 -Wall -Wextra -Werror firmware/tests/$t.cpp -o /tmp/ecotray-$t && /tmp/ecotray-$t && echo "$t OK"
done
```

Kiểm tra này dùng đúng lớp C++ của firmware, bao gồm nhiễu ngắn, giữ khay, ngắt khoảng vắng, mốc 1.000ms và tràn `millis()`. `hcsr04_presence_test` chạy chuỗi bộ lọc HC-SR04 → `TrayGate` với chu kỳ 60 ms: không echo ≠ 0 cm, gai lẻ không đổi trạng thái, trễ biên 25–27 cm, đúng một lần chụp mỗi lượt giữ khay, vẫy tay 200 ms không chụp. Không thay thế nghiệm thu điện, camera, TLS/NTP hoặc độ trễ thực tế. Đặt camera thẳng xuống khay và giới hạn vùng chụp trước khi dùng tại trường.

## Đối chiếu khi CameraWebServer chạy nhưng EcoTray lỗi 0x106

Nhóm đã báo mẫu Arduino CameraWebServer chạy được với `CAMERA_MODEL_AI_THINKER`. Sơ đồ chân EcoTray khớp AI Thinker; log cũ chỉ xác nhận lỗi nhận diện cảm biến, chưa xác định nguyên nhân. Không kết luận camera hỏng hoặc khẳng định thay độ phân giải sẽ sửa được lỗi probe.

Bản đối chiếu khởi tạo camera trước các chân nút/flash/cảm biến, dùng UXGA + PSRAM + quality 10 như mẫu đã chạy, rồi gọi sensor để chuyển về **SVGA 800×600, quality 12** trước khi chụp. Vẫn giữ khởi tạo zero cho các trường cấu hình không dùng. Đây là bước cô lập khác biệt, chưa được nghiệm thu trên mạch bị lỗi.

1. Giữ nguyên board, phiên bản esp32 core và các thiết lập Tools đã dùng cho mẫu chạy được. Khi cần log chi tiết, chọn **Tools → Core Debug Level → Verbose** rồi nạp lại sketch EcoTray.
2. Mở Serial 115200, reset và giữ toàn bộ log từ `[CAM] Arduino=...`. Log này chỉ in phiên bản, PSRAM, chân camera và PID khi đọc được; không in mật khẩu Wi-Fi/CA.
3. Nếu thấy `[CAM] Sẵn sàng`, gõ `t`. Kỳ vọng log có `[CAM] Ảnh thử JPEG 800x600`, số byte và `không gửi API`. Bước này không cần Wi-Fi, NTP hay ROOT_CA. Sau đó mới thử `c` để gửi ảnh.
4. Nếu vẫn lỗi, gửi toàn bộ log khởi động và phần `CAMERA_MODEL_AI_THINKER` trong `camera_pins.h` của mẫu chạy được. `board_config.h` chỉ chọn model; định nghĩa chân thực tế nằm trong `camera_pins.h`.

## Kết quả kiểm tra mã ngày 30/10/2026

- Bản đối chiếu có log và lệnh `t` biên dịch thành công với `esp32:esp32@3.3.2`, FQBN `esp32:esp32:esp32cam:DebugLevel=verbose`: 1.196.567 byte chương trình, 58.972 byte biến toàn cục. Chưa xác nhận hết lỗi 0x106 trên mạch của nhóm.
- Bản đầu (trước bổ sung log và lệnh `t`) biên dịch thành công với `esp32:esp32@3.3.2`, FQBN `esp32:esp32:esp32cam`: 1.143.383 byte chương trình, 58.972 byte biến toàn cục. Cấu hình kiểm tra dùng thông tin giữ chỗ, không có mật khẩu/chứng thư thật và không nạp thiết bị.
- Kiểm thử C++ máy trạng thái, 69 test Node, model smoke, typecheck và build `dist/` đều qua. Model smoke chỉ kiểm tra chạy được, không đo độ chính xác.
- Lần kiểm tra production ban đầu (chưa chạy lại khi bổ sung log camera): API Vision trả 200 nhưng chưa có ảnh/kết quả; IoT status trả 200, `online:false`, chưa có capture. Chưa POST ảnh vào production trong lần kiểm tra này; chưa xác nhận commit đang deploy, nạp ESP32, chụp ảnh thật hay NFC vật lý.

### Bổ sung HC-SR04 (03/11/2026)

- Đã chạy: hai bài kiểm thử C++ trên máy tính ở trên (đều qua), và kiểm tra cú pháp `esp32_cam_gate.ino` với `config.h` thật cùng `config.example.h` bằng thư viện giả lập Arduino/ESP32 (không có lỗi; các `static_assert` chặn đúng TRIG=GPIO16, nút trùng TRIG và bật hai cảm biến cùng lúc).
- **Chưa** biên dịch bằng `arduino-cli`/Arduino IDE với core `esp32:esp32` (máy chưa cài `arduino-cli`), chưa nạp board, chưa đo khoảng cách thật, chưa chụp/gửi ảnh từ mạch có HC-SR04. Hãy biên dịch và làm các bước hiệu chỉnh ở trên trước khi tin vào hành vi trên thiết bị.
- Số liệu kích thước chương trình ở mục trên là của bản trước khi thêm HC-SR04.

Sau khi tạo `config.h`, có thể biên dịch bằng CLI đã cài core tương ứng:

```sh
arduino-cli compile --fqbn esp32:esp32:esp32cam firmware/esp32_cam_gate
```
