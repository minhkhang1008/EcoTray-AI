import { useEffect, useMemo, useRef, useState } from "react";
import {
  dishImages,
  latestMenuDay,
  matchesDish,
  monthCells,
  shiftMonth,
} from "../lib/boarding-menu.mjs";
import Icon from "./Icon";
import { ZoomableImage } from "./ImageZoom";

export type MenuDay = { date: string; dishes: string[] };
type Photo = { name: string; date: string };

const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const visibleDishes = 4;
const dayLabel = (date: string) => date.split("-").reverse().join("/");

function PhotoDialog({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="menu-photo-dialog"
      aria-label={`Ảnh món ${photo.name}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <div>
          <strong>{photo.name}</strong>
          <span>Thực đơn ngày {dayLabel(photo.date)}</span>
        </div>
        <button autoFocus onClick={onClose} aria-label="Đóng ảnh món ăn">
          Đóng ×
        </button>
      </header>
      <div className="menu-photo-grid">
        {dishImages(photo.date, photo.name).map((image: { path: string }) => (
          <ZoomableImage
            key={image.path}
            src={"." + image.path}
            alt={`Ảnh món ${photo.name} từ Portal`}
            label={photo.name}
            loading="lazy"
          />
        ))}
      </div>
    </dialog>
  );
}

export default function MenuCalendar({
  days,
  today,
}: {
  days: MenuDay[];
  today: string;
}) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const latest = useMemo(() => latestMenuDay(days, today), [days, today]);
  const opening = latest || today;
  const [selected, setSelected] = useState(opening);
  const [month, setMonth] = useState(opening.slice(0, 7));
  const [query, setQuery] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const searching = query.trim().length > 0;
  const hits = (day?: MenuDay) =>
    day ? day.dishes.filter((name) => matchesDish(name, query)) : [];
  const monthHits = searching
    ? days.filter((d) => d.date.startsWith(month) && hits(d).length).length
    : 0;
  const selectedDay = byDate.get(selected);
  function show(date: string) {
    setSelected(date);
    setMonth(date.slice(0, 7));
  }
  return (
    <div className="menu-page">
      <div className="menu-toolbar">
        <button
          className="menu-step"
          aria-label="Tháng trước"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
        >
          <Icon name="arrow" size={16} style={{ transform: "rotate(180deg)" }} />
        </button>
        <label className="menu-month">
          <span>
            Tháng {Number(month.slice(5))}/{month.slice(0, 4)}
          </span>
          <Icon name="calendar" size={17} />
          <input
            type="month"
            aria-label="Tháng thực đơn"
            value={month}
            onClick={(e) => e.currentTarget.showPicker?.()}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
          />
        </label>
        <button
          className="menu-step"
          aria-label="Tháng sau"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
        >
          <Icon name="arrow" size={16} />
        </button>
        <div className="scope-period" role="group" aria-label="Chọn nhanh ngày">
          <button aria-pressed={selected === today} onClick={() => show(today)}>
            Hôm nay
          </button>
          {latest && latest !== today && (
            <button aria-pressed={selected === latest} onClick={() => show(latest)}>
              Ngày gần nhất · {dayLabel(latest)}
            </button>
          )}
        </div>
        <label className="menu-search">
          <Icon name="search" size={16} />
          <input
            type="search"
            aria-label="Tìm món ăn trong tháng"
            placeholder="Tìm món ăn trong tháng…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {searching && (
        <p className="menu-search-result" role="status">
          {monthHits
            ? `${monthHits} ngày trong tháng có món phù hợp`
            : "Không có món phù hợp trong tháng này"}
        </p>
      )}
      <div className="menu-layout">
        <section className="menu-calendar" aria-label={`Lịch thực đơn tháng ${month}`}>
          <div className="menu-weekdays" aria-hidden="true">
            {weekdays.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="menu-grid">
            {monthCells(month).map((date: string | null, i: number) => {
              if (!date) return <span key={`blank-${i}`} className="menu-blank" />;
              const day = byDate.get(date);
              const matched = hits(day);
              const chips = searching ? matched : (day?.dishes ?? []);
              const count = day?.dishes.length ?? 0;
              const className = [
                "menu-day",
                date === selected && "is-selected",
                date === today && "is-today",
                !day && "is-empty",
                searching && !matched.length && "is-dimmed",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={date}
                  className={className}
                  aria-pressed={date === selected}
                  aria-label={`Ngày ${dayLabel(date)}: ${count ? `${count} món` : "chưa có thực đơn"}`}
                  onClick={() => setSelected(date)}
                >
                  <span className="menu-day-head">
                    <b>{Number(date.slice(8))}</b>
                    {count > 0 && <small>{count} món</small>}
                  </span>
                  {day && (
                    <span className="menu-day-dishes">
                      {chips.slice(0, visibleDishes).map((name, n) => (
                        <i key={`${name}-${n}`}>{name}</i>
                      ))}
                      {chips.length > visibleDishes && (
                        <small>+{chips.length - visibleDishes} món</small>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
        <aside className="menu-detail" aria-live="polite">
          <h2>Ngày {dayLabel(selected)}</h2>
          {selectedDay ? (
            <>
              <p className="menu-detail-count">
                <Icon name="menus" size={18} /> {selectedDay.dishes.length} món ăn
              </p>
              <ul>
                {selectedDay.dishes.map((name, n) => {
                  const images = dishImages(selected, name);
                  const content = (
                    <>
                      {images.length ? (
                        <img
                          src={"." + images.at(-1).path}
                          alt=""
                          width={52}
                          height={52}
                          loading="lazy"
                        />
                      ) : (
                        <span className="menu-thumb-empty">
                          <Icon name="menus" size={20} />
                        </span>
                      )}
                      <strong>{name}</strong>
                      {images.length > 0 && <Icon name="arrow" size={15} />}
                    </>
                  );
                  return (
                    <li key={`${name}-${n}`}>
                      {images.length ? (
                        <button
                          aria-label={`Xem ảnh món ${name}`}
                          onClick={() => setPhoto({ name, date: selected })}
                        >
                          {content}
                        </button>
                      ) : (
                        <div>{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="menu-detail-empty">Chưa có thực đơn cho ngày này.</p>
          )}
        </aside>
      </div>
      {photo && <PhotoDialog photo={photo} onClose={() => setPhoto(null)} />}
    </div>
  );
}
