#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <esp_system.h>
#include <esp_log.h>
#include <esp_arduino_version.h>
#include <time.h>
#include "config.h"
#include "tray_gate.h"

constexpr int FLASH_PIN = 4;
constexpr int SENSOR_PIN = 13;
TrayGate trayGate;
bool cameraReady = false;
camera_fb_t* pending = nullptr;
String pendingKey, pendingAt;
bool buttonDown = false, buttonLatched = false;
uint32_t buttonSince = 0;

bool initCamera() {
  camera_config_t config = {};
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = 5;  config.pin_d1 = 18;
  config.pin_d2 = 19; config.pin_d3 = 21;
  config.pin_d4 = 36; config.pin_d5 = 39;
  config.pin_d6 = 34; config.pin_d7 = 35;
  config.pin_xclk = 0; // IO0 is the camera clock, never a capture button.
  config.pin_pclk = 22;
  config.pin_vsync = 25;
  config.pin_href = 23;
  config.pin_sccb_sda = 26;
  config.pin_sccb_scl = 27;
  config.pin_pwdn = 32;
  config.pin_reset = -1;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  // Match CameraWebServer's PSRAM initialization, then select SVGA below.
  // This comparison baseline is not a confirmed fix for sensor probe failures.
  config.frame_size = FRAMESIZE_UXGA;
  config.jpeg_quality = 10;
  config.fb_count = 2;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.grab_mode = CAMERA_GRAB_LATEST;
  Serial.printf("[CAM] Arduino=%s; SDK=%s; chip=%s; PSRAM=%u; PSRAM trống=%u\n",
    ESP_ARDUINO_VERSION_STR, ESP.getSdkVersion(), ESP.getChipModel(),
    (unsigned)ESP.getPsramSize(), (unsigned)ESP.getFreePsram());
  Serial.printf("[CAM] AI Thinker: XCLK=%d; SDA=%d; SCL=%d; PWDN=%d; RESET=%d\n",
    config.pin_xclk, config.pin_sccb_sda, config.pin_sccb_scl,
    config.pin_pwdn, config.pin_reset);
  if (!psramFound()) {
    Serial.println("[LỖI] Cần PSRAM để chụp 800×600. Kiểm tra cấu hình bo mạch.");
    return false;
  }
  const esp_err_t result = esp_camera_init(&config);
  if (result != ESP_OK) {
    Serial.printf("[LỖI] Khởi tạo camera: 0x%x (%s)\n", result, esp_err_to_name(result));
    Serial.println("[CAM] Chưa nhận diện được camera; chưa bắt đầu Wi-Fi/HTTPS.");
    return false;
  }
  sensor_t* sensor = esp_camera_sensor_get();
  if (!sensor || sensor->set_framesize(sensor, FRAMESIZE_SVGA) != 0 ||
      sensor->set_quality(sensor, 12) != 0) {
    Serial.println("[LỖI] Không đặt được JPEG 800×600, chất lượng 12.");
    esp_camera_deinit();
    return false;
  }
  Serial.printf("[CAM] Sẵn sàng; PID=0x%04x; JPEG 800×600. Gõ t để thử ảnh tại chỗ.\n",
    sensor->id.PID);
  return true;
}

// Camera-only diagnostic: no Wi-Fi, TLS, API event, or hardware record.
void testCamera() {
  if (!cameraReady) { Serial.println("[LỖI] Camera chưa sẵn sàng."); return; }
  if (pending) { Serial.println("[CHỜ] Gửi lại ảnh đang chờ bằng r trước khi thử camera."); return; }
  camera_fb_t* frame = esp_camera_fb_get();
  if (!frame) { Serial.println("[LỖI] Không lấy được ảnh thử."); return; }
  if (frame->format == PIXFORMAT_JPEG && frame->width == 800 && frame->height == 600)
    Serial.printf("[CAM] Ảnh thử JPEG %ux%u; %u byte; không gửi API.\n",
      (unsigned)frame->width, (unsigned)frame->height, (unsigned)frame->len);
  else
    Serial.println("[LỖI] Ảnh thử không đúng JPEG 800×600.");
  esp_camera_fb_return(frame);
}

bool utcNow(String& result) {
  time_t now = time(nullptr);
  if (now < 1767225600) return false; // 2026-01-01; wait for SNTP, never fake UTC.
  struct tm utc;
  gmtime_r(&now, &utc);
  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%S.000Z", &utc);
  result = buffer;
  return true;
}

