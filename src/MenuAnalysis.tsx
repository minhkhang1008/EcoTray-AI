import { useMemo, useState } from "react";
import { daily, menuPriority, menuStats } from "../lib/analytics.mjs";
import {
  analysisActions,
  analysisInsights,
  analysisMetrics,
  analysisSummary,
  axisMax,
  previousPeriodChange,
  rankMenus,
} from "../lib/menu-analysis.mjs";
import type { ComponentKey, TrayRow } from "../lib/contracts";
import { chartColors } from "./chartColors";
import { number, percent } from "./format";
import type { Thresholds } from "./PriorityThresholds";
import TrendChart from "./TrendChart";
import Icon from "./Icon";

type Metric = "vegetables" | "rice" | "main" | "overall";
type RankItem = { menu: ReturnType<typeof menuStats>[number]; mean: number; n: number };
const parts: { key: ComponentKey; label: string }[] = [
  { key: "rice", label: "Cơm" },
  { key: "vegetables", label: "Rau" },
  { key: "main", label: "Món chính" },
];
const metricColor = (metric: Metric) =>
  metric === "overall" ? "#3f5a4c" : chartColors[metric];
// Cùng một sắc độ để bậc ưu tiên đọc được mà không thêm màu mới.
const tierColors: Record<string, string> = {
  high: "#0d6a3d",
  medium: "#5f9c7c",
  watch: "#b9d4c4",
};

function Scale({ max }: { max: number }) {
  return (
    <div className="rank-axis" aria-hidden="true">
      <span />
      <span className="rank-axis-labels">
        {Array.from({ length: 6 }, (_, i) => <small key={i} data-tick={`${number(max * i / 5)}%`} />)}
      </span>
      <span />
    </div>
  );
}

