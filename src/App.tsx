import { useEffect, useMemo, useState } from "react";
import { parseCSV, exportCSV, keys, labels } from "../lib/core.mjs";
import {
  demoRows,
  filterRows,
  menuStats,
  portalMenus,
} from "../lib/analytics.mjs";
import Overview from "./Overview";
import MenuTable from "./MenuTable";
import Icon, { type IconName } from "./Icon";
import ProductContext from "./ProductContext";
import Vision from "./VisionLab";
import LiveDemo from "./LiveDemo";
import DishDrawer from "./DishDrawer";
import QuickLog from "./QuickLog";
import { useFinalRound } from "./FinalRoundContext";
import { ConnectionControls, NfcTerminal } from "./Pipeline";
import {
  OperationalOverview,
  AdapterSettings,
  CloudCalculator,
  InterventionHistory,
} from "./OperationalPanels";

type Row = {
  id: string;
  date: string;
  menu: string;
  rice: number | null;
  vegetables: number | null;
  main: number | null;
  source: string;
};
const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
const pct = (n: number | null) =>
  n === null
    ? "—"
    : n.toLocaleString("vi-VN", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }) + "%";
const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(
    new Date(),
  );
const navigation = [
  ["overview", "Tổng quan"],
  ["menus", "Phân tích thực đơn"],
  ["vision", "EcoTray Vision"],
  ["log", "Ghi nhận khay"],
  ["data", "Dữ liệu & cấu hình"],
] as const;
// Temporarily hide the stage demo entry; retain the demo for later use.
const SHOW_STAGE_DEMO = false;
const mobileNavigation = {
  overview: "Tổng quan",
  menus: "Thực đơn",
  vision: "Vision",
  log: "Ghi nhận",
  data: "Dữ liệu",
};
function download(name: string, data: string, type = "text/csv;charset=utf-8") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + data], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export default function App() {
  const final = useFinalRound();
  const [live, setLive] = useState(false),
    [selectedDish, setSelectedDish] = useState(""),
    [logView, setLogView] = useState("manual");
  const [tab, setTab] = useState("overview"),
    [mode, setMode] = useState("demo"),
    [rows, setRows] = useState<Row[]>([]),
    [ready, setReady] = useState(false),
    [message, setMessage] = useState("");
  const [menu, setMenu] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0),
    [help, setHelp] = useState(false);
  const [entry, setEntry] = useState({
    date: today(),
    menu: "",
    rice: "NA",
    vegetables: "NA",
    main: "NA",
  });
  const [aiApplied, setAiApplied] = useState(false);
  const [dataView, setDataView] = useState("records"),
    [menuView, setMenuView] = useState("cards");
  useEffect(() => {
    final.setWatching(
      live || tab === "vision" || tab === "log" || mode === "hardware",
    );
  }, [live, tab, mode]);
  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem("ecotray-records") || "[]");
      if (Array.isArray(a))
        setRows(
          a.filter(
            (r) =>
              r &&
              r.source !== "simulation" &&
              typeof r.id === "string" &&
              typeof r.menu === "string" &&
              typeof r.date === "string" &&
              keys.every(
                (k) =>
                  r[k] === null ||
                  (typeof r[k] === "number" && r[k] >= 0 && r[k] <= 100),
              ),
          ),
        );
    } catch {
      setMessage("Không thể đọc dữ liệu đã lưu.");
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem("ecotray-records", JSON.stringify(rows));
      } catch {
        setMessage("Bộ nhớ đầy. Xuất CSV để giữ dữ liệu.");
      }
  }, [rows, ready]);
  useEffect(() => setPage(0), [mode, menu, from, to, search]);
  const source: Row[] =
    mode === "demo"
      ? demoRows
      : mode === "hardware"
        ? final.hardwareRows
        : rows;
  const filtered = useMemo(
    () =>
      filterRows(source, {
        menu,
        from,
        to,
        search: tab === "data" ? search : "",
      }),
    [source, menu, from, to, search, tab],
  );
  const menus = useMemo(() => menuStats(filtered), [filtered]);
  function reset() {
    setMenu("");
    setFrom("");
    setTo("");
    setSearch("");
  }
  function period(days: number) {
    const end = [...new Set(source.map((r) => r.date))].sort().at(-1);
    if (!end) return;
    const d = new Date(end + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - days + 1);
    setFrom(d.toISOString().slice(0, 10));
    setTo(end);
  }
  async function importFile(file: File) {
    try {
      if (file.size > 2000000) throw Error("Tệp CSV tối đa 2 MB.");
      const data = parseCSV(await file.text());
      if (data.some((r) => r.source === "simulation"))
        throw Error(
          "File chứa dữ liệu mô phỏng. Sử dụng không gian Demo để xem bộ dữ liệu này.",
        );
      setRows((old) => [...old, ...data]);
      setMode("real");
      reset();
      setMessage(`Đã nhập ${fmt(data.length)} bản ghi.`);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  function save() {
    if (!entry.menu.trim() || !entry.date) {
      setMessage("Cần ngày ghi nhận và tên món.");
      return;
    }
    const row: Row = {
      id: crypto.randomUUID(),
      date: entry.date,
      menu: entry.menu.trim(),
      source: aiApplied ? "ai-reviewed" : "manual",
      rice: null,
      vegetables: null,
      main: null,
    };
    keys.forEach(
      (k) =>
        (row[k as "rice"] =
          entry[k as "rice"] === "NA" ? null : Number(entry[k as "rice"])),
    );
    if (keys.every((k) => row[k as "rice"] === null)) {
      setMessage("Cần ít nhất một thành phần được ghi nhận.");
      return;
    }
    setRows((old) => [...old, row]);
    setMode("real");
    reset();
    setMessage("Đã lưu bản ghi.");
    setAiApplied(false);
    setEntry({ ...entry, rice: "NA", vegetables: "NA", main: "NA" });
  }
  const table = filtered
    .slice()
    .reverse()
    .slice(page * 20, page * 20 + 20);
  return (
    <div className="workspace product-workspace">
      <a className="skip-link" href="#content">
        Đến nội dung chính
      </a>
      <aside className="sidebar">
        <a href="#content" className="brand">
          <span className="brandmark">
            <Icon name="leaf" size={23} />
          </span>
          EcoTray
          <span className="brand-dot"></span>
        </a>
        <div className="workspace-name">
          <div className="school-avatar">P</div>
          <div>
            <strong>
              {final.adapter === "pro" ? final.schoolName : "Trường nhân rộng"}
            </strong>
            <span>{final.adapterInfo.name}</span>
          </div>
        </div>
        <p className="nav-label">QUẢN LÝ CĂN TIN</p>
        <nav aria-label="Điều hướng">
          {navigation.map(([id, title]) => (
            <button
              key={id}
              className={tab === id ? "nav-item active" : "nav-item"}
              aria-current={tab === id ? "page" : undefined}
              aria-label={title}
              onClick={() => {
                setTab(id);
                setMessage("");
              }}
            >
              <span className="nav-symbol">
                <Icon name={id as IconName} size={20} />
              </span>
              <span className="nav-title">{title}</span>
              <span className="nav-short">{mobileNavigation[id]}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p className="sidebar-purpose">
            Mỗi khay lên tiếng.
            <br />
            Mỗi bữa ăn tốt hơn.
          </p>
          <button
            className="help-toggle"
            aria-expanded={help}
            onClick={() => setHelp(!help)}
          >
            <Icon name="info" size={17} /> Phương pháp & trợ giúp
          </button>
          <div className="profile">
            <span>
              <Icon name="leaf" size={17} />
            </span>
            <div>
              <strong>Không gian cục bộ</strong>
              <small>Dữ liệu trên thiết bị này</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <div className="topbar">
          <div className="breadcrumb">
            Không gian làm việc <span>/</span>{" "}
            <b>{navigation.find((n) => n[0] === tab)?.[1]}</b>
          </div>
          <div className="topbar-right">
            {SHOW_STAGE_DEMO && (
            <button
              className="live-launch"
              onClick={() => {
                setLive(true);
                final.setNotice("");
              }}
            >
              <Icon name="play" size={14} /> Demo chung kết
            </button>
            )}
            <button
              className="mobile-help"
              aria-label="Phương pháp và trợ giúp"
              aria-expanded={help}
              onClick={() => setHelp(!help)}
            >
              <Icon name="info" size={18} />
            </button>
            <span className="local-status">
              <i />
              Lưu trên thiết bị
            </span>
            <span className="avatar">VL</span>
          </div>
        </div>
        <main id="content" tabIndex={-1}>
          <header className="page-header">
            <div>
              <h1>
                {tab === "overview"
                  ? "Tổng quan vận hành"
                  : tab === "menus"
                    ? "Phân tích thực đơn"
                    : tab === "vision"
                      ? "EcoTray Vision"
                      : tab === "log"
                        ? "Ghi nhận khay"
                        : "Dữ liệu & cấu hình"}
              </h1>
              <p>
                {tab === "overview"
                  ? "Nhìn rõ phần còn lại. Biết bữa sau cần thay đổi gì."
                  : tab === "menus"
                    ? "Hiệu suất từng món, chi tiết từng thành phần."
                    : tab === "vision"
                      ? "Ghi nhận phần còn lại từ hình ảnh khay ăn."
                      : tab === "log"
                        ? "Một khay ăn, một điểm dữ liệu."
                        : "Toàn bộ dữ liệu trong một không gian."}
              </p>
            </div>
            <div className="header-actions">
              {!["vision", "log"].includes(tab) && (
                <label className="source-switch">
                  <span className={mode === "demo" ? "badge demo" : "badge"}>
                    {mode === "demo"
                      ? "MẪU"
                      : mode === "hardware"
                        ? "TRẠM"
                        : "CÁ NHÂN"}
                  </span>
                  <select
                    aria-label="Không gian dữ liệu"
                    value={mode}
                    onChange={(e) => {
                      setMode(e.target.value);
                      if (e.target.value === "hardware")
                        final.setSource("hardware");
                      reset();
                    }}
                  >
                    <option value="demo">Dữ liệu mô phỏng</option>
                    <option value="real">Dữ liệu của tôi</option>
                    <option value="hardware">Dữ liệu phần cứng</option>
                  </select>
                </label>
              )}
              {tab !== "vision" && tab !== "log" && (
                <button
                  className="export-action"
                  aria-label="Xuất CSV"
                  title="Xuất CSV"
                  onClick={() =>
                    download(
                      `EcoTray-${mode}-${today()}.csv`,
                      exportCSV(filtered),
                    )
                  }
                >
                  <Icon name="download" size={16} /> <span>Xuất CSV</span>
                </button>
              )}
              {tab === "overview" && (
                <button
                  className="record-action"
                  onClick={() => {
                    setTab("log");
                    setLogView("manual");
                  }}
                >
                  <Icon name="plus" size={17} /> Ghi nhận khay
                </button>
              )}
            </div>
          </header>
          {tab === "vision" || tab === "log" ? (
            <div className="source-notice">
              <span className="badge">
                {tab === "vision"
                  ? "PHÂN TÍCH ẢNH"
                  : logView === "nfc"
                    ? final.source === "hardware"
                      ? "PHẦN CỨNG"
                      : "NFC MÔ PHỎNG"
                    : "GHI NHẬN TRỰC TIẾP"}
              </span>
              <p>
                {tab === "vision"
                  ? "Ảnh tham chiếu và kịch bản thử được tách riêng. Kết quả theo mẫu hiệu chuẩn, chưa có kiểm định độc lập."
                  : logView === "nfc"
                    ? "Quét thẻ nhận suất và kiểm tra cảnh báo. Sự kiện mô phỏng được tách khỏi dữ liệu thật."
                    : "Bản ghi mới được lưu trên thiết bị, tách riêng bộ dữ liệu mẫu."}
              </p>
            </div>
          ) : (
            <div
              className={`source-notice ${mode === "demo" ? "sample-source" : ""}`}
            >
              <span className="badge">
                {mode === "demo"
                  ? "DỮ LIỆU MÔ PHỎNG"
                  : mode === "hardware"
                    ? "NGUỒN PHẦN CỨNG"
                    : "DỮ LIỆU CỦA TÔI"}
              </span>
              <p>
                {mode === "demo" ? (
                  <>
                    Thực đơn & ảnh thật từ Portal PTNK. Số khay và tỷ lệ thừa là
                    mô phỏng.
                  </>
                ) : mode === "hardware" ? (
                  "Chỉ hiển thị dữ liệu từ trạm đã kết nối."
                ) : (
                  "Bản ghi được lưu riêng trên trình duyệt của bạn."
                )}
              </p>
              {mode === "demo" && (
                <small>12–16/10/2026 · {portalMenus.length} món</small>
              )}
            </div>
          )}

          {final.storageError && (
            <div className="toast" role="status">
              {final.storageError}
            </div>
          )}
          {mode === "hardware" && <ConnectionControls />}
          {message && (
            <div className="toast" role="status">
              {message}
              <button
                aria-label="Đóng thông báo"
                onClick={() => setMessage("")}
              >
                ×
              </button>
            </div>
          )}
          {help && (
            <section className="help-panel">
              <div className="section-heading">
                <h2>Phương pháp & dữ liệu</h2>
                <button onClick={() => setHelp(false)}>Đóng</button>
              </div>
              <p>
                Chỉ số phần còn lại được ước lượng theo các mức 0 / 25 / 50 / 75
                / 100%. NA được loại khỏi mẫu số từng thành phần. Chỉ số chung
                là trung bình các quan sát thành phần hợp lệ, không phải khối
                lượng.
              </p>
              <p>
                Đề xuất ưu tiên khi có ít nhất 10 quan sát rau và tỷ lệ còn lại
                từ 20%. Ngưỡng này là quy tắc thử nghiệm. Bếp phê duyệt thay đổi
                và theo dõi mức đủ ăn.
              </p>
              <p>
                Không gian Demo dùng tên món, ngày và ảnh thật từ Portal PTNK
                (12–16/10/2026); 1.280 khay và mức phần thừa được mô phỏng bằng
                chương trình; xu hướng không phản ánh kết quả thực địa. Dữ liệu
                thật được lưu riêng trên trình duyệt. CSV nhập sẽ thêm dòng;
                chưa tự loại trùng hoặc đồng bộ Google Sheets.
              </p>
            </section>
          )}
          {(tab === "overview" ||
            tab === "menus" ||
            (tab === "data" && dataView === "records")) && (
            <section className="filter-toolbar" aria-label="Phạm vi phân tích">
              <div className="filter-scope">
                <strong>{menu || "Toàn bộ thực đơn"}</strong>
                <span>
                  {from || to
                    ? `${from ? from.split("-").reverse().join("/") : "Đầu kỳ"} – ${to ? to.split("-").reverse().join("/") : "Cuối kỳ"}`
                    : "Toàn bộ thời gian"}
                </span>
              </div>
              <div className="filter-tools">
                {(menu || from || to) && (
                  <button className="text-button" onClick={reset}>
                    Xóa bộ lọc
                  </button>
                )}
                <details className="filter-details">
                  <summary>
                    <Icon name="filter" size={17} /> Lọc dữ liệu
                    {(menu || from || to) && (
                      <span className="filter-count">Đang lọc</span>
                    )}
                  </summary>
                  <div className="filterbar">
                    <label>
                      Món ăn
                      <select
                        value={menu}
                        onChange={(e) => setMenu(e.target.value)}
                      >
                        <option value="">Tất cả thực đơn</option>
                        {[...new Set(source.map((r) => r.menu))].map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Từ ngày
                      <input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                      />
                    </label>
                    <label>
                      Đến ngày
                      <input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                      />
                    </label>
                    <div className="filter-presets">
                      <button onClick={() => period(7)}>7 ngày</button>
                      <button onClick={() => period(30)}>30 ngày</button>
                      <button
                        className={!from && !to && !menu ? "chosen" : ""}
                        onClick={reset}
                      >
                        Toàn kỳ
                      </button>
                    </div>
                  </div>
                </details>
              </div>
            </section>
          )}
          {tab === "overview" && (
            <Overview
              rows={filtered}
              mode={mode}
              onDish={setSelectedDish}
              onMenus={() => setTab("menus")}
              onRecord={() => {
                setTab("log");
                setLogView("manual");
              }}
            />
          )}
          {tab === "overview" && (
            <ProductContext
              mode={mode}
              onRecord={() => {
                setTab("log");
                setLogView("manual");
              }}
            />
          )}
          {tab === "overview" && (
            <details className="operational-details">
              <summary>
                Kịch bản vận hành & dự toán tác động{" "}
                <span>Ước tính riêng · Không phải kết quả thực địa</span>
              </summary>
              <OperationalOverview mode={mode} />
            </details>
          )}
          {tab === "menus" && (
            <section className="menu-catalog">
              <div className="section-heading">
                <div>
                  <h2>Danh mục thực đơn</h2>
                  <p>
                    {menus.length} món · {fmt(filtered.length)} khay ghi nhận
                  </p>
                </div>
                <div
                  className="segmented"
                  role="group"
                  aria-label="Cách xem thực đơn"
                >
                  {[
                    ["cards", "Thẻ món"],
                    ["table", "Danh sách"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      aria-pressed={menuView === id}
                      className={menuView === id ? "selected" : ""}
                      onClick={() => setMenuView(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {!menus.length && menuView === "cards" && (
                <div className="empty">
                  Chưa có món ăn phù hợp. Thử đổi bộ lọc hoặc ghi nhận thêm
                  khay.
                </div>
              )}
              {menuView === "table" ? (
                <MenuTable
                  menus={menus}
                  showSource={mode === "demo"}
                  onSelect={setSelectedDish}
                />
              ) : (
                <div className="menu-cards">
                  {menus.map((m) => (
                    <article key={m.menu}>
                      {mode === "demo" &&
                        portalMenus
                          .find((p) => p.name === m.menu)
                          ?.images.at(-1) && (
                          <img
                            className="menu-photo"
                            src={
                              "." +
                              portalMenus
                                .find((p) => p.name === m.menu)!
                                .images.at(-1)!.path
                            }
                            alt={m.menu}
                            loading="lazy"
                          />
                        )}
                      <span className="badge">
                        {m.vegetables.n < 10
                          ? "Chưa đủ mẫu"
                          : m.vegetables.mean >= 20
                            ? "Cần xem xét"
                            : "Đang theo dõi"}
                      </span>
                      <h3>{m.menu}</h3>
                      <button
                        className="dish-detail-button"
                        onClick={() => setSelectedDish(m.menu)}
                      >
                        Xem phân tích chi tiết ↗
                      </button>
                      <p>
                        {m.vegetables.n < 10
                          ? "Bổ sung quan sát để đánh giá."
                          : m.vegetables.mean >= 20
                            ? "Khảo sát khẩu vị, cách chế biến và lượng phục vụ rau trước khi điều chỉnh."
                            : "Duy trì cách phục vụ, tiếp tục theo dõi các bữa tiếp theo."}
                      </p>
                      <div className="menu-card-metrics">
                        <span>
                          Cơm <b>{pct(m.rice.mean)}</b>
                        </span>
                        <span>
                          Rau <b>{pct(m.vegetables.mean)}</b>
                        </span>
                        <span>
                          Món chính <b>{pct(m.main.mean)}</b>
                        </span>
                      </div>
                      <small>
                        {fmt(m.count)} khay · {fmt(m.vegetables.n)} quan sát rau
                      </small>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
          {tab === "vision" && <Vision />}
          {tab === "log" && (
            <>
              <div className="subtabs" role="group" aria-label="Trạm ghi nhận">
                {[
                  ["nfc", "Cổng NFC"],
                  ["calibration", "QuickLog · Cân mẫu"],
                  ["manual", "Ghi nhận thủ công"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    aria-pressed={logView === id}
                    className={logView === id ? "selected" : ""}
                    onClick={() => setLogView(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {logView === "nfc" && (
                <>
                  <ConnectionControls />
                  <section className="panel nfc-full">
                    <h2>Trạm quét thẻ nhận suất</h2>
                    <NfcTerminal />
                    {final.source === "simulation" && (
                      <button onClick={final.resetStage}>
                        Đặt lại lượt NFC mô phỏng
                      </button>
                    )}
                  </section>
                </>
              )}
              {logView === "calibration" && <QuickLog />}
            </>
          )}
          {tab === "log" && logView === "manual" && (
            <div className="entry-grid">
              <section className="panel">
                <div className="section-heading">
                  <h2>Thông tin khay</h2>
                  <span className="badge">
                    {aiApplied ? "AI · Chờ xác nhận" : "Ghi nhận trực tiếp"}
                  </span>
                </div>
                <div className="form-grid">
                  <label>
                    Ngày phục vụ
                    <input
                      type="date"
                      value={entry.date}
                      onChange={(e) =>
                        setEntry({ ...entry, date: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Món ăn
                    <input
                      list="menus-list"
                      maxLength={100}
                      placeholder="Tên món"
                      value={entry.menu}
                      onChange={(e) =>
                        setEntry({ ...entry, menu: e.target.value })
                      }
                    />
                    <datalist id="menus-list">
                      {[...new Set(source.map((r) => r.menu))].map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </datalist>
                  </label>
                </div>
                {keys.map((k) => (
                  <fieldset key={k}>
                    <legend>
                      {labels[k]} <small>Phần còn lại</small>
                    </legend>
                    <div className="choices">
                      {["0", "25", "50", "75", "100", "NA"].map((v) => (
                        <button
                          key={v}
                          aria-pressed={entry[k as "rice"] === v}
                          className={entry[k as "rice"] === v ? "selected" : ""}
                          onClick={() => setEntry({ ...entry, [k]: v })}
                        >
                          {v === "NA" ? "Không rõ" : v + "%"}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ))}
                <div className="form-footer">
                  <span>Lưu vào dữ liệu của tôi</span>
                  <button className="primary" onClick={save}>
                    {aiApplied ? "Xác nhận & lưu" : "Lưu bản ghi"} ↗
                  </button>
                </div>
              </section>
              <section className="panel entry-summary">
                <span className="eyebrow">PHIẾU GHI NHẬN</span>
                <h2>{entry.menu || "Chưa chọn món"}</h2>
                <p>{entry.date.split("-").reverse().join("/")}</p>
                {keys.map((k) => (
                  <div key={k}>
                    <span>{labels[k]}</span>
                    <b>
                      {entry[k as "rice"] === "NA"
                        ? "—"
                        : entry[k as "rice"] + "%"}
                    </b>
                  </div>
                ))}
                <small>Dữ liệu lưu riêng trên thiết bị này.</small>
              </section>
            </div>
          )}
          {tab === "data" && (
            <div className="subtabs" role="group" aria-label="Quản lý dữ liệu">
              {[
                ["records", "Bản ghi khay"],
                ["interventions", "Lịch sử can thiệp"],
                ["settings", "Cấu hình trường"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={dataView === id}
                  className={dataView === id ? "selected" : ""}
                  onClick={() => setDataView(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {tab === "data" && dataView === "records" && (
            <>
              <div className="data-actions">
                <label className="search">
                  <span>Tìm kiếm</span>
                  <input
                    type="search"
                    placeholder="Tìm tên món…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <div>
                  <label className="button upload">
                    Nhập CSV
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => {
                        if (e.target.files?.[0]) importFile(e.target.files[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    onClick={() =>
                      download(
                        "EcoTray-mau.csv",
                        "date,menu,rice,vegetables,main\n2026-10-16,Cơm gà,0,25,0",
                      )
                    }
                  >
                    Mẫu dữ liệu ↗
                  </button>
                </div>
              </div>
              <section className="panel table-panel">
                <div className="section-heading">
                  <h2>Bản ghi khay</h2>
                  <span className="badge">{fmt(filtered.length)} bản ghi</span>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Mã khay</th>
                        <th>Ngày</th>
                        <th>Món ăn</th>
                        <th>Cơm</th>
                        <th>Rau</th>
                        <th>Món chính</th>
                        <th>Nguồn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.map((r) => (
                        <tr key={r.id}>
                          <td className="record-id">
                            {r.id.startsWith("demo-")
                              ? "#" + r.id.slice(5)
                              : "#" + r.id.slice(0, 8)}
                          </td>
                          <td>{r.date.split("-").reverse().join("/")}</td>
                          <td className="dish-name">{r.menu}</td>
                          {keys.map((k) => (
                            <td key={k}>
                              {r[k as "rice"] === null
                                ? "NA"
                                : r[k as "rice"] + "%"}
                            </td>
                          ))}
                          <td>
                            <span className="badge">
                              {r.source === "simulation"
                                ? "Mô phỏng"
                                : r.source === "hardware"
                                  ? "Phần cứng"
                                  : r.source === "ai-reviewed"
                                    ? "AI · Đã duyệt"
                                    : "Ghi nhận"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!filtered.length && (
                  <div className="empty">Không có bản ghi phù hợp.</div>
                )}
                <div className="pagination">
                  <span>
                    {filtered.length
                      ? `${page * 20 + 1}–${Math.min((page + 1) * 20, filtered.length)} / ${fmt(filtered.length)}`
                      : "0 bản ghi"}
                  </span>
                  <div>
                    <button
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      ← Trước
                    </button>
                    <button
                      disabled={(page + 1) * 20 >= filtered.length}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Sau →
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
          {tab === "data" && dataView === "interventions" && (
            <section className="panel">
              <InterventionHistory />
            </section>
          )}
          {tab === "data" && dataView === "settings" && (
            <div className="settings-stack">
              <AdapterSettings />
              <CloudCalculator />
            </div>
          )}
          {selectedDish && (
            <DishDrawer
              name={selectedDish}
              rows={filtered}
              mode={mode}
              onClose={() => setSelectedDish("")}
            />
          )}
          {live && <LiveDemo onClose={() => setLive(false)} />}
          <footer>
            <span>
              EcoTray <b>·</b> Mỗi khay lên tiếng.
            </span>
            <span>
              {tab === "vision"
                ? "Ảnh tham chiếu · Chưa kiểm định độc lập"
                : tab === "log"
                  ? "Bản ghi khay · Lưu riêng trên thiết bị"
                  : mode === "demo"
                    ? "Dữ liệu mẫu · Số khay và tỷ lệ thừa mô phỏng"
                    : mode === "hardware"
                      ? "Dữ liệu từ trạm · Tách riêng"
                      : "Không gian cá nhân · Lưu cục bộ"}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
