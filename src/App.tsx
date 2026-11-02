import { ComboFields } from "./DecisionSupport";
import { useEffect, useMemo, useState } from "react";
import { parseCSV, exportCSV, keys, labels } from "../lib/core.mjs";
import {
  defaultPriorityThresholds,
  demoRows,
  filterRows,
  menuPriority,
  menuStats,
  needsReview,
  portalMenus,
  priorityThresholdError,
} from "../lib/analytics.mjs";
import PriorityThresholds, { type Thresholds } from "./PriorityThresholds";
import Overview from "./Overview";
import DateFilter from "./DateFilter";
import MenuSlotFilter from "./MenuSlotFilter";
import { filterMenuSlots } from "../lib/menu-slots.mjs";
import MenuTable from "./MenuTable";
import Icon, { type IconName } from "./Icon";
import Vision from "./VisionLab";
import { RealtimeFunnel } from "./PTNKVision";
import { boardingDays } from "../lib/boarding-menu.mjs";
import MenuCalendar from "./MenuCalendar";
import MenuAnalysis from "./MenuAnalysis";
import { ZoomableImage } from "./ImageZoom";
import DishDrawer from "./DishDrawer";
import QuickLog from "./QuickLog";
import type { Account } from "./auth";
import { DeviceStatus, TopbarTools, type WorkspaceAlert } from "./WorkspaceHeader";
import { useFinalRound } from "./FinalRoundContext";
import { ConnectionControls, NfcTerminal } from "./Pipeline";
import { AdapterSettings, InterventionHistory } from "./OperationalPanels";
import { Link, navigate, useRoute } from "./router";

type Row = import("../lib/contracts").TrayRow;
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
// Bỏ qua ngày tương lai để bản ghi nhập nhầm không chiếm màn hình mở đầu.
const latestDate = (rows: Row[]) => {
  const now = today();
  return rows.reduce(
    (latest, r) => (r.date <= now && r.date > latest ? r.date : latest),
    "",
  );
};
const navigation = [
  ["overview", "Tổng quan"],
  ["menu", "Thực đơn"],
  ["vision", "EcoTray Vision"],
  ["log", "Ghi nhận khay"],
  ["data", "Dữ liệu & cấu hình"],
] as const;
const menuTabs = [
  ["menu", "Lịch thực đơn", "calendar", "calendar"],
  ["menus", "Thống kê", "data", "stats"],
  ["analysis", "Phân tích", "chart", "analysis"],
] as const;
// Stage remains separate from the operational workspace.

