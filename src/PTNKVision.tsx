import { resolveStationMenu } from "../lib/vision-menu.mjs";
import { StationMenuControls } from "./StationMenuControls";
import { useRef, useState } from "react";
import {
  analyzeStationPixels,
  MODEL,
  RIDGE_WEIGHTS,
  PTNK_TRAYS_CATALOG,
  evaluateTrayWithTrainedModel,
  homography,
  CANONICAL_TRAY_CORNERS,
  updateWeights,
  visionKeys,
  galleryDateRange,
  type FeatureVectors,
  type ModelWeights,
  type Percentages,
  type VisionAnalysisResponse,
} from "./lib/ecotrayVisionEngine";
import { useFinalRound } from "./FinalRoundContext";
import { number } from "./format";
import { ZoomableImage, ZoomCornerButton } from "./ImageZoom";
import { isCleanTray } from "../lib/clean-attribution.mjs";
import { ConnectionControls, TrayPreview, DecisionCard } from "./Pipeline";
export function VisionResult({
  analysis,
  imageUrl,
  trayCorners,
  showDetails = true,
}: {
  analysis: VisionAnalysisResponse;
  imageUrl: string | null;
  trayCorners?: number[][];
  showDetails?: boolean;
}) {
  const aligned = trayCorners?.length === 4 ? homography(CANONICAL_TRAY_CORNERS, trayCorners) : null;
  const project = (u: number, v: number): [number, number] => {
    if (!aligned) return [u, v];
    const d = aligned[6] * u + aligned[7] * v + aligned[8];
    return [(aligned[0] * u + aligned[1] * v + aligned[2]) / d, (aligned[3] * u + aligned[4] * v + aligned[5]) / d];
  };
  return (
    <>
      <div className="ptnk-overlay" style={analysis.stationLayout?.rotation === 90 ? {aspectRatio:"3/4"} : undefined}>
        {imageUrl ? (
          <ZoomableImage
            src={imageUrl}
            label="khay đang phân tích"
            alt="Khay thức ăn với các vùng phân tích theo chiều khay"
          />
        ) : (
          <p>Ảnh không còn khả dụng.</p>
        )}
        {imageUrl && aligned && (
          <svg className="ptnk-aligned" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
            <polygon className="ptnk-frame" points={trayCorners!.map((p) => p.join(",")).join(" ")} />
            {visionKeys.map((k) => {
              const [x1, y1, x2, y2] = analysis.components[k].bboxNormalized;
              const pts = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]].map(([u, v]) => project(u, v));
              return <polygon key={k} className={"ptnk-poly ptnk-" + k} points={pts.map((p) => p.join(",")).join(" ")} />;
            })}
          </svg>
        )}
        {imageUrl &&
          visionKeys.map((k) => {
            const c = analysis.components[k],
              [x1, y1, x2, y2] = c.bboxNormalized,
              [px, py] = project(x1, y1);
            return (
              <div
                key={k}
                className={"ptnk-box ptnk-" + k}
                style={aligned ? { left: px * 100 + "%", top: py * 100 + "%", border: 0 } : {
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
      {showDetails && <VisionDetails analysis={analysis} />}
    </>
  );
}
export function VisionDetails({ analysis }: { analysis: VisionAnalysisResponse }) {
  return (
    <>
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
      {isCleanTray(Object.fromEntries(visionKeys.map((k) => [k, analysis.components[k].wastePct]))) && (
        <details className="method-details">
          <summary>Khay sạch 0% · định danh món</summary>
          <p className="fine">
            Không có đồ thừa để nhận món. Phân bổ vào “Khay sạch chờ phân bổ”, cuối ca lấy
            số suất thực nhận (NFC) trừ số khay còn thừa của món (Tầng 2). Không dùng NFC:
            chia theo tỷ trọng suất nấu (Tầng 3). Phổ màu nước sốt là tín hiệu phụ, chưa triển khai.
          </p>
        </details>
      )}
      <details className="method-details">
        <summary>{analysis.nutritionalFloorLocked ? "Chưa cho phép giảm rau" : "Ghi chú phương pháp"}</summary>
        <p className="fine">W_min ≥ 85 g rau/khay</p>
      </details>
    </>
  );
}
export function VisionStreamPanel() {
  const f = useFinalRound(), { vision } = f;
  const tray = vision.active;
  const legacy = f.state.capture;
  const showVision = f.showVision && !!tray;
  return <section className="panel ptnk-stream">
    <div className="section-heading">
      <div><h2>Trạm căn tin</h2><p>Ảnh mới nhất và quyết định của bếp</p></div>
      <span className="badge">{showVision ? vision.usingFallback ? "Ảnh tham chiếu · dự phòng" : "Ảnh từ thiết bị" : legacy ? f.source === "simulation" ? "Mô phỏng" : "Khay từ thiết bị" : "Chờ ảnh từ thiết bị"}</span>
    </div>
    {showVision && !vision.usingFallback && tray.analysis.stationLayout && <div className="header-actions">
      <button disabled={vision.editing} onClick={() => void vision.reanalyze(tray.analysis.comboName, tray.analysis.menuDate!, tray.analysis.stationLayout?.orientation === 180 ? 0 : 180)}>↻ Đổi chiều khung 180°</button>
      <button disabled={vision.editing} onClick={() => void vision.reanalyze(tray.analysis.comboName, tray.analysis.menuDate!, "auto")}>Tự nhận chiều khay</button>
      {tray.analysis.stationLayout.uncertain && <span className="fine">Chiều khay chưa rõ; kiểm tra vùng cơm và canh.</span>}
    </div>}
    {vision.editError && <p role="alert">{vision.editError}</p>}
    {showVision ? <div className="ptnk-workbench">
      <div><VisionResult analysis={tray.analysis} imageUrl={tray.imageUrl} showDetails={false} /></div>
      <div>
        {!vision.usingFallback && tray.analysis.stationLayout && <StationMenuControls analysis={tray.analysis} disabled={vision.editing} onChange={(combo,date,angle)=>void vision.reanalyze(combo,date,angle)} />}
        <h3>{tray.analysis.comboName}</h3>
        <button className="primary" disabled={vision.editing || vision.approved || tray.analysis.referenceOnly} onClick={vision.approve}>{vision.approved ? "Đã ghi nhận quyết định" : "Ghi nhận quyết định"}</button>
        {vision.usingFallback && <button onClick={() => { vision.resume(); f.setSource("hardware"); }}>Trở về luồng thiết bị</button>}
        <VisionDetails analysis={tray.analysis} />
      </div>
    </div> : legacy ? <>
      <p role="status">{legacy.status === "QUEUED" ? "Đã nhận ảnh · chờ worker phân tích" : legacy.status === "PROCESSING" ? "Worker đang phân tích" : legacy.status === "FAILED" ? legacy.errorMessage : "Đã nhận kết quả từ worker"}</p>
      <div className="ptnk-workbench"><div><TrayPreview capture={legacy} /></div><DecisionCard /></div>
    </> : <p role="status">Chưa có ảnh khay. Khi trạm gửi ảnh hoặc kết quả, chúng sẽ xuất hiện tại đây.</p>}
    <details className="method-details">
      <summary>Kết nối & nguồn ảnh</summary>
      <ConnectionControls />
      <p className="fine">Ảnh: {vision.online ? "đã kết nối" : vision.error || "chưa kết nối"} · NFC/worker: {f.connected ? "đã kết nối" : f.error || "chưa kết nối"}. Lưu quyết định tại Dữ liệu → Lịch sử quyết định.</p>
    </details>
  </section>;
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
    </section>
  );
}
/** Sliders move in 5% steps; quarter levels stay as tick marks. */
const sliderValue = (pct: number) => Math.round(pct / 5) * 5;

export default function PTNKVision() {
  const station = useFinalRound();
  const [uploadMenu,setUploadMenu] = useState<{comboName:string;menuDate:string}|null>(null);
  const first = Object.keys(PTNK_TRAYS_CATALOG)[0];
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
    [measurement, setMeasurement] = useState<import("./lib/ecotrayVisionEngine").StationMeasurement | undefined>(undefined);
  const request = useRef(0);
  const referenceLabel = sampleId ? PTNK_TRAYS_CATALOG[sampleId as keyof typeof PTNK_TRAYS_CATALOG] : undefined;
  const analysis = evaluateTrayWithTrainedModel({
    ...(sampleId ? { sampleId } : {}),
    featureVectors: features,
    weights,
    ...(manual ? { overridePcts: feedback } : referenceLabel ? { overridePcts: referenceLabel.y as Percentages } : {}),
    pixelMeasurement: measurement,
    ...(measurement ? {
      ...(uploadMenu ?? resolveStationMenu({schoolId:station.schoolId,
        capturedAt:new Date().toISOString(),comboName:station.vision.hardware?.analysis.comboName,
        menuDate:station.vision.hardware?.analysis.menuDate ?? undefined})),
      cohort: [],
    } : {}),
  });
  function choose(id: string) {
    request.current++;
    setBusy(false);
    setMeasurement(undefined);
    setSampleId(id);
    setImageUrl("./ptnk-normalized/" + id);
    setFeatures(MODEL.features[id as keyof typeof MODEL.features]);
    setManual(false);
    setMessage("");
  }
  async function upload(file: File | undefined, orientation: "auto" | 0 | 180 = "auto") {
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
      if (bitmap.height > bitmap.width) {
        ctx.translate(800, 0); ctx.rotate(Math.PI / 2);
        ctx.drawImage(bitmap, 0, 0, 600, 800); ctx.setTransform(1,0,0,1,0,0);
      } else ctx.drawImage(bitmap, 0, 0, 800, 600);
      bitmap.close();
      const pixels = ctx.getImageData(0, 0, 800, 600),
        measured = analyzeStationPixels(pixels, {orientation});
      if (token !== request.current) return;
      setMeasurement(measured);
      setSampleId("");
      setImageUrl(canvas.toDataURL("image/jpeg", 0.8));
      setManual(false);
      setMessage(
        "Ảnh xử lý trên thiết bị; tự xoay ảnh dọc, chọn chiều khay và ô rau. Cần chụp trọn khay theo vùng hiệu chuẩn ESP32.",
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
      if (measurement) {
        setVersion(v=>v+1);
        setMessage("Đã giữ hiệu chỉnh thủ công cho ảnh này trong phiên; không huấn luyện mô hình trạm.");
        return;
      }
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
          <h2>Kiểm tra ảnh khay PTNK</h2>
          <p>
            {MODEL.realTraysCount} ảnh thật ({MODEL.independentTrays} khay độc lập,
            không tính hai mốc) · {galleryDateRange()} · nhãn phần còn lại ước lượng
            bằng mắt
          </p>
        </div>
        <span className="badge">ẢNH THỰC ĐỊA</span>
      </div>
      <p className="ptnk-evaluation">
        Mô hình Ridge cho gallery · Sai số kiểm định theo nhóm (MAE):{" "}
        <b>{number(MODEL.validation.overallMAE)} điểm phần trăm</b> ·{" "}
        {MODEL.validation.scoredImages} ảnh được chấm, 2 mốc không chấm · mốc so
        sánh đoán bằng trung bình nhãn:{" "}
        {number(MODEL.validation.baselineMeanLabelMAE.overall)} điểm. Chưa có độ chính xác phân loại
        được xác thực. Bộ đọc OV2640 cho ảnh mới chưa có kiểm định trên tập độc lập.
      </p>
      <div className="ptnk-gallery" aria-label={MODEL.realTraysCount + " mẫu ảnh khay thực địa"}>
        {Object.entries(PTNK_TRAYS_CATALOG).map(([id, m], i) => (
          <div className="ptnk-gallery-tile" key={id}>
            <button
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
            <ZoomCornerButton
              src={"./ptnk-normalized/" + id}
              label={"mẫu " + (i + 1) + " · " + m.combo}
            />
          </div>
        ))}
      </div>
      <div className="section-heading">
        <div>
          <h3>Sửa kết quả ước lượng</h3>
          <p>
            {sampleId || "Ảnh tải lên"} · Lần hiệu chỉnh {version}
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
      {!sampleId && <div className="header-actions">
        <button disabled={busy} onClick={()=>void upload(file.current, measurement?.orientation === 180 ? 0 : 180)}>↻ Đổi chiều khung 180°</button>
        <button disabled={busy} onClick={()=>void upload(file.current)}>Tự nhận chiều khay</button>
      </div>}

      <div className="ptnk-workbench" aria-busy={busy}>
        <div>
          <VisionResult analysis={analysis} imageUrl={imageUrl} trayCorners={(referenceLabel as { trayCorners?: number[][] } | undefined)?.trayCorners} />
        </div>
        <div>
          {measurement && <StationMenuControls analysis={analysis} disabled={busy} onChange={(comboName,menuDate)=>setUploadMenu({comboName,menuDate})} />}
          <h3>{analysis.comboName}</h3>
          <p className="badge">
            {manual ? "Nhãn hiệu chỉnh thủ công" : referenceLabel ? "Nhãn thực địa" : "Ước lượng từ ảnh"}
          </p>
          <h3>Sửa tỷ lệ phần còn lại</h3>
          <datalist id="ptnk-quarter-ticks">
            {[0, 25, 50, 75, 100].map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          {visionKeys.map((k, i) => (
            <label className="scenario-slider" key={k}>
              {analysis.components[k].nameVi} ·{" "}
              {manual ? feedback[i] : sliderValue(analysis.components[k].wastePct)}%
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                list="ptnk-quarter-ticks"
                aria-label={"Hiệu chỉnh " + analysis.components[k].nameVi}
                value={
                  manual ? feedback[i] : sliderValue(analysis.components[k].wastePct)
                }
                onChange={(e) => {
                  const next: Percentages = manual
                    ? [...feedback]
                    : (visionKeys.map(
                        (c) => sliderValue(analysis.components[c].wastePct),
                      ) as Percentages);
                  next[i] = Number(e.target.value);
                  setFeedback(next);
                  setManual(true);
                }}
              />
              <small>Bước 5% · vạch mốc 0 · 25 · 50 · 75 · 100%</small>
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
              Áp dụng hiệu chỉnh trong phiên
            </button>
            <button
              onClick={() => {
                setWeights(structuredClone(RIDGE_WEIGHTS));
                setVersion(0);
                setManual(false);
                if (!sampleId) void upload(file.current);
                setMessage("Đã khôi phục trọng số gốc.");
              }}
            >
              Khôi phục mô hình gốc
            </button>
          </div>
          <p className="fine">
            {measurement ? "Hiệu chỉnh chỉ áp dụng cho ảnh tải lên trong phiên." : "Phản hồi cập nhật hồi quy trong phiên này."} Không thay mô hình máy chủ hoặc kết quả kiểm định gốc.
          </p>
          {message && <p role="status">{message}</p>}
          <details>
            <summary>Phương pháp và giới hạn kiểm định</summary>
            <p>
              Ridge α = 0,15; bỏ lần lượt từng nhóm khay liên quan để kiểm định.
              Các góc chụp lặp nằm cùng nhóm; hai mốc 0%/100% là điểm huấn
              luyện thường, không tính sai số và hiển thị theo nhãn mốc. Nhãn do nhóm cung cấp, chưa đối chiếu
              phép cân. MAE này không phải độ chính xác phân loại.
            </p>
            <p>
              IQR chỉ so cùng thực đơn/ngày, tối thiểu 10 khay độc lập; không
              gán dị ứng từ một ảnh. Bộ ảnh tham chiếu chưa đủ nhóm thực đơn để kết luận
              IQR.
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}
