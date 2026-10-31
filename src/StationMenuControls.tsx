import { useFinalRound } from "./FinalRoundContext";
import {
  PTNK_18_TRAYS_CATALOG,
  type VisionAnalysisResponse,
} from "./lib/ecotrayVisionEngine";
import { number } from "./format";
export function IqrVerification({
  analysis: a,
}: {
  analysis: VisionAnalysisResponse;
}) {
  return (
    <p className="fine">
      IQR: {number(a.iqrEligibleCount)} khay nền độc lập cùng thực đơn/ngày ·{" "}
      {a.iqrEligibleCount < 10
        ? "chưa đủ 10 mẫu để kiểm định"
        : "đã đối chiếu ngưỡng ngoại lai"}
      .{" "}
      {a.iqrExcludedCount
        ? `Đã tách ${number(a.iqrExcludedCount)} mẫu có cờ cơ địa/ngoại lai khỏi tập nền; cờ thống kê không chẩn đoán dị ứng.`
        : "Chưa ghi nhận mẫu có cờ bị tách khỏi tập nền."}{" "}
      Không dùng 1.280 khay mô phỏng làm nền cho ảnh thiết bị.
    </p>
  );
}
export function StationMenuControls({
  analysis,
  disabled,
  onChange,
}: {
  analysis: VisionAnalysisResponse;
  disabled: boolean;
  onChange: (
    combo: string,
    date: string,
    orientation: "auto" | 0 | 180,
  ) => void;
}) {
  const { schoolId } = useFinalRound();
  const combos = Array.from(
    new Set([
      analysis.comboName,
      ...(schoolId === "ptnk"
        ? Object.values(PTNK_18_TRAYS_CATALOG).map((m) => m.combo)
        : []),
    ]),
  );
  const date = analysis.menuDate ?? "";
  return (
    <div className="station-menu-controls">
      <label>
        Thực đơn đang gắn
        <select
          value={analysis.comboName}
          disabled={disabled || !date}
          onChange={(e) =>
            onChange(
              e.target.value,
              date,
              analysis.stationLayout?.orientation ?? "auto",
            )
          }
        >
          {combos.map((combo) => (
            <option key={combo} value={combo}>
              {combo}
            </option>
          ))}
        </select>
      </label>
      <label>
        Ngày phục vụ
        <input
          type="date"
          value={date}
          disabled={disabled}
          onChange={(e) => {
            if (e.target.value)
              onChange(
                analysis.comboName,
                e.target.value,
                analysis.stationLayout?.orientation ?? "auto",
              );
          }}
        />
      </label>
    </div>
  );
}
