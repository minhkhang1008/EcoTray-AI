/** Scoring of the live area reader against weighed ground truth.
 * This is the validation that the PTNK gallery cannot provide: real ESP32/OV2640 frames,
 * served and leftover grams per compartment from a kitchen scale. Pure and unit-tested; the
 * file/JPEG handling lives in scripts/evaluate-station.mjs. */
export const COMPONENTS = ["rice", "main", "veg", "soup"];
/** What must be true before any station accuracy figure may be quoted. */
export const STATION_GATE = Object.freeze({
  minTrays: 100,
  minLightingConditions: 3,
  targetOverallMAE: 10,
});
const TRAY_KEYS = new Set(["id", "sessionId", "frame", "menu", "servedGrams", "leftoverGrams", "note"]);
const SESSION_KEYS = new Set(["id", "date", "lighting", "emptyFrame"]);
const isGrams = (v) => Number.isFinite(v) && v >= 0 && v <= 2000;
const safeRelative = (p) =>
  typeof p === "string" && /\.(jpe?g)$/i.test(p) && !p.startsWith("/") && !p.split(/[\\/]/).includes("..");

/** Validates the manifest and returns trays with weighed leftover percentages (0–100). */
export function parseManifest(manifest) {
  if (!manifest || manifest.schemaVersion !== 1 || !Array.isArray(manifest.sessions) || !Array.isArray(manifest.trays))
    throw Error("Manifest không hợp lệ: cần schemaVersion 1, sessions và trays.");
  const sessions = new Map();
  for (const s of manifest.sessions) {
    const extra = Object.keys(s ?? {}).filter((k) => !SESSION_KEYS.has(k));
    if (extra.length) throw Error(`Phiên chụp có trường không được phép: ${extra.join(", ")}.`);
    if (!s.id || sessions.has(s.id) || typeof s.lighting !== "string" || !s.lighting.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(s.date ?? ""))
      throw Error("Phiên chụp cần id duy nhất, date YYYY-MM-DD và lighting.");
    if (s.emptyFrame != null && !safeRelative(s.emptyFrame)) throw Error(`Đường dẫn khung khay trống không hợp lệ: ${s.emptyFrame}`);
    sessions.set(s.id, s);
  }
  const seen = new Set();
  const trays = manifest.trays.map((t) => {
    // Privacy by design: only anonymous IDs and grams. Any other field (name, UID, face image) is refused.
    const extra = Object.keys(t ?? {}).filter((k) => !TRAY_KEYS.has(k));
    if (extra.length) throw Error(`Khay ${t?.id ?? "?"} có trường không được phép (không lưu định danh học sinh): ${extra.join(", ")}.`);
    if (!t.id || seen.has(t.id)) throw Error("Mỗi khay cần id ẩn danh duy nhất.");
    seen.add(t.id);
    if (!sessions.has(t.sessionId)) throw Error(`Khay ${t.id} tham chiếu phiên chụp không tồn tại.`);
    if (!safeRelative(t.frame)) throw Error(`Đường dẫn ảnh khay ${t.id} không hợp lệ.`);
    const truth = COMPONENTS.map((k) => {
      const served = t.servedGrams?.[k],
        left = t.leftoverGrams?.[k];
      if (!isGrams(served) || !isGrams(left) || served <= 0) throw Error(`Khay ${t.id}: thiếu số gram ${k}.`);
      if (left > served * 1.05) throw Error(`Khay ${t.id}: phần còn lại ${k} lớn hơn phần múc.`);
      return Math.min(100, (left / served) * 100);
    });
    return { ...t, session: sessions.get(t.sessionId), truth };
  });
  return { sessions: [...sessions.values()], trays };
}

const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
function maeOf(records, pick) {
  const byComponent = Object.fromEntries(
    COMPONENTS.map((k, i) => [k, mean(records.map((r) => Math.abs(pick(r)[i] - r.truth[i])))]),
  );
  return { overall: mean(COMPONENTS.map((k) => byComponent[k])), byComponent };
}
/** records: [{id, lighting, truth:[4], measured:[4], measuredWithReference?:[4]}] (percent of served). */
export function scoreRecords(records) {
  if (!records.length) throw Error("Chưa có bản ghi để chấm.");
  // Leave-one-out mean of the weighed labels: the "guess the average" baseline.
  const loo = (r) => COMPONENTS.map((_, i) => mean(records.filter((o) => o !== r).map((o) => o.truth[i])));
  const baseline = records.length > 1 ? maeOf(records, loo) : null;
  const lighting = [...new Set(records.map((r) => r.lighting))].sort();
  const report = {
    trays: records.length,
    lightingConditions: lighting,
    areaReader: maeOf(records, (r) => r.measured),
    meanLabelBaseline: baseline,
    byLighting: Object.fromEntries(
      lighting.map((l) => {
        const subset = records.filter((r) => r.lighting === l);
        return [l, { trays: subset.length, ...maeOf(subset, (r) => r.measured) }];
      }),
    ),
  };
  const withRef = records.filter((r) => r.measuredWithReference);
  if (withRef.length)
    report.withEmptyReference = {
      trays: withRef.length,
      areaReaderSameTrays: maeOf(withRef, (r) => r.measured),
      emptyRef: maeOf(withRef, (r) => r.measuredWithReference),
    };
  report.gate = gateStatus(report);
  return report;
}
/** The gate is about whether a number may be quoted, not whether it is good. */
export function gateStatus(report) {
  const reasons = [];
  if (report.trays < STATION_GATE.minTrays) reasons.push(`mới có ${report.trays}/${STATION_GATE.minTrays} khay`);
  if (report.lightingConditions.length < STATION_GATE.minLightingConditions)
    reasons.push(`mới có ${report.lightingConditions.length}/${STATION_GATE.minLightingConditions} điều kiện sáng`);
  const quotable = reasons.length === 0;
  return {
    quotable,
    reasons,
    meetsTarget: quotable && report.areaReader.overall < STATION_GATE.targetOverallMAE,
    targetOverallMAE: STATION_GATE.targetOverallMAE,
  };
}
