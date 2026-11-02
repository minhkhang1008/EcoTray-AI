/** Pure helpers for the frozen-embedding + Ridge experiment (scripts/experiment-embeddings.mjs).
 * Deterministic and dependency-free so the validation logic itself is unit-tested.
 *
 * Validation rules enforced here, because small-data experiments leak easily:
 *  - the held-out group never appears in training, scaling or alpha selection;
 *  - alpha is chosen by an inner grouped CV on the training groups only;
 *  - augmented rows may train but are never scored.
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
function gaussian(rand) {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

function boxBlur5(image) {
  const { width, height, data } = image,
    R = 2,
    tmp = new Float32Array(data.length),
    out = new Uint8Array(data.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      for (let c = 0; c < 3; c++) {
        let sum = 0,
          n = 0;
        for (let d = -R; d <= R; d++) {
          const xx = x + d;
          if (xx < 0 || xx >= width) continue;
          sum += data[(y * width + xx) * 4 + c];
          n++;
        }
        tmp[(y * width + x) * 4 + c] = sum / n;
      }
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        let sum = 0,
          n = 0;
        for (let d = -R; d <= R; d++) {
          const yy = y + d;
          if (yy < 0 || yy >= height) continue;
          sum += tmp[(yy * width + x) * 4 + c];
          n++;
        }
        out[o + c] = sum / n;
      }
      out[o + 3] = 255;
    }
  return { width, height, data: out };
}

/** OV2640-like degradation: per-channel colour cast, exposure, optional blur and sensor noise. */
export function augmentPhotometric(
  image,
  rand,
  { cast = 0.15, exposure = [0.75, 1.15], noiseSigma = 12, blurProb = 0.5, noiseProb = 0.5 } = {},
) {
  const expo = exposure[0] + rand() * (exposure[1] - exposure[0]),
    gain = [0, 1, 2].map(() => (1 + (rand() * 2 - 1) * cast) * expo),
    blur = rand() < blurProb,
    noisy = rand() < noiseProb;
  const base = blur ? boxBlur5(image) : image,
    out = new Uint8Array(base.data.length);
  for (let i = 0; i < out.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = base.data[i + c] * gain[c] + (noisy ? gaussian(rand) * noiseSigma : 0);
      out[i + c] = Math.max(0, Math.min(255, Math.round(v)));
    }
    out[i + 3] = 255;
  }
  return { width: image.width, height: image.height, data: out, params: { gain, blur, noisy } };
}

/* ---------- Ridge in dual form, unpenalised bias ---------- */
const BIAS_KERNEL = 1e4; // constant feature sqrt(1e4): effectively unpenalised intercept

function cholesky(a, n) {
  const l = new Float64Array(n * n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j <= i; j++) {
      let s = a[i * n + j];
      for (let k = 0; k < j; k++) s -= l[i * n + k] * l[j * n + k];
      if (i === j) {
        if (s <= 1e-12) throw Error("Ma trận không xác định dương.");
        l[i * n + i] = Math.sqrt(s);
      } else l[i * n + j] = s / l[j * n + j];
    }
  return l;
}
function choleskySolve(l, n, b) {
  const z = new Float64Array(n),
    x = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= l[i * n + k] * z[k];
    z[i] = s / l[i * n + i];
  }
  for (let i = n - 1; i >= 0; i--) {
    let s = z[i];
    for (let k = i + 1; k < n; k++) s -= l[k * n + i] * x[k];
    x[i] = s / l[i * n + i];
  }
  return x;
}
export function standardizer(rows) {
  const d = rows[0].length,
    mean = new Float64Array(d),
    std = new Float64Array(d);
  for (const r of rows) for (let j = 0; j < d; j++) mean[j] += r[j] / rows.length;
  for (const r of rows) for (let j = 0; j < d; j++) std[j] += (r[j] - mean[j]) ** 2 / rows.length;
  for (let j = 0; j < d; j++) std[j] = Math.sqrt(std[j]) || Infinity; // constant column -> 0
  return (r) => Float64Array.from(r, (v, j) => (v - mean[j]) / std[j]);
}
const dot = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};
function kernel(rowsA, rowsB) {
  return rowsA.map((a) => rowsB.map((b) => dot(a, b) + BIAS_KERNEL));
}
function fitDual(K, idx, y, alpha) {
  const n = idx.length,
    A = new Float64Array(n * n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) A[i * n + j] = K[idx[i]][idx[j]] + (i === j ? alpha : 0);
  return choleskySolve(cholesky(A, n), n, Float64Array.from(idx, (i) => y[i]));
}
const clip = (v) => Math.max(0, Math.min(100, v));

