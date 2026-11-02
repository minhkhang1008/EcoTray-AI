import { useState } from "react";
import { nutritionAudit } from "../lib/final-round.mjs";
import { pairingScenarios } from "../lib/decision-scenarios";
import type { TrayRow } from "../lib/contracts";
import { number } from "./format";
import { MODEL } from "./lib/ecotrayVisionEngine";

export function MealComboLine({ main, rows = [] }: { main: string; rows?: TrayRow[] }) {
  const sides = ([['riceDish', 'Cơm / Tinh bột'], ['vegetableDish', 'Món rau đi kèm'], ['soupDish', 'Món canh đi kèm']] as const)
    .map(([key, label]) => [label, [...new Set(rows.map(r => r[key]).filter(Boolean))].join(" / ")])
    .filter(([, value]) => value);
  if (!sides.length) return null;
  return <dl className="meal-combo-line" aria-label={"Món đi kèm " + main}>{sides.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function PairingMatrix() {
  const [selected, setSelected] = useState("pair-a");
  const active = pairingScenarios.find(c => c.id === selected)!;
  return <section className="panel pairing-panel" aria-labelledby="pairing-title">
    <div className="section-heading"><div><h2 id="pairing-title">Một món chính, hai cách phối hợp</h2><p>Phân tích tổ hợp cặp món · cùng Vịt kho gừng</p></div><span className="badge demo">KỊCH BẢN MÔ PHỎNG</span></div>
    <p className="fine">Mốc 310 suất và ngày dưới đây thuộc kịch bản đề xuất. Không phải hai lần đo đối chứng; không cộng vào 1.280 khay nguồn.</p>
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Bảng có thể cuộn ngang"><table><caption>Ma trận bốn thành phần · minh họa 310 suất / tổ hợp</caption><thead><tr>{["Tổ hợp", "Cơm / Tinh bột", "Món chính", "Món rau", "Món canh", "Rau còn lại", "Canh còn lại"].map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{pairingScenarios.map((c, i) => <tr key={c.id} className={selected === c.id ? "pair-selected" : ""}><th scope="row"><button aria-pressed={selected === c.id} onClick={() => setSelected(c.id)}>{i === 0 ? "A · Hiện trạng" : "B · Đề xuất"}<small>{c.date} · mô phỏng</small></button></th><td>{c.rice}</td><td>{c.main}</td><td>{c.vegetable}</td><td>{c.soup}</td><td><strong>{number(c.vegetableWaste)}%</strong></td><td>{number(c.soupWaste)}%</td></tr>)}</tbody></table></div>
    <p className="pairing-insight" role="status"><b>{selected === "pair-a" ? "Khảo sát cặp rau–canh trước khi giảm lượng." : "Đổi cặp món, giữ lượng rau rồi đo lại."}</b> {active.vegetable} + {active.soup}: rau còn lại {number(active.vegetableWaste)}%, canh {number(active.soupWaste)}%. Chênh lệch là giả định để thử nghiệm, chưa xác định nguyên nhân khẩu vị.</p>
  </section>;
}

export function NutritionPanel({ served, waste, compact = false, concise = false }: { served?: number; waste?: number; compact?: boolean; concise?: boolean }) {
  const [example, setExample] = useState("locked");
  const interactive = !compact;
  const grams = interactive ? example === "locked" ? 90 : 120 : served;
  const pct = interactive ? example === "locked" ? 46.5 : 25 : waste;
  const audit = nutritionAudit(grams, pct);
  return <section className={"nutrition-panel " + (compact ? "compact" : "panel")} aria-label="Bảo vệ định lượng rau">
    <div className="section-heading"><div><h3>{audit.kind === "locked" ? "Khóa giảm định lượng rau" : "Bảo vệ định lượng rau"}</h3><p>Ngưỡng thử nghiệm: 85 g rau/khay</p></div>{!concise && <span className="badge demo">{interactive ? "THỬ QUY TẮC" : "GIẢ ĐỊNH CẤU HÌNH"}</span>}</div>
    {interactive && <div className="segmented" role="group" aria-label="Kịch bản định lượng rau">{[["locked", "Thực ăn dưới ngưỡng"], ["calibrate", "Dư định lượng múc"]].map(([id, label]) => <button key={id} aria-pressed={example === id} className={example === id ? "selected" : ""} onClick={() => setExample(id)}>{label}</button>)}</div>}
    {audit.kind === "unknown" ? <p>Chưa có định lượng đã cân. Chưa cho phép giảm rau; bổ sung mẫu cân trước khi quyết định.</p> : <><dl className="nutrition-values">{[["Múc ban đầu", audit.served], ["Bỏ thừa ước tính", audit.wasted], ["Thực ăn ước tính", audit.consumed], ["Ngưỡng minh họa", audit.minimum]].map(([label, v]) => <div key={String(label)}><dt>{label}</dt><dd>{number(Number(v))} <small>g</small></dd></div>)}</dl><p className="nutrition-action">{audit.kind === "locked" ? `Giữ ${number(audit.served!)} g rau; thử đổi cách chế biến hoặc cặp rau–canh. Không giảm lượng khi thực ăn còn dưới ngưỡng.` : audit.kind === "calibrate" ? `Thử ${number(audit.proposed!)} g/khay; đo lại lượng thực ăn và mức đủ ăn ở chu kỳ sau.` : "Giữ nguyên và tiếp tục theo dõi."}</p></>}
    {!concise && <p className="fine">85 g là giả định trong kịch bản, chưa phải chuẩn áp dụng tại trường. Khối lượng rau không tương đương khối lượng chất xơ. Định lượng theo lứa tuổi cần người phụ trách dinh dưỡng xác nhận; dự báo thực ăn phải được đo lại.</p>}
  </section>;
}

export function EvidencePanel() {
  return (
    <section className="panel"><h2>Kiểm chứng & đồng hành</h2><dl className="evidence-list"><div><dt>Thực địa PTNK</dt><dd>144 khay quan sát · khoảng 44 g/khay; pilot 07/10: 51 khay.</dd></div><div><dt>Hiệu chuẩn Vision</dt><dd>100 ảnh thực tế của học sinh tại PTNK. MAE kiểm định theo nhóm của mô hình Ridge trên gallery: {number(MODEL.validation.overallMAE)} điểm phần trăm, so với {number(MODEL.validation.baselineMeanLabelMAE.overall)} điểm nếu chỉ đoán bằng trung bình nhãn; nhãn ước lượng bằng mắt. Bộ đọc ảnh ESP32 của trạm chưa có sai số đo được; chưa có bộ cân đối chứng độc lập.</dd></div></dl></section>
  );
}


type ComboEntry = { riceDish: string; vegetableDish: string; soupDish: string; soup: string };
export function ComboFields({ value, onChange }: { value: ComboEntry; onChange: (patch: Partial<ComboEntry>) => void }) {
  return <fieldset className="combo-fields"><legend>Tổ hợp món đi kèm <small>Không bắt buộc · bỏ trống nếu chưa biết</small></legend><div className="form-grid">{([['riceDish','Cơm / Tinh bột'],['vegetableDish','Món rau đi kèm'],['soupDish','Món canh đi kèm']] as const).map(([key,label]) => <label key={key}>{label}<input maxLength={100} value={value[key]} onChange={e => onChange({[key]:e.target.value})} /></label>)}<label>Canh còn lại<select value={value.soup} onChange={e => onChange({soup:e.target.value})}><option value="NA">Chưa quan sát</option>{[0,25,50,75,100].map(v => <option key={v} value={String(v)}>{v}%</option>)}</select></label></div><p className="fine">Canh được lưu và xuất riêng; chỉ số tổng hợp ba thành phần nguồn giữ nguyên cách tính.</p></fieldset>;
}
