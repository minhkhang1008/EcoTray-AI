import { MealComboLine } from "./DecisionSupport";
import { useEffect, useMemo, useRef, useState } from "react";
import { daily, portalMenus } from "../lib/analytics.mjs";
import { summarize } from "../lib/core.mjs";
import {
  trimOutliers,
  componentKeys,
  componentLabels,
} from "../lib/final-round.mjs";
import type { TrayRow } from "../lib/contracts";
import { number, percent } from "./format";
import TrendChart from "./TrendChart";
export default function DishDrawer({
  name,
  rows,
  mode,
  onClose,
}: {
  name: string;
  rows: TrayRow[];
  mode: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [trim, setTrim] = useState(true),
    subset = useMemo(() => rows.filter((r) => r.menu === name), [rows, name]),
    filtered = useMemo(() => trimOutliers(subset), [subset]);
  const selected = trim ? filtered.rows : subset,
    stats = summarize(selected),
    days = daily(selected),
    portal = portalMenus.find((p) => p.name === name),
    image = portal?.images.at(-1)?.path;
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="dish-dialog"
      onCancel={onClose}
      onClose={onClose}
      aria-labelledby="dish-title"
    >
      <header className="section-heading">
        <div>
          <span className="eyebrow">CHI TIẾT THỰC ĐƠN</span>
          <h2 id="dish-title">{name}</h2>
        </div>
        <button autoFocus onClick={onClose} aria-label="Đóng chi tiết món">
          Đóng ×
        </button>
      </header>
      <div className="dish-detail-hero">
        {image ? (
          <figure>
            <img src={"." + image} alt={name} />
            <figcaption>
              Ảnh thật từ Portal PTNK ·{" "}
              {portal!.date.split("-").reverse().join("/")}
            </figcaption>
          </figure>
        ) : (
          <div className="empty">Chưa có ảnh nguồn cho món này.</div>
        )}
        <div>
          <span className="badge demo">
            {mode === "demo"
              ? "KHAY MÔ PHỎNG"
              : mode === "hardware"
                ? "DỮ LIỆU TỪ TRẠM"
                : "GHI NHẬN CỤC BỘ"}
          </span>
          <h3>{number(selected.length)} khay trong phân tích</h3>
          <p className="analysis-basis">
            {trim
              ? "Số liệu sau lọc dị ứng & ngoại lai IQR"
              : "Số liệu trước lọc ngoại lai"}
          </p>
          <div className="dish-component-stats">
            {componentKeys.map((k) => (
              <div key={k}>
                <span>{componentLabels[k]}</span>
                <strong>{percent(stats[k].mean)}</strong>
                <small>{stats[k].n} quan sát</small>
              </div>
            ))}
          </div>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={trim}
              onChange={(e) => setTrim(e.target.checked)}
            />
            Lọc dị ứng & ngoại lai IQR
          </label>
          <p className="fine">
            {filtered.flagged} mẫu có cờ cơ địa · {filtered.statistical} mẫu
            vượt ngưỡng IQR ·{" "}
            {filtered.total
              ? number((filtered.removed / filtered.total) * 100)
              : "0"}
            % được tách khi bật lọc.
          </p>
          <p className="fine">
            {mode === "demo"
              ? "Bộ CSV mô phỏng chưa có hồ sơ dị ứng: số mẫu có cờ bằng 0. "
              : ""}
            IQR chỉ phát hiện bất thường; không xác định nguyên nhân y tế.
          </p>
        </div>
      </div>
      <MealComboLine main={name} rows={subset} />
      {selected.some(r => typeof r.soup === "number") && <p className="fine">Canh: {(() => {
        const values = selected.flatMap(r => typeof r.soup === "number" ? [r.soup] : []);
        return `${values.length} quan sát · ${percent(values.reduce((x, y) => x + y, 0) / values.length)} còn lại trung bình`;
      })()}</p>}
      <section className="dish-trend">
        <h3>Phần còn lại theo ngày phục vụ</h3>
        {days.length === 1 && (
          <p className="fine">
            Món này chỉ có một ngày nguồn. Cần đo lại ở lần phục vụ sau để so
            sánh thực tế.
          </p>
        )}
        <TrendChart data={days} />

      </section>

    </dialog>
  );
}
