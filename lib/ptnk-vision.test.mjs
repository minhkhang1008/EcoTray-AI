import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateTrayWithTrainedModel,
  extractFeatures,
  updateWeights,
  PTNK_TRAYS_CATALOG,
  RIDGE_WEIGHTS,
  MODEL,
  predictPercent,
} from "./ptnk-vision.mjs";
test("every labelled photograph has a normalized feature row; labels are visual estimates, not predictions", () => {
  const ids = Object.keys(PTNK_TRAYS_CATALOG);
  assert.equal(ids.length, MODEL.realTraysCount);
  assert.ok(ids.length >= 18);
  for (const id of ids) assert.ok(MODEL.features[id], id);
  assert.ok(
    MODEL.validation.overallMAE < MODEL.validation.baselineMeanLabelMAE.overall,
    "model must beat the predict-the-mean baseline",
  );
  const r = evaluateTrayWithTrainedModel({
    sampleId: "IMG_20261028_115444.jpg",
  });
  assert.equal(r.predictionSource, "ridge-pixels");
  assert.notEqual(r.components.rice.wastePct, 85);
});
test("requires pixels or known sample, never fabricates percentages", () => {
  assert.throws(() => evaluateTrayWithTrainedModel({}), /đặc trưng/);
  assert.throws(() =>
    evaluateTrayWithTrainedModel({ sampleId: "../../etc/passwd" }),
  );
  assert.throws(() =>
    evaluateTrayWithTrainedModel({ overridePcts: [0, 0, 0, 0] }),
  );
});
test("anchor photos report their reference label, labelled as such", () => {
  for (const [id, pct] of [
    ["IMG_20261028_115429.jpg", 0],
    ["IMG_20261029_112146.jpg", 100],
  ]) {
    const r = evaluateTrayWithTrainedModel({ sampleId: id });
    assert.equal(r.predictionSource, "anchor-label");
    for (const c of Object.values(r.components)) assert.equal(c.wastePct, pct);
  }
});
test("raw Ridge output keeps the full tray above the clean tray for rice, veg and soup", () => {
  for (const k of ["rice", "veg", "soup"])
    assert.ok(
      predictPercent(RIDGE_WEIGHTS, MODEL.features[MODEL.anchors.full], k) >
        predictPercent(RIDGE_WEIGHTS, MODEL.features[MODEL.anchors.empty], k) + 30,
      k,
    );
});
test("nutritional floor locks even at small vegetable waste and requires no waste threshold", () => {
  const r = evaluateTrayWithTrainedModel({
    sampleId: "IMG_20261029_112143.jpg",
    overridePcts: [0, 0, 10, 0],
  });
  assert.equal(r.nutritionalFloorLocked, true);
  assert.equal(r.components.veg.consumedGrams, 81);
  assert.equal(r.predictionSource, "manual-calibration");
});
test("high leftovers alone never diagnose allergy or pretend to be IQR", () => {
  const r = evaluateTrayWithTrainedModel({
    sampleId: "IMG_20261028_114612.jpg",
    overridePcts: [100, 100, 100, 100],
  });
  assert.equal(r.isDietaryOutlier, false);
  assert.ok(r.iqrEligibleCount < 10);
});
test("NFC flag excludes and real IQR excludes only against eligible same-menu cohort", () => {
  const cohort = Array.from({ length: 11 }, (_, i) => ({
    id: String(i),
    combo: "A",
    date: "2026-10-29",
    pcts: [0, 0, 0, 0],
  }));
  const r = evaluateTrayWithTrainedModel({
    featureVectors: Object.fromEntries(
      ["rice", "main", "veg", "soup"].map((k) => [k, [0, 0, 0, 0, 0, 1]]),
    ),
    comboName: "A",
    menuDate: "2026-10-29",
    overridePcts: [0, 0, 100, 0],
    cohort,
  });
  assert.equal(r.isDietaryOutlier, true);
  assert.equal(
    evaluateTrayWithTrainedModel({
      sampleId: "IMG_20261028_115429.jpg",
      allergyFlags: ["peanut"],
    }).isDietaryOutlier,
    true,
  );
});
test("feature extraction is finite for black and metallic images", () => {
  for (const v of [0, 120]) {
    const f = extractFeatures(
      {
        width: 2,
        height: 2,
        data: new Uint8Array(
          Array.from({ length: 16 }, (_, i) => (i % 4 === 3 ? 255 : v)),
        ),
      },
      [0, 0, 1, 1],
    );
    assert.ok(f.every(Number.isFinite));
    assert.equal(f.length, 6);
  }
});
test("human feedback updates weights and reduces feedback sample error without mutating base", () => {
  const features = [0.5, 0.2, 0.1, 0.3, 0.1, 1],
    before = structuredClone(RIDGE_WEIGHTS);
  const result = updateWeights(
    RIDGE_WEIGHTS,
    { rice: features, main: features, veg: features, soup: features },
    [0, 25, 75, 100],
  );
  assert.notDeepEqual(result, RIDGE_WEIGHTS);
  assert.deepEqual(RIDGE_WEIGHTS, before);
  assert.throws(() =>
    updateWeights(RIDGE_WEIGHTS, { rice: features }, [0, 25, 75, 100]),
  );
});

test("online correction reduces real feature error without moving either anchor prediction", () => {
  const f = MODEL.features["IMG_20261028_115444.jpg"],
    pcts = [0, 25, 75, 100],
    updated = updateWeights(RIDGE_WEIGHTS, f, pcts);
  for (const [i, k] of ["rice", "main", "veg", "soup"].entries()) {
    const before = predictPercent(RIDGE_WEIGHTS, f, k);
    if (Math.abs(before - pcts[i]) > 1)
      assert.ok(Math.abs(predictPercent(updated, f, k) - pcts[i]) < Math.abs(before - pcts[i]), k);
    for (const anchor of [MODEL.anchors.empty, MODEL.anchors.full]) {
      const a = MODEL.features[anchor];
      assert.ok(
        Math.abs(predictPercent(updated, a, k) - predictPercent(RIDGE_WEIGHTS, a, k)) < 1e-6,
        k + " " + anchor,
      );
    }
  }
});
