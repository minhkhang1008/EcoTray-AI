import { NutritionPanel } from "./DecisionSupport";
import { useEffect, useRef, useState } from "react";
import { useFinalRound } from "./FinalRoundContext";
import type { Capture } from "../lib/contracts";
import { componentKeys, componentLabels } from "../lib/final-round.mjs";
import { number, percent } from "./format";
import { responseJson } from "./iotClient";

type Reader = {
  scan: (options: { signal: AbortSignal }) => Promise<void>;
  onreading: ((event: { serialNumber: string }) => void) | null;
  onreadingerror: (() => void) | null;
};
type ReaderConstructor = new () => Reader;
export function ConnectionControls() {
  const f = useFinalRound();
  return (
    <div className="connection-controls">
      <div className="segmented" role="group" aria-label="Nguồn sự kiện">
        <button
          className={f.source === "simulation" ? "selected" : ""}
          aria-pressed={f.source === "simulation"}
          onClick={() => f.setSource("simulation")}
        >
          Mô phỏng · chạy ngoại tuyến
        </button>
        <button
          className={f.source === "hardware" ? "selected" : ""}
          aria-pressed={f.source === "hardware"}
          onClick={() => f.setSource("hardware")}
        >
          Kết nối phần cứng
        </button>
      </div>
      {f.source === "hardware" && (
        <details className="connection-settings">
          <summary>Thiết lập kết nối IoT</summary>
          <p>
            API IoT đang mở công khai; dashboard và trạm phần cứng không cần
            khóa truy cập.
          </p>
        </details>
      )}
      <span
        className={"badge " + (f.connected && f.remote?.online ? "ready" : "")}
      >
        {f.source === "simulation"
          ? f.offlineReady
            ? "Dữ liệu tham chiếu · ngoại tuyến"
            : "Dữ liệu mô phỏng"
          : f.connected
              ? f.remote?.online
                ? "Trạm đang hoạt động"
                : "API kết nối · trạm chưa gửi sự kiện"
              : "Đang chờ kết nối"}
      </span>
      {f.source === "hardware" && f.error && (
        <p className="inline-status" role="status">
          {f.error} Luồng dự phòng cục bộ vẫn khả dụng.
        </p>
      )}
    </div>
  );
}

