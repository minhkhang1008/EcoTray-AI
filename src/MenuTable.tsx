import { portalMenus } from "../lib/analytics.mjs";
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
  rice: Metric;
  vegetables: Metric;
  main: Metric;
};
export default function MenuTable({
  menus,
  showSource = false,
  onSelect,
}: {
  menus: MenuSummary[];
  showSource?: boolean;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Món ăn</th>
            <th>Khay</th>
            <th>Cơm</th>
            <th>Rau</th>
            <th>Món chính</th>
          </tr>
        </thead>
        <tbody>
          {menus.map((m) => (
            <tr
              key={m.menu}
              className="clickable-row"
              onClick={() => onSelect(m.menu)}
            >
              <td className="dish-name">
                <button
                  className="dish-row-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(m.menu);
                  }}
                >
                  {showSource &&
                  portalMenus.find((p) => p.name === m.menu)?.images.at(-1) ? (
                    <img
                      className="dish-thumbnail"
                      src={
                        "." +
                        portalMenus
                          .find((p) => p.name === m.menu)!
                          .images.at(-1)!.path
                      }
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <span className="dish-icon">M</span>
                  )}
                  {m.menu}
                  <span aria-hidden="true">↗</span>
                </button>
              </td>
              <td>{fmt(m.count)}</td>
              {(["rice", "vegetables", "main"] as const).map((k) => (
                <td key={k}>
                  <span
                    className={
                      k === "vegetables" && (m[k].mean ?? 0) >= 20
                        ? "value-alert"
                        : ""
                    }
                  >
                    {pct(m[k].mean)}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!menus.length && <div className="empty">Chưa có dữ liệu thực đơn.</div>}
    </div>
  );
}
