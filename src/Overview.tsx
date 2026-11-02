import { daily, menuStats, needsReview, overall, portalMenus } from "../lib/analytics.mjs";
import type { Thresholds } from "./PriorityThresholds";
import { summarize } from "../lib/core.mjs";
import type { ComponentKey, TrayRow } from "../lib/contracts";
import { number, percent } from "./format";
import Icon from "./Icon";
import TrendChart from "./TrendChart";
import ComponentDonut from "./ComponentDonut";
import { ZoomableImage } from "./ImageZoom";
import MenuTable from "./MenuTable";

const components: { key: ComponentKey; label: string }[] = [
  { key: "rice", label: "Cơm" },
  { key: "vegetables", label: "Rau" },
  { key: "main", label: "Món chính" },
];
export default function Overview({
  rows,
  mode,
  thresholds,
  isToday,
  onShowAll,
  onDish,
  onMenus,
  onRecord,
  onImport,
}: {
  rows: TrayRow[];
  mode: string;
  thresholds: Thresholds;
  isToday: boolean;
  /** Có khi nguồn còn dữ liệu ngoài phạm vi thời gian đang xem. */
  onShowAll?: () => void;
  onDish: (name: string) => void;
  onMenus: () => void;
  onRecord: () => void;
  onImport: () => void;
}) {
  const menus = menuStats(rows),
    stats = summarize(rows),
    days = daily(rows);
  const priority = menus.filter((m) => needsReview(m, thresholds));
  const observations = components.reduce(
    (total, { key }) => total + stats[key].n,
    0,
  );
  const first = priority[0];
  const photo =
    mode === "demo" && first
      ? portalMenus.find((m) => m.name === first.menu)?.images.at(-1)?.path
      : undefined;
  return (
    <div className="overview-content">
      <div className="overview-top">
      <section
        className={`decision-brief ${!rows.length ? "is-empty" : ""}`}
        aria-labelledby="decision-title"
      >
        <div className="decision-main">
          <div className="decision-status">
            <span className={first ? "status-dot attention" : "status-dot"} />
            {first
              ? "Cần bếp xem xét"
              : rows.length
                ? "Tiếp tục theo dõi"
                : onShowAll
                  ? isToday
                    ? "Chưa có dữ liệu hôm nay"
                    : "Chưa có dữ liệu trong phạm vi này"
                  : "Chưa có dữ liệu phân tích"}
          </div>
          <h2 id="decision-title">
            {first
              ? `${priority.length} món cần xem lại phần rau`
              : rows.length
                ? "Chưa có món ưu tiên về rau."
                : onShowAll
                  ? isToday
                    ? "Hôm nay chưa có khay nào được ghi nhận."
                    : "Không có khay trong phạm vi đang xem."
                  : "Bắt đầu từ một khay ăn."}
          </h2>
          <p>
            {first ? (
              <>
                Ưu tiên <strong>{first.menu}</strong>: rau còn lại{" "}
                <strong>{percent(first.vegetables.mean)}</strong>. Khảo sát khẩu
                vị và cách chế biến trước khi đổi khẩu phần.
              </>
            ) : rows.length ? (
              "Chưa có món đủ điều kiện ưu tiên về rau. Xem cả Cơm, Rau và Món chính; bổ sung quan sát trước khi quyết định."
            ) : onShowAll ? (
              "Ghi nhận khay mới, hoặc xem toàn bộ thời gian để phân tích dữ liệu đã có."
            ) : (
              "Ghi nhận khay hoặc nhập CSV để xem phần còn lại theo món và nhận khuyến nghị cho bếp."
            )}
          </p>
          <div className="decision-actions">
            <button
              className="primary"
              onClick={() =>
                first
                  ? onDish(first.menu)
                  : rows.length
                    ? onMenus()
                    : onRecord()
              }
            >
              {first
                ? "Xem món ưu tiên"
                : rows.length
                  ? "Xem thực đơn"
                  : onShowAll
                    ? "Ghi nhận khay"
                    : "Ghi nhận khay đầu tiên"}
              <Icon name="arrow" size={17} />
            </button>
            {!rows.length &&
              (onShowAll ? (
                <button onClick={onShowAll}>Xem toàn bộ thời gian</button>
              ) : (
                <button onClick={onImport}>Nhập CSV</button>
              ))}
            <span>
              {first
                ? "Bếp duyệt trước khi điều chỉnh"
                : "Dữ liệu được phân tích theo từng nguồn"}
            </span>
          </div>
        </div>
        {photo && <figure className="decision-photo"><ZoomableImage src={"." + photo} label={first!.menu} alt={`Khay món ${first!.menu} từ Portal PTNK`} width={800} height={600} fetchPriority="high" /><figcaption><Icon name="leaf" size={20} /><span><strong>{percent(first!.vegetables.mean)}</strong><small>rau còn lại</small></span></figcaption></figure>}
      </section>
        {first ? (
          <div className="priority-preview">
            <div className="priority-list">
              <h3>Ưu tiên trong kỳ</h3>
              {priority.slice(0, 3).map((m) => (
                <button key={m.menu} onClick={() => onDish(m.menu)}>
                  <span>{m.menu}</span>
                  <strong>{percent(m.vegetables.mean)}</strong>
                  <Icon name="arrow" size={15} />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {rows.length > 0 && <>
      <section
        className="overview-metrics"
        aria-label="Số liệu trong kỳ đang xem"
      >
        <div>
          <Icon name="tray" size={23} />
          <span>Khay ghi nhận</span>
          <strong>{number(rows.length)}</strong>
          <small>{days.length} ngày có dữ liệu</small>
        </div>
        <div>
          <Icon name="overview" size={23} />
          <span>Thức ăn còn lại</span>
          <strong>{percent(overall(rows))}</strong>
          <small>Trên các thành phần hợp lệ</small>
        </div>
        <div>
          <Icon name="data" size={23} />
          <span>Quan sát hợp lệ</span>
          <strong>
            {rows.length
              ? percent((observations / (rows.length * 3)) * 100)
              : "—"}
          </strong>
          <small>{number(observations)} quan sát thành phần</small>
        </div>
        <div>
          <Icon name="menus" size={23} />
          <span>Món cần xem xét</span>
          <strong>
            {priority.length}
            <small> món</small>
          </strong>
          <small>Trong {menus.length} món đã ghi nhận</small>
        </div>
      </section>

      <div className="overview-charts">
        <section className="panel trend-panel">
          <div className="section-heading">
            <div>
              <h2>{days.length === 1 ? "Phần còn lại trong ngày" : "Phần còn lại qua từng ngày"}</h2>
            </div>
          </div>
          <TrendChart data={days} />
        </section>
        <section className="panel composition">
          <div className="section-heading">
            <h2>Theo thành phần</h2>
          </div>
          <div className="composition-body">
            <ComponentDonut
              items={components.map(({ key, label }) => ({ key, label, mean: stats[key].mean }))}
              observations={observations}
            />
            <div className="composition-bars">
              {components.map(({ key, label }, i) => (
                <div className="component-bar" key={key}>
                  <div>
                    <span>
                      <i className={`food-dot food-${i}`} />
                      {label}
                    </span>
                    <strong>{percent(stats[key].mean)}</strong>
                  </div>
                  <div className="track">
                    <span
                      className={`fill food-bg-${i}`}
                      style={{ width: `${stats[key].mean ?? 0}%` }}
                    />
                  </div>
                  <small>{number(stats[key].n)} quan sát hợp lệ</small>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <section className="panel overview-menu-table">
        <div className="section-heading">
          <div>
            <h2>Thực đơn cần theo dõi</h2>
          </div>
          <button className="text-button" onClick={onMenus}>
            Xem {menus.length} món
            <Icon name="arrow" size={16} />
          </button>
        </div>
        <MenuTable
          thresholds={thresholds}
          menus={menus.slice(0, 5)}
          showSource={mode === "demo"}
          onSelect={onDish}
        />
      </section>
      </>}
    </div>
  );
}
