/** Scores the live area reader (`ov2640-area-v1`) against weighed ground truth.
 *
 *   node scripts/evaluate-station.mjs [--manifest data/station-weighed/manifest.json] [--out report.json]
 *
 * With no manifest it says so and exits 0: there is currently no weighed ESP32 data, so no
 * station accuracy exists to report. Protocol and schema: docs/STATION-WEIGHED-DATA.md.
 */
import fs from "node:fs";
import path from "node:path";
import jpeg from "jpeg-js";
import { fileURLToPath } from "node:url";
import { analyzeStationPixels } from "../lib/station-vision.mjs";
import { COMPONENTS, STATION_GATE, parseManifest, scoreRecords } from "../lib/station-evaluation.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const argOf = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const manifestPath = path.resolve(ROOT, argOf("--manifest") ?? "data/station-weighed/manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.log(
    `Chưa có dữ liệu cân: không thấy ${path.relative(ROOT, manifestPath)}.\n` +
      `Chưa có số liệu sai số cho bộ đọc ov2640-area-v1 trên ảnh ESP32 thật; không được trích dẫn con số nào.\n` +
      `Cần ≥${STATION_GATE.minTrays} khay, ≥${STATION_GATE.minLightingConditions} điều kiện sáng, có số gram múc/còn lại. Xem docs/STATION-WEIGHED-DATA.md.`,
  );
  process.exit(0);
}
const base = path.dirname(manifestPath);
const { trays } = parseManifest(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
function readFrame(rel) {
  const full = path.resolve(base, rel);
  if (!full.startsWith(base + path.sep)) throw Error(`Đường dẫn ra ngoài thư mục dữ liệu: ${rel}`);
  const d = jpeg.decode(fs.readFileSync(full), { useTArray: true, maxResolutionInMP: 4, maxMemoryUsageInMB: 128 });
  return { width: d.width, height: d.height, data: Uint8Array.from(d.data) };
}
const emptyFrames = new Map();
const records = trays.map((t) => {
  const frame = readFrame(t.frame),
    measured = analyzeStationPixels(frame).pcts,
    ref = t.session.emptyFrame;
  if (ref && !emptyFrames.has(ref)) emptyFrames.set(ref, readFrame(ref));
  return {
    id: t.id,
    lighting: t.session.lighting,
    truth: t.truth,
    measured,
    measuredWithReference: ref ? analyzeStationPixels(frame, { reference: emptyFrames.get(ref) }).pcts : undefined,
  };
});
const report = scoreRecords(records);
const f = (v) => v.toFixed(1).padStart(5);
console.log(`Khay đã cân: ${report.trays} · điều kiện sáng: ${report.lightingConditions.join(", ")}`);
console.log(`MAE bộ đọc diện tích (điểm %): tổng ${f(report.areaReader.overall)} · ` + COMPONENTS.map((k) => `${k} ${f(report.areaReader.byComponent[k])}`).join(" · "));
if (report.meanLabelBaseline) console.log(`Đoán bằng trung bình nhãn cân:     tổng ${f(report.meanLabelBaseline.overall)}`);
if (report.withEmptyReference)
  console.log(`Có khung khay trống (${report.withEmptyReference.trays} khay): ${f(report.withEmptyReference.areaReaderSameTrays.overall)} → ${f(report.withEmptyReference.emptyRef.overall)}`);
for (const [l, v] of Object.entries(report.byLighting)) console.log(`  ${l.padEnd(14)} ${String(v.trays).padStart(3)} khay · tổng ${f(v.overall)}`);
console.log(
  report.gate.quotable
    ? `Đủ điều kiện trích dẫn. Mục tiêu MAE < ${STATION_GATE.targetOverallMAE}: ${report.gate.meetsTarget ? "ĐẠT" : "CHƯA ĐẠT"}.`
    : `CHƯA ĐƯỢC trích dẫn con số này: ${report.gate.reasons.join("; ")}.`,
);
const out = argOf("--out");
if (out) fs.writeFileSync(path.resolve(ROOT, out), JSON.stringify(report, null, 2) + "\n");
