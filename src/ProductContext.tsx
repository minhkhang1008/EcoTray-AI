import { useFinalRound } from "./FinalRoundContext";
import Icon from "./Icon";

export default function ProductContext({
  mode,
  onRecord,
}: {
  mode: string;
  onRecord: () => void;
}) {
  const f = useFinalRound();
  return (
    <details className="workflow-guide">
      <summary>
        EcoTray đưa ra khuyến nghị như thế nào?
        <span>Đăng ký → Thực nhận → Phần còn lại → Quyết định</span>
      </summary>
      <div className="workflow-body">
        <ol className="context-flow">
          <li>
            <span>1</span>
            <div>
              <strong>Đăng ký</strong>
              <small>
                {f.adapterInfo.portal
                  ? "Thực đơn & số suất"
                  : f.adapterInfo.input}
              </small>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>Thực nhận</strong>
              <small>
                {f.adapterInfo.nfc
                  ? "Xác nhận qua NFC"
                  : "Số suất được phục vụ"}
              </small>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>Phần còn lại</strong>
              <small>
                {mode === "demo"
                  ? "Quan sát khay mô phỏng"
                  : "Ghi nhận theo thành phần"}
              </small>
            </div>
          </li>
          <li>
            <span>4</span>
            <div>
              <strong>Quyết định</strong>
              <small>Bếp duyệt & theo dõi lại</small>
            </div>
          </li>
        </ol>
        <p>
          Thiếu người nhận: xem lại số suất. Thừa một thành phần: xem lại khẩu
          phần hoặc cách chế biến. Khay dị ứng/ngoại lai được tách khỏi phân
          tích chung. Thừa thấp: giữ nguyên.
        </p>
        <button className="text-button" onClick={onRecord}>
          Ghi nhận khay mới
          <Icon name="arrow" size={16} />
        </button>
      </div>
    </details>
  );
}
