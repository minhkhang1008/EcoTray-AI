import { NutritionPanel, PairingMatrix } from "./DecisionSupport";
import { useState } from "react";
import PTNKVision, { VisionStreamPanel } from "./PTNKVision";
import { useFinalRound } from "./FinalRoundContext";
import {
  componentKeys,
  componentLabels,
  estimateGrams,
  trimOutliers,
} from "../lib/final-round.mjs";
import type { Values } from "../lib/contracts";
import { number } from "./format";
const presets = [
  {
    title: "Rau thừa cao",
    real: false,
    values: { rice: 8, vegetables: 62, main: 5 },
  },
  {
    title: "Mẫu ngoại lai",
    real: false,
    values: { rice: 5, vegetables: 12, main: 100 },
  },
  { title: "Ăn tốt", real: false, values: { rice: 5, vegetables: 8, main: 4 } },
  {
    title: "Cơm thừa cao",
    real: false,
    values: { rice: 55, vegetables: 12, main: 10 },
  },
  { title: "Ăn hết", real: false, values: { rice: 0, vegetables: 0, main: 0 } },
];
function ScenarioSandbox({ initial }: { initial: Values }) {
  const f = useFinalRound(),
    [values, setValues] = useState(initial),
    [iqr, setIqr] = useState(true);
  const cohort = [...Array.from({length:20}, (_, i) => ({rice:5+i%3, vegetables:20+i%3, main:5+i%3})), values];
  const trimmed = trimOutliers(cohort), selectedRows = iqr ? trimmed.rows : cohort;
  const mean = selectedRows.reduce((sum, row) => sum + row.vegetables, 0) / selectedRows.length;
  return (
    <section className="panel scenario-sandbox">
      <div className="section-heading">
        <div>
          <h2>Thử nghiệm độ nhạy theo thành phần</h2>
          <p>
            Mô phỏng số liệu · sơ đồ khay minh họa, không phải ảnh hoặc kết quả
            AI
          </p>
        </div>
        <span className="badge demo">MÔ PHỎNG</span>
      </div>
      <div className="scenario-layout">
        <div
          className="tray-diagram"
          aria-label="Sơ đồ ba thành phần trên khay"
        >
          {componentKeys.map((k) => (
            <div className={"diagram-" + k} key={k}>
              <div style={{ height: `${values[k]}%` }} />
              <span>
                {componentLabels[k]}
                <b>{values[k]}%</b>
              </span>
            </div>
          ))}
        </div>
        <div>
          {componentKeys.map((k) => {
            const reference = f.fullPortion(k),
              grams = estimateGrams(values[k], reference);
            return (
              <label className="scenario-slider" key={k}>
                {componentLabels[k]} · {values[k]}%
                <input
                  aria-label={"Phần còn lại " + componentLabels[k]}
                  type="range"
                  min="0"
                  max="100"
                  value={values[k]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [k]: Number(e.target.value) }))
                  }
                />
                <small>
                  {grams === null
                    ? "Chưa có mẫu cân để quy đổi gram"
                    : `Ước tính ${grams} g · tham chiếu ${number(reference!)} g từ mẫu cân`}
                </small>
              </label>
            );
          })}
          <p className="fine">
            Thêm mẫu cân trong Ghi nhận khay → Cân mẫu để cập nhật hệ số tại
            đây.
          </p>
        </div>
      </div>
      <div className="vision-iqr"><label className="toggle-label"><input type="checkbox" checked={iqr} onChange={e => setIqr(e.target.checked)} />Bộ lọc ngoại lai IQR: {iqr ? "Đang bật" : "Đang tắt"}</label><p>{selectedRows.length}/21 mẫu mô phỏng trong phép tính · {iqr ? trimmed.removed : 0} mẫu tách · Rau trung bình {number(mean)}%.</p><p className="fine">Thử trên 20 mẫu nền mô phỏng và một mẫu từ thanh trượt. Không dùng một khay làm quần thể IQR, không chẩn đoán dị ứng và không cộng vào dữ liệu nguồn.</p></div>
      <NutritionPanel served={f.fullPortion("vegetables") ?? undefined} waste={values.vegetables} compact />
    </section>
  );
}
export default function VisionLab() {
  const [view, setView] = useState("stream"), [preset, setPreset] = useState(0);
  return <>
    <div className="subtabs" role="group" aria-label="Chế độ Vision">
      {[["stream", "Trạm căn tin"], ["photos", "Kiểm tra ảnh"], ["scenarios", "Thử kịch bản"]].map(([id, label]) => (
        <button key={id} aria-pressed={view === id} className={view === id ? "selected" : ""} onClick={() => setView(id)}>{label}</button>
      ))}
    </div>
    {view === "stream" && <VisionStreamPanel />}
    {view === "photos" && <PTNKVision />}
    {view === "scenarios" && <>
      <p className="source-notice">Các kịch bản dưới đây là mô phỏng, tách khỏi ảnh thực địa và thống kê khay.</p>
      <details className="vision-scenarios" open>
        <summary>Thử tỷ lệ phần còn lại</summary>
        <div className="preset-grid">
          {presets.map((p, i) => <button key={p.title} aria-pressed={preset === i} className={preset === i ? "selected" : ""} onClick={() => setPreset(i)}>{p.title}</button>)}
        </div>
        <ScenarioSandbox key={preset} initial={presets[preset].values} />
      </details>
      <PairingMatrix />
      <NutritionPanel />
    </>}
  </>;
}
