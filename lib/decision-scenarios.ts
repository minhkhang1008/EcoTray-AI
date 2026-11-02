// User-supplied scenarios. Never joined to Portal observations or real tray records.
export interface MealCombo {
  id: string;
  source: "simulation";
  date: string;
  rice: string;
  main: string;
  vegetable: string;
  soup: string;
  vegetableWaste: number;
  soupWaste: number;
}
export const pairingScenarios: MealCombo[] = [
  { id: "pair-a", source: "simulation", date: "13/10", rice: "Cơm trắng", main: "Vịt kho gừng", vegetable: "Bắp cải luộc", soup: "Canh bí đỏ", vegetableWaste: 36.5, soupWaste: 28 },
  { id: "pair-b", source: "simulation", date: "16/10", rice: "Cơm trắng", main: "Vịt kho gừng", vegetable: "Rau muống xào tỏi", soup: "Canh rong biển", vegetableWaste: 14.2, soupWaste: 9.5 },
];
export interface RoadmapYear {
  year: string;
  period: string;
  goal: string;
  scope: string;
  work: string;
  owners: string;
  resources: string;
  budget: string;
  kpis: string[];
  outcomes: string[];
  /** Điều kiện kiểm chứng trước khi chuyển sang năm kế tiếp. */
  gate: string;
}
/** Kế hoạch 3 năm theo slide chung kết (ver2, 02/11/2026). Đây là mục tiêu để lập kế hoạch, không phải kết quả đã đạt. */
export const roadmap: RoadmapYear[] = [
  {
    year: "Năm 1",
    period: "11/2026 – 10/2027",
    goal: "Giảm 10% khối lượng thức ăn thừa đã cân trong hai học kỳ, tăng lượng rau thực ăn",
    scope: "PTNK CSĐH · 1.017 học sinh/ngày",
    work: "Lắp 02 trạm NFC (tận dụng điện thoại sẵn có) và 01 ESP32-CAM; chốt báo cáo thực đơn vào thứ Sáu hằng tuần.",
    owners: "Minh Khang (AWS/AI) · Hoàng Sơn (Web/Portal) · Viết Bảo (NFC/IoT) · Phú Thịnh (khung trạm & đo kiểm) · Thầy Bá Duy (cố vấn)",
    resources: "01 trạm ESP32-CAM + NFC, Wi-Fi PTNK",
    budget: "1.500.000đ",
    kpis: ["≥ 90% suất ghi nhận bằng NFC từ học kỳ 2", "Khối lượng thừa đã cân < 39,6 g/khay (giảm 10% so với mốc nền cân thực tế)"],
    outcomes: ["Giảm khoảng 0,8 tấn thức ăn thừa/năm (kịch bản Cơ sở)", "Nguyên liệu tiết kiệm tối đa ≈10 triệu đồng/năm, đo trong năm, chưa cam kết trước"],
    gate: "Có mốc nền cân 2–3 tuần; đạt giảm 10% thức ăn thừa đã cân và rau thực ăn không giảm.",
  },
  {
    year: "Năm 2",
    period: "11/2027 – 10/2028",
    goal: "Nhân rộng có điều kiện, mục tiêu giảm 10% tại mỗi trường sau khi đo mốc nền riêng",
    scope: "1–2 trường THPT/THCS ngoài PTNK",
    work: "Bộ Kit phần cứng lắp nhanh, nhập thực đơn bằng Excel; ký biên bản hợp tác với các trường.",
    owners: "Viết Bảo (đối tác 4 trường & tài chính) · Minh Khang & Hoàng Sơn (cloud đa trường) · Phú Thịnh & 4 học sinh kế nhiệm (sản xuất 06 bộ Kit)",
    resources: "06 bộ Kit phần cứng + AWS Credits",
    budget: "4.500.000đ",
    kpis: ["Mỗi trường vận hành > 6 tháng và có mốc nền cân riêng", "Sai lệch khối lượng thừa AI so với cân theo ngày: ngưỡng chốt sau khi đo sai số trạm ESP32"],
    outcomes: ["Mục tiêu theo từng trường, không nhân tuyến tính từ PTNK", "Tiền tiết kiệm chỉ báo cáo sau khi có giá nhập và mô hình hợp đồng căn tin"],
    gate: "Chỉ mở rộng khi PTNK đạt mục tiêu Năm 1 đã được cân.",
  },
  {
    year: "Năm 3",
    period: "11/2028 – 10/2029",
    goal: "Chuyển giao vận hành cho Ban điều hành kế nhiệm",
    scope: "Mạng lưới 3–5 trường",
    work: "Đào tạo Ban điều hành kế nhiệm (lớp Chuyên Tin 10–11); Ban sáng lập cố vấn định kỳ.",
    owners: "Ban Điều hành Kế nhiệm (vận hành trực tiếp) · Nhóm Va Lo Ran & giáo viên hướng dẫn (Ban Cố vấn Chiến lược)",
    resources: "Bộ tài liệu SOP mở + SaaS Cloud",
    budget: "Phí duy trì đề xuất 50.000đ/tháng/trường (chưa đủ bù chi phí cloud; cần bảng thu–chi đầy đủ)",
    kpis: ["3–5 trường vận hành ổn định", "5+ thành viên kế nhiệm độc lập"],
    outcomes: ["Đóng góp SDG 3, 12.3 (chưa quy đổi CO₂e vì hệ số chưa kiểm chứng)", "Bộ SOP mở để trường khác tự triển khai"],
    gate: "Mô hình thu–chi cân đối và chuyển giao thành công cho đội kế nhiệm.",
  },
];
