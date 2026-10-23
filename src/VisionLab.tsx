import { useState } from "react";
import EcoVision from "./EcoVision";
import { ConnectionControls, TrayPreview, DecisionCard } from "./Pipeline";
import { useFinalRound } from "./FinalRoundContext";
import {
  componentKeys,
  componentLabels,
  estimateGrams,
} from "../lib/final-round.mjs";
import type { Values } from "../lib/contracts";
import { number } from "./format";
const presets = [
  {
    title: "Ảnh khay thực tế",
    real: true,
    values: { rice: 50, vegetables: 100, main: 100 },
  },
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
    [values, setValues] = useState(initial);
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
            Thêm mẫu cân trong Ghi nhận khay → QuickLog để cập nhật hệ số tại
            đây.
          </p>
        </div>
      </div>
    </section>
  );
}
export default function VisionLab() {
  const f = useFinalRound(),
    [view, setView] = useState<"sandbox" | "iot">("sandbox"),
    [preset, setPreset] = useState(1);
  return (
    <>
      <div className="subtabs" role="group" aria-label="Chế độ Vision">
        <button
          aria-pressed={view === "iot"}
          className={view === "iot" ? "selected" : ""}
          onClick={() => setView("iot")}
        >
          Trạm phần cứng
        </button>
        <button
          aria-pressed={view === "sandbox"}
          className={view === "sandbox" ? "selected" : ""}
          onClick={() => setView("sandbox")}
        >
          Phân tích ảnh khay
        </button>
      </div>
      {view === "iot" ? (
        <>
          <ConnectionControls />
          <div className="iot-metrics">
            <article>
              <span>Định dạng thiết bị</span>
              <strong>800×600 JPEG</strong>
              <small>~45 KB/ảnh · thông số mục tiêu</small>
            </article>
            <article>
              <span>Độ trễ xử lý</span>
              <strong>
                {f.source === "hardware" &&
                f.state.capture?.latencyMs !== undefined
                  ? f.state.capture.latencyMs + " ms"
                  : "Chưa đo"}
              </strong>
              <small>680 ms là mục tiêu, chưa được đo xác nhận</small>
            </article>
            <article>
              <span>Trạng thái khay</span>
              <strong>
                {
                  (
                    {
                      QUEUED: "Đang xếp hàng",
                      PROCESSING: "Đang phân tích",
                      COMPLETED: "Đã xử lý",
                      FAILED: "Xử lý thất bại",
                    } as const
                  )[f.state.capture?.status ?? "QUEUED"]
                }
              </strong>
              <small>{f.state.capture?.captureId ?? "Chưa có khay"}</small>
            </article>
          </div>
          <div className="vision-layout">
            <section className="panel">
              <div className="section-heading">
                <h2>Ảnh từ trạm</h2>
                <span className="badge">
                  {f.source === "hardware" ? "Phần cứng" : "Mô phỏng"}
                </span>
              </div>
              <TrayPreview capture={f.state.capture} />
              {f.state.capture?.status === "FAILED" && (
                <p role="status">{f.state.capture.errorMessage}</p>
              )}
              <p className="fine">
                Ảnh JPEG thô được xếp hàng; AWS/Lambda gửi kết quả về mới hiển
                thị phần trăm. Không tự tạo kết quả AI.
              </p>
            </section>
            <section className="panel">
              <h2>Quy đổi & quyết định</h2>
              <div className="gram-results">
                {componentKeys.map((k) => {
                  const g = estimateGrams(
                    f.state.capture?.result?.[k],
                    f.fullPortion(k),
                  );
                  return (
                    <p key={k}>
                      {componentLabels[k]}{" "}
                      <b>
                        {g === null ? "Chưa có mẫu cân" : g + " g (ước lượng)"}
                      </b>
                    </p>
                  );
                })}
              </div>
              <DecisionCard />
            </section>
          </div>
        </>
      ) : (
        <>
          <EcoVision />
          <details className="vision-scenarios"><summary>Thử kịch bản mô phỏng <span>Khám phá các mức phần còn lại</span></summary>
          <p className="sandbox-note">
            Có 1 ảnh khay thực tế đã gán nhãn và 5 kịch bản số liệu để thử tương
            tác. Ảnh món ăn từ Portal không được dùng thay cho ảnh khay thừa.
            Tải ảnh cùng bố cục đã hiệu chuẩn để thử phân tích.
          </p>
          <div className="preset-grid">
            {presets.map((p, i) => p.real ? null : (
              <button
                key={p.title}
                aria-pressed={preset === i}
                className={preset === i ? "selected" : ""}
                onClick={() => setPreset(i)}
              >
                {p.real ? (
                  <img
                    src="./tray-demo/portal.ptnk.png"
                    alt="Khay thực tế đã gán nhãn"
                  />
                ) : (
                  <span className="preset-tray" aria-hidden="true">
                    ▥
                  </span>
                )}
                <strong>{p.title}</strong>
                <small>
                  {p.real ? "Ảnh thật · nhãn tham chiếu" : "Kịch bản mô phỏng"}
                </small>
              </button>
            ))}
          </div>
          <ScenarioSandbox key={preset} initial={presets[preset].values} />
          </details>
        </>
      )}
      <details className="method-details">
        <summary>Giới hạn phương pháp & dữ liệu</summary>
        <p>
          Mô hình hiện tại dùng vùng khay cố định và diện tích màu so với một
          ảnh gán nhãn. Chưa có bộ đánh giá độc lập đủ lớn để công bố độ chính
          xác. Ảnh khác bố cục bị từ chối, không tạo dự đoán tùy ý.
        </p>
        <p>
          Khối lượng ước lượng lấy hệ số từ QuickLog; ảnh nguồn và bản ghi cân
          được lưu tách biệt. Không dùng nhận diện khuôn mặt.
        </p>
      </details>
    </>
  );
}
