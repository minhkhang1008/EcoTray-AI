import { menuPriority, needsReview, portalMenus } from "../lib/analytics.mjs";
import type { Thresholds } from "./PriorityThresholds";
import Icon from "./Icon";
import { dishNumbers } from "../lib/boarding-menu.mjs";
import { ZoomableImage } from "./ImageZoom";
const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
const pct = (n: number | null) =>
  n === null
    ? "—"
    : n.toLocaleString("vi-VN", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }) + "%";
type Metric = { mean: number | null; n: number };
type MenuSummary = {
  menu: string;
  count: number;
  dates: string[];
  rice: Metric;
  vegetables: Metric;
  main: Metric;
};
export default function MenuTable({
  menus,
  showSource = false,
  thresholds,
  onSelect,
}: {
  menus: MenuSummary[];
  showSource?: boolean;
  thresholds?: Thresholds;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="table-scroll">
      <table className="menu-table">
        <thead>
          <tr>
            {showSource && <th>Món số</th>}
            <th>Món ăn</th>
            <th>Khay</th>
            <th>Cơm</th>
            <th>Rau</th>
            <th>Món chính</th>
            <th>Ưu tiên</th>
          </tr>
        </thead>
        <tbody>
          {menus.map((m) => (
            <tr
              key={m.menu}
              className="clickable-row"
              onClick={() => onSelect(m.menu)}
            >
              {showSource && (
                <td className="dish-slot-cell">
                  <span className="menu-cell-label">Món số</span>
                  {dishNumbers(m.menu, m.dates).join(", ") || "—"}
                </td>
              )}
              <td className="dish-name">
                <div className="dish-name-row">
                  {showSource &&
                    portalMenus.find((p) => p.name === m.menu)?.images.at(-1) && (
                      <ZoomableImage
                        className="dish-thumbnail"
                        src={
                          "." +
                          portalMenus
                            .find((p) => p.name === m.menu)!
                            .images.at(-1)!.path
                        }
                        alt=""
                        label={m.menu}
                        loading="lazy"
                      />
                    )}
                  <button
                    className="dish-row-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(m.menu);
                    }}
                  >
                    {!(showSource &&
                      portalMenus.find((p) => p.name === m.menu)?.images.at(-1)) && (
                      <span className="dish-icon">M</span>
                    )}
                    {m.menu}
                    <span aria-hidden="true">↗</span>
                  </button>
                </div>
              </td>
              <td><span className="menu-cell-label">Khay</span>{fmt(m.count)}</td>
              {(["rice", "vegetables", "main"] as const).map((k) => (
                <td key={k}>
                  <span className="menu-cell-label">{{rice: "Cơm", vegetables: "Rau", main: "Món chính"}[k]}</span>
                  <span
                    className={
                      k === "vegetables" && needsReview(m, thresholds)
                        ? "value-alert"
                        : ""
                    }
                  >
                    {pct(m[k].mean)}
                  </span>
                </td>
              ))}
              <td className="menu-priority-cell">
                <span className="menu-cell-label">Ưu tiên</span>
                <span className="menu-priority-value">
                  <span className={`priority-pill priority-${menuPriority(m, thresholds).level}`}>
                    {menuPriority(m, thresholds).label}
                  </span>
                  <Icon name="chevron" size={16} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!menus.length && <div className="empty">Chưa có dữ liệu thực đơn.</div>}
    </div>
  );
}
