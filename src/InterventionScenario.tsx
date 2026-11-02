import { pairingScenarios } from "../lib/decision-scenarios";
import { number } from "./format";

/**
 * Kịch bản tuân thủ quy tắc dinh dưỡng: đổi cặp rau–canh, giữ nguyên lượng múc.
 * Không cắt khẩu phần rau (nutritionAudit khóa khi lượng ăn < W_min); lợi ích là rau thực ăn tăng, không quy ra tiền.
 */
export default function InterventionScenario() {
  const [before, after] = pairingScenarios;
  const rows = [
    ["Trước", before.vegetable, before.soup, before.vegetableWaste],
    ["Sau", after.vegetable, after.soup, after.vegetableWaste],
  ] as const;
  return (
    <section className="before-after">
      <div className="section-heading">
        <div>
          <h3>Đổi cặp rau–canh, giữ nguyên lượng rau</h3>
          <p>
            Mô phỏng từ hai ngày thực đơn có cùng món chính ({before.main}). Lượng múc không đổi; chỉ số lợi ích là rau thực ăn mỗi khay tăng lên.
          </p>
        </div>
        <span className="badge demo">MÔ PHỎNG</span>
      </div>
      {rows.map(([label, veg, soup, waste]) => (
        <div className="comparison-row" key={label}>
          <span>{label}</span>
          <div
            className="stacked-bar"
            style={{ width: `${Math.max(waste, 2) / before.vegetableWaste * 100}%` }}
            aria-label={`${label}: ${veg} và ${soup}, rau còn lại ${waste}%`}
          >
            <span className="food-bg-1" style={{ width: "100%" }} />
          </div>
          <b>{number(waste)}% rau còn lại</b>
        </div>
      ))}
      <p className="fine">
        {before.vegetable} + {before.soup} → {after.vegetable} + {after.soup}. Chưa quy ra gam rau thực ăn hay tiền: bếp vẫn nấu lượng cũ nên đây là lợi ích dinh dưỡng, không phải tiết kiệm nguyên liệu. Không áp dụng cắt khẩu phần rau khi lượng ăn đã gần W_min (85 g) và hướng dẫn 3958/QĐ-BYT (100–150 g rau/bữa chính).
      </p>
    </section>
  );
}