export function NfcTerminal() {
  const f = useFinalRound(),
    [reading, setReading] = useState(false),
    [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null),
    cards = useRef(new Map<string, "normal" | "allergy" | "unknown">()),
    pending = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    controller.current?.abort();
    setReading(false);
    setMessage("");
  }, [f.source]);
  async function webNfc() {
    const Reader = (window as unknown as { NDEFReader?: ReaderConstructor })
      .NDEFReader;
    if (!Reader) {
      setMessage(
        "Web NFC cần Android Chrome và thẻ NDEF tương thích. Có thể dùng nút mô phỏng bên dưới hoặc đầu đọc NFC của trạm.",
      );
      return;
    }
    try {
      const abort = new AbortController();
      controller.current?.abort();
      controller.current = abort;
      const reader = new Reader();
      await reader.scan({ signal: abort.signal });
      setReading(true);
      setMessage("Đưa thẻ NDEF đến gần điện thoại.");
      reader.onreadingerror = () =>
        setMessage("Chưa đọc được thẻ. Thử lại hoặc dùng đầu đọc của trạm.");
      reader.onreading = async ({ serialNumber }) => {
        if (pending.current || abort.signal.aborted) return;
        if (!serialNumber) {
          setMessage("Thẻ không cung cấp mã. Dùng đầu đọc NFC của trạm.");
          return;
        }
        pending.current = true;
        try {
          if (f.source === "simulation") {
            const bytes = await crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(serialNumber),
            );
            const hash = Array.from(new Uint8Array(bytes), (v) =>
              v.toString(16).padStart(2, "0"),
            ).join("");
            if (!cards.current.has(hash))
              cards.current.set(
                hash,
                cards.current.size === 0
                  ? "normal"
                  : cards.current.size === 1
                    ? "allergy"
                    : "unknown",
              );
            f.dispatch({
              type: "scan",
              scenario: cards.current.get(hash)!,
              cardHash: hash,
            });
            setMessage(
              "Đã đọc thẻ cho kịch bản mô phỏng. Không ghi vào dữ liệu thực địa.",
            );
          } else {
            const eventId = crypto.randomUUID();
            await responseJson(
              await fetch("/api/iot/nfc-scan", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Idempotency-Key": eventId,
                },
                body: JSON.stringify({
                  eventId,
                  schoolId: f.schoolId,
                  stationId: "web-nfc",
                  uid: serialNumber,
                  scannedAt: new Date().toISOString(),
                }),
                signal: abort.signal,
              }),
            );
            setMessage("Trạm đã nhận sự kiện. Dashboard đang cập nhật.");
          }
        } catch (e) {
          if (!abort.signal.aborted) setMessage((e as Error).message);
        } finally {
          pending.current = false;
        }
      };
    } catch (e) {
      setMessage((e as Error).message);
      setReading(false);
    }
  }
  const event = f.state.nfc,
    status = event?.status;
  return (
    <div className="nfc-terminal">
      <div
        className={
          "nfc-card " +
          (status === "ALLERGY_WARNING"
            ? "warning"
            : status === "UNKNOWN_CARD" || status === "ALREADY_REDEEMED"
              ? "danger"
              : "")
        }
      >
        <span className="nfc-icon" aria-hidden="true">
          ◉
        </span>
        <div>
          <strong>
            {!event
              ? "Sẵn sàng nhận thẻ"
              : status === "VALID"
                ? "✓ Thẻ hợp lệ"
                : status === "ALLERGY_WARNING"
                  ? "⚠ Cảnh báo dị ứng"
                  : status === "ALREADY_REDEEMED"
                    ? "Đã nhận suất · không cộng lại"
                    : "Thẻ chưa đăng ký"}
          </strong>
          <small>
            {(f.source === "simulation" ? "Thẻ tham chiếu ẩn danh" : event?.studentCode) ??
              (event
                ? "Mã thẻ ẩn danh"
                : "Không lưu tên học sinh hoặc UID gốc")}
          </small>
          <code>
            {event?.cardUidHash
              ? "UID băm: " + event.cardUidHash.slice(0, 12) + "…"
              : "Chạm thẻ để nhận suất"}
          </code>
        </div>
      </div>
      {event?.menu && (
        <div className="registered-dish">
          Món đăng ký: <b>{event.menu.name}</b>
          {f.source === "simulation" && <p className="fine">Cơm trắng · Bắp cải luộc · Canh bí đỏ (cặp món mô phỏng)</p>}
        </div>
      )}
      <div
        aria-live="polite"
        className={
          event?.allergyFlags.length ? "allergy-alert" : "allergy-clear"
        }
      >
        {event
          ? event.status === "UNKNOWN_CARD"
            ? "Chưa xác định hồ sơ cơ địa."
            : event.allergyFlags.length
              ? "⚠ Cảnh báo cơ địa: " + event.allergyFlags.join(" · ")
              : "✓ Không có ghi chú dị ứng"
          : "Cờ dị ứng được kiểm tra trước khi phát suất."}
      </div>
      <div className="terminal-counters">
        <div>
          <strong>{number(f.state.served)}</strong>
          <small>
            Suất thực nhận{f.source === "simulation" ? " / 1.017 đăng ký" : ""}
          </small>
        </div>
        <div>
          <strong>{number(f.state.savedTickets)}</strong>
          <small>
            {f.source === "simulation"
              ? "Phiếu giấy thay thế · mô phỏng"
              : "Sự kiện nhận suất được ghi hôm nay"}
          </small>
        </div>
      </div>
      <div className="nfc-actions">
        <button
          onClick={
            reading
              ? () => {
                  controller.current?.abort();
                  setReading(false);
                  setMessage("Đã dừng đọc NFC.");
                }
              : webNfc
          }
        >
          {reading ? "Dừng đọc NFC" : "Đọc bằng Web NFC"}
        </button>
      </div>
      {message && (
        <p className="fine" role="status">
          {message}
        </p>
      )}
      {!f.adapterInfo.nfc && (
        <p className="fine">
          {f.adapterInfo.name} không yêu cầu NFC. Trạm này chỉ dùng để thử
          mô-đun Pro.
        </p>
      )}
    </div>
  );
}

