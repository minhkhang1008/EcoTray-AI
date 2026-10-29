import { componentKeys, componentLabels } from "../lib/final-round.mjs";
import { number } from "./format";

export default function InterventionScenario() {
  return (
      <section className="before-after">
        <div className="section-heading">
          <div>
            <h3>Trước & sau can thiệp</h3>
            <p>
              Kịch bản mô phỏng toàn căn tin · chưa có kết quả sau can thiệp thực địa
            </p>
          </div>
          <span className="badge demo">−16,8%</span>
        </div>
        {[
          ["Trước", 63.1, 16.8, 31.4, 14.9],
          ["Sau", 52.5, 16.1, 21.9, 14.5],
        ].map(([label, total, rice, veg, main]) => (
          <div className="comparison-row" key={label}>
            <span>{label}</span>
            <div
              className="stacked-bar"
              style={{ width: `${(Number(total) / 63.1) * 100}%` }}
              aria-label={`${label}: Cơm ${rice} kg, Rau ${veg} kg, Món chính ${main} kg`}
            >
              {[rice, veg, main].map((v, i) => (
                <span
                  key={i}
                  className={"food-bg-" + i}
                  style={{ width: `${(Number(v) / Number(total)) * 100}%` }}
                />
              ))}
            </div>
            <b>{number(Number(total))} kg</b>
          </div>
        ))}
        <div className="chart-key">
          {componentKeys.map((k, i) => (
            <span key={k}>
              <i className={"food-bg-" + i} />
              {componentLabels[k]}
            </span>
          ))}
        </div>
        <p className="fine">
          Khảo sát cặp món và định lượng, bảo vệ ngưỡng rau đã cấu hình; giữ nguyên tổng số suất. 63,1 →
          52,5 kg/ngày là mô phỏng theo README, chưa có dữ liệu sau can thiệp
          thực địa.
        </p>
      </section>
  );
}
