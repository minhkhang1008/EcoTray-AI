#include "../esp32_cam_gate/tray_gate.h"
#include <cassert>
#include <cstdint>
int main() {
  TrayGate gate;
  assert(!gate.update(true, 0));
  assert(!gate.update(false, 299)); // brief obstruction never captures
  assert(!gate.update(true, 400));
  assert(!gate.update(true, 699));
  assert(gate.update(true, 700));
  assert(!gate.update(true, 10000)); // one capture while held
  assert(!gate.update(false, 11000));
  assert(!gate.update(false, 12000)); // exactly 1000ms still locked
  assert(!gate.update(true, 12001)); // interrupted absence resets release timer
  assert(!gate.update(false, 13000));
  assert(!gate.update(false, 14001)); // rearmed, no capture on release
  assert(!gate.update(true, 15000));
  assert(gate.update(true, 15300));
  TrayGate manual;
  manual.lock(); // serial/button while sensor is enabled also locks the gate
  assert(!manual.update(true, 0));
  assert(!manual.update(false, 1));
  assert(!manual.update(false, 1002));
  assert(!manual.update(true, 1100));
  assert(manual.update(true, 1400));
  TrayGate rollover;
  assert(!rollover.update(true, UINT32_MAX - 100));
  assert(!rollover.update(true, 198));
  assert(rollover.update(true, 199)); // millis() overflow
}
