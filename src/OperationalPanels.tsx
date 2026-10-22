import { useState } from "react";
import { useFinalRound } from "./FinalRoundContext";
import { adapters, cloudEstimate } from "../lib/final-round.mjs";
import { number, dateLabel, csvCell, downloadCsv } from "./format";
import type { Adapter } from "../lib/contracts";

export function OperationalOverview({ mode }: { mode: string }) {
  const f = useFinalRound();
  return (
    <>
      <section className="operational-funnel panel">
        <div className="section-heading">
          <div>
            <h2>Đăng ký → Thực nhận → Khay phân tích</h2>
            <p>
              {mode === "demo"
                ? "Kịch bản vận hành một ngày · độc lập với bộ 1.280 khay"
                : mode === "hardware"
                  ? "Sự kiện từ phần cứng · tối đa 100 khay gần nhất"
                  : "Dữ liệu cân/ghi nhận trên thiết bị chưa có số suất đăng ký"}
            </p>
          </div>
          <span className="badge demo">
            {mode === "demo" ? "MÔ PHỎNG" : "NGUỒN RIÊNG"}
          </span>
        </div>
        <div className="funnel-stages">
          {[
            [
              "01",
              f.adapterInfo.portal
                ? "Đăng ký trên Portal"
                : f.adapterInfo.input,
              mode === "demo" ? "1.017 suất" : "Chưa có số liệu",
            ],
            [
              "02",
              f.adapterInfo.nfc
                ? "Thực nhận qua NFC"
                : f.adapter === "standard"
                  ? "Sĩ số theo lớp"
                  : "Suất do bếp báo",
              mode === "demo"
                ? "1.004 suất · 13 vắng"
                : mode === "hardware"
                  ? number(f.remote?.servedCount ?? 0) + " suất"
                  : "Chưa ghi nhận",
            ],
            [
              "03",
              "Khay đã phân tích",
              mode === "demo"
                ? "986 khay"
                : mode === "hardware"
                  ? number(f.hardwareRows.length) + " khay"
                  : "Xem thống kê bên dưới",
            ],
          ].map(([n, label, value]) => (
            <article key={n}>
              <span>{n}</span>
              <div>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="sustainability-strip">
        <div className="strip-intro">
          <h2>Bền vững & kinh tế</h2>
          <span className="badge demo">KỊCH BẢN ƯỚC TÍNH</span>
        </div>
        <div className="esg-grid">
          {[
            [
              "318 kg",
              "Thực phẩm ngăn lãng phí / tháng",
              "10,6 kg × 30 ngày · giảm 16,8%",
            ],
            [
              "7.950.000đ",
              "Nguyên liệu tiết kiệm / tháng",
              "318 kg × 25.000đ/kg giả định",
            ],
            [
              "20.340",
              "Phiếu giấy thay thế / tháng",
              "1.017 suất × 20 ngày học",
            ],
            [
              "~795 kg CO₂e",
              "Phát thải quy đổi / tháng",
              "Giả định 2,5 kg CO₂e/kg thực phẩm",
            ],
          ].map(([v, l, n]) => (
            <article key={l}>
              <strong>{v}</strong>
              <span>{l}</span>
              <small>{n}</small>
            </article>
          ))}
        </div>
        <p className="fine">
          Đây là các kịch bản, chưa phải tác động thực địa. Dự toán năm theo
          README: 30 triệu nguyên liệu + 5,5 triệu phiếu giấy = 35,5 triệu
          đồng/năm; không ngoại suy kịch bản tháng thành kết quả năm.
        </p>
      </section>
    </>
  );
}
export function AdapterSettings() {
  const f = useFinalRound();
  return (
    <section className="panel adapter-settings">
      <div className="section-heading">
        <div>
          <h2>Cấu hình mô-đun trường học</h2>
          <p>
            Mỗi trường chọn đầu vào phù hợp, dùng chung vòng phản hồi cho bếp.
          </p>
        </div>
        <span className="badge">{f.adapterInfo.name}</span>
      </div>
      <div className="adapter-grid">
        {(Object.keys(adapters) as Adapter[]).map((key) => {
          const a = adapters[key];
          return (
            <button
              key={key}
              className={
                f.adapter === key ? "adapter-card selected" : "adapter-card"
              }
              aria-pressed={f.adapter === key}
              onClick={() => f.setAdapter(key)}
            >
              <strong>{a.name}</strong>
              <span>{a.description}</span>
              <small>✓ ESP32-CAM + AI</small>
              <small>✓ {a.input}</small>
              <small>
                {a.nfc ? "✓ NFC + Lọc dị ứng" : "Không yêu cầu NFC / Portal"}
              </small>
            </button>
          );
        })}
      </div>
      <div className="module-badges">
        <span className="badge ready">ESP32-CAM</span>
        <span className={"badge " + (f.adapterInfo.portal ? "ready" : "")}>
          {f.adapterInfo.portal ? "Bật" : "Tắt"} · Đồng bộ Portal
        </span>
        <span className={"badge " + (f.adapterInfo.nfc ? "ready" : "")}>
          {f.adapterInfo.nfc ? "Bật" : "Tắt"} · NFC
        </span>
        <span className={"badge " + (f.adapterInfo.allergy ? "ready" : "")}>
          {f.adapterInfo.allergy ? "Bật" : "Tắt"} · Hồ sơ dị ứng
        </span>
        <span className="badge ready">Kiểm định ngoại lai IQR</span>
      </div>
      <p className="fine">
        Đây là cấu hình trình diễn khả năng nhân rộng. Bật mô-đun không tự xác
        nhận rằng Portal hoặc phần cứng đã được triển khai.
      </p>
    </section>
  );
}
export function CloudCalculator() {
  const [students, setStudents] = useState(1017),
    [days, setDays] = useState(20),
    cost = cloudEstimate(students, days);
  return (
    <section className="panel cloud-calculator">
      <div className="section-heading">
        <div>
          <h2>Bảng tính chi phí hạ tầng</h2>
          <p>
            Dự toán theo giả định trong README · không phải báo giá AWS trực
            tiếp
          </p>
        </div>
        <span className="badge">~290.000đ / trạm Vision</span>
      </div>
      <div className="calculator-grid">
        <div>
          <label>
            Số học sinh / trường <strong>{number(students)}</strong>
            <input
              aria-label="Số học sinh"
              type="range"
              min="500"
              max="3000"
              step="1"
              value={students}
              onChange={(e) => setStudents(Number(e.target.value))}
            />
          </label>
          <div className="range-labels">
            <span>500 học sinh</span>
            <button
              onClick={() => {
                setStudents(1017);
                setDays(20);
              }}
            >
              PTNK · 1.017
            </button>
            <span>3.000 học sinh</span>
          </div>
          <label>
            Ngày phục vụ / tháng
            <input
              aria-label="Ngày phục vụ mỗi tháng"
              type="number"
              min="1"
              max="31"
              value={days}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (n >= 1 && n <= 31) setDays(n);
              }}
            />
          </label>
          <p className="fine">
            {number(cost.images)} ảnh/tháng · 800×600 JPEG, giả định 45 KB/ảnh ·
            giữ ảnh 30 ngày.
          </p>
        </div>
        <div className="cost-result">
          <small>OPEX đám mây ước tính / tháng</small>
          <strong>
            {number(cost.total)} <span>VNĐ</span>
          </strong>
          <dl>
            {[
              ["API Gateway (giả định Free Tier)", cost.api],
              ["Lambda (giả định Free Tier)", cost.lambda],
              ["Lưu ảnh S3, 30 ngày", cost.storage],
              ["AI inference & cơ sở dữ liệu", cost.inference],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{number(Number(value))}đ</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <details>
        <summary>Giả định, công thức & giới hạn của dự toán</summary>
        <p className="fine">
          Mốc 1.017 học sinh × 20 ngày: 500đ S3 + 38.000đ AI/database =
          38.500đ/tháng. Nhân tuyến tính với số ảnh. API Gateway và Lambda tạm
          tính 0đ khi còn hạn mức miễn phí; cần kiểm tra tài khoản, khu vực,
          thời hạn ưu đãi và lưu lượng trước triển khai. Chưa bao gồm truyền dữ
          liệu, thuế, phí Redis hoặc S3 requests phát sinh.
        </p>
        <p className="fine">
          Ước tính nguyên liệu tiết kiệm: 30 triệu đồng / 180 ngày × 20 ngày =
          khoảng 3,33 triệu đồng cho tháng học 20 ngày; không phải kết quả đã
          đo. NFC: thêm 195.000đ cho đầu đọc rời hoặc 0đ nếu tận dụng Android
          tương thích sẵn có.
        </p>
      </details>
    </section>
  );
}
export function InterventionHistory() {
  const f = useFinalRound(),
    history = f.history.filter((h) => h.source === f.source);
  function exportHistory() {
    downloadCsv(
      "EcoTray-can-thiep-" + f.source + ".csv",
      [
        "at,menu,kind,recommendation,source",
        ...history.map((h) =>
          [h.at, h.menu, h.kind, h.text, h.source].map(csvCell).join(","),
        ),
      ].join("\n"),
    );
  }
  return (
    <section className="intervention-history">
      <div className="section-heading">
        <div>
          <h2>Lịch sử bếp phê duyệt</h2>
          <p>
            {f.source === "simulation" ? "Mô phỏng" : "Phần cứng"} · lưu riêng
            trên trình duyệt
          </p>
        </div>
        <button disabled={!history.length} onClick={exportHistory}>
          Xuất lịch sử CSV
        </button>
      </div>
      {history.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Món</th>
                <th>Quyết định</th>
                <th>Nguồn</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{dateLabel(h.at)}</td>
                  <td>{h.menu}</td>
                  <td className="wrap-cell">{h.text}</td>
                  <td>{h.source === "simulation" ? "Mô phỏng" : "Từ trạm"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty">
          Chưa có phê duyệt. Mở Live Demo để thực hiện vòng phản hồi.
        </p>
      )}
    </section>
  );
}
