import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveStationMenu,
  PTNK_STATION_MENU,
  captureMenuDate,
} from "./vision-menu.mjs";
test("binds explicit, active, recent NFC and default menus without borrowing another date or school", () => {
  const base = { schoolId: "ptnk", capturedAt: "2026-10-30T04:00:00Z" };
  assert.deepEqual(resolveStationMenu(base), {
    comboName: PTNK_STATION_MENU,
    menuDate: "2026-10-30",
  });
  const latestNfc = {
    recordedAt: "2026-10-30T03:50:00Z",
    status: "VALID",
    menu: { name: "NFC" },
  };
  assert.equal(resolveStationMenu({ ...base, latestNfc }).comboName, "NFC");
  assert.equal(
    resolveStationMenu({
      ...base,
      latestNfc,
      activeMenu: { combo: "Selected", date: "2026-10-30" },
    }).comboName,
    "Selected",
  );
  assert.equal(
    resolveStationMenu({ ...base, latestNfc, comboName: "Header" }).comboName,
    "Header",
  );
  assert.equal(
    resolveStationMenu({
      ...base,
      latestNfc: { ...latestNfc, recordedAt: "2026-10-29T03:50:00Z" },
    }).comboName,
    PTNK_STATION_MENU,
  );
  assert.notEqual(
    resolveStationMenu({ ...base, schoolId: "other" }).comboName,
    PTNK_STATION_MENU,
  );
  assert.equal(captureMenuDate("2026-10-29T23:30:00Z"), "2026-10-30");
});
