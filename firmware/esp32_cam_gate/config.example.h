#pragma once
// Copy to config.h (gitignored). Never commit Wi-Fi credentials.
constexpr char WIFI_SSID[] = "YOUR_WIFI";
constexpr char WIFI_PASSWORD[] = "YOUR_PASSWORD";
constexpr char CAPTURE_API[] = "https://ecotray-ai.vercel.app/api/ai/analyze-tray";
constexpr char SCHOOL_ID[] = "ptnk";
constexpr char STATION_ID[] = "PTNK-ESP32CAM-01";
// PEM root CA for the endpoint's verified certificate chain. See README.md.
constexpr char ROOT_CA[] = R"PEM()PEM";
constexpr bool USE_EXTERNAL_SENSOR = false; // active LOW, GPIO13, 3.3V logic
constexpr int TEST_BUTTON_PIN = -1; // optional GPIO14 -> button -> GND; no microSD
constexpr bool USE_FLASH = false; // enable only after checking glare on steel trays
// Optional: URL-encoded Vietnamese menu name and YYYY-MM-DD menu date.
// Update both daily; leave both empty if the menu is unknown.
constexpr char MENU_NAME_ENCODED[] = "";
constexpr char MENU_DATE[] = "";
