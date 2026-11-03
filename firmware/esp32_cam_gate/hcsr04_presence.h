#pragma once
#include <stdint.h>

// Pure logic for an HC-SR04 tray detector, kept free of Arduino calls so the
// same code runs in firmware/tests on a laptop. It only decides "tray present?";
// the 300 ms hold and >1,000 ms release timers stay in TrayGate (tray_gate.h).

// Round-trip echo time (microseconds) to centimetres, ~343 m/s at 20 °C.
// pulseIn() returns 0 on timeout: that means "no echo", never "0 cm".
// Returns a negative value for "no valid reading".
inline float echoMicrosToCm(uint32_t echoMicros) {
  return echoMicros == 0 ? -1.0f : float(echoMicros) / 58.0f;
}

// Median-of-3 plus enter/leave hysteresis.
//  - A lone spike or dropout (common on angled stainless trays) cannot flip the
//    state, because TrayGate would otherwise restart its 300 ms timer.
//  - A reading below minCm (HC-SR04 blind zone) or negative (no echo) counts as
//    "far", so a timeout can never look like a tray touching the sensor.
//  - Start-up state is "far": two near readings are needed before presence.
class PresenceFilter {
  static constexpr float kFar() { return 1.0e6f; }
  float window[3];
  uint8_t next = 0;
  bool present = false;
  float minCm, enterCm, leaveCm;

  static float median3(float a, float b, float c) {
    if (a > b) { const float t = a; a = b; b = t; }
    if (b > c) { b = c; }
    return a > b ? a : b;
  }

public:
  // enterCm: tray counts as present at or below this distance.
  // leaveCm: once present, it must exceed this distance to count as absent
  //          (leaveCm >= enterCm gives the hysteresis band).
  PresenceFilter(float minCm, float enterCm, float leaveCm)
    : window{kFar(), kFar(), kFar()}, minCm(minCm), enterCm(enterCm), leaveCm(leaveCm) {}

  // Feed one reading (cm, or negative when there was no echo).
  // Returns the filtered presence.
  bool update(float cm) {
    window[next] = (cm < minCm) ? kFar() : cm;
    next = uint8_t((next + 1) % 3);
    const float m = median3(window[0], window[1], window[2]);
    present = present ? (m <= leaveCm) : (m <= enterCm);
    return present;
  }

  bool isPresent() const { return present; }
};