export default function MenuAnalysis({
  rows,
  history,
  mode,
  thresholds,
  onDish,
}: {
  rows: TrayRow[];
  /** Cùng bộ lọc món nhưng không giới hạn thời gian, để so với kỳ trước và vẽ xu hướng. */
  history: TrayRow[];
  mode: string;
  thresholds: Thresholds;
  onDish: (name: string) => void;
}) {
  const [metric, setMetric] = useState<Metric>("vegetables");
  const menus = useMemo(() => menuStats(rows), [rows]);
  const scopedDays = useMemo(() => daily(rows), [rows]);
  const historyDays = useMemo(() => daily(history), [history]);
  const days = scopedDays.length > 1 ? scopedDays : historyDays;
  const ranking: RankItem[] = rankMenus(menus, metric, thresholds);
  const summary = analysisSummary(rows, metric, thresholds);
  const insights = analysisInsights(rows, metric, thresholds);
  const actions = analysisActions(rows, thresholds);
  const metricLabel = analysisMetrics.find((m: { key: string }) => m.key === metric)!.label;
  const max = axisMax(ranking.map((item) => item.mean));
  const dotMax = axisMax(
    ranking.flatMap(({ menu }) => parts.map(({ key }) => menu[key].mean ?? 0)),
  );
  const attention = summary.attention;
  const change = attention ? previousPeriodChange(history, rows, attention.key) : null;
  if (!rows.length)
    return (
      <div className="empty">
        Chưa có dữ liệu để phân tích trong phạm vi này. Thử chọn khoảng thời gian rộng hơn.
      </div>
    );
  return (
    <div className="menu-analysis">
      <section className="analysis-hero" aria-label="Chỉ số phân tích">
        <div className="analysis-lead">
          <span className="analysis-lead-icon"><Icon name="leaf" size={24} /></span>
          <div className="analysis-lead-value">
            <p>{attention ? `${attention.label} còn lại trung bình` : "Chưa có quan sát hợp lệ"}</p>
            <strong>{percent(attention?.mean)}</strong>
          </div>
          <div className="analysis-lead-side">
            {change !== null && (
              <>
                <span className="analysis-delta">
                  {change > 0 ? "▲ +" : change < 0 ? "▼ −" : ""}
                  {number(Math.abs(change))} điểm %
                </span>
                <small>so với kỳ trước</small>
              </>
            )}
            <small>
              {attention ? `${number(attention.n)} quan sát` : ""}
              {attention && mode === "demo" ? " · " : ""}
              {mode === "demo" ? "Dữ liệu minh họa" : ""}
            </small>
          </div>
        </div>
        <dl className="analysis-figures">
          <div>
            <Icon name="menus" size={23} />
            <dt>Món cần xem xét</dt>
            <dd>{summary.review}</dd>
            <small>Trong {summary.menuCount} món đã ghi nhận</small>
          </div>
          <div>
            <Icon name="tray" size={23} />
            <dt>Khay hợp lệ</dt>
            <dd>{number(summary.validTrays)}</dd>
            <small>Trên {number(summary.trays)} khay ghi nhận</small>
          </div>
        </dl>
      </section>

      <div className="analysis-columns">
        <section className="analysis-section">
          <header className="analysis-section-head">
            <div>
              <h2>
                {metric === "overall"
                  ? "Những món còn lại nhiều nhất"
                  : `Những món có tỷ lệ ${metricLabel.toLowerCase()} còn lại cao nhất`}
              </h2>
              <p>Thang 0–{max}%. Bấm vào món để xem chi tiết.</p>
            </div>
            <div className="analysis-switch" role="group" aria-label="Thành phần xếp hạng">
              {analysisMetrics.map((m: { key: Metric; label: string }) => (
                <button key={m.key} aria-pressed={metric === m.key} onClick={() => setMetric(m.key)}>
                  {m.label}
                </button>
              ))}
            </div>
          </header>
          {ranking.length ? (
            <>
              <ol className="rank-chart">
                {ranking.map((item) => {
                  const priority = menuPriority(item.menu, thresholds);
                  return (
                    <li key={item.menu.menu}>
                      <button
                        onClick={() => onDish(item.menu.menu)}
                        title={`${item.menu.menu}: ${percent(item.mean)} · ${number(item.n)} quan sát`}
                      >
                        <span className="rank-name">{item.menu.menu}</span>
                        <span className="rank-track">
                          <i
                            style={{
                              width: `${(item.mean / max) * 100}%`,
                              background:
                                metric === "vegetables"
                                  ? tierColors[priority.level]
                                  : metricColor(metric),
                            }}
                          />
                          <b style={{ left: `${(item.mean / max) * 100}%` }}>{percent(item.mean)}</b>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <Scale max={max} />
              {metric === "vegetables" && (
                <div className="analysis-tiers">
                  <span><i style={{ background: tierColors.high }} />Cao, từ {thresholds.high}%</span>
                  <span><i style={{ background: tierColors.medium }} />Trung bình, từ {thresholds.medium}%</span>
                  <span><i style={{ background: tierColors.watch }} />Theo dõi</span>
                </div>
              )}
            </>
          ) : (
            <div className="empty">Chưa có món đủ quan sát cho thành phần này.</div>
          )}
        </section>
        <section className="analysis-section analysis-text analysis-insights">
          <h2><Icon name="chart" size={21} /> Nhận định</h2>
          <ul>
            {insights.map((text: string) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className="analysis-columns">
        <section className="analysis-section analysis-trend">
          <header className="analysis-section-head">
            <div>
              <h2>{days.length === 1 ? "Phần còn lại trong ngày" : "Xu hướng phần còn lại theo ngày"}</h2>
              <p>
                Tỷ lệ trung bình trên mỗi khay
                {scopedDays.length === 1 && days.length > 1 ? ", gồm mọi ngày có dữ liệu" : ""}.
              </p>
            </div>
          </header>
          <TrendChart data={days} />
        </section>
        <section className="analysis-section analysis-text analysis-actions">
          <h2><Icon name="bulb" size={21} /> Gợi ý cho bếp</h2>
          {actions.length ? (
            <ul>
              {actions.map((text: string) => (
                <li key={text}><Icon name="check" size={20} /><span>{text}</span></li>
              ))}
            </ul>
          ) : (
            <p>Chưa có việc cần xem xét theo ngưỡng hiện tại.</p>
          )}
          <small>Đây là gợi ý để bếp cân nhắc, không tự động thay đổi thực đơn.</small>
        </section>
      </div>

      {ranking.length > 0 && (
        <details className="analysis-section analysis-compare">
          <summary>So sánh Cơm, Rau, Món chính theo món</summary>
          <p>Mỗi chấm là một tỷ lệ riêng trên cùng thang 0–{dotMax}%, không cộng dồn thành một tổng.</p>
          <div className="dot-legend">
            {parts.map((p) => (
              <span key={p.key}>
                <i className={`dot dot-${p.key}`} style={{ background: chartColors[p.key] }} />
                {p.label}
              </span>
            ))}
          </div>
          <ul className="dot-chart">
            {ranking.map(({ menu }) => (
              <li key={menu.menu}>
                <button onClick={() => onDish(menu.menu)}>
                  <span className="rank-name">{menu.menu}</span>
                  <span className="dot-track">
                    {parts.map(({ key, label }) =>
                      menu[key].mean === null ? null : (
                        <i
                          key={key}
                          className={`dot dot-${key}`}
                          title={`${label}: ${percent(menu[key].mean)} · ${number(menu[key].n)} quan sát`}
                          style={{
                            left: `${(menu[key].mean / dotMax) * 100}%`,
                            background: chartColors[key],
                          }}
                        />
                      ),
                    )}
                  </span>
                  <span className="stack-values">
                    {parts.map(({ key }) => percent(menu[key].mean)).join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