export const DEFAULT_ALPHAS = [1, 10, 100, 1000, 10000, 100000];

/** Leave-one-group-out Ridge with nested alpha selection.
 * samples: [{x:number[], y:number, group:string, source:string, scored:boolean, augmented:boolean}]
 * `scored` marks the rows to evaluate (anchors are trained on but not scored); augmented rows
 * are never scored. Returns {predictions:{source:value}, alphaByGroup}. */
export function leaveGroupOutRidge(samples, { alphas = DEFAULT_ALPHAS, innerFolds = 6, useAugmented = true } = {}) {
  const groups = [...new Set(samples.filter((s) => s.scored && !s.augmented).map((s) => s.group))].sort(),
    predictions = {},
    alphaByGroup = {};
  for (const g of groups) {
    const train = samples.filter((s) => s.group !== g && (useAugmented || !s.augmented)),
      held = samples.filter((s) => s.group === g && s.scored && !s.augmented);
    const scale = standardizer(train.map((s) => s.x)),
      Z = train.map((s) => scale(s.x)),
      y = train.map((s) => s.y),
      K = kernel(Z, Z);
    const trainGroups = [...new Set(train.map((s) => s.group))].sort(),
      foldOf = new Map(trainGroups.map((t, i) => [t, i % innerFolds]));
    let best = null;
    for (const alpha of alphas) {
      let err = 0,
        count = 0;
      for (let f = 0; f < innerFolds; f++) {
        const tr = [],
          va = [];
        train.forEach((s, i) => {
          if (foldOf.get(s.group) !== f) tr.push(i);
          else if (s.scored && !s.augmented) va.push(i);
        });
        if (!tr.length || !va.length) continue;
        const a = fitDual(K, tr, y, alpha);
        for (const v of va) {
          let p = 0;
          tr.forEach((t, k) => (p += a[k] * K[v][t]));
          err += Math.abs(clip(p) - y[v]);
          count++;
        }
      }
      const mae = count ? err / count : Infinity;
      if (!best || mae <= best.mae) best = { alpha, mae }; // ties prefer the stronger penalty
    }
    const all = train.map((_, i) => i),
      a = fitDual(K, all, y, best.alpha);
    alphaByGroup[g] = best.alpha;
    for (const s of held) {
      const z = scale(s.x);
      let p = 0;
      train.forEach((_, k) => (p += a[k] * (dot(Z[k], z) + BIAS_KERNEL)));
      predictions[s.source] = clip(p);
    }
  }
  return { predictions, alphaByGroup };
}

/** Same folds, predicting the mean training label (scored, non-augmented rows only). */
export function leaveGroupOutMean(samples) {
  const groups = [...new Set(samples.filter((s) => s.scored && !s.augmented).map((s) => s.group))].sort(),
    predictions = {};
  for (const g of groups) {
    const base = samples.filter((s) => s.group !== g && s.scored && !s.augmented),
      mean = base.reduce((t, s) => t + s.y, 0) / base.length;
    for (const s of samples) if (s.group === g && s.scored && !s.augmented) predictions[s.source] = mean;
  }
  return predictions;
}

export function mae(predictions, labels) {
  const ids = Object.keys(predictions);
  if (!ids.length) return NaN;
  return ids.reduce((t, id) => t + Math.abs(predictions[id] - labels[id]), 0) / ids.length;
}

/** The decision rule is data, written before any result exists. */
export function adoptionDecision(rule, reference, candidate) {
  const overallGain = reference.overall - candidate.overall,
    worse = Object.keys(reference.byComponent).filter(
      (k) => candidate.byComponent[k] > reference.byComponent[k] + (rule.componentTolerancePP ?? 0),
    );
  return {
    overallGainPP: overallGain,
    componentsWorse: worse,
    passes: overallGain >= rule.minOverallGainPP && worse.length === 0,
  };
}
