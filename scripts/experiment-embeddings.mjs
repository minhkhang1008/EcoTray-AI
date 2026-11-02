/** Frozen-embedding + Ridge experiment on the PTNK gallery, per tray compartment.
 *
 *   node scripts/experiment-embeddings.mjs [--aug 4] [--out data/vision-experiments/embeddings-ridge.json]
 *
 * Scope, stated up front:
 *  - Backbone: the MobileNet v1 0.25 already shipped in public/model (256-d pooled features,
 *    frozen). No new dependency, no new weights.
 *  - Data: the 35 phone photos / 27 independent trays in data/ptnk-trays.json, labelled by
 *    eye. The deployed OV2640 station layout differs from the gallery layout, so a result
 *    here is a statement about the gallery Ridge only. It is NOT a measurement of the live
 *    reader `ov2640-area-v1` and cannot satisfy the weighed-ESP32 gate (see
 *    docs/STATION-WEIGHED-DATA.md and scripts/evaluate-station.mjs).
 *  - Output goes to a report file. It never touches src/lib/ecotrayModels.json or the
 *    6-number featureVectors contract; adopting a candidate is a separate decision.
 */
import * as tf from "@tensorflow/tfjs";
import jpeg from "jpeg-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractFeatures, getRois, visionKeys, warpToCanonical } from "../lib/ptnk-features.mjs";
import { referenceDiffFeatures } from "../lib/empty-reference.mjs";
import {
  adoptionDecision,
  augmentPhotometric,
  hashSeed,
  leaveGroupOutMean,
  leaveGroupOutRidge,
  mae,
  mulberry32,
} from "../lib/embedding-experiment.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---- Decision rule: fixed BEFORE any result is computed. ----
// The docs already record that ~1 pp changes are inside the noise at 27 trays, so a candidate
// must beat the gallery Ridge by a clear margin on the same folds, with no regression anywhere.
const ADOPTION_RULE = Object.freeze({
  comparedAgainst: "gallery Ridge held-out predictions stored in src/lib/ecotrayModels.json",
  minOverallGainPP: 3,
  componentTolerancePP: 0,
  scope: "gallery phone photos only; says nothing about the OV2640 station path",
});

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const AUG = Number(argOf("--aug", "4"));
if (!Number.isInteger(AUG) || AUG < 0 || AUG > 12) throw Error("--aug must be an integer 0..12");
const OUT = path.resolve(ROOT, argOf("--out", "data/vision-experiments/embeddings-ridge.json"));

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "data/ptnk-trays.json"), "utf8"));
const shipped = JSON.parse(fs.readFileSync(path.join(ROOT, "src/lib/ecotrayModels.json"), "utf8"));
const { empty: EMPTY, full: FULL } = shipped.anchors;
const ids = Object.keys(catalog);
const label = (id, i) => (id === FULL ? 100 : Number(catalog[id].y[i]));

// ---- Backbone ----
const modelJson = JSON.parse(fs.readFileSync(path.join(ROOT, "public/model/model.json"), "utf8"));
const weightData = Buffer.concat(
  modelJson.weightsManifest.flatMap((g) => g.paths.map((p) => fs.readFileSync(path.join(ROOT, "public/model", p)))),
);
await tf.setBackend("cpu");
await tf.ready();
const full = await tf.loadLayersModel(
  tf.io.fromMemory({
    modelTopology: modelJson.modelTopology,
    weightSpecs: modelJson.weightsManifest.flatMap((g) => g.weights),
    weightData: weightData.buffer.slice(weightData.byteOffset, weightData.byteOffset + weightData.byteLength),
  }),
);
const backbone = tf.model({ inputs: full.inputs, outputs: full.getLayer("global_average_pooling2d_1").output });

