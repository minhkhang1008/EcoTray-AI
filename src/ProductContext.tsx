import {useFinalRound} from './FinalRoundContext';

type Props = {mode: string; onRecord: () => void};
export default function ProductContext({mode, onRecord}: Props) {
  const f = useFinalRound();
  return <section className="product-context" aria-label="Vòng phản hồi căn tin">
    <div className="context-intro"><span className="eyebrow">VÒNG PHẢN HỒI CĂN TIN</span><h2>Từ mỗi khay ăn đến quyết định của bếp.</h2><p>Theo dõi phần còn lại, tìm nguyên nhân và đo lại sau mỗi thay đổi.</p><button onClick={onRecord}>Ghi nhận khay mới <span aria-hidden="true">↗</span></button></div>
    <ol className="context-flow">
      <li><span>01</span><div><strong>Đăng ký</strong><small>{f.adapterInfo.portal ? 'Thực đơn & số suất' : f.adapterInfo.input}</small></div></li>
      <li><span>02</span><div><strong>Thực nhận</strong><small>{f.adapterInfo.nfc ? 'Xác nhận qua NFC' : 'Số suất được phục vụ'}</small></div></li>
      <li><span>03</span><div><strong>Phần còn lại</strong><small>{mode === 'demo' ? 'Quan sát khay mô phỏng' : 'Ghi nhận theo thành phần'}</small></div></li>
      <li><span>04</span><div><strong>Quyết định</strong><small>Bếp duyệt & theo dõi lại</small></div></li>
    </ol>
  </section>;
}
