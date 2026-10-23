import { useState } from "react";
import type { ComponentKey } from "../lib/contracts";
import { percent, number } from "./format";

type DailyPoint = { date: string; count: number } & Record<
  ComponentKey,
  { mean: number | null }
>;
const series: { key: ComponentKey; label: string; color: string }[] = [
  { key: "vegetables", label: "Rau", color: "#237f67" },
  { key: "rice", label: "Cơm", color: "#8a9984" },
  { key: "main", label: "Món chính", color: "#ad8050" },
];
const dateLabel = (date: string) => date.split("-").reverse().join("/");
export default function TrendChart({ data }: { data: DailyPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const w = 800,
    h = 230,
    left = 38,
    right = 14,
    top = 16,
    bottom = 28;
  const max = Math.max(
    40,
    ...data.flatMap((d) => series.map((s) => d[s.key].mean ?? 0)),
  );
  const y = (n: number) => top + (h - top - bottom) * (1 - n / max);
  const x = (i: number) =>
    left + (w - left - right) * (data.length > 1 ? i / (data.length - 1) : 0.5);
  if (!data.length)
    return (
      <div className="empty">Chưa có dữ liệu trong khoảng thời gian này.</div>
    );
  const selected = active === null ? null : data[active];
  return (
    <>
      <div className="chart-key">
        {series.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg
        className="trend-chart"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label="Xu hướng phần còn lại trung bình theo ngày và thành phần. Số liệu chi tiết có trong bảng bên dưới."
      >
        {[0, 1, 2, 3, 4].map((t) => {
          const v = (max * t) / 4;
          return (
            <g key={t}>
              <line
                x1={left}
                x2={w - right}
                y1={y(v)}
                y2={y(v)}
                stroke="#e9eeeb"
                strokeDasharray="3 5"
              />
              <text x={left - 9} y={y(v) + 4} textAnchor="end">
                {v.toFixed(0)}%
              </text>
            </g>
          );
        })}
        {series.map((s) => (
          <g key={s.key}>
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              points={data
                .map((d, i) =>
                  d[s.key].mean === null ? "" : `${x(i)},${y(d[s.key].mean!)}`,
                )
                .join(" ")}
            />
            {data.length === 1 && data[0][s.key].mean !== null && (
              <circle
                cx={x(0)}
                cy={y(data[0][s.key].mean ?? 0)}
                r="4"
                fill={s.color}
              />
            )}
          </g>
        ))}
        {[
          ...new Set([
            0,
            Math.floor((data.length - 1) / 3),
            Math.floor(((data.length - 1) * 2) / 3),
            data.length - 1,
          ]),
        ].map((i) => (
          <text key={i} x={x(i)} y={h - 4} textAnchor="middle">
            {data[i].date.slice(8)}/{data[i].date.slice(5, 7)}
          </text>
        ))}
        {active !== null && active < data.length && (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={top}
            y2={h - bottom}
            stroke="#64766c"
            strokeDasharray="4 4"
          />
        )}
        {data.map((d, i) => (
          <rect
            key={d.date}
            x={x(i) - (w - left - right) / Math.max(data.length - 1, 1) / 2}
            y={top}
            width={(w - left - right) / Math.max(data.length - 1, 1)}
            height={h - top - bottom}
            fill="transparent"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <title>
              {dateLabel(d.date)}:{" "}
              {series
                .map((s) => `${s.label} ${percent(d[s.key].mean)}`)
                .join(", ")}
            </title>
          </rect>
        ))}
      </svg>
      <div className="chart-caption">
        {selected
          ? `${dateLabel(selected.date)} · ${series.map((s) => `${s.label} ${percent(selected[s.key].mean)}`).join(" · ")}`
          : "Tỷ lệ ước lượng trên các quan sát hợp lệ · Không quy đổi khối lượng"}
      </div>
      <details className="chart-data">
        <summary>Xem số liệu theo ngày</summary>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              Phần còn lại trung bình theo ngày phục vụ
            </caption>
            <thead>
              <tr>
                <th scope="col">Ngày</th>
                <th scope="col">Khay</th>
                {series.map((s) => (
                  <th scope="col" key={s.key}>
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date}>
                  <td>{dateLabel(d.date)}</td>
                  <td>{number(d.count)}</td>
                  {series.map((s) => (
                    <td key={s.key}>{percent(d[s.key].mean)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
