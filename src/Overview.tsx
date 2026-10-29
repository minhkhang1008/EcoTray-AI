import { daily, menuStats, overall, portalMenus } from "../lib/analytics.mjs";
import { summarize } from "../lib/core.mjs";
import type { ComponentKey, TrayRow } from "../lib/contracts";
import { number, percent } from "./format";
import Icon from "./Icon";
import TrendChart from "./TrendChart";
import MenuTable from "./MenuTable";

const components: { key: ComponentKey; label: string }[] = [
  { key: "rice", label: "Cơm" },
  { key: "vegetables", label: "Rau" },
  { key: "main", label: "Món chính" },
];
export default function Overview({
  rows,
  mode,
  onDish,
  onMenus,
  onRecord,
  onImport,
}: {
  rows: TrayRow[];
  mode: string;
  onDish: (name: string) => void;
  onMenus: () => void;
  onRecord: () => void;
  onImport: () => void;
}) {
  const menus = menuStats(rows),
    stats = summarize(rows),
    days = daily(rows);
  const priority = menus.filter(
    (m) => m.vegetables.n >= 10 && m.vegetables.mean >= 20,
  );
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
                : "Chưa có dữ liệu phân tích"}
          </div>
          <h2 id="decision-title">
            {first
              ? `${priority.length} món cần xem lại phần rau`
              : rows.length
                ? "Chưa có món ưu tiên về rau."
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
                  : "Ghi nhận khay đầu tiên"}
              <Icon name="arrow" size={17} />
            </button>
            {!rows.length && <button onClick={onImport}>Nhập CSV</button>}
            <span>
              {first
                ? "Bếp duyệt trước khi điều chỉnh"
                : "Dữ liệu được phân tích theo từng nguồn"}
            </span>
          </div>
        </div>
        {first ? (
          <div className="priority-preview">
            {photo && (
              <img src={"." + photo} alt={`Món ${first.menu} từ Portal PTNK`} />
            )}
            <div className="priority-list">
              <h3>Ưu tiên trong kỳ</h3>
              {priority.slice(0, 3).map((m) => (
                <button key={m.menu} onClick={() => onDish(m.menu)}>
                  <span>{m.menu}</span>
                  <strong>{percent(m.vegetables.mean)}</strong>
                  <Icon name="arrow" size={15} />
                </button>
              ))}
              <small>
                Tỷ lệ trước lọc ngoại lai · Tối thiểu 10 quan sát/món
              </small>
            </div>
          </div>
        ) : null}
      </section>

      {rows.length > 0 && <>
      <section
        className="overview-metrics"
        aria-label="Số liệu trong kỳ đang xem"
      >
        <div>
          <span>Khay ghi nhận</span>
          <strong>{number(rows.length)}</strong>
          <small>{days.length} ngày có dữ liệu</small>
        </div>
        <div>
          <span>Phần còn lại trung bình</span>
          <strong>{percent(overall(rows))}</strong>
          <small>Trên các thành phần hợp lệ</small>
        </div>
        <div>
          <span>Quan sát hợp lệ</span>
          <strong>
            {rows.length
              ? percent((observations / (rows.length * 3)) * 100)
              : "—"}
          </strong>
          <small>{number(observations)} quan sát thành phần</small>
        </div>
        <div>
          <span>Thực đơn đã ghi nhận</span>
          <strong>
            {menus.length}
            <small> món</small>
          </strong>
          <small>{priority.length} món ưu tiên xem xét rau</small>
        </div>
      </section>

      <div className="overview-charts">
        <section className="panel trend-panel">
          <div className="section-heading">
            <div>
              <h2>Phần còn lại qua từng ngày</h2>
              <p>Đối chiếu ba thành phần để chọn đúng điều chỉnh.</p>
            </div>
          </div>
          <TrendChart data={days} />
        </section>
        <section className="panel composition">
          <div className="section-heading">
            <h2>Theo thành phần</h2>
            <span className="subtle">Bình quân</span>
          </div>
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
          <div className="component-footer">
            Tỷ lệ phần còn lại trên khay, chưa quy đổi khối lượng.
          </div>
        </section>
      </div>
      <section className="panel overview-menu-table">
        <div className="section-heading">
          <div>
            <h2>Thực đơn cần theo dõi</h2>
            <p>Xếp theo tỷ lệ rau còn lại, từ cao đến thấp.</p>
          </div>
          <button className="text-button" onClick={onMenus}>
            Xem {menus.length} món
            <Icon name="arrow" size={16} />
          </button>
        </div>
        <MenuTable
          menus={menus.slice(0, 5)}
          showSource={mode === "demo"}
          onSelect={onDish}
        />
      </section>
      </>}
    </div>
  );
}