const mobileNavigation = {
  overview: "Tổng quan",
  menu: "Thực đơn",
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

export default function App({
  account,
  onLogout,
}: {
  account: Account;
  onLogout: () => void;
}) {
  const isPtnk = account.dataset === "ptnk";
  const mode = isPtnk ? "demo" : "real";
  const storageKey = isPtnk ? "ecotray-records" : "ecotray-records-hcm";
  const final = useFinalRound();
  const route = useRoute();
  // Trang đang mở lấy từ URL (/vision, /log/nfc, /data/settings…); App không được dựng cho /project.
  const tab: string = route.page === "menu"
    ? menuTabs.find(([, , , sub]) => sub === route.sub)![0]
    : route.page;
  const logView = route.page === "log" ? route.sub! : "manual";
  const dataView = route.page === "data" ? route.sub! : "records";
  const setTab = (id: string) => {
    const menuTab = menuTabs.find(([tabId]) => tabId === id);
    navigate(menuTab ? `/menu/${menuTab[3]}` : `/${id}`);
  };
  const setLogView = (view: string) => navigate(`/log/${view}`);
  const setDataView = (view: string) => navigate(`/data/${view}`);
  const openingDay = () => latestDate(isPtnk ? demoRows : []) || today();
  const [selectedDish, setSelectedDish] = useState("");
  const [rows, setRows] = useState<Row[]>([]),
    [ready, setReady] = useState(false),
    [message, setMessage] = useState("");
  const isMenuTab = menuTabs.some(([id]) => id === tab);
  const thresholdKey = isPtnk ? "ecotray-priority-thresholds" : "ecotray-priority-thresholds-hcm";
  const [thresholds, setThresholds] = useState<Thresholds>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(thresholdKey) || "null");
      if (saved && !priorityThresholdError(saved)) return saved;
    } catch {
      /* dùng ngưỡng mặc định nếu không đọc được */
    }
    return defaultPriorityThresholds;
  });
  const [menuSlots, setMenuSlots] = useState([1, 2, 3, 4]);
  const [menu, setMenu] = useState(""),
    [from, setFrom] = useState(openingDay),
    [to, setTo] = useState(openingDay),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0);
  const [entry, setEntry] = useState({
    date: today(),
    menu: "",
    rice: "NA",
    vegetables: "NA",
    main: "NA",
    soup: "NA", riceDish: "", vegetableDish: "", soupDish: "",
  });
  const [menuView, setMenuView] = useState("table");
  useEffect(() => {
    final.setWatching(tab === "vision" || tab === "log");
    return () => final.setWatching(false);
  }, [tab]);
  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(a))
        setRows(
          a.filter(
            (r) =>
              r &&
              r.source !== "simulation" &&
              typeof r.id === "string" &&
              typeof r.menu === "string" &&
              typeof r.date === "string" &&
              (r.soup == null || (typeof r.soup === "number" && Number.isFinite(r.soup) && r.soup >= 0 && r.soup <= 100)) &&
              ["riceDish", "vegetableDish", "soupDish"].every(k => r[k] === undefined || (typeof r[k] === "string" && r[k].length <= 100)) &&
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
        localStorage.setItem(storageKey, JSON.stringify(rows));
      } catch {
        setMessage("Bộ nhớ đầy. Xuất CSV để giữ dữ liệu.");
      }
  }, [rows, ready]);
  useEffect(() => setPage(0), [menu, menuSlots, from, to, search]);
  const source: Row[] = useMemo(
    () => (isPtnk ? [...demoRows, ...rows] : rows),
    [isPtnk, rows],
  );
  const history = useMemo(
    () => filterRows(filterMenuSlots(source, isPtnk ? boardingDays : [], menuSlots), { menu }),
    [source, menu, menuSlots, isPtnk],
  );
  const filtered = useMemo(
    () =>
      filterRows(filterMenuSlots(source, isPtnk ? boardingDays : [], menuSlots), {
        menu,
        from,
        to,
        search: tab === "data" || tab === "menus" ? search : "",
      }),
    [source, menu, menuSlots, isPtnk, from, to, search, tab],
  );
  const menus = useMemo(() => menuStats(filtered), [filtered]);
  const allMenus = useMemo(() => menuStats(source), [source]);
  const allDishes = useMemo(() => menuStats(source), [source]);
  const latestDay = useMemo(() => latestDate(source), [source]);
  const isToday = from === today() && to === from,
    isLatest = Boolean(latestDay) && from === latestDay && to === from,
    isAllTime = !from && !to,
    isCustom = !isToday && !isLatest && !isAllTime,
    filtering = Boolean(menu) || menuSlots.length !== 4 || isCustom;
  function showDay(date: string) {
    setFrom(date);
    setTo(date);
  }
  function reset() {
    setMenu("");
    setMenuSlots([1, 2, 3, 4]);
    showDay(latestDay || today());
    setSearch("");
  }
  useEffect(() => {
    if (ready) showDay(latestDay || today());
  }, [ready]);
  async function importFile(file: File) {
    try {
      if (file.size > 2000000) throw Error("Tệp CSV tối đa 2 MB.");
      const data = parseCSV(await file.text());
      if (data.some((r) => r.source === "simulation"))
        throw Error(
          "File chứa dữ liệu mô phỏng. Sử dụng không gian dữ liệu mô phỏng để xem bộ dữ liệu này.",
        );
      setRows((old) => [...old, ...data]);
      reset();
      showDay("");
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
      source: "manual",
      riceDish: entry.riceDish.trim(), vegetableDish: entry.vegetableDish.trim(), soupDish: entry.soupDish.trim(),
      soup: entry.soup === "NA" ? null : Number(entry.soup),
      rice: null,
      vegetables: null,
      main: null,
    };
    keys.forEach(
      (k) =>
        (row[k as "rice"] =
          entry[k as "rice"] === "NA" ? null : Number(entry[k as "rice"])),
    );
    if (keys.every((k) => row[k as "rice"] === null) && row.soup === null) {
      setMessage("Cần ít nhất một thành phần được ghi nhận.");
      return;
    }
    setRows((old) => [...old, row]);
    reset();
    showDay(row.date === today() ? row.date : "");
    setMessage("Đã lưu bản ghi.");
    setEntry({ ...entry, rice: "NA", vegetables: "NA", main: "NA", soup: "NA" });
  }
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [route.path]);
  const viewingRows = tab === "overview" || tab === "menus" || tab === "analysis" || (tab === "data" && dataView === "records");
  const nfcActive = Boolean(final.connected && final.remote?.online && Date.now() - Date.parse(final.remote.lastUpdatedAt ?? '') < 60000),
    cameraActive = Boolean(final.vision.online && final.vision.hardware && Date.now() - Date.parse(final.vision.hardware.analysis.timestamp) < 60000);
  const priorityCount = menus.filter((m) => needsReview(m, thresholds)).length;
  const alerts: WorkspaceAlert[] = [
    ...(priorityCount
      ? [{ id: "priority", text: `${priorityCount} món cần xem lại phần rau`, onOpen: () => setTab("menus") }]
      : []),
    ...(final.storageError ? [{ id: "storage", text: final.storageError }] : []),
  ];
  function submitSearch() {
    showDay("");
    if (tab !== "data") setTab("menus");
    if (tab === "data") setDataView("records");
  }
  const table = filtered
    .slice()
    .reverse()
    .slice(page * 20, page * 20 + 20);
  return (
    <div className="workspace product-workspace">
      <a className="skip-link" href={route.path + "#content"}>
        Đến nội dung chính
      </a>
      <aside className="sidebar">
        <Link to="/overview" className="brand" aria-label="EcoTray, về Tổng quan" onNavigate={() => setMessage("")}>
          <span className="brandmark">
            <Icon name="leaf" size={23} />
          </span>
          EcoTray
          <span className="brand-dot"></span>
        </Link>
        <div className="workspace-name">
          <div className={account.logo ? "school-avatar has-logo" : "school-avatar"}>
            {account.logo ? (
              <img src={account.logo} alt="Logo trường" />
            ) : (
              account.initial
            )}
          </div>
          <div>
            <strong>{account.schoolName}</strong>
            <span>{final.adapterInfo.name}</span>
          </div>
        </div>
        <p className="nav-label">QUẢN LÝ CĂN TIN</p>
        <nav aria-label="Điều hướng">
          {navigation.map(([id, title]) => {
            const isActive = id === "menu" ? isMenuTab : tab === id;
            return (
              <Link
                key={id}
                to={id === "menu" && isMenuTab ? route.path : "/" + id}
                className={isActive ? "nav-item active" : "nav-item"}
                aria-current={isActive ? "page" : undefined}
                aria-label={title}
                onNavigate={() => {
                  setMessage("");
                  if (id !== "menu" && id !== "data") setSearch("");
                }}
              >
                <span className="nav-symbol">
                  <Icon name={id as IconName} size={20} />
                </span>
                <span className="nav-title">{title}</span>
                <span className="nav-short">{mobileNavigation[id]}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <Link
            to="/project"
            className="logout-button"
            onNavigate={() => setMessage("")}
          >
            <Icon name="help" size={20} /> Giới thiệu EcoTray AI
          </Link>
          <button className="logout-button" onClick={onLogout}>
            <Icon name="logout" size={20} /> Đăng xuất
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <div className="topbar">
          <div className="breadcrumb">
            Không gian làm việc <span>/</span>{" "}
            <b>{isMenuTab ? "Thực đơn" : navigation.find((n) => n[0] === tab)?.[1]}</b>
            {isMenuTab && (
              <> <span>/</span> <b>{menuTabs.find(([id]) => id === tab)?.[1]}</b></>
            )}
          </div>
          <div className="topbar-right">
            <TopbarTools
              search={search}
              onSearch={setSearch}
              onSubmit={submitSearch}
              alerts={alerts}
              currentTab={tab}
              onSelectTab={(newTab) => {
                setTab(newTab);
                setMessage("");
              }}
              onSelectLogView={(view) => {
                setTab("log");
                setLogView(view);
                setMessage("");
              }}
              onSelectDataView={(view) => {
                setTab("data");
                setDataView(view);
                setMessage("");
              }}
              onSelectDish={(dishName) => {
                setSelectedDish(dishName);
              }}
              onExportCSV={() =>
                download(
                  `EcoTray-${mode}-${today()}.csv`,
                  exportCSV(filtered),
                )
              }
              onLogout={onLogout}
              allDishes={allDishes}
            />
            <span className="avatar" aria-label={account.schoolName}>{account.initial}</span>
          </div>
        </div>
        <main id="content" tabIndex={-1}>
          <header className="page-header">
            <div>
              <h1>
                {tab === "overview"
                  ? "Tổng quan căn tin"
                  : tab === "menu"
                    ? "Lịch thực đơn"
                    : tab === "menus" || tab === "analysis"
                    ? "Phân tích thực đơn"
                    : tab === "vision"
                      ? "EcoTray Vision"
                      : tab === "log"
                        ? "Ghi nhận khay"
                        : "Dữ liệu & cấu hình"}
              </h1>
              {tab === "overview" && <p>Theo dõi phần còn lại và hiệu quả sử dụng khay tại căn tin.</p>}
              {tab === "menu" && <p>Xem thực đơn hằng ngày của căn tin.</p>}
              {(tab === "menus" || tab === "analysis") && (
                <p>Đánh giá mức thức ăn còn lại, so sánh giữa các món và xu hướng theo thời gian.</p>
              )}
            </div>
            <div className="header-actions">
              {(tab === "overview" || tab === "vision") && (
                <DeviceStatus nfc={nfcActive} camera={cameraActive} />
              )}
              {viewingRows && (
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
                  onClick={() => navigate("/log/manual")}
                >
                  <Icon name="plus" size={17} /> Ghi nhận khay
                </button>
              )}
            </div>
          </header>
          {isMenuTab && (
            <div className="subtabs menu-subtabs" role="group" aria-label="Thực đơn">
              {menuTabs.map(([id, label, icon]) => (
                <button
                  key={id}
                  aria-pressed={tab === id}
                  className={tab === id ? "selected" : ""}
                  onClick={() => setTab(id)}
                >
                  <Icon name={icon as IconName} size={17} /> {label}
                </button>
              ))}
            </div>
          )}
          {tab === "menu" && <MenuCalendar days={isPtnk ? boardingDays : []} today={today()} />}
          {tab === "data" && dataView !== "records" ? null : tab === "menu" ? null : tab === "vision" || tab === "log" ? (
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
            </div>
          ) : mode === "demo" ? null : (
            <div className="source-notice">
              <span className="badge">
                DỮ LIỆU CỦA TÔI
              </span>
              <p>
                Bản ghi được lưu riêng trên trình duyệt của bạn.
              </p>
            </div>
          )}

          {final.storageError && (
            <div className="toast" role="status">
              {final.storageError}
            </div>
          )}
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

          {(tab === "overview" ||
            tab === "menus" ||
            tab === "analysis" ||
            (tab === "data" && dataView === "records")) && (
            <section className="filter-toolbar" aria-label="Phạm vi phân tích">
              <div className="filter-scope">
                <MenuSlotFilter selected={menuSlots} onChange={setMenuSlots} />
                <DateFilter today={today()} latestDay={latestDay} from={from} to={to}
                  onChange={(start, end) => { setFrom(start); setTo(end); }} />
              </div>
              <div className="filter-tools">
                {filtering && (
                  <button className="text-button" onClick={reset}>
                    Xóa bộ lọc
                  </button>
                )}
                <details className="filter-details">
                  <summary>
                    <Icon name="filter" size={17} /> Lọc dữ liệu
                    {filtering && (
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
                    <div className="filter-presets">
                      <button
                        className={isAllTime && !menu ? "chosen" : ""}
                        onClick={() => {
                          setMenu("");
                          showDay("");
                        }}
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
              thresholds={thresholds}
              isToday={isToday}
              onShowAll={source.length ? () => showDay("") : undefined}
              onDish={setSelectedDish}
              onImport={() => navigate("/data/records")}
              onMenus={() => navigate("/menu/stats")}
              onRecord={() => navigate("/log/manual")}
            />
          )}
          {tab === "overview" && (final.remote?.latestNfc || final.vision.active || final.state.capture) && <RealtimeFunnel />}
          {tab === "analysis" && (
            <MenuAnalysis
              rows={filtered}
              history={history}
              mode={mode}
              thresholds={thresholds}
              onDish={setSelectedDish}
            />
          )}
          {tab === "menus" && (
            <section className="menu-catalog">
              <div className="section-heading">
                <div>
                  <h2>Lượng thức ăn bỏ thừa</h2>
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
                  thresholds={thresholds}
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
                          <ZoomableImage
                            className="menu-photo"
                            src={
                              "." +
                              portalMenus
                                .find((p) => p.name === m.menu)!
                                .images.at(-1)!.path
                            }
                            alt={m.menu}
                            label={m.menu}
                            loading="lazy"
                          />
                        )}
                      <span className="badge">
                        {menuPriority(m, thresholds).level === "insufficient"
                          ? "Chưa đủ mẫu"
                          : needsReview(m, thresholds)
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
                  ["calibration", "Cân mẫu"],
                  ["manual", "Ghi nhận thủ công"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    aria-pressed={logView === id}
                    className={logView === id ? "selected" : ""}
                    onClick={() => navigate(`/log/${id}`)}
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
            <div className="entry-grid manual-entry">
              <section className="panel">
                <div className="section-heading">
                  <h2>Thông tin khay</h2>

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
                <details className="method-details"><summary>Món đi kèm & canh (không bắt buộc)</summary><ComboFields value={entry} onChange={patch => setEntry(old => ({...old, ...patch}))} /></details>
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
                    Lưu bản ghi
                  </button>
                </div>
              </section>

            </div>
          )}
          {tab === "data" && (
            <div className="subtabs" role="group" aria-label="Quản lý dữ liệu">
              {[
                ["records", "Bản ghi khay"],
                ["interventions", "Lịch sử quyết định"],
                ["settings", "Cấu hình trường"],
                ["thresholds", "Cấu hình ngưỡng"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={dataView === id}
                  className={dataView === id ? "selected" : ""}
                  onClick={() => navigate(`/data/${id}`)}
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
                        <th>Canh</th><th>Tổ hợp đi kèm</th>
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
                          <td>{r.soup == null ? "NA" : pct(r.soup)}</td>
                          <td className="wrap-cell">{[r.riceDish, r.vegetableDish, r.soupDish].filter(Boolean).join(" · ") || "Chưa ghi nhận"}</td>
                          <td>
                            <span className="badge">
                              {r.source === "simulation"
                                ? "Ghi nhận"
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
                      ? `${page * 20 + 1}-${Math.min((page + 1) * 20, filtered.length)} / ${fmt(filtered.length)}`
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
            </div>
          )}
          {tab === "data" && dataView === "thresholds" && (
            <div className="settings-stack">
              <PriorityThresholds
                value={thresholds}
                menus={allMenus}
                onSave={(next) => {
                  setThresholds(next);
                  try {
                    localStorage.setItem(thresholdKey, JSON.stringify(next));
                    setMessage("Đã lưu ngưỡng ưu tiên.");
                  } catch {
                    setMessage("Ngưỡng chỉ áp dụng trong phiên này vì không lưu được trên trình duyệt.");
                  }
                }}
              />
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

          <footer>
            <span>
              EcoTray <b>·</b> Mỗi khay lên tiếng.
            </span>
            <span>
              {tab === "data" && dataView !== "records"
                ? "Lưu trên trình duyệt này"
                : tab === "vision"
                ? "Ảnh & kết quả được ghi rõ nguồn"
                : tab === "log"
                  ? "Lưu trên trình duyệt này"
                  : mode === "demo"
                    ? "Dữ liệu căn tin trường"
                    : "Không gian cá nhân · Lưu cục bộ"}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
