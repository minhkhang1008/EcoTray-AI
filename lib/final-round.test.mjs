import test from "node:test";
import assert from "node:assert/strict";
import {
  initialStage,
  stageReducer,
  trimOutliers,
  operationalDecision,
  cloudEstimate,
  calibrateWeights,
  estimateGrams,
} from "./final-round.mjs";

test("NFC accepts two distinct cards but duplicate/unknown never increases served", () => {
  let s = initialStage();
  s = stageReducer(s, { type: "scan", scenario: "normal" });
  assert.equal(s.served, 1016);
  s = stageReducer(s, { type: "scan", scenario: "normal" });
  assert.equal(s.served, 1016);
  assert.equal(s.nfc.status, "ALREADY_REDEEMED");
  s = stageReducer(s, { type: "scan", scenario: "unknown" });
  assert.equal(s.served, 1016);
  s = stageReducer(s, { type: "scan", scenario: "allergy" });
  assert.equal(s.savedTickets, 2);
});
test("approval requires completed analysis and is idempotent, reset removes stage history", () => {
  let s = stageReducer(initialStage(), { type: "approve" });
  assert.equal(s.history.length, 0);
  s = stageReducer(s, { type: "scan", scenario: "normal" });
  s = stageReducer(s, { type: "capture" });
  s = stageReducer(s, { type: "analyze" });
  s = stageReducer(s, { type: "approve", at: "2026-10-22T01:00:00Z" });
  assert.equal(s.history.length, 1);
  assert.equal(stageReducer(s, { type: "approve" }).history.length, 1);
  assert.equal(stageReducer(s, { type: "reset" }).history.length, 0);
});
test("two layers remove flagged allergy and statistical extremes, never infer medical cause from IQR", () => {
  const rows = Array.from({ length: 20 }, (_, i) => ({
    id: String(i),
    rice: 5,
    vegetables: 20 + (i % 3),
    main: 5,
  }));
  rows.push({
    id: "allergy",
    rice: 5,
    vegetables: 20,
    main: 100,
    allergyFlags: ["seafood"],
  });
  rows.push({ id: "statistical", rice: 100, vegetables: 100, main: 100 });
  const result = trimOutliers(rows);
  assert.equal(result.rows.length, 20);
  assert.equal(result.flagged, 1);
  assert.equal(result.statistical, 1);
  assert.equal(
    trimOutliers([{ rice: 100, vegetables: 100, main: 100 }]).rows.length,
    1,
  );
});
test("decision preserves quantity, portion, outlier, optimal and minimum sample outcomes", () => {
  assert.equal(
    operationalDecision({
      registered: 100,
      served: 70,
      values: { rice: 5, vegetables: 50, main: 5 },
      sampleCount: 20,
    }).kind,
    "quantity",
  );
  assert.equal(
    operationalDecision({
      registered: 100,
      served: 99,
      values: { rice: 5, vegetables: 50, main: 5 },
      sampleCount: 20,
    }).kind,
    "portion",
  );
  assert.equal(
    operationalDecision({
      registered: 100,
      served: 99,
      values: { rice: 5, vegetables: 5, main: 5 },
      sampleCount: 20,
    }).kind,
    "keep",
  );
  assert.equal(
    operationalDecision({ isOutlier: true, sampleCount: 20 }).kind,
    "outlier",
  );
  assert.equal(operationalDecision({ sampleCount: 1 }).kind, "insufficient");
});
test("cloud scenario is transparent and scales from canonical 38,500 VND anchor", () => {
  assert.equal(cloudEstimate(1017).total, 38500);
  assert.equal(cloudEstimate(2034).total, 77000);
  assert.equal(cloudEstimate(1017).images, 20340);
  assert.throws(() => cloudEstimate(-1));
});
test("calibration fits weighed samples; no grams without a measured reference", () => {
  assert.equal(estimateGrams(50, null), null);
  assert.equal(
    calibrateWeights([
      { percent: 50, grams: 100 },
      { percent: 100, grams: 200 },
    ]),
    200,
  );
  assert.equal(estimateGrams(25, 200), 50);
  assert.throws(() => calibrateWeights([{ percent: 0, grams: 100 }]));
});

test("physical demo cards and keyboard cards represent the same two profiles", () => {
  let s = stageReducer(initialStage(), {
    type: "scan",
    scenario: "normal",
    cardHash: "f".repeat(64),
  });
  s = stageReducer(s, { type: "scan", scenario: "normal" });
  assert.equal(s.served, 1016);
  assert.equal(s.nfc.status, "ALREADY_REDEEMED");
});
