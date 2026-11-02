import test from "node:test";
import assert from "node:assert/strict";
import {
  adoptionDecision,
  augmentPhotometric,
  hashSeed,
  leaveGroupOutMean,
  leaveGroupOutRidge,
  mae,
  mulberry32,
} from "./embedding-experiment.mjs";

function synthetic(n = 24) {
  const rand = mulberry32(7);
  return Array.from({ length: n }, (_, i) => {
    const x = Array.from({ length: 5 }, () => rand() * 2 - 1);
    return {
      x,
      y: 40 + 8 * x[0] - 5 * x[1],
      group: "g" + i,
      source: "s" + i,
      scored: true,
      augmented: false,
    };
  });
}
const labels = (samples) => Object.fromEntries(samples.map((s) => [s.source, s.y]));

test("seeded generator is deterministic and bounded", () => {
  const a = mulberry32(hashSeed("x.jpg")),
    b = mulberry32(hashSeed("x.jpg"));
  const seq = Array.from({ length: 50 }, () => a());
  assert.deepEqual(seq, Array.from({ length: 50 }, () => b()));
  assert.ok(seq.every((v) => v >= 0 && v < 1));
  assert.notEqual(hashSeed("a"), hashSeed("b"));
});

test("leave-group-out ridge recovers a linear signal on unseen groups", () => {
  const samples = synthetic(),
    { predictions } = leaveGroupOutRidge(samples);
  assert.equal(Object.keys(predictions).length, samples.length);
  assert.ok(mae(predictions, labels(samples)) < 1.5, String(mae(predictions, labels(samples))));
  assert.ok(mae(predictions, labels(samples)) < mae(leaveGroupOutMean(samples), labels(samples)) / 2);
});

test("a held-out group's labels never influence its own prediction", () => {
  const samples = synthetic(),
    before = leaveGroupOutRidge(samples).predictions.s3,
    tampered = samples.map((s) => (s.group === "g3" ? { ...s, y: 99 } : s));
  assert.equal(leaveGroupOutRidge(tampered).predictions.s3, before);
  const meanBefore = leaveGroupOutMean(samples).s3;
  assert.equal(leaveGroupOutMean(tampered).s3, meanBefore);
});

test("augmented rows train but are never scored, and a held group's copies stay out of its fold", () => {
  const base = synthetic(),
    copies = base.map((s, i) => ({ ...s, source: s.source + "#aug", augmented: true, x: s.x.map((v) => v + 0.01 * (i % 3)) })),
    samples = [...base, ...copies],
    { predictions } = leaveGroupOutRidge(samples);
  assert.equal(Object.keys(predictions).length, base.length);
  assert.ok(Object.keys(predictions).every((k) => !k.endsWith("#aug")));
  const tampered = samples.map((s) => (s.group === "g3" && s.augmented ? { ...s, y: 99 } : s));
  assert.equal(leaveGroupOutRidge(tampered).predictions.s3, predictions.s3);
});

test("rows marked unscored (anchors) are used for training only", () => {
  const samples = synthetic().map((s, i) => (i < 2 ? { ...s, scored: false } : s)),
    { predictions } = leaveGroupOutRidge(samples);
  assert.equal(Object.keys(predictions).length, samples.length - 2);
  assert.equal("s0" in predictions, false);
});

test("photometric augmentation is seeded, size-preserving and changes the pixels", () => {
  const width = 16,
    height = 12,
    data = new Uint8Array(width * height * 4).fill(120);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  const run = () => augmentPhotometric({ width, height, data }, mulberry32(11));
  const a = run(),
    b = run();
  assert.deepEqual(a.data, b.data);
  assert.equal(a.data.length, data.length);
  assert.ok(a.data.some((v, i) => v !== data[i]));
  assert.ok(Array.from(a.data).filter((_, i) => i % 4 === 3).every((v) => v === 255));
  assert.deepEqual(data.slice(0, 4), new Uint8Array([120, 120, 120, 255])); // input untouched
});

test("adoption rule requires a real overall gain and no component regression", () => {
  const rule = { minOverallGainPP: 3, componentTolerancePP: 0 },
    ref = { overall: 15, byComponent: { rice: 19, main: 16, veg: 14, soup: 11 } };
  assert.equal(adoptionDecision(rule, ref, { overall: 11, byComponent: { rice: 14, main: 12, veg: 10, soup: 8 } }).passes, true);
  assert.equal(adoptionDecision(rule, ref, { overall: 13, byComponent: { rice: 14, main: 12, veg: 10, soup: 8 } }).passes, false);
  const worse = adoptionDecision(rule, ref, { overall: 11, byComponent: { rice: 10, main: 10, veg: 10, soup: 14 } });
  assert.equal(worse.passes, false);
  assert.deepEqual(worse.componentsWorse, ["soup"]);
});
