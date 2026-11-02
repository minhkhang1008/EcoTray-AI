import { useState } from "react";
import Icon from "./Icon";
import { SearchPalette, type SearchDishItem } from "./SearchPalette";

export type WorkspaceAlert = { id: string; text: string; onOpen?: () => void };

export function SchoolIllustration() {
  return (
    <svg
      className="school-illustration"
      viewBox="0 0 220 110"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 104h216" />
      <path d="M2 92h11M35 92h9" />
      <path d="M24 60 13 88h22zM24 88v16" />
      <path d="M46 60v44M156 60v44" />
      <path d="M36 60 100 12l64 48z" />
      <path d="M52 54 100 19l48 35z" />
      <path d="M56 66h22v13H56zM89 66h22v13H89zM122 66h22v13h-22z" />
      <path d="M67 66v13M100 66v13M133 66v13" />
      <path d="M56 86h22v12H56zM122 86h22v12h-22z" />
      <path d="M90 104V84h20v20M100 84v20" />
      <path d="M190 14c18 8 25 28 19 46-4 12-34 12-38 0-6-18 1-38 19-46z" />
      <path d="M190 104V34M190 66l-11-11M190 54l10-10M190 44l-7-7" />
    </svg>
  );
}

export function DeviceStatus({
  nfc,
  camera,
}: {
  nfc: boolean;
  camera: boolean;
}) {
  const devices = [
    { name: "NFC", active: nfc },
    { name: "ESP32-CAM", active: camera },
  ];
  return (
    <section className="device-status" role="status" aria-label="Trạng thái thiết bị">
      <h2>
        <i className={nfc && camera ? "online" : ""} />
        Trạng thái thiết bị
      </h2>
      <ul>
        {devices.map((d) => (
          <li key={d.name}>
            <Icon name="vision" size={22} />
            <span>
              {d.name}
              <b className={d.active ? "online" : ""}>
                {d.active ? "Hoạt động" : "Chờ tín hiệu"}
              </b>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export type TopbarToolsProps = {
  search: string;
  onSearch: (value: string) => void;
  onSubmit: () => void;
  alerts: WorkspaceAlert[];
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  onSelectLogView?: (view: string) => void;
  onSelectDataView?: (view: string) => void;
  onSelectDish?: (dish: string) => void;
  onExportCSV?: () => void;
  onLogout?: () => void;
  allDishes?: SearchDishItem[];
};

export function TopbarTools({
  search,
  onSearch,
  onSubmit,
  alerts,
  currentTab,
  onSelectTab,
  onSelectLogView,
  onSelectDataView,
  onSelectDish,
  onExportCSV,
  onLogout,
  allDishes,
}: TopbarToolsProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SearchPalette
        search={search}
        onSearch={onSearch}
        onSubmit={onSubmit}
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        onSelectLogView={onSelectLogView}
        onSelectDataView={onSelectDataView}
        onSelectDish={onSelectDish}
        onExportCSV={onExportCSV}
        onLogout={onLogout}
        allDishes={allDishes}
      />
      <div
        className="notification"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        <button
          className="notification-toggle"
          aria-label={`Thông báo: ${alerts.length} mục`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name="bell" size={20} />
          {alerts.length > 0 && <i />}
        </button>
        {open && (
          <div className="notification-panel">
            <strong>Thông báo</strong>
            {alerts.length ? (
              <ul>
                {alerts.map((a) => (
                  <li key={a.id}>
                    {a.onOpen ? (
                      <button
                        onClick={() => {
                          setOpen(false);
                          a.onOpen?.();
                        }}
                      >
                        {a.text}
                        <Icon name="arrow" size={14} />
                      </button>
                    ) : (
                      <span>{a.text}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Chưa có thông báo mới.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