function embedCrops(image, boxes) {
  return tf.tidy(() => {
    const whole = tf.tensor3d(image.data, [image.height, image.width, 4], "int32").slice([0, 0, 0], [-1, -1, 3]);
    const crops = boxes.map(([x1, y1, x2, y2]) => {
      const left = Math.floor(x1 * image.width),
        top = Math.floor(y1 * image.height);
      const w = Math.max(2, Math.floor(x2 * image.width) - left),
        h = Math.max(2, Math.floor(y2 * image.height) - top);
      return whole
        .slice([top, left, 0], [h, w, 3])
        .resizeBilinear([224, 224])
        .toFloat()
        .div(127.5)
        .sub(1);
    });
    return backbone.predict(tf.stack(crops));
  });
}
async function embeddings(image, boxes) {
  const t = embedCrops(image, boxes),
    flat = await t.data();
  t.dispose();
  return boxes.map((_, k) => Array.from(flat.slice(k * 256, (k + 1) * 256)));
}

// ---- Rows: one clean row per photo plus AUG degraded copies (training only). ----
function loadImage(id) {
  const decoded = jpeg.decode(fs.readFileSync(path.join(ROOT, "public/ptnk-normalized", id)), {
    useTArray: true,
    maxResolutionInMP: 2,
    maxMemoryUsageInMB: 64,
  });
  if (decoded.width !== 800 || decoded.height !== 600) throw Error(id + ": expected normalized 800×600");
  const image = { width: 800, height: 600, data: Uint8Array.from(decoded.data) };
  return catalog[id].trayCorners ? warpToCanonical(image, catalog[id].trayCorners) : image;
}
const cos = (a, b) => {
  let d = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return d / (Math.sqrt(na * nb) || 1);
};

const emptyImage = loadImage(EMPTY);
const emptyBoxes = (id) => visionKeys.map((k) => getRois(catalog[id].veg_pos)[k]);
// Reference crops must use the same ROI as the sample, so embed the empty anchor once per veg side.
const refEmbedBySide = {};
for (const side of ["TL", "TR"]) {
  const boxes = visionKeys.map((k) => getRois(side)[k]);
  refEmbedBySide[side] = await embeddings(emptyImage, boxes);
}

const rows = []; // {id, aug, perKey: {key: {embed, hand, diff}}}
const started = Date.now();
for (const id of ids) {
  const clean = loadImage(id),
    boxes = emptyBoxes(id),
    side = catalog[id].veg_pos;
  for (let a = 0; a <= AUG; a++) {
    const image = a === 0 ? clean : augmentPhotometric(clean, mulberry32(hashSeed(id) + a));
    const embs = await embeddings(image, boxes);
    const perKey = {};
    visionKeys.forEach((key, k) => {
      const hand = extractFeatures(image, boxes[k]).slice(0, 5);
      const d = referenceDiffFeatures(image, emptyImage, boxes[k]);
      perKey[key] = {
        embed: embs[k],
        hand,
        diff: [d.changedFraction, d.meanAbsDiff, 1 - cos(embs[k], refEmbedBySide[side][k])],
      };
    });
    rows.push({ id, aug: a, perKey });
  }
  process.stderr.write(`\rembedded ${rows.length} frames (${((Date.now() - started) / 1000).toFixed(0)}s)`);
}
process.stderr.write("\n");

const VARIANTS = {
  "embedding-only": (r) => r.embed,
  "embedding+hand-features": (r) => [...r.embed, ...r.hand],
  "embedding+hand+empty-diff": (r) => [...r.embed, ...r.hand, ...r.diff],
};

