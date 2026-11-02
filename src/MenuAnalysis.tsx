import { useMemo, useState } from "react";
import { daily, menuStats } from "../lib/analytics.mjs";
import {
  analysisActions,
  analysisInsights,
  analysisMetrics,
  analysisSummary,
  rankMenus,
} from "../lib/menu-analysis.mjs";
import type { ComponentKey, TrayRow } from "../lib/contracts";
import { chartColors } from "./chartColors";
import { number, percent } from "./format";
import Icon from "./Icon";
import type { Thresholds } from "./PriorityThresholds";
import TrendChart from "./TrendChart";

type Metric = "vegetables" | "rice" | "main" | "overall";
const parts: { key: ComponentKey; label: string }[] = [
  { key: "rice", label: "Cơm" },
  { key: "vegetables", label: "Rau" },
  { key: "main", label: "Món chính" },
];
const metricColor = (metric: Metric) =>
  metric === "overall" ? "#3f5a4c" : chartColors[metric];

export default function MenuAnalysis({
  rows,
  mode,
  thresholds,
  onDish,
}: {
  rows: TrayRow[];
  mode: string;
  thresholds: Thresholds;
  onDish: (name: string) => void;
}) {
  const [metric, setMetric] = useState<Metric>("vegetables");
  const menus = useMemo(() => menuStats(rows), [rows]);
  const days = useMemo(() => daily(rows), [rows]);
  const ranking = rankMenus(menus, metric, thresholds);
  const summary = analysisSummary(rows, metric, thresholds);
  const insights = analysisInsights(rows, metric, thresholds);
  const actions = analysisActions(rows, thresholds);
  const metricLabel = analysisMetrics.find((m: { key: string }) => m.key === metric)!.label;
  const scale = Math.max(1, ...ranking.map((item: { mean: number }) => item.mean));
  const stacks = ranking.map(({ menu }: { menu: (typeof menus)[number] }) => menu);
  const stackScale = Math.max(
    1,
    ...stacks.map((menu: (typeof menus)[number]) =>
      parts.reduce((total, { key }) => total + (menu[key].mean ?? 0), 0),
    ),
  );
  if (!rows.length)
    return (
      <div className="empty">
        Chưa có dữ liệu để phân tích trong phạm vi này. Thử chọn khoảng thời gian rộng hơn.
      </div>
    );
  return (
    <div className="menu-analysis">
      {mode === "demo" && (
        <p className="analysis-note">
          <Icon name="info" size={16} /> Đang dùng bộ dữ liệu minh họa của PTNK; nhận định dưới đây chưa phải kết quả đo thực tế.
        </p>
      )}
      <section className="overview-metrics" aria-label="Chỉ số phân tích">
        <div>
          <Icon name="chart" size={23} />
          <span>Món còn lại cao nhất · {metricLabel}</span>
          <strong className="analysis-top-dish">
            {summary.top ? percent(summary.top.mean) : "—"}
          </strong>
          <small>{summary.top ? summary.top.menu.menu : "Chưa có món đủ quan sát"}</small>
        </div>
        <div>
          <Icon name="overview" size={23} />
          <span>Rau còn lại trung bình</span>
          <strong>{percent(summary.vegetables)}</strong>
          <small>{number(summary.vegetableObservations)} quan sát rau</small>
        </div>
        <div>
          <Icon name="menus" size={23} />
          <span>Món cần xem xét</span>
          <strong>
            {summary.review}
            <small> món</small>
          </strong>
          <small>Trong {summary.menuCount} món đã ghi nhận</small>
        </div>
        <div>
          <Icon name="tray" size={23} />
          <span>Khay hợp lệ</span>
          <strong>{number(summary.validTrays)}</strong>
          <small>Trên {number(summary.trays)} khay ghi nhận</small>
        </div>
      </section>

      <div className="analysis-row">
        <section className="panel">
          <div className="section-heading analysis-heading">
            <div>
              <h2>Món còn lại nhiều nhất</h2>
              <p>Bấm vào món để xem chi tiết</p>
            </div>
            <div className="segmented" role="group" aria-label="Thành phần xếp hạng">
              {analysisMetrics.map((m: { key: Metric; label: string }) => (
                <button
                  key={m.key}
                  aria-pressed={metric === m.key}
                  className={metric === m.key ? "selected" : ""}
                  onClick={() => setMetric(m.key)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {ranking.length ? (
            <ol className="rank-chart">
              {ranking.map((item: { menu: { menu: string }; mean: number; n: number }) => (
                <li key={item.menu.menu}>
                  <button
                    onClick={() => onDish(item.menu.menu)}
                    title={`${item.menu.menu}: ${percent(item.mean)} · ${number(item.n)} quan sát`}
                  >
                    <span className="rank-name">{item.menu.menu}</span>
                    <span className="rank-track">
                      <i
                        style={{
                          width: `${(item.mean / scale) * 100}%`,
                          background: metricColor(metric),
                        }}
                      />
                    </span>
                    <b>{percent(item.mean)}</b>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="empty">Chưa có món đủ quan sát cho thành phần này.</div>
          )}
        </section>
        <section className="panel analysis-text">
          <h2>Nhận định</h2>
          <ul>
            {insights.map((text: string) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Thành phần còn lại theo món</h2>
            <p>Cộng ba tỷ lệ để so sánh tương đối, không phải tổng 100% của một khay</p>
          </div>
        </div>
        <div className="chart-key">
          {parts.map((p) => (
            <span key={p.key}>
              <i style={{ background: chartColors[p.key] }} />
              {p.label}
            </span>
          ))}
        </div>
        <ul className="stack-chart">
          {stacks.map((menu: (typeof menus)[number]) => (
            <li key={menu.menu}>
              <button onClick={() => onDish(menu.menu)}>
                <span className="rank-name">{menu.menu}</span>
                <span className="stack-track">
                  {parts.map(({ key, label }) =>
                    menu[key].mean ? (
                      <i
                        key={key}
                        title={`${label}: ${percent(menu[key].mean)} · ${number(menu[key].n)} quan sát`}
                        style={{
                          width: `${(menu[key].mean / stackScale) * 100}%`,
                          background: chartColors[key],
                        }}
                      />
                    ) : null,
                  )}
                </span>
                <span className="stack-values">
                  {parts.map(({ key }) => percent(menu[key].mean)).join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="analysis-row">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>{days.length === 1 ? "Phần còn lại trong ngày" : "Xu hướng theo ngày"}</h2>
            </div>
          </div>
          <TrendChart data={days} />
        </section>
        <section className="panel analysis-text">
          <h2>Gợi ý cho bếp</h2>
          {actions.length ? (
            <ul>
              {actions.map((text: string) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          ) : (
            <p>Chưa có việc cần xem xét theo ngưỡng hiện tại.</p>
          )}
          <small>Đây là gợi ý để bếp cân nhắc, không tự động thay đổi thực đơn.</small>
        </section>
      </div>
    </div>
  );
}
