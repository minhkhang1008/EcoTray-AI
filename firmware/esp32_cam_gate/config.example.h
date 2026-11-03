#pragma once
// Copy to config.h (gitignored). Never commit Wi-Fi credentials.
constexpr char WIFI_SSID[] = "YOUR_WIFI";
constexpr char WIFI_PASSWORD[] = "YOUR_PASSWORD";
constexpr char CAPTURE_API[] = "https://ecotray-ai.vercel.app/api/ai/analyze-tray";
constexpr char SCHOOL_ID[] = "ptnk";
constexpr char STATION_ID[] = "PTNK-ESP32CAM-01";
// PEM root CA for the endpoint's verified certificate chain. See README.md.
constexpr char ROOT_CA[] = R"PEM()PEM";
// --- Cảm biến phát hiện khay (chọn tối đa MỘT) ---
// HC-SR04 siêu âm (phần cứng của nhóm): TRIG=GPIO14, ECHO=GPIO13.
// ECHO của HC-SR04 thường là 5V: BẮT BUỘC chia áp (vd 1k nối ECHO->GPIO13, 2k GPIO13->GND)
// trước khi vào ESP32. HC-SR04P / bản 3,3V thì nối thẳng. VCC cấp từ chân 5V của board.
constexpr bool USE_HCSR04 = true;
constexpr int HCSR04_TRIG_PIN = 14;
constexpr int HCSR04_ECHO_PIN = 13;
constexpr float TRAY_ENTER_CM = 25.0f; // khay ở trong khoảng này = có khay (SSC: dưới 25 cm)
constexpr float TRAY_LEAVE_CM = 27.0f; // phải xa hơn mức này mới tính là rời đi (chống nhiễu biên)
constexpr float SENSOR_MIN_CM = 2.0f;  // dưới mức này là vùng mù HC-SR04, coi như không hợp lệ
// Cảm biến số khác (IR obstacle...): active LOW, GPIO13, logic 3,3V. Không bật cùng HC-SR04.
constexpr bool USE_EXTERNAL_SENSOR = false;
// Nút thử tùy chọn: GPIO15 -> nút -> GND (không dùng cùng microSD). -1 = tắt.
constexpr int TEST_BUTTON_PIN = -1;
constexpr bool USE_FLASH = false; // enable only after checking glare on steel trays
// Optional: URL-encoded Vietnamese menu name and YYYY-MM-DD menu date.
// Update both daily; leave both empty if the menu is unknown.
constexpr char MENU_NAME_ENCODED[] = "";
constexpr char MENU_DATE[] = "";