export function TrayPreview({
  capture,
  scanning = false,
}: {
  capture: Capture | null;
  scanning?: boolean;
}) {
  const { source } = useFinalRound();
  const [image, setImage] = useState(""),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    setImage("");
    if (!capture?.imageUrl) return;
    const url = capture.imageUrl;
    if (!url.startsWith("/api/iot/image?")) {
      setImage(url);
      return;
    }
    let alive = true,
      objectUrl = "";
    const abort = new AbortController();
    fetch(url, { signal: abort.signal })
      .then(async (r) => {
        if (!r.ok) throw Error("Ảnh không khả dụng");
        objectUrl = URL.createObjectURL(await r.blob());
        if (alive) setImage(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
      abort.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [capture?.captureId, capture?.imageUrl]);
  return (
    <>
      <div
        className={"capture-preview " + (scanning ? "is-scanning" : "")}
        aria-busy={scanning}
      >
        {image && !failed ? (
          <img
            src={image}
            onError={() => setFailed(true)}
            alt="Ảnh toàn khay; không có khuôn mặt"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="capture-placeholder">
            <span aria-hidden="true">⌗</span>
            {failed
              ? "Ảnh hết hạn hoặc không tải được"
              : scanning
                ? "Đang nhận ảnh…"
                : "Chờ khay đi qua trạm"}
          </div>
        )}
        {scanning && <div className="scan-line" />}
        {image && !failed && source === "simulation" && (
          <>
            <span className="roi roi-rice">Cơm</span>
            <span className="roi roi-vegetables">Rau</span>
            <span className="roi roi-main">Món chính</span>
          </>
        )}
      </div>
      {capture?.result && (
        <div className="capture-breakdown">
          {componentKeys.map((k) => (
            <div key={k} className={capture.result![k] >= 20 ? "high" : ""}>
              <span>{componentLabels[k]}</span>
              <strong>{percent(capture.result![k])}</strong>
              <small>{capture.result![k] >= 20 ? "Thừa cao" : "Ăn tốt"}</small>
            </div>
          ))}
          {capture.result.soup !== undefined && <div className={capture.result.soup >= 20 ? "high" : ""}><span>Canh</span><strong>{percent(capture.result.soup)}</strong><small>{capture.result.soup >= 20 ? "Cần xem xét" : "Ăn tốt"}</small></div>}
        </div>
      )}
      {source === "simulation" && capture && (
        <p className="fine">
          Ảnh khay thật do nhóm cung cấp; vùng đọc tham chiếu. Các tỷ lệ{" "}
          {capture.result?.rice}% / {capture.result?.vegetables}% /{" "}
          {capture.result?.main}% thuộc kịch bản mô phỏng, không phải kết quả đo
          ảnh này.
        </p>
      )}
    </>
  );
}

export function DecisionCard({ stage = false }: { stage?: boolean }) {
  const f = useFinalRound(),
    result = f.state.capture?.result;
  return (
    <div className="decision-card">
      <span className="badge">
        {f.source === "simulation" ? "Đề xuất mô phỏng" : "Dữ liệu từ trạm"}
      </span>
      <h3>{f.state.analyzed ? f.decision.title : "Chờ kết quả phân tích"}</h3>
      <p>
        <b>
          {f.state.capture?.menuName ??
            f.state.capture?.dishId ??
            "Chưa gắn món"}
        </b>
      </p>
      {f.state.analyzed ? (
        <>
          <p>{stage && f.source === "simulation" && f.decision.kind === "portion" ? "Giữ số suất và 90 g rau/khay. Thử đổi Bắp cải luộc + Canh bí đỏ sang Rau muống xào tỏi + Canh rong biển; cân lại ở chu kỳ sau." : f.decision.text}</p>
          {!stage && <NutritionPanel served={f.source === "simulation" ? result?.vegetableServedGrams : undefined} waste={result?.vegetables} compact />}
          {f.source === "simulation" && !result?.isOutlier && (
            <p className="fine">
              64 mẫu mô phỏng cùng món · Rau trung bình{" "}
              {number(result?.vegetables ?? 0)}%{" "}
              · Thực nhận {number((f.state.served / 1017) * 100)}%.
            </p>
          )}
        </>
      ) : (
        <p>
          Khi có khay và kiểm định dữ liệu, khuyến nghị vận hành sẽ xuất hiện
          tại đây.
        </p>
      )}
      <button
        className="primary full-width"
        disabled={!f.state.analyzed || f.state.approved}
        onClick={f.approve}
      >
        {f.state.approved
          ? "✓ Đã ghi vào lịch sử"
          : f.decision.kind === "outlier"
            ? "✓ Xác nhận tách mẫu ngoại lai"
            : f.decision.kind === "insufficient"
              ? "✓ Ghi nhận cần thêm mẫu"
              : "Phê duyệt điều chỉnh thực đơn"}
      </button>
      {f.state.approved &&
        f.source === "simulation" &&
        f.decision.kind === "portion" && (
          <div className="simulated-impact">
            <b>Dự kiến giảm 10,6 kg/ngày</b>
            <span>~265.000đ/ngày · giá giả định 25.000đ/kg</span>
            <small>
              Mô phỏng 63,1 → 52,5 kg/ngày, chưa kiểm chứng thực địa.
            </small>
          </div>
        )}
    </div>
  );
}
