import model from "../src/lib/ecotrayModels.json" with { type: "json" };
import catalog from "../data/ptnk-trays.json" with { type: "json" };
import { getRois, visionKeys } from "./ptnk-features.mjs";
export { extractFeatures, getRois, visionKeys } from "./ptnk-features.mjs";
export const PTNK_18_TRAYS_CATALOG = catalog;
export const RIDGE_WEIGHTS = model.weights;
export const MODEL = model;
const dot = (a, b) => a.reduce((sum, w, i) => sum + w * b[i], 0);
const clamp = (v) => Math.max(0, Math.min(100, v));
const round = (v) => Math.round(v * 10) / 10;
export function validFeatures(features) {
  return (
    features &&
    visionKeys.every(
      (k) =>
        Array.isArray(features[k]) &&
        features[k].length === 6 &&
        features[k].every(Number.isFinite) &&
        features[k].slice(0, 5).every((v) => v >= 0 && v <= 2) &&
        features[k][5] === 1,
    )
  );
}
export function predictPercent(weights, features, key) {
  const lo = dot(weights[key], model.features[model.anchors.empty][key]);
  const hi = dot(weights[key], model.features[model.anchors.full][key]);
  if (hi - lo <= 1e-6) throw Error("Hai mốc hiệu chuẩn không hợp lệ.");
  return clamp(((dot(weights[key], features[key]) - lo) / (hi - lo)) * 100);
}
/** Online regularized residual update in raw Ridge units; anchors remain fixed reference features. */
export function updateWeights(weights, features, pcts) {
  if (
    !validFeatures(features) ||
    !Array.isArray(pcts) ||
    pcts.length !== 4 ||
    !pcts.every((v) => Number.isFinite(v) && v >= 0 && v <= 100)
  )
    throw Error("Phản hồi hiệu chuẩn không hợp lệ.");
  const updated = structuredClone(weights);
  visionKeys.forEach((k, i) => {
    const a = model.features[model.anchors.empty][k],
      b = model.features[model.anchors.full][k],
      x = features[k];
    const lo = dot(weights[k], a),
      hi = dot(weights[k], b),
      aa = dot(a, a),
      ab = dot(a, b),
      bb = dot(b, b),
      det = aa * bb - ab * ab;
    if (det <= 1e-12) throw Error("Hai mốc hiệu chuẩn không độc lập.");
    const ca = (dot(x, a) * bb - dot(x, b) * ab) / det,
      cb = (dot(x, b) * aa - dot(x, a) * ab) / det;
    const direction = x.map((v, j) => v - ca * a[j] - cb * b[j]);
    const norm = dot(direction, direction);
    const target = lo + ((hi - lo) * pcts[i]) / 100,
      error = target - dot(weights[k], x);
    // Project feedback away from both anchors so 0% and 100% remain stable.
    updated[k] = weights[k].map(
      (w, j) => w + (0.85 * error * direction[j]) / (1e-6 + norm),
    );
  });
  for (const k of visionKeys)
    if (
      dot(updated[k], model.features[model.anchors.full][k]) -
        dot(updated[k], model.features[model.anchors.empty][k]) <=
      1e-6
    )
      throw Error("Phản hồi đảo ngược mốc chuẩn; cần thêm mẫu.");
  return updated;
}
const quantile = (a, p) => {
  const x = (a.length - 1) * p,
    i = Math.floor(x);
  return a[i] + (a[Math.min(i + 1, a.length - 1)] - a[i]) * (x - i);
};
/** Same date/menu only; collapse related views; references excluded; flags are not diagnoses. */
export function evaluateTrayWithTrainedModel(params = {}) {
  const meta = params.sampleId
    ? Object.hasOwn(catalog, params.sampleId)
      ? catalog[params.sampleId]
      : null
    : null;
  if (params.sampleId && !meta && !params.featureVectors)
    throw Error("Mẫu ảnh không hợp lệ.");
  const features =
    params.featureVectors ?? (meta ? model.features[params.sampleId] : null);
  if (!params.pixelMeasurement && !validFeatures(features))
    throw Error("Cần đặc trưng pixel của ảnh khay.");
  const combo =
    params.comboName ?? meta?.combo ?? "Ảnh tải lên · chưa gắn thực đơn";
  const date = params.menuDate ?? meta?.date ?? null;
  const weights = params.weights ?? RIDGE_WEIGHTS;
  if (
    params.overridePcts &&
    (!Array.isArray(params.overridePcts) ||
      params.overridePcts.length !== 4 ||
      !params.overridePcts.every(
        (v) => Number.isFinite(v) && v >= 0 && v <= 100,
      ))
  )
    throw Error("Phần trăm hiệu chuẩn không hợp lệ.");
  const pcts =
    params.overridePcts ??
    params.pixelMeasurement?.pcts ??
    visionKeys.map((k) => predictPercent(weights, features, k));
  const sourceRows =
    params.cohort ??
    Object.entries(catalog)
      .filter(([, m]) => !m.referenceOnly)
      .map(([id, m]) => ({
        id,
        group: m.group,
        combo: m.combo,
        date: m.date,
        pcts: m.y,
      }));
  const seen = new Set();
  const peers = sourceRows.filter(
    (r) =>
      date &&
      (params.comboName || meta?.combo) &&
      r.combo === combo &&
      r.date === date &&
      r.id !== params.sampleId &&
      (!meta || r.group !== meta.group) &&
      !r.isOutlier &&
      !r.allergyFlags?.length &&
      r.pcts?.length === 4 &&
      r.pcts.every(Number.isFinite) &&
      !seen.has(r.group ?? r.id) &&
      seen.add(r.group ?? r.id),
  );
  const statistical =
    peers.length >= 10 &&
    visionKeys.some((_, i) => {
      const a = peers.map((r) => r.pcts[i]).sort((a, b) => a - b),
        q1 = quantile(a, 0.25),
        q3 = quantile(a, 0.75);
      return pcts[i] > q3 + 1.5 * (q3 - q1);
    });
  const reference = !!meta?.referenceOnly;
  const isDietaryOutlier =
    !reference && (!!params.allergyFlags?.length || statistical);
  const names = { rice: "Cơm", main: "Món chính", veg: "Rau", soup: "Canh" },
    rois =
      params.pixelMeasurement?.rois ?? getRois(meta?.veg_pos ?? params.vegPos);
  const components = Object.fromEntries(
    visionKeys.map((k, i) => {
      const wastePct = round(clamp(pcts[i])),
        servedGrams = model.portionAssumptionsGrams[k],
        wasteGrams = round((servedGrams * wastePct) / 100);
      return [
        k,
        {
          nameVi: names[k],
          wastePct,
          protocolLevel: Math.round(wastePct / 25) * 25,
          servedGrams,
          wasteGrams,
          consumedGrams: round(servedGrams - wasteGrams),
          status:
            wastePct >= 40
              ? "CRITICAL"
              : wastePct >= 20
                ? "WARNING"
                : "OPTIMAL",
          bboxNormalized: rois[k],
        },
      ];
    }),
  );
  const nutritionalFloorLocked = components.veg.consumedGrams < 85;
  const high = visionKeys.some((k) => components[k].wastePct >= 20);
  const diagnosisCode = reference
    ? "REFERENCE_ONLY"
    : isDietaryOutlier
      ? "DIETARY_OUTLIER_TRIMMED"
      : nutritionalFloorLocked
        ? "CULINARY_PAIRING_SWAP"
        : high
          ? "PORTION_CALIBRATION"
          : "OPTIMAL";
  const headline = reference
    ? "Mốc đối chứng 100% · không tính vào khay trả"
    : isDietaryOutlier
      ? "Tách mẫu ngoại lai · cần xác minh"
      : nutritionalFloorLocked
        ? "Khóa giảm rau · thử đổi cặp món"
        : high
          ? "Kiểm tra khẩu phần và cách chế biến"
          : "Giữ nguyên";
  return {
    sampleId: params.sampleId ?? "uploaded-tray",
    timestamp: new Date().toISOString(),
    comboName: combo,
    menuDate: date,
    modelVersion: params.pixelMeasurement
      ? "ov2640-area-v1"
      : model.modelVersion,
    predictionSource: params.overridePcts
      ? "manual-calibration"
      : params.pixelMeasurement
        ? "ov2640-area"
        : "ridge-pixels",
    stationLayout: params.pixelMeasurement
      ? {
          orientation: params.pixelMeasurement.orientation,
          rotation: params.pixelMeasurement.rotation,
          uncertain: params.pixelMeasurement.orientationUncertain,
        }
      : null,
    calibrationAccuracyPct: null,
    brothFiltered: "heuristic",
    utensilFiltered: "heuristic",
    isDietaryOutlier,
    referenceOnly: reference,
    iqrEligibleCount: peers.length,
    iqrExcludedCount: new Set(
      sourceRows
        .filter(
          (r) =>
            date &&
            r.combo === combo &&
            r.date === date &&
            r.id !== params.sampleId &&
            (!meta || r.group !== meta.group) &&
            (r.isOutlier || r.allergyFlags?.length),
        )
        .map((r) => r.group ?? r.id),
    ).size,
    nutritionalFloorLocked,
    totalWasteGrams: round(
      Object.values(components).reduce((s, c) => s + c.wasteGrams, 0),
    ),
    components,
    decisionLoop: {
      diagnosisCode,
      headline,
      recommendation: reference
        ? "Mốc hiệu chuẩn đầy khay, không suy ra dị ứng hoặc quyết định khẩu phần."
        : isDietaryOutlier
          ? "Loại khỏi phép tính khẩu phần chung. Cờ thống kê không chẩn đoán dị ứng."
          : nutritionalFloorLocked
            ? "Giữ định lượng rau; thử đổi cách chế biến hoặc cặp rau–canh. Bếp duyệt rồi đo lại, không thay đổi số suất từ một khay."
            : high
              ? "Cân mẫu và đối chiếu tập khay cùng thực đơn trước khi điều chỉnh thành phần; giữ số suất."
              : "Giữ nguyên định lượng, tiếp tục theo dõi.",
      nutritionalGuardrailNote:
        "Ngưỡng cấu hình demo W_min = 85g; gram suy từ định lượng giả định, chưa phải phép cân hoặc chuẩn dinh dưỡng đã xác thực.",
    },
  };
}
