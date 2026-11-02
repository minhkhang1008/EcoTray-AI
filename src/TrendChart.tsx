import { useLayoutEffect, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { ComponentKey } from "../lib/contracts";
import { chartColors } from "./chartColors";
import { percent, number } from "./format";

type DailyPoint = { date: string; count: number } & Record<
  ComponentKey,
  { mean: number | null }
>;
const series: { key: ComponentKey; label: string; color: string }[] = [
  { key: "rice", label: "Cơm", color: chartColors.rice },
  { key: "vegetables", label: "Rau", color: chartColors.vegetables },
  { key: "main", label: "Món chính", color: chartColors.main },
];
const legendOrder: ComponentKey[] = ["vegetables", "rice", "main"];
const dateLabel = (date: string) => date.split("-").reverse().join("/");
const shortDate = (date: string) => `${date.slice(8)}/${date.slice(5, 7)}`;
const h = 240,
  left = 40,
  right = 18,
  top = 12,
  bottom = 28,
  cardWidth = 176,
  cardGap = 14,
  minTickSpacing = 64,
  minDotSpacing = 32;

export default function TrendChart({ data }: { data: DailyPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [plot, setPlot] = useState<HTMLDivElement | null>(null);
  const [w, setW] = useState(720);
  useLayoutEffect(() => {
    if (!plot) return;
    const measure = () => {
      const width = Math.round(plot.clientWidth);
      if (width > 0) setW(width);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(plot);
    return () => observer.disconnect();
  }, [plot]);
  if (!data.length)
    return (
      <div className="empty">Chưa có dữ liệu trong khoảng thời gian này.</div>
    );
  if (data.length === 1) return (
    <div className="table-scroll">
      <table>
        <thead><tr>{series.map(s => <th scope="col" key={s.key}>{s.label}</th>)}</tr></thead>
        <tbody><tr>{series.map(s => <td key={s.key}>{percent(data[0][s.key].mean)}</td>)}</tr></tbody>
      </table>
    </div>
  );
  const last = data.length - 1;
  const peak = Math.max(
    40,
    ...data.flatMap((d) => series.map((s) => d[s.key].mean ?? 0)),
  );
  const tickStep = peak > 60 ? 20 : 10;
  const max = Math.ceil(peak / tickStep) * tickStep;
  const yTicks = Array.from({ length: max / tickStep + 1 }, (_, t) => t * tickStep);
  const innerW = Math.max(w - left - right, 1);
  const y = (n: number) => top + (h - top - bottom) * (1 - n / max);
  const x = (i: number) => left + (innerW * i) / last;
  const spacing = innerW / last;
  const labelEvery = Math.ceil(minTickSpacing / spacing);
  const current = active !== null && active <= last ? active : null;
  const selected = current === null ? null : data[current];
  const cardLeft =
    current === null
      ? 0
      : x(current) + cardGap + cardWidth <= w
        ? x(current) + cardGap
        : Math.max(0, x(current) - cardGap - cardWidth);
  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const position = Math.round(((e.clientX - box.left - left) / innerW) * last);
    setActive(Math.min(last, Math.max(0, position)));
  };
  const step = (e: KeyboardEvent<HTMLDivElement>) => {
    const next: Record<string, number | null> = {
      ArrowLeft: Math.max(0, (current ?? data.length) - 1),
      ArrowRight: Math.min(last, (current ?? -1) + 1),
      Home: 0,
      End: last,
      Escape: null,
    };
    if (!(e.key in next)) return;
    e.preventDefault();
    setActive(next[e.key]);
  };
  return (
    <>
      <div className="chart-key">
        {legendOrder.map((key) => series.find((s) => s.key === key)!).map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div
        ref={setPlot}
        className="trend-plot"
        role="group"
        aria-label="Biểu đồ theo ngày. Dùng phím mũi tên trái, phải để xem số liệu từng ngày."
        tabIndex={0}
        onPointerDown={pick}
        onPointerMove={pick}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setActive(null);
        }}
        onKeyDown={step}
        onFocus={(e) => {
          if (e.currentTarget.matches(":focus-visible") && current === null) setActive(last);
        }}
        onBlur={() => setActive(null)}
      >
        <svg
          className="trend-chart"
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          role="img"
          aria-label="Xu hướng phần còn lại trung bình theo ngày và thành phần. Số liệu chi tiết có trong bảng bên dưới."
        >
          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={left}
                x2={w - right}
                y1={y(v)}
                y2={y(v)}
                stroke={v === 0 ? "#cfd9d1" : "#edf1ee"}
              />
              <text x={left - 10} y={y(v) + 4} textAnchor="end">
                {v}%
              </text>
            </g>
          ))}
          {data.map((d, i) =>
            (last - i) % labelEvery === 0 ? (
              <text
                key={d.date}
                className={i === current ? "is-active" : undefined}
                x={x(i)}
                y={h - 6}
                textAnchor="middle"
              >
                {shortDate(d.date)}
              </text>
            ) : null,
          )}
          {current !== null && (
            <line
              x1={x(current)}
              x2={x(current)}
              y1={top}
              y2={h - bottom}
              stroke="#64766c"
              strokeDasharray="3 4"
            />
          )}
          {series.map((s) => (
            <g key={s.key}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth="2.75"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={data
                  .map((d, i) =>
                    d[s.key].mean === null ? "" : `${x(i)},${y(d[s.key].mean!)}`,
                  )
                  .join(" ")}
              />
              {data.map((d, i) => {
                const mean = d[s.key].mean;
                if (mean === null || (i !== current && spacing < minDotSpacing)) return null;
                return (
                  <circle
                    key={d.date}
                    cx={x(i)}
                    cy={y(mean)}
                    r={i === current ? 6 : 4}
                    fill={i === current ? s.color : "#fff"}
                    stroke={i === current ? "#fff" : s.color}
                    strokeWidth={2}
                  />
                );
              })}
            </g>
          ))}
        </svg>
        {selected && (
          <div
            className="trend-card"
            role="status"
            style={{ width: cardWidth, transform: `translateX(${cardLeft}px)` }}
          >
            <header>
              <strong>{dateLabel(selected.date)}</strong>
              <span>{number(selected.count)} khay</span>
            </header>
            <dl>
              {series.map((s) => (
                <div key={s.key}>
                  <dt>
                    <i style={{ background: s.color }} />
                    {s.label}
                  </dt>
                  <dd>{percent(selected[s.key].mean)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
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
