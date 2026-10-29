import { useRef, useState } from "react";
import {
  MODEL,
  RIDGE_WEIGHTS,
  PTNK_18_TRAYS_CATALOG,
  evaluateTrayWithTrainedModel,
  extractFeatures,
  getRois,
  updateWeights,
  visionKeys,
  type FeatureVectors,
  type ModelWeights,
  type Percentages,
  type VisionAnalysisResponse,
} from "./lib/ecotrayVisionEngine";
import { useFinalRound } from "./FinalRoundContext";
import { number } from "./format";
export function VisionResult({
  analysis,
  imageUrl,
}: {
  analysis: VisionAnalysisResponse;
  imageUrl: string | null;
}) {
  return (
    <>
      <div className="ptnk-overlay">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Khay thức ăn PTNK với bốn vùng phân tích cố định"
          />
        ) : (
          <p>Ảnh không còn khả dụng.</p>
        )}
        {imageUrl &&
          visionKeys.map((k) => {
            const c = analysis.components[k],
              [x1, y1, x2, y2] = c.bboxNormalized;
            return (
              <div
                key={k}
                className={"ptnk-box ptnk-" + k}
                style={{
                  left: x1 * 100 + "%",
                  top: y1 * 100 + "%",
                  width: (x2 - x1) * 100 + "%",
                  height: (y2 - y1) * 100 + "%",
                }}
              >
                <span>
                  {c.nameVi} · {number(c.wastePct)}%
                </span>
              </div>
            );
          })}
      </div>
      <div className="table-scroll">
        <table className="ptnk-results">
          <caption>
            Ước lượng theo định lượng giả định; chưa phải khối lượng cân
          </caption>
          <thead>
            <tr>
              <th>Thành phần</th>
              <th>Phần còn lại</th>
              <th>Đã ăn (ước tính)</th>
            </tr>
          </thead>
          <tbody>
            {visionKeys.map((k) => {
              const c = analysis.components[k];
              return (
                <tr key={k}>
                  <th scope="row">{c.nameVi}</th>
                  <td>{number(c.wastePct)}%</td>
                  <td>
                    {number(c.consumedGrams)} g / {c.servedGrams} g
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="badge">
        {analysis.nutritionalFloorLocked ? "🔒" : "✓"} Ngưỡng bảo vệ dinh dưỡng
        W_min ≥ 85g ·{" "}
        {analysis.nutritionalFloorLocked ? "Khóa giảm rau" : "Giữ mức bảo vệ"}
      </p>
      <p className="fine">
        Ngưỡng chính sách thử nghiệm. Vùng khay cố định; lọc nước kho và dụng cụ
        bằng màu/texture, có thể còn nhiễu.
      </p>
    </>
  );
}
export function VisionStreamPanel() {
  const { vision } = useFinalRound();
  const tray = vision.active;
  return (
    <section className="panel ptnk-stream">
      <div className="section-heading">
        <div>
          <h2>Luồng ảnh từ trạm IoT</h2>
          <p>NFC → Phân tích khay → Kiểm định → Phê duyệt</p>
        </div>
        <span className="badge">
          {vision.usingFallback
            ? "Ảnh tham chiếu · sự kiện dự phòng"
            : vision.online
              ? "API đã kết nối"
              : "Chưa kết nối API"}
        </span>
      </div>
      {!tray ? (
        <p role="status">
          Chờ ESP32-CAM gửi ảnh. Chưa có dữ liệu thiết bị để phân tích.
        </p>
      ) : (
        <div className="ptnk-workbench">
          <div>
            <VisionResult analysis={tray.analysis} imageUrl={tray.imageUrl} />
          </div>
          <div>
            <h3>{tray.analysis.comboName}</h3>
            <p>{tray.analysis.decisionLoop.headline}</p>
            <p>{tray.analysis.decisionLoop.recommendation}</p>
            <p className="fine">
              {tray.analysis.referenceOnly
                ? "Mốc đối chứng · loại khỏi thống kê khay trả"
                : tray.analysis.isDietaryOutlier
                  ? "Ngoại lai · không tính vào điều chỉnh khẩu phần"
                  : `IQR: ${tray.analysis.iqrEligibleCount} khay độc lập cùng ngày và thực đơn; ${tray.analysis.iqrEligibleCount < 10 ? "chưa đủ 10 mẫu để kết luận" : "đã kiểm tra ngưỡng"}.`}
            </p>
            <button
              className="primary"
              disabled={vision.approved || tray.analysis.referenceOnly}
              onClick={vision.approve}
            >
              {vision.approved
                ? "Đã ghi nhận phê duyệt"
                : "Phê duyệt điều chỉnh thực đơn"}
            </button>
            <p className="fine">
              Phê duyệt lưu trong phiên trình duyệt; bếp triển khai và đo lại ở
              chu kỳ sau.
            </p>
            {vision.usingFallback && (
              <button onClick={vision.resume}>Trở về luồng thiết bị</button>
            )}
          </div>
        </div>
      )}
      {vision.error && !vision.usingFallback && (
        <p className="fine" role="status">
          {vision.error}
        </p>
      )}
      {vision.approvals.length > 0 && (
        <details>
          <summary>
            Lịch sử phê duyệt trong phiên ({vision.approvals.length})
          </summary>
          {vision.approvals.map((a) => (
            <p key={a.revision}>
              {a.source === "hardware" ? "Từ trạm" : "Ảnh tham chiếu"} ·{" "}
              {new Date(a.at).toLocaleTimeString("vi-VN")} · {a.recommendation}
            </p>
          ))}
        </details>
      )}
    </section>
  );
}
export function RealtimeFunnel() {
  const f = useFinalRound(),
    tray = f.vision.active;
  return (
    <section className="panel operational-funnel">
      <div className="section-heading">
        <h2>Đăng ký → Thực nhận → Khay phân tích</h2>
        <span className="badge">Theo nguồn sự kiện</span>
      </div>
      <div className="funnel-stages">
        <article>
          <span>01</span>
          <div>
            <small>Đăng ký</small>
            <strong>Chưa đồng bộ</strong>
          </div>
        </article>
        <article>
          <span>02</span>
          <div>
            <small>
              Thực nhận NFC ·{" "}
              {f.source === "simulation" ? "sự kiện mô phỏng" : "từ trạm"}
            </small>
            <strong>
              {f.source === "simulation"
                ? number(f.stage.served)
                : f.connected
                  ? number(f.remote?.servedCount ?? 0)
                  : "Chờ kết nối"}
            </strong>
          </div>
        </article>
        <article>
          <span>03</span>
          <div>
            <small>
              Ảnh phân tích mới nhất ·{" "}
              {tray?.source === "reference-fallback" ? "tham chiếu" : "từ trạm"}
            </small>
            <strong>
              {tray
                ? tray.analysis.components.veg.wastePct + "% rau còn lại"
                : "Chờ ảnh"}
            </strong>
          </div>
        </article>
      </div>
      <p className="fine">
        Ảnh tham chiếu và sự kiện dự phòng không cộng vào thống kê phần cứng. Bộ
        đếm NFC độc lập với số ảnh nhận.
      </p>
    </section>
  );
}
export default function PTNKVision() {
  const first = Object.keys(PTNK_18_TRAYS_CATALOG)[0];
  const [sampleId, setSampleId] = useState(first),
    [imageUrl, setImageUrl] = useState("./ptnk-normalized/" + first),
    [features, setFeatures] = useState<FeatureVectors>(
      MODEL.features[first as keyof typeof MODEL.features],
    ),
    [weights, setWeights] = useState<ModelWeights>(
      structuredClone(RIDGE_WEIGHTS),
    ),
    [version, setVersion] = useState(0),
    [feedback, setFeedback] = useState<Percentages>([0, 0, 0, 0]),
    [manual, setManual] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [vegPos, setVegPos] = useState<"TR" | "TL">("TR");
  const request = useRef(0);
  const analysis = evaluateTrayWithTrainedModel({
    ...(sampleId ? { sampleId } : {}),
    featureVectors: features,
    weights,
    ...(manual ? { overridePcts: feedback } : {}),
    vegPos,
  });
  function choose(id: string) {
    request.current++;
    setBusy(false);
    setSampleId(id);
    setImageUrl("./ptnk-normalized/" + id);
    setFeatures(MODEL.features[id as keyof typeof MODEL.features]);
    setManual(false);
    setMessage("");
  }
  async function upload(file: File | undefined, pos: "TL" | "TR" = vegPos) {
    if (!file) return;
    const token = ++request.current;
    setBusy(true);
    setMessage("");
    try {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 8_000_000
      )
        throw Error("Chọn ảnh JPEG, PNG hoặc WebP dưới 8 MB.");
      const bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 24_000_000) {
        bitmap.close();
        throw Error("Ảnh tối đa 24 megapixel.");
      }
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        bitmap.close();
        throw Error("Trình duyệt chưa hỗ trợ đọc ảnh.");
      }
      ctx.drawImage(bitmap, 0, 0, 800, 600);
      bitmap.close();
      const pixels = ctx.getImageData(0, 0, 800, 600),
        rois = getRois(pos);
      const next = Object.fromEntries(
        visionKeys.map((k) => [k, extractFeatures(pixels, rois[k])]),
      ) as FeatureVectors;
      if (token !== request.current) return;
      setSampleId("");
      setImageUrl(canvas.toDataURL("image/jpeg", 0.8));
      setFeatures(next);
      setManual(false);
      setMessage(
        "Ảnh xử lý trên thiết bị. Cần khay nằm ngang và đúng vùng đọc; ảnh khác bố cục không bảo đảm kết quả.",
      );
    } catch (e) {
      if (token === request.current) setMessage((e as Error).message);
    } finally {
      if (token === request.current) setBusy(false);
    }
  }
  const file = useRef<File | undefined>(undefined);
  function calibrate() {
    try {
      const next = updateWeights(weights, features, feedback);
      setWeights(next);
      setVersion((v) => v + 1);
      setManual(false);
      setMessage(
        "Đã cập nhật trọng số trong phiên. Kết quả bên trái được tính lại; cần kiểm định lại trước khi dùng cho trạm.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <section className="panel ptnk-lab">
      <div className="section-heading">
        <div>
          <h2>Bộ dữ liệu Huấn luyện & Kiểm định Thực địa PTNK</h2>
          <p>
            18 ảnh thật · 28–29/10/2026 · nhãn phần còn lại ước lượng bằng mắt
          </p>
        </div>
        <span className="badge">ẢNH THỰC ĐỊA</span>
      </div>
      <p className="ptnk-evaluation">
        MAE kiểm định theo nhóm:{" "}
        <b>{number(MODEL.validation.overallMAE)} điểm phần trăm</b> · 16 ảnh
        được chấm, 2 mốc hiệu chuẩn không chấm. Chưa có độ chính xác phân loại
        được xác thực.
      </p>
      <div className="ptnk-gallery" aria-label="18 mẫu ảnh khay thực địa">
        {Object.entries(PTNK_18_TRAYS_CATALOG).map(([id, m], i) => (
          <button
            key={id}
            aria-pressed={sampleId === id}
            onClick={() => choose(id)}
            title={m.combo + " · " + id}
          >
            <img
              src={"./ptnk-normalized/" + id}
              alt={"Mẫu " + (i + 1) + " · " + m.combo}
              loading="lazy"
            />
            <strong>
              {String(i + 1).padStart(2, "0")} · {m.date.slice(8)}/
              {m.date.slice(5, 7)}
            </strong>
            <small>
              {id === MODEL.anchors.empty
                ? "Mốc sạch 0%"
                : id === MODEL.anchors.full
                  ? "Mốc đầy 100%"
                  : m.group !== id
                    ? "Góc chụp lặp"
                    : "Khay tham chiếu"}
            </small>
          </button>
        ))}
      </div>
      <div className="section-heading">
        <div>
          <h3>Hiệu chỉnh trực tuyến · Online Calibration Sandbox</h3>
          <p>
            {sampleId || "Ảnh tải lên"} · Trọng số phiên {version}
            {version > 0 ? " · chưa kiểm định lại" : ""}
          </p>
        </div>
        <label className="ptnk-upload">
          Tải ảnh khay
          <input
            aria-label="Tải ảnh khay để phân tích"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => {
              file.current = e.target.files?.[0];
              void upload(file.current);
            }}
          />
        </label>
      </div>
      <p className="fine">
        Chỉ dùng ảnh khay, không có khuôn mặt hoặc thông tin nhận diện. Ảnh tải
        lên và phản hồi không được gửi lên máy chủ.
      </p>
      {!sampleId && (
        <label>
          Vị trí rau trên ảnh{" "}
          <select
            value={vegPos}
            onChange={(e) => {
              const pos = e.target.value as "TL" | "TR";
              setVegPos(pos);
              void upload(file.current, pos);
            }}
          >
            <option value="TR">Ô trên bên phải</option>
            <option value="TL">Ô trên bên trái</option>
          </select>
        </label>
      )}
      <div className="ptnk-workbench" aria-busy={busy}>
        <div>
          <VisionResult analysis={analysis} imageUrl={imageUrl} />
        </div>
        <div>
          <h3>{analysis.comboName}</h3>
          <p className="badge">
            {manual ? "Nhãn hiệu chỉnh thủ công" : "Dự đoán Ridge từ pixel"}
          </p>
          {sampleId && (
            <p className="fine">
              Nhãn tham chiếu (Cơm / Món chính / Rau / Canh):{" "}
              {PTNK_18_TRAYS_CATALOG[
                sampleId as keyof typeof PTNK_18_TRAYS_CATALOG
              ].y.join(" / ")}
              %. Hai mốc chuẩn hóa là 0% và 100%; nhãn gốc được giữ riêng.
            </p>
          )}
          <h3>{analysis.decisionLoop.headline}</h3>
          <p>{analysis.decisionLoop.recommendation}</p>
          <p className="fine">
            IQR: {analysis.iqrEligibleCount} mẫu độc lập cùng thực đơn/ngày;{" "}
            {analysis.iqrEligibleCount < 10
              ? "chưa đủ 10 mẫu nền để kết luận."
              : "đã kiểm tra ngưỡng ngoại lai."}
          </p>
          <h3>Phản hồi người kiểm định</h3>
          {visionKeys.map((k, i) => (
            <label className="scenario-slider" key={k}>
              {analysis.components[k].nameVi} ·{" "}
              {manual ? feedback[i] : analysis.components[k].protocolLevel}%
              <input
                type="range"
                min="0"
                max="100"
                step="25"
                aria-label={"Hiệu chỉnh " + analysis.components[k].nameVi}
                value={
                  manual ? feedback[i] : analysis.components[k].protocolLevel
                }
                onChange={(e) => {
                  const next: Percentages = manual
                    ? [...feedback]
                    : (visionKeys.map(
                        (c) => analysis.components[c].protocolLevel,
                      ) as Percentages);
                  next[i] = Number(e.target.value);
                  setFeedback(next);
                  setManual(true);
                }}
              />
              <small>0% · 25% · 50% · 75% · 100%</small>
            </label>
          ))}
          <div className="header-actions">
            <button
              className="primary"
              onClick={calibrate}
              disabled={
                !manual ||
                busy ||
                sampleId === MODEL.anchors.empty ||
                sampleId === MODEL.anchors.full
              }
            >
              Cập nhật Trọng số Mô hình (Active Learning)
            </button>
            <button
              onClick={() => {
                setWeights(structuredClone(RIDGE_WEIGHTS));
                setVersion(0);
                setManual(false);
                setMessage("Đã khôi phục trọng số gốc.");
              }}
            >
              Khôi phục trọng số gốc
            </button>
          </div>
          <p className="fine">
            Phản hồi cập nhật hồi quy trong phiên này. Không thay mô hình máy
            chủ hoặc kết quả kiểm định gốc.
          </p>
          {message && <p role="status">{message}</p>}
          <details>
            <summary>Phương pháp và giới hạn kiểm định</summary>
            <p>
              Ridge α = 0,15; bỏ lần lượt từng nhóm khay liên quan để kiểm định.
              Các góc chụp lặp nằm cùng nhóm; hai mốc cố định luôn dùng để hiệu
              chuẩn và không tính sai số. Nhãn do nhóm cung cấp, chưa đối chiếu
              phép cân. MAE này không phải độ chính xác phân loại.
            </p>
            <p>
              IQR chỉ so cùng thực đơn/ngày, tối thiểu 10 khay độc lập; không
              gán dị ứng từ một ảnh. Bộ 18 ảnh chưa đủ nhóm thực đơn để kết luận
              IQR.
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}
