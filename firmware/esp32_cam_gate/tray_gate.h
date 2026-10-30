#pragma once
#include <stdint.h>

// Unsigned subtraction keeps the timers correct across millis() rollover.
class TrayGate {
  enum State { Idle, Entering, Locked, Leaving };
  State state = Idle;
  uint32_t since = 0;
public:
  void lock() { state = Locked; }
  bool update(bool present, uint32_t now) {
    switch (state) {
      case Idle:
        if (present) { state = Entering; since = now; }
        break;
      case Entering:
        if (!present) state = Idle;
        else if (uint32_t(now - since) >= 300) { lock(); return true; }
        break;
      case Locked:
        if (!present) { state = Leaving; since = now; }
        break;
      case Leaving:
        if (present) state = Locked;
        else if (uint32_t(now - since) > 1000) state = Idle;
        break;
    }
    return false;
  }
};
