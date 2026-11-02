import { useState } from "react";
import {
  defaultPriorityThresholds,
  menuPriority,
  priorityThresholdError,
} from "../lib/analytics.mjs";

export type Thresholds = typeof defaultPriorityThresholds;
type Metric = { mean: number | null; n: number };
type Field = keyof Thresholds;

const fields: { key: Field; label: string; hint: string; unit: string; max: number }[] = [
  { key: "high", label: "Mức Cao", hint: "Phần rau còn lại từ mức này trở lên", unit: "%", max: 100 },
  { key: "medium", label: "Mức Trung bình", hint: "Từ mức này đến dưới mức Cao; thấp hơn là Theo dõi", unit: "%", max: 100 },
  { key: "minSamples", label: "Số quan sát tối thiểu", hint: "Ít hơn số này thì ghi Chưa đủ mẫu", unit: "quan sát", max: 100000 },
];
const levels = [
  { level: "high", label: "Cao" },
  { level: "medium", label: "Trung bình" },
  { level: "watch", label: "Theo dõi" },
  { level: "insufficient", label: "Chưa đủ mẫu" },
];

export default function PriorityThresholds({
  value,
  menus,
  onSave,
}: {
  value: Thresholds;
  menus: { vegetables: Metric }[];
  onSave: (next: Thresholds) => void;
}) {
  const [draft, setDraft] = useState<Record<Field, string>>({
    high: String(value.high),
    medium: String(value.medium),
    minSamples: String(value.minSamples),
  });
  const parsed: Thresholds = {
    high: draft.high.trim() ? Number(draft.high) : NaN,
    medium: draft.medium.trim() ? Number(draft.medium) : NaN,
    minSamples: draft.minSamples.trim() ? Number(draft.minSamples) : NaN,
  };
  const error = priorityThresholdError(parsed);
  const unchanged = fields.every(({ key }) => parsed[key] === value[key]);
  const isDefault = fields.every(({ key }) => parsed[key] === defaultPriorityThresholds[key]);
  const count = (level: string) =>
    error ? "—" : menus.filter((m) => menuPriority(m, parsed).level === level).length;
  return (
    <section className="panel priority-settings">
      <div className="section-heading">
        <div>
          <h2>Cấu hình ngưỡng ưu tiên</h2>
          <p>
            Áp dụng cho cột Ưu tiên, Món cần xem xét và Ưu tiên trong kỳ. Lưu trên trình duyệt này, không gửi lệnh tới bếp.
          </p>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!error) onSave(parsed);
        }}
      >
        <div className="threshold-fields">
          {fields.map(({ key, label, hint, unit, max }) => (
            <label key={key}>
              <strong>{label}</strong>
              <span className="threshold-input">
                <input
                  type="number"
                  inputMode="decimal"
                  min={key === "minSamples" ? 1 : 0}
                  max={max}
                  step={key === "minSamples" ? 1 : "any"}
                  value={draft[key]}
                  aria-invalid={Boolean(error)}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                />
                <small>{unit}</small>
              </span>
              <small>{hint}</small>
            </label>
          ))}
        </div>
        {error && (
          <p className="threshold-error" role="alert">
            {error}
          </p>
        )}
        <div className="threshold-preview" aria-live="polite">
          <strong>Xem trước trên {menus.length} món của toàn bộ dữ liệu</strong>
          <ul>
            {levels.map(({ level, label }) => (
              <li key={level}>
                <span className={`priority-pill priority-${level}`}>{label}</span>
                <b>{count(level)}</b>
              </li>
            ))}
          </ul>
        </div>
        <div className="threshold-actions">
          <button
            type="button"
            disabled={isDefault}
            onClick={() =>
              setDraft({
                high: String(defaultPriorityThresholds.high),
                medium: String(defaultPriorityThresholds.medium),
                minSamples: String(defaultPriorityThresholds.minSamples),
              })
            }
          >
            Về mặc định
          </button>
          <button type="submit" className="primary" disabled={Boolean(error) || unchanged}>
            Lưu ngưỡng
          </button>
        </div>
      </form>
    </section>
  );
}
