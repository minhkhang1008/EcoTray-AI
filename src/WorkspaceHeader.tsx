import { useState } from "react";
import Icon from "./Icon";
import { SearchPalette, type SearchDishItem } from "./SearchPalette";

export type WorkspaceAlert = { id: string; text: string; onOpen?: () => void };

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
