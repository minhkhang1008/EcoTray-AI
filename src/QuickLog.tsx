import { useState, type FormEvent } from "react";
import { useFinalRound } from "./FinalRoundContext";
import {
  componentKeys,
  componentLabels,
  calibrateWeights,
} from "../lib/final-round.mjs";
import type { ComponentKey } from "../lib/contracts";
import { number, dateLabel, csvCell, downloadCsv } from "./format";
export default function QuickLog() {
  const f = useFinalRound(),
    [component, setComponent] = useState<ComponentKey>("rice"),
    [pct, setPct] = useState("50"),
    [grams, setGrams] = useState(""),
    [status, setStatus] = useState("");
  function save(event: FormEvent) {
    event.preventDefault();
    try {
      const percent = Number(pct),
        weight = Number(grams);
      if (!grams.trim()) throw Error("Nhập khối lượng từ cân mẫu.");
      calibrateWeights([{ percent, grams: weight }]);
      f.setSamples((old) => [
        ...old,
        {
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          component,
          percent,
          grams: weight,
          source: "measured-reference",
        },
      ]);
      setStatus("Đã lưu hệ số cân cho mục Thử kịch bản trong Vision. Bộ ảnh PTNK vẫn dùng định lượng giả định.");
      setGrams("");
    } catch (e) {
      setStatus((e as Error).message);
    }
  }
  function exportSamples() {
    downloadCsv(
      "EcoTray-mau-can.csv",
      [
        "at,component,area_percent,grams,source",
        ...f.samples.map((s) =>
          [s.at, componentLabels[s.component], s.percent, s.grams, s.source]
            .map(csvCell)
            .join(","),
        ),
      ].join("\n"),
    );
  }
  return (
    <section className="panel calibration-log">
      <div className="section-heading">
        <div>
          <h2>Hiệu chuẩn bằng cân mẫu</h2>
          <p>Cân phần thức ăn còn lại sau khi trừ bì khay.</p>
        </div>
        <button onClick={exportSamples} disabled={!f.samples.length}>
          Xuất mẫu cân CSV
        </button>
      </div>
      <form onSubmit={save} className="calibration-form">
        <label>
          Thành phần
          <select
            value={component}
            onChange={(e) => setComponent(e.target.value as ComponentKey)}
          >
            {componentKeys.map((k) => (
              <option value={k} key={k}>
                {componentLabels[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          % diện tích còn lại
          <input
            type="number"
            required
            min="0.1"
            max="100"
            step="0.1"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
          />
        </label>
        <label>
          Khối lượng thực cân (g)
          <input
            type="number"
            required
            min="0"
            max="3000"
            step="0.1"
            placeholder="Ví dụ: 95"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
          />
        </label>
        <button className="primary" type="submit">
          Lưu mẫu cân
        </button>
      </form>
      {status && (
        <p className="inline-status" role="status">
          {status}
        </p>
      )}
      <div className="calibration-coefficients">
        {componentKeys.map((k) => (
          <article key={k}>
            <span>{componentLabels[k]}</span>
            <strong>
              {f.fullPortion(k)
                ? number(f.fullPortion(k)!) + " g"
                : "Chưa có mẫu"}
            </strong>
            <small>Khối lượng tham chiếu đủ khẩu phần</small>
          </article>
        ))}
      </div>
      <p className="fine">
        Ước lượng g ≈ (% diện tích / 100) × khối lượng tham chiếu. Hệ số được
        khớp bình phương tối thiểu qua gốc từ các mẫu cân; diện tích và khối
        lượng không luôn tuyến tính. Cần đo nhiều góc/độ dày trước khi dùng
        trong vận hành. Mẫu hiệu chuẩn dùng trong Vision → Thử kịch bản, không thay định lượng giả định của mô hình PTNK và không tính là khay khảo sát.
      </p>
      {f.samples.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Thành phần</th>
                <th>Diện tích</th>
                <th>Cân mẫu</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {f.samples
                .slice(-10)
                .reverse()
                .map((s) => (
                  <tr key={s.id}>
                    <td>{dateLabel(s.at)}</td>
                    <td>{componentLabels[s.component]}</td>
                    <td>{number(s.percent)}%</td>
                    <td>{number(s.grams)} g</td>
                    <td>
                      <button
                        onClick={() =>
                          f.setSamples((old) =>
                            old.filter((x) => x.id !== s.id),
                          )
                        }
                        aria-label={`Xóa mẫu cân ${componentLabels[s.component]} ${s.grams} g`}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