function evaluate(variant, useAugmented) {
  const byComponent = {},
    predictions = {},
    alphas = {};
  visionKeys.forEach((key, i) => {
    const samples = rows
      .filter((r) => useAugmented || r.aug === 0)
      .map((r) => ({
        x: VARIANTS[variant](r.perKey[key]),
        y: label(r.id, i),
        group: catalog[r.id].group,
        source: r.aug === 0 ? r.id : `${r.id}#aug${r.aug}`,
        scored: r.id !== EMPTY && r.id !== FULL,
        augmented: r.aug > 0,
      }));
    const ridge = leaveGroupOutRidge(samples);
    const labels = Object.fromEntries(samples.filter((s) => !s.augmented).map((s) => [s.source, s.y]));
    byComponent[key] = mae(ridge.predictions, labels);
    alphas[key] = Object.values(ridge.alphaByGroup).reduce((m, a) => ({ ...m, [a]: (m[a] ?? 0) + 1 }), {});
    for (const [src, p] of Object.entries(ridge.predictions)) (predictions[src] ??= {})[key] = Math.round(p * 100) / 100;
    if (variant === "embedding-only" && useAugmented) {
      const mean = leaveGroupOutMean(samples);
      byComponent.__baseline = { ...(byComponent.__baseline ?? {}), [key]: mae(mean, labels) };
    }
  });
  const baseline = byComponent.__baseline;
  delete byComponent.__baseline;
  const overall = visionKeys.reduce((t, k) => t + byComponent[k], 0) / visionKeys.length;
  return { byComponent, overall, alphaChoices: alphas, baseline, predictions };
}

// ---- Gallery Ridge reference, recomputed from stored held-out predictions + current labels. ----
const held = shipped.validation.heldOutPredictions;
const refByComponent = Object.fromEntries(
  visionKeys.map((k, i) => [
    k,
    Object.keys(held).reduce((t, id) => t + Math.abs(held[id][k] - label(id, i)), 0) / Object.keys(held).length,
  ]),
);
const reference = {
  overall: visionKeys.reduce((t, k) => t + refByComponent[k], 0) / 4,
  byComponent: refByComponent,
  scoredImages: Object.keys(held).length,
};

// Supplementary, descriptive only (the pass/fail rule above is not changed): paired bootstrap over
// whole groups of the gain (reference MAE − candidate MAE) on the same held-out photos.
function pairedGainInterval(predictions) {
  const perGroup = new Map();
  for (const id of Object.keys(held)) {
    const ref = visionKeys.reduce((t, k, i) => t + Math.abs(held[id][k] - label(id, i)), 0) / 4,
      cand = visionKeys.reduce((t, k, i) => t + Math.abs(predictions[id][k] - label(id, i)), 0) / 4,
      g = perGroup.get(catalog[id].group) ?? { gain: 0, n: 0 };
    g.gain += ref - cand;
    g.n += 1;
    perGroup.set(catalog[id].group, g);
  }
  const list = [...perGroup.values()],
    rand = mulberry32(20261102),
    draws = [];
  for (let b = 0; b < 4000; b++) {
    let gain = 0,
      n = 0;
    for (let i = 0; i < list.length; i++) {
      const g = list[Math.floor(rand() * list.length)];
      gain += g.gain;
      n += g.n;
    }
    draws.push(gain / n);
  }
  draws.sort((a, b) => a - b);
  const total = list.reduce((t, g) => t + g.gain, 0) / list.reduce((t, g) => t + g.n, 0);
  return { gainPP: total, ci95: [draws[Math.floor(0.025 * draws.length)], draws[Math.floor(0.975 * draws.length)]], groups: list.length, draws: draws.length };
}

const results = {};
for (const variant of Object.keys(VARIANTS)) {
  const withAug = evaluate(variant, true),
    noAug = AUG > 0 ? evaluate(variant, false) : null;
  results[variant] = {
    withAugmentation: { overall: withAug.overall, byComponent: withAug.byComponent, alphaChoices: withAug.alphaChoices },
    withoutAugmentation: noAug && { overall: noAug.overall, byComponent: noAug.byComponent },
    decision: adoptionDecision(ADOPTION_RULE, reference, withAug),
    pairedBootstrap: pairedGainInterval(withAug.predictions),
    heldOutPredictions: withAug.predictions,
  };
  if (variant === "embedding-only") reference.meanLabelBaseline = withAug.baseline;
}
const baselineOverall = visionKeys.reduce((t, k) => t + reference.meanLabelBaseline[k], 0) / 4;

