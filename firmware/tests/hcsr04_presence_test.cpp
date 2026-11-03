#include "../esp32_cam_gate/hcsr04_presence.h"
#include "../esp32_cam_gate/tray_gate.h"
#include <cassert>
#include <cmath>
#include <cstdint>
#include <vector>

// Same numbers as config.example.h.
static const float MIN_CM = 2.0f, ENTER_CM = 25.0f, LEAVE_CM = 27.0f;
static const uint32_t PERIOD_MS = 60; // SENSOR_PERIOD_MS in the sketch

// Runs the exact filter -> gate chain the sketch runs, one reading per 60 ms.
struct Rig {
  PresenceFilter filter{MIN_CM, ENTER_CM, LEAVE_CM};
  TrayGate gate;
  uint32_t now = 0;
  int captures = 0;
  uint32_t lastCaptureAt = 0;
  void feed(float cm) {
    now += PERIOD_MS;
    if (gate.update(filter.update(cm), now)) { captures++; lastCaptureAt = now; }
  }
  void hold(float cm, uint32_t ms) { for (uint32_t t = 0; t < ms; t += PERIOD_MS) feed(cm); }
};

int main() {
  // Echo conversion: 0 is "no echo", not 0 cm. 1160 us round trip = 20 cm.
  assert(echoMicrosToCm(0) < 0);
  assert(std::fabs(echoMicrosToCm(1160) - 20.0f) < 0.01f);

  {
    // Starts "far": a single near reading cannot create presence; two can.
    PresenceFilter f(MIN_CM, ENTER_CM, LEAVE_CM);
    assert(!f.update(10));
    assert(f.update(10));
    assert(f.isPresent());
  }
  {
    // Isolated far spikes / no-echo dropouts (>= 2 good readings apart) never release a held tray.
    PresenceFilter f(MIN_CM, ENTER_CM, LEAVE_CM);
    f.update(10); f.update(10); f.update(10);
    const float stream[] = {200, 10, 10, -1, 10, 10, 150, 10, 10, -1, 10, 10};
    for (float cm : stream) assert(f.update(cm));
    // Two bad readings inside one 3-sample window do release it.
    assert(f.update(-1));      // [-1,10,10] -> still present
    assert(!f.update(-1));     // [-1,-1,10] -> absent
  }
  {
    // A lone near spike in an empty scene does not create presence.
    PresenceFilter f(MIN_CM, ENTER_CM, LEAVE_CM);
    for (int i = 0; i < 3; i++) f.update(-1);
    assert(!f.update(10));
    assert(!f.update(-1));
    assert(!f.update(-1));
  }
  {
    // Blind-zone readings (< MIN_CM) are invalid, never "tray touching the sensor".
    PresenceFilter f(MIN_CM, ENTER_CM, LEAVE_CM);
    for (int i = 0; i < 5; i++) assert(!f.update(0.5f));
  }
  {
    // Hysteresis band 25..27 cm: absent stays absent at 26, present stays present at 26.
    PresenceFilter f(MIN_CM, ENTER_CM, LEAVE_CM);
    for (int i = 0; i < 4; i++) assert(!f.update(26));
    for (int i = 0; i < 4; i++) f.update(24);
    assert(f.isPresent());
    for (int i = 0; i < 4; i++) assert(f.update(26));
    for (int i = 0; i < 4; i++) f.update(28);
    assert(!f.isPresent());
  }

  {
    // One tray held 3 s => exactly one capture, 300-500 ms after entry.
    Rig r;
    r.hold(100, 600);
    const uint32_t entry = r.now;
    r.hold(15, 3000);
    assert(r.captures == 1);
    assert(r.lastCaptureAt - entry >= 300 && r.lastCaptureAt - entry <= 500);
    r.hold(15, 10000); // staying put never re-captures
    assert(r.captures == 1);
  }
  {
    // A 200 ms wave of the hand is not a tray.
    Rig r;
    r.hold(100, 600);
    r.hold(15, 200);
    r.hold(100, 3000);
    assert(r.captures == 0);
  }
  {
    // Noisy hold (dropout every 5th reading, plus a far spike) still gives one capture.
    Rig r;
    r.hold(100, 600);
    for (int i = 0; i < 60; i++) r.feed(i % 5 == 4 ? -1.0f : (i == 20 ? 150.0f : 14.0f));
    assert(r.captures == 1);
  }
  {
    // Two trays separated by > 1.0 s of empty table => two captures.
    Rig r;
    r.hold(100, 600);
    r.hold(15, 1500);
    r.hold(100, 1500);
    r.hold(15, 1500);
    assert(r.captures == 2);
  }
  {
    // Gap shorter than 1.0 s does not re-arm: the contract prefers a missed tray to a duplicate.
    Rig r;
    r.hold(100, 600);
    r.hold(15, 1500);
    r.hold(100, 600);
    r.hold(15, 1500);
    assert(r.captures == 1);
  }
  {
    // No echo for a long time (sensor unplugged / nothing in 4 m) never captures.
    Rig r;
    for (int i = 0; i < 500; i++) r.feed(-1);
    assert(r.captures == 0);
  }
}
