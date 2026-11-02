import test from "node:test";
import assert from "node:assert/strict";
import { COMPONENTS, STATION_GATE, gateStatus, parseManifest, scoreRecords } from "./station-evaluation.mjs";

const served = { rice: 200, main: 110, veg: 90, soup: 150 };
function manifest(extraTray = {}) {
  return {
    schemaVersion: 1,
    sessions: [{ id: "s1", date: "2026-11-05", lighting: "daylight", emptyFrame: "frames/s1-empty.jpg" }],
    trays: [
      {
        id: "t001",
        sessionId: "s1",
        frame: "frames/t001.jpg",
        servedGrams: served,
        leftoverGrams: { rice: 100, main: 11, veg: 90, soup: 0 },
        ...extraTray,
      },
    ],
  };
}
test("leftover percent comes from weighed grams, not from image area", () => {
  const { trays } = parseManifest(manifest());
  assert.deepEqual(trays[0].truth, [50, 10, 100, 0]);
  assert.equal(trays[0].session.lighting, "daylight");
});
test("manifest refuses student identifiers and unsafe paths", () => {
  assert.throws(() => parseManifest(manifest({ studentName: "x" })), /không lưu định danh/);
  assert.throws(() => parseManifest(manifest({ cardUid: "04A1" })), /không lưu định danh/);
  assert.throws(() => parseManifest(manifest({ frame: "../secret.jpg" })), /không hợp lệ/);
  assert.throws(() => parseManifest(manifest({ frame: "/etc/x.jpg" })), /không hợp lệ/);
  assert.throws(() => parseManifest(manifest({ sessionId: "nope" })), /không tồn tại/);
  assert.throws(() => parseManifest(manifest({ leftoverGrams: { ...served, rice: 500 } })), /lớn hơn phần múc/);
  assert.throws(() => parseManifest({ ...manifest(), schemaVersion: 2 }), /schemaVersion/);
});
test("duplicate tray ids are rejected", () => {
  const m = manifest();
  m.trays.push({ ...m.trays[0] });
  assert.throws(() => parseManifest(m), /duy nhất/);
});
function records(n, lights) {
  return Array.from({ length: n }, (_, i) => {
    const truth = COMPONENTS.map((_, k) => (i * 7 + k * 13) % 101);
    return {
      id: "t" + i,
      lighting: lights[i % lights.length],
      truth,
      measured: truth.map((v) => Math.min(100, v + 8)),
      measuredWithReference: truth.map((v) => Math.min(100, v + 4)),
    };
  });
}
test("scores per component and per lighting condition against a leave-one-out mean baseline", () => {
  const r = scoreRecords(records(12, ["daylight", "dim"]));
  assert.equal(r.trays, 12);
  assert.ok(r.areaReader.overall > 0 && r.areaReader.overall <= 8);
  assert.ok(r.meanLabelBaseline.overall > r.areaReader.overall);
  assert.deepEqual(Object.keys(r.byLighting), ["daylight", "dim"]);
  assert.ok(r.withEmptyReference.emptyRef.overall < r.withEmptyReference.areaReaderSameTrays.overall);
});
test("no accuracy figure is quotable below the tray and lighting gate", () => {
  const small = scoreRecords(records(12, ["daylight", "dim"]));
  assert.equal(small.gate.quotable, false);
  assert.equal(small.gate.meetsTarget, false);
  assert.match(small.gate.reasons.join(" "), /12\/100 khay/);
  const big = scoreRecords(records(STATION_GATE.minTrays, ["daylight", "dim", "fluorescent"]));
  assert.equal(big.gate.quotable, true);
  assert.equal(big.gate.meetsTarget, true, "8 pp MAE is under the 10 pp target");
  const oneLight = scoreRecords(records(STATION_GATE.minTrays, ["daylight"]));
  assert.equal(oneLight.gate.quotable, false);
  assert.equal(gateStatus({ trays: 100, lightingConditions: ["a", "b", "c"], areaReader: { overall: 14 } }).meetsTarget, false);
});
test("scoring needs data", () => assert.throws(() => scoreRecords([]), /Chưa có/));
