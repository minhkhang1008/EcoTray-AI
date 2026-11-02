import type { ComponentKey } from "../lib/contracts";
import { chartColors } from "./chartColors";
import { number, percent } from "./format";

const radius = 48;
const gap = 0.7;
// Bắt đầu từ đỉnh theo chiều kim đồng hồ: phần lớn nhất thường là Rau.
const order: ComponentKey[] = ["vegetables", "rice", "main"];

export default function ComponentDonut({
  items,
  observations,
}: {
  items: { key: ComponentKey; label: string; mean: number | null }[];
  observations: number;
}) {
  const total = items.reduce((sum, item) => sum + (item.mean ?? 0), 0);
  const segments = order
    .map((key) => items.find((item) => item.key === key)!)
    .filter((item) => (item.mean ?? 0) > 0)
    .map((item) => ({ ...item, share: ((item.mean ?? 0) / total) * 100 }));
  const summary = segments
    .map((s) => `${s.label} ${s.share.toFixed(0)}%`)
    .join(", ");
  let start = 0;
  return (
    <figure
      className="component-donut"
      role="img"
      aria-label={`Tỷ trọng giữa các thành phần theo mức còn lại trung bình: ${summary || "chưa có dữ liệu"}. ${number(observations)} quan sát hợp lệ.`}
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} className="component-donut-track" />
        {segments.map((s) => {
          const visible = segments.length > 1 ? Math.max(s.share - gap, 0.1) : 100;
          const offset = -start;
          start += s.share;
          return (
            <circle
              key={s.key}
              cx="60"
              cy="60"
              r={radius}
              pathLength={100}
              stroke={chartColors[s.key]}
              strokeDasharray={`${visible} ${100 - visible}`}
              strokeDashoffset={offset}
            >
              <title>{`${s.label}: còn lại ${percent(s.mean)}, chiếm ${s.share.toFixed(0)}% tổng ba thành phần`}</title>
            </circle>
          );
        })}
      </svg>
      <figcaption>
        <strong>{number(observations)}</strong>
        <span>
          quan sát
          <br />
          hợp lệ
        </span>
      </figcaption>
    </figure>
  );
}
