import { useEffect, useRef, useState } from "react";

export default function MenuSlotFilter({ selected, onChange }: {
  selected: number[];
  onChange: (slots: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const all = selected.length === 4;
  return <div className="menu-slot-filter" ref={root} onKeyDown={event => {
    if (event.key === "Escape") { event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
  }}>
    <span id="menu-slot-label">Món ăn</span>
    <button ref={trigger} type="button" aria-labelledby="menu-slot-label menu-slot-value"
      aria-expanded={open} aria-controls="menu-slot-options" onClick={() => setOpen(!open)}>
      <span id="menu-slot-value">{all ? "Tất cả món" : selected.length ? `Món ${selected.join(", ")}` : "Chưa chọn món"}</span>
      <span aria-hidden="true">⌄</span>
    </button>
    {open && <fieldset id="menu-slot-options" className="menu-slot-options">
      <legend>Chọn món</legend>
      <label><input type="checkbox" checked={all} onChange={() => onChange(all ? [] : [1, 2, 3, 4])} />Tất cả món</label>
      {[1, 2, 3, 4].map(slot => <label key={slot}>
        <input type="checkbox" checked={selected.includes(slot)} onChange={() => onChange(
          selected.includes(slot) ? selected.filter(value => value !== slot) : [...selected, slot].sort(),
        )} />Món {slot}
      </label>)}
    </fieldset>}
  </div>;
}
