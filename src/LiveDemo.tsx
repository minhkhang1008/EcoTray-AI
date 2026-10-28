import { NutritionPanel } from "./DecisionSupport";
import { useEffect, useRef, useState } from "react";
import { useFinalRound } from "./FinalRoundContext";
import {
  ConnectionControls,
  NfcTerminal,
  TrayPreview,
  DecisionCard,
} from "./Pipeline";
import { InterventionHistory } from "./OperationalPanels";
export default function LiveDemo({ onClose }: { onClose: () => void }) {
  const f = useFinalRound(),
    dialog = useRef<HTMLDialogElement>(null),
    [scanning, setScanning] = useState(false),
    busy = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    d?.querySelector<HTMLElement>("h1")?.focus();
    return () => {
      d?.close();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    busy.current = false;
    setScanning(false);
  }, [f.source]);
  function capture() {
    if (f.source !== "simulation" || busy.current) return;
    busy.current = true;
    setScanning(true);
    timer.current = setTimeout(() => {
      f.dispatch({ type: "capture" });
      f.dispatch({ type: "analyze" });
      setScanning(false);
      busy.current = false;
    }, 600);
  }
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        target.closest("input,select,textarea,[contenteditable=true]")
      )
        return;
      if (f.source !== "simulation") return;
      if (["1", "2", "3"].includes(event.key)) {
        event.preventDefault();
        f.dispatch({
          type: "scan",
          scenario: (
            { "1": "normal", "2": "allergy", "3": "unknown" } as const
          )[event.key as "1" | "2" | "3"],
        });
      }
      if (event.key === "5") { event.preventDefault(); f.approve(); }
      if (event.key.toLowerCase() === "r") { event.preventDefault(); reset(); }
      if (event.key === " " || event.key === "4") {
        if (event.key === " " && target.closest("button,summary")) return;
        event.preventDefault();
        capture();
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  });
  function reset() {
    if (timer.current) clearTimeout(timer.current);
    busy.current = false;
    setScanning(false);
    f.resetStage();
  }
  return (
    <dialog
      className="live-dialog"
      ref={dialog}
      onCancel={onClose}
      onClose={onClose}
      aria-labelledby="live-title"
    >
      <header className="live-header">
        <div>
          <h1 id="live-title" tabIndex={-1}>
            Live Demo Chung Kết
          </h1>
        </div>
        <div className="header-actions">
          {f.source === "simulation" && (
            <button onClick={reset}>Đặt lại lượt demo</button>
          )}
          <button onClick={onClose} aria-label="Đóng trình diễn">
            Đóng ×
          </button>
        </div>
      </header>
      <ConnectionControls />
      <p className="hotkey-guide">
        <kbd>1</kbd> Thẻ hợp lệ <kbd>2</kbd> Dị ứng <kbd>3</kbd> Thẻ chưa đăng ký · lặp 1/2 để thử thẻ trùng <kbd>Space</kbd> / <kbd>4</kbd> Chụp & kiểm định <kbd>5</kbd> Bếp duyệt <kbd>R</kbd> Đặt lại
      </p>
      {f.notice && (
        <div className="toast" role="status">
          {f.notice}
          <button onClick={() => f.setNotice("")} aria-label="Đóng thông báo">
            ×
          </button>
        </div>
      )}
      <div className="pipeline-grid">
        <section className="panel pipeline-step">
          <div className="step-heading">
            <span>01</span>
            <div>
              <h2>Cổng nhận suất NFC</h2>
              <p>Đăng ký → Thực nhận · Cảnh báo trước bữa ăn</p>
            </div>
          </div>
          <NfcTerminal />
        </section>
        <section className="panel pipeline-step">
          <div className="step-heading">
            <span>02</span>
            <div>
              <h2>Trạm thị giác ESP32-CAM</h2>
              <p>
                {f.source === "simulation"
                  ? "Mô phỏng trạm · không xác nhận thiết bị online"
                  : f.connected && f.remote?.online
                    ? "Trạm vừa gửi dữ liệu"
                    : "Chưa xác nhận tín hiệu thiết bị"}
              </p>
            </div>
            {f.source === "simulation" && (
              <button disabled={scanning} onClick={capture}>
                Chụp khay <kbd>4</kbd>
              </button>
            )}
          </div>
          <TrayPreview capture={f.state.capture} scanning={scanning} />
          <p className="fine">
            Hợp đồng cảm biến: ổn định 300 ms → chụp 1 ảnh → khóa → vắng
            &gt;1.000 ms mới mở lại.
          </p>
        </section>
        <section className="panel pipeline-step">
          <div className="step-heading">
            <span>03</span>
            <div>
              <h2>Lọc ngoại lai hai lớp</h2>
              <p>Cờ NFC trước bữa ăn + kiểm định IQR sau bữa ăn</p>
            </div>
          </div>
          <div
            className={"verification " + (f.isOutlier ? "warning" : "")}
            role="status"
          >
            <span aria-hidden="true">♢</span>
            <h3>
              {!f.state.analyzed
                ? "Chờ khay để kiểm định"
                : f.isOutlier
                  ? "Mẫu ngoại lai · tách khỏi công thức chung"
                  : f.source === "simulation"
                    ? "Mẫu hợp lệ trong luồng trình diễn"
                    : f.trimmed.total < 10
                      ? "Chưa đủ mẫu để kiểm định IQR"
                      : "Mẫu chưa có cờ ngoại lai"}
            </h3>
            <p>
              {f.state.analyzed
                ? f.isOutlier
                  ? "Mẫu có cờ cơ địa hoặc vượt ngưỡng IQR. Không suy ra phải cắt khẩu phần chung."
                  : "Đối chiếu cờ cơ địa và phân bố khay cùng món trước khi tính khuyến nghị."
                : "Không dùng một khay cá biệt để quyết định khẩu phần của toàn trường."}
            </p>
          </div>
          {f.state.analyzed && !f.isOutlier && <NutritionPanel served={f.source === "simulation" ? f.state.capture?.result?.vegetableServedGrams : undefined} waste={f.state.capture?.result?.vegetables} compact concise />}
          <details className="stage-method"><summary>Phương pháp lọc hai lớp</summary>
          <div className="defense-layers">
            <span>
              <b>01 · Trước bữa ăn</b> Cảnh báo cơ địa khi nhận suất.
            </span>
            <span>
              <b>02 · Sau bữa ăn</b> IQR: Q3 + 1,5 × (Q3 − Q1), tối thiểu 10
              mẫu.
            </span>
          </div>
          <p className="fine">
            {f.source === "simulation"
              ? "Minh họa phương pháp; không gán tỷ lệ 4,2% chưa có trong dữ liệu nguồn."
              : `${f.trimmed.flagged} mẫu có cờ; ${f.trimmed.statistical} mẫu vượt IQR trong ${f.trimmed.total} khay cùng món hiện có.`}{" "}
            IQR phát hiện bất thường, không chẩn đoán dị ứng.
          </p></details>
        </section>
        <section className="panel pipeline-step">
          <div className="step-heading">
            <span>04</span>
            <div>
              <h2>Khuyến nghị vận hành</h2>
              <p>Bếp phê duyệt → thay đổi → đo lại</p>
            </div>
          </div>
          <DecisionCard stage />
        </section>
      </div>
      <details className="live-history">
        <summary>Lịch sử phê duyệt trong phiên & trên thiết bị</summary>
        <InterventionHistory />
      </details>
      <p className="fine live-footnote">
        Sự kiện sân khấu được lưu riêng, không cộng vào 1.280 khay mô phỏng hoặc
        hồ sơ thực địa. Mọi ảnh khay phải tránh khuôn mặt.
      </p>
    </dialog>
  );
}