const best = Object.entries(results).sort((a, b) => a[1].withAugmentation.overall - b[1].withAugmentation.overall)[0];
const report = {
  generatedFor: "frozen-embedding experiment; see docs/VISION-PTNK.md",
  backbone: "MobileNet v1 0.25, public/model, global_average_pooling2d_1 (256-d), frozen",
  scope: ADOPTION_RULE.scope,
  data: {
    photos: ids.length,
    independentTrays: new Set(ids.map((id) => catalog[id].group)).size,
    scoredPhotos: reference.scoredImages,
    labels: "visual estimates (relabel v2), not weighed",
  },
  method: {
    crop: "calibrated gallery ROI per compartment (after 4-corner alignment where available), stretched to 224×224",
    model: "Ridge in dual form, z-scored features per fold, unpenalised bias",
    alphaSelection: "inner grouped 6-fold CV on training groups only",
    validation: "leave-one-related-view-group-out; both anchor photos train, neither is scored",
    augmentation: `${AUG} seeded OV2640-like copies per photo (colour cast ±15%, exposure 0.75–1.15, 5×5 blur, σ12 noise); training rows only`,
    emptyDiff: "diff vs the 0% anchor photo; phone photos are hand-held, so registration is poor and this variant is only a weak proxy for a fixed station camera",
  },
  adoptionRule: ADOPTION_RULE,
  galleryRidgeReference: { ...reference, meanLabelBaselineOverall: baselineOverall },
  results,
  verdict: {
    bestVariant: best[0],
    bestOverallMAE: best[1].withAugmentation.overall,
    meetsPreRegisteredRule: Object.values(results).some((r) => r.decision.passes),
    // Added after the first run, only to make the verdict stricter: the interval must exclude zero.
    gainDistinguishableFromNoise: Object.values(results).some((r) => r.decision.passes && r.pairedBootstrap.ci95[0] > 0),
    // A candidate, not a decision: swapping the shipped model is a separate call.
    candidateForGallery: Object.values(results).some((r) => r.decision.passes && r.pairedBootstrap.ci95[0] > 0),
    bestGainMinusRulePP: best[1].decision.overallGainPP - ADOPTION_RULE.minOverallGainPP,
    note: "The variants' intervals overlap, so their ranking is not reliable; the margin over the rule is the number above. Any candidate applies to the gallery only: the live station path still needs the weighed ESP32 gate.",
  },
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");

const f = (v) => v.toFixed(2).padStart(6);
console.log(`\nGallery Ridge (reference): overall ${f(reference.overall)}  ` + visionKeys.map((k) => `${k} ${f(reference.byComponent[k])}`).join("  "));
console.log(`Mean-label baseline:       overall ${f(baselineOverall)}`);
for (const [name, r] of Object.entries(results)) {
  const w = r.withAugmentation;
  console.log(
    `${name.padEnd(28)} overall ${f(w.overall)}  ` +
      visionKeys.map((k) => `${k} ${f(w.byComponent[k])}`).join("  ") +
      (r.withoutAugmentation ? `  | no-aug ${f(r.withoutAugmentation.overall)}` : "") +
      `  | gain ${f(r.decision.overallGainPP)} pp (95% CI ${r.pairedBootstrap.ci95.map((v) => v.toFixed(1)).join(" … ")}) → ${r.decision.passes ? "meets" : "misses"} the rule`,
  );
}
console.log(
  `\nPre-registered rule met: ${report.verdict.meetsPreRegisteredRule ? "yes" : "no"}; gain distinguishable from noise: ${report.verdict.gainDistinguishableFromNoise ? "yes" : "no"}; candidate for the gallery: ${report.verdict.candidateForGallery ? "yes" : "no"} (margin over rule ${report.verdict.bestGainMinusRulePP.toFixed(2)} pp; not adopted automatically). Report: ${path.relative(ROOT, OUT)}`,
);
