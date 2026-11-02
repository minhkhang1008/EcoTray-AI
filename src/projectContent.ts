/**
 * Nội dung trang "Thông tin dự án".
 * Nguồn: slide chung kết SSC 2026 (ver2, 02/11/2026) đối chiếu với README.md (nguồn chuẩn).
 * Chỉ đặt tại đây các số liệu mang tính trình bày; số đo mô hình (MAE…) luôn đọc từ artifact,
 * và mọi con số kịch bản/mục tiêu phải giữ nhãn tương ứng trên giao diện.
 */
export const projectMeta = {
  name: "EcoTray AI",
  tagline: "Mỗi khay lên tiếng, mỗi bữa ăn tốt hơn.",
  lead: "Vòng lặp quyết định khép kín cho căn tin học đường: biết học sinh đăng ký gì, nhận gì, ăn bao nhiêu và bỏ thừa gì để bếp điều chỉnh bữa sau.",
  source: "Slide chung kết SSC 2026 (ver2, 02/11/2026) · README dự án",
};

export const problemStats = [
  { value: "1.017+", label: "suất ăn / ngày", note: "Căn tin PTNK CSĐH" },
  { value: "≈183.000", label: "suất ăn / năm", note: "1.017 suất × 180 ngày ăn" },
  { value: "≈8,0 tấn", label: "thức ăn thừa / năm", note: "≈44 g/khay × 183.000 suất · ước tính" },
  { value: "5–7", label: "suất/món thặng dư sản xuất", note: "≤2,5% · theo phỏng vấn quản lý căn tin" },
];

export const problemInsight =
  "Không thể chỉ tập trung giảm số suất nấu ra: bếp chỉ dư 5–7 suất/món, còn thức ăn thừa tập trung ở khay trả — nơi dữ liệu đang đứt gãy giữa Đăng ký, Thực nhận và Tiêu thụ.";

/** Tỷ lệ phần còn lại trung bình theo thành phần (khay trả). */
export const plateWaste = [
  { label: "Rau", value: 28.8, note: "" },
  { label: "Canh", value: 21.4, note: "Theo slide; README mới ghi ba thành phần Rau / Cơm / Món chính" },
  { label: "Cơm", value: 6.3, note: "" },
  { label: "Món chính", value: 5.2, note: "" },
];

export const loopSteps = [
  {
    key: "Registered",
    title: "Đăng ký",
    caption: "Học sinh đăng ký món qua Portal/Form",
    points: ["Biết trước nhu cầu theo món", "Cơ sở so sánh với suất thực nhận"],
  },
  {
    key: "Served",
    title: "Thực nhận",
    caption: "Cổng NFC không giấy tờ",
    points: [
      "Quét UID thẻ học sinh có sẵn trong ≈0,4 giây",
      "Ghi nhận biến Thực nhận, thay 183.000 phiếu giấy/năm",
      "Kích hoạt cờ cảnh báo dị ứng cá nhân (đậu phộng, hải sản, lactose)",
    ],
  },
  {
    key: "Consumed / Wasted",
    title: "Tiêu thụ & bỏ thừa",
    caption: "Camera AI tại khay trả",
    points: [
      "Cảm biến siêu âm tự động chụp khay trong ≈0,5 giây",
      "Gửi lên AWS Serverless, bóc tách 4 thành phần của khay",
      "Cắt ngoại lai bằng IQR trimming",
    ],
  },
  {
    key: "Decision",
    title: "Quyết định",
    caption: "Ràng buộc ngưỡng dinh dưỡng",
    points: [
      "W_min = 85 g rau/suất là ngưỡng bảo vệ",
      "Đủ chuẩn mà vẫn dư: hiệu chỉnh giảm định lượng múc",
      "Ăn dưới ngưỡng: không giảm, đề xuất đổi món khó ăn",
    ],
  },
];

export const decisionOutcomes = [
  {
    title: "Lệch số lượng",
    rule: "Đăng ký > Thực nhận",
    action: "Điều chỉnh số suất chuẩn bị hoặc hệ số dự phòng.",
  },
  {
    title: "Khẩu phần / món",
    rule: "Đăng ký ≈ Thực nhận, một thành phần thừa cao",
    action: "Giữ số suất; chỉnh thành phần đó (ví dụ −12% Rau) hoặc công thức.",
  },
  {
    title: "Ngoại lai dị ứng / sức khỏe",
    rule: "Thừa 100% bất thường do dị ứng, sức khỏe hoặc ràng buộc cá nhân",
    action: "Gán nhãn Ngoại lai (cờ NFC trước bữa + IQR sau bữa) và loại khỏi phép giảm khẩu phần chung.",
  },
  {
    title: "Tối ưu",
    rule: "Đăng ký ≈ Thực nhận, mức thừa thấp",
    action: "Giữ nguyên.",
  },
];

export const modules = [
  {
    name: "EcoTray Lite",
    audience: "Dành cho mọi trường",
    inputs: "ESP32-CAM + nhập thực đơn bằng Excel",
    badge: "Nhân rộng đại trà",
  },
  {
    name: "EcoTray Standard",
    audience: "Các trường có thể ứng dụng công nghệ",
    inputs: "ESP32-CAM + báo sĩ số bằng QR/Form",
    badge: "Quản lý theo lớp",
  },
  {
    name: "EcoTray Pro",
    audience: "Trường Phổ thông Năng khiếu, ĐHQG-HCM",
    inputs: "Portal sync, NFC, ESP32-CAM",
    badge: "Đang thí điểm tại PTNK",
  },
];

export const readiness = {
  have: ["Mã nguồn AI / Web / Firmware", "AWS Credits & ESP32-CAM", "Hạ tầng NFC & Portal PTNK"],
  missing: ["Vỏ hộp công nghiệp chống ẩm số lượng lớn", "Giấy giới thiệu liên trường từ Sở GD&ĐT"],
  fallback:
    "Tận dụng 100% điện thoại Android sẵn có của bếp chạy Web NFC (0đ phần cứng NFC) và triển khai gói EcoTray Lite (290.000đ/trạm).",
};

export const scaleConditions = [
  { title: "Số liệu", body: "Giảm tối thiểu 15% food waste sau 3 tháng tại PTNK." },
  { title: "Điều kiện áp dụng", body: "Khảo sát quy trình căn tin để chọn gói Lite, Standard hoặc Pro." },
  { title: "Nguồn lực", body: "Ít nhất 1 giáo viên/quản lý bếp phụ trách duyệt đề xuất." },
  { title: "Quy trình chuyển giao", body: "Bộ tài liệu hướng dẫn vận hành và đội ngũ học sinh kế nhiệm." },
];

export const sections = [
  ["van-de", "Vấn đề"],
  ["vong-lap", "Vòng lặp quyết định"],
  ["mo-dun", "Ba mô-đun"],
  ["kiem-chung", "Kiểm chứng"],
  ["hieu-qua", "Hiệu quả & chi phí"],
  ["lo-trinh", "Lộ trình 3 năm"],
  ["nhan-rong", "Nhân rộng"],
] as const;
