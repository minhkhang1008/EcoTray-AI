import { useState } from "react";
import { lastSevenDays } from "../lib/date-range.mjs";

const label = (date: string) => date.split("-").reverse().join("/");

export default function DateFilter({ today, latestDay, from, to, onChange }: {
  today: string;
  latestDay: string;
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(from || today);
  const [end, setEnd] = useState(to || today);
  const week = lastSevenDays(today);
  const selected = from === today && to === today ? "today"
    : from === week.from && to === week.to ? "week"
    : latestDay && from === latestDay && to === latestDay ? "latest"
    : !from && !to ? "all" : "custom";

  return <div className="date-filter">
    <label className="date-filter-select">
      Thời gian
      <select aria-label="Thời gian phân tích" value={editing ? "custom" : selected}
        onChange={e => {
          const value = e.target.value;
          setEditing(value === "custom");
          if (value === "today") onChange(today, today);
          if (value === "week") onChange(week.from, week.to);
          if (value === "latest") onChange(latestDay, latestDay);
          if (value === "all") onChange("", "");
          if (value === "custom") { setStart(from || today); setEnd(to || today); }
        }}>
        <option value="today">Hôm nay · {label(today)}</option>
        {latestDay && latestDay !== today && <option value="latest">Ngày gần nhất · {label(latestDay)}</option>}
        <option value="week">7 ngày qua</option>
        <option value="custom">Khoảng ngày…</option>
        <option value="all">Toàn bộ thời gian</option>
      </select>
    </label>
    {!editing && selected === "week" && <span className="date-filter-summary">{label(from)} – {label(to)}</span>}
    {!editing && selected === "custom" && <button type="button" onClick={() => {
      setStart(from || today); setEnd(to || today); setEditing(true);
    }}>{from ? label(from) : "Đầu kỳ"} – {to ? label(to) : "Cuối kỳ"}</button>}
    {editing && <form className="date-filter-range" onSubmit={e => {
      e.preventDefault();
      if (!start || !end || start > end) return;
      onChange(start, end); setEditing(false);
    }}>
      <label>Từ ngày<input type="date" required value={start} max={end || undefined} onInput={e => setStart(e.currentTarget.value)} /></label>
      <label>Đến ngày<input type="date" required value={end} min={start || undefined} onInput={e => setEnd(e.currentTarget.value)} /></label>
      <button type="submit">Áp dụng</button>
      <button type="button" onClick={() => setEditing(false)}>Hủy</button>
    </form>}
  </div>;
}
