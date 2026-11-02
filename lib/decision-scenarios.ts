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
}
/** Kế hoạch 3 năm theo slide chung kết (ver2, 02/11/2026). Đây là mục tiêu để lập kế hoạch, không phải kết quả đã đạt. */
export const roadmap: RoadmapYear[] = [
  {
    year: "Năm 1",
    period: "11/2026 – 10/2027",
    goal: "Giảm 18% thức ăn thừa trong hai học kỳ",
    scope: "PTNK CSĐH · 1.017 học sinh/ngày",
    work: "Lắp 02 trạm NFC (tận dụng điện thoại sẵn có) và 01 ESP32-CAM; chốt báo cáo thực đơn vào thứ Sáu hằng tuần.",
    owners: "Minh Khang (AWS/AI) · Hoàng Sơn (Web/Portal) · Viết Bảo (NFC/IoT) · Phú Thịnh (khung trạm & đo kiểm) · Thầy Bá Duy (cố vấn)",
    resources: "01 trạm ESP32-CAM + NFC, Wi-Fi PTNK",
    budget: "1.500.000đ",
    kpis: ["Giảm 183.000 phiếu ăn giấy", "Khối lượng thừa < 44 g/khay"],
    outcomes: ["Giảm 1,44 tấn rác hữu cơ/năm", "Tiết kiệm 30.000.000đ+/năm"],
  },
  {
    year: "Năm 2",
    period: "11/2027 – 10/2028",
    goal: "Giảm trung bình 15% thức ăn thừa",
    scope: "04 trường THPT/THCS · 4.500 học sinh",
    work: "Bộ Kit phần cứng lắp nhanh, nhập thực đơn bằng Excel; ký biên bản hợp tác với các trường.",
    owners: "Viết Bảo (đối tác 4 trường & tài chính) · Minh Khang & Hoàng Sơn (cloud đa trường) · Phú Thịnh & 4 học sinh kế nhiệm (sản xuất 06 bộ Kit)",
    resources: "06 bộ Kit phần cứng + AWS Credits",
    budget: "4.500.000đ",
    kpis: ["5 trường vận hành > 6 tháng", "Độ lệch sai số AI < 7%"],
    outcomes: ["Giảm 6,2 tấn rác thực phẩm/năm", "Tiết kiệm > 140.000.000đ/năm"],
  },
  {
    year: "Năm 3",
    period: "11/2028 – 10/2029",
    goal: "Tự chủ tài chính và chuyển giao 100%",
    scope: "Mạng lưới 12 trường · 12.000+ học sinh",
    work: "Đào tạo Ban điều hành kế nhiệm (lớp Chuyên Tin 10–11); Ban sáng lập cố vấn định kỳ.",
    owners: "Ban Điều hành Kế nhiệm (vận hành trực tiếp) · Nhóm Va Lo Ran & giáo viên hướng dẫn (Ban Cố vấn Chiến lược)",
    resources: "Bộ tài liệu SOP mở + SaaS Cloud",
    budget: "Phí duy trì 50.000đ/tháng/trường",
    kpis: ["Tối ưu 2,1 triệu+ suất ăn/năm", "5+ thành viên kế nhiệm độc lập"],
    outcomes: ["Ngăn 16,5 tấn rác/năm (41,2 tấn CO₂e, kịch bản)", "Đóng góp SDG 3, 12.3, 13"],
  },
];