void uploadPending() {
  if (!pending) { Serial.println("[THÔNG TIN] Không có ảnh chờ gửi."); return; }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[LỖI] Mất Wi-Fi; giữ ảnh trong RAM. Gõ r để thử lại.");
    return;
  }
  if (strlen(ROOT_CA) == 0 || strncmp(CAPTURE_API, "https://", 8) != 0) {
    Serial.println("[LỖI] Cần URL HTTPS và ROOT_CA hợp lệ trong config.h.");
    return;
  }
  WiFiClientSecure client;
  client.setCACert(ROOT_CA);
  client.setHandshakeTimeout(10);
  HTTPClient http;
  http.setConnectTimeout(10000);
  http.setTimeout(15000);
  if (!http.begin(client, CAPTURE_API)) {
    Serial.println("[LỖI] Không mở được kết nối HTTPS. Giữ ảnh; gõ r để thử lại.");
    return;
  }
  http.addHeader("Content-Type", "image/jpeg");
  http.addHeader("X-School-Id", SCHOOL_ID);
  http.addHeader("X-Station-Id", STATION_ID);
  http.addHeader("X-Captured-At", pendingAt);
  http.addHeader("Idempotency-Key", pendingKey);
  if (strlen(MENU_NAME_ENCODED)) http.addHeader("X-Menu-Name", MENU_NAME_ENCODED);
  if (strlen(MENU_DATE)) http.addHeader("X-Menu-Date", MENU_DATE);
  int code = http.POST(pending->buf, pending->len);
  // A lost response must retry the SAME JPEG, timestamp and key, never recapture.
  if (code == 200 || code == 202) {
    Serial.printf("[OK] HTTP %d; %s; key=%s\n", code,
      code == 202 ? "đã nhận, chờ worker" : "Vision đã xử lý", pendingKey.c_str());
    esp_camera_fb_return(pending);
    pending = nullptr;
  } else {
    Serial.printf("[LỖI] HTTP %d. Giữ nguyên ảnh/khóa; gõ r để thử lại.\n", code);
    if (code > 0) Serial.println(http.getString());
  }
  http.end();
}

void captureTray() {
  if (pending) {
    Serial.println("[CHỜ] Còn ảnh chưa xác nhận; gõ r để gửi lại trước khi chụp tiếp.");
    return;
  }
  if (!cameraReady) { Serial.println("[LỖI] Camera chưa sẵn sàng."); return; }
  if (WiFi.status() != WL_CONNECTED || !utcNow(pendingAt)) {
    Serial.println("[CHỜ] Cần Wi-Fi và đồng bộ giờ NTP trước khi chụp.");
    return;
  }
  if (USE_FLASH) { digitalWrite(FLASH_PIN, HIGH); delay(150); }
  // Discard the buffered image before acquiring the current frame.
  camera_fb_t* stale = esp_camera_fb_get();
  if (stale) esp_camera_fb_return(stale);
  pending = esp_camera_fb_get();
  digitalWrite(FLASH_PIN, LOW);
  if (!pending) { Serial.println("[LỖI] Không lấy được JPEG."); return; }
  if (pending->width != 800 || pending->height != 600 || pending->len > 150000 ||
      pending->format != PIXFORMAT_JPEG) {
    Serial.println("[LỖI] Cần JPEG 800×600 ≤150KB; kiểm tra camera/ánh sáng.");
    esp_camera_fb_return(pending);
    pending = nullptr;
    return;
  }
  char key[80];
  snprintf(key, sizeof(key), "tray-%012llx-%08lx-%08lx-%08lx",
    (unsigned long long)ESP.getEfuseMac(), (unsigned long)esp_random(),
    (unsigned long)esp_random(), (unsigned long)esp_random());
  pendingKey = key;
  Serial.printf("[CHỤP] %u byte; %s\n", (unsigned)pending->len, pendingAt.c_str());
  uploadPending();
}

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  esp_log_level_set("camera", ESP_LOG_DEBUG);
  esp_log_level_set("sccb", ESP_LOG_DEBUG);
  esp_log_level_set("sccb-ng", ESP_LOG_DEBUG);
  // Keep the camera first, as in the working CameraWebServer example.
  cameraReady = initCamera();
  pinMode(FLASH_PIN, OUTPUT);
  digitalWrite(FLASH_PIN, LOW);
  if (USE_EXTERNAL_SENSOR) pinMode(SENSOR_PIN, INPUT_PULLUP);
  if (TEST_BUTTON_PIN >= 0) pinMode(TEST_BUTTON_PIN, INPUT_PULLUP);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  Serial.println("EcoTray: t=thử camera tại chỗ; c=chụp và gửi; r=gửi lại. Chờ Wi-Fi/NTP để gửi ảnh.");
}

void loop() {
  bool trigger = false;
  while (Serial.available()) {
    char command = Serial.read();
    if (command == 't' || command == 'T') testCamera();
    if (command == 'c' || command == 'C') trigger = true;
    if (command == 'r' || command == 'R') uploadPending();
  }
  // Debounce and latch the optional button; holding it never repeats captures.
  if (TEST_BUTTON_PIN >= 0) {
    bool down = digitalRead(TEST_BUTTON_PIN) == LOW;
    if (down != buttonDown) { buttonDown = down; buttonSince = millis(); }
    if (!down && uint32_t(millis() - buttonSince) >= 50) buttonLatched = false;
    if (down && !buttonLatched && uint32_t(millis() - buttonSince) >= 50) {
      buttonLatched = true;
      trigger = true;
    }
  }
  if (USE_EXTERNAL_SENSOR) {
    if (trigger) trayGate.lock();
    trigger = trayGate.update(digitalRead(SENSOR_PIN) == LOW, millis()) || trigger;
  }
  if (trigger) captureTray();
  delay(10);
}
