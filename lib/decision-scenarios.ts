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
export const roadmap = [
  { year: "Năm 1", goal: "Kiểm chứng tại PTNK · 1.017 học sinh", work: "Hiệu chuẩn ≥1.000 khay; thử nghiệm đối chứng và NFC", owners: "Minh Khang: cloud/AI; Hoàng Sơn: web; Viết Bảo: vận hành; Phú Thịnh: khung & thực địa; Thầy Bá Duy: hướng dẫn", resources: "Trạm Vision, cân mẫu, phối hợp bếp", output: "Bộ mẫu cân và quy trình ghi nhận", outcome: "Mục tiêu giảm 18%: 44 → ≤36 g/khay; thay 183.000 phiếu/năm", impact: "Mục tiêu ~1,44 tấn/năm, theo mốc ~8 tấn" },
  { year: "Năm 2", goal: "Mốc đề xuất: 4 trường · 4.500 học sinh", work: "Chuẩn hóa kit Lite/Standard lắp trong 30 phút, hướng dẫn & hỗ trợ", owners: "Viết Bảo: đối tác; Khang & Sơn: kit; Phú Thịnh: tài liệu", resources: "Ngân sách kit, đầu mối từng trường", output: "Kit và SOP tại 4 trường", outcome: "Mục tiêu giảm 15% rau/canh thừa", impact: "Kịch bản 6,2 tấn/năm; cần xác minh giả định quy mô" },
  { year: "Năm 3", goal: "Mốc đề xuất: 12 trường · ≥12.000 học sinh", work: "Bàn giao SOP; thử phí duy trì 50.000đ/tháng/trường", owners: "Thầy Bá Duy & đội kế nhiệm CLB Tin học PTNK khóa 26–29 (dự kiến)", resources: "Đội kế nhiệm, ngân sách bảo trì", output: "SOP và đội hỗ trợ kế nhiệm", outcome: "Mục tiêu tự chủ chi phí vận hành", impact: "Kịch bản 16,5 tấn/năm; SDG 12.3, 3, 4, 13" },
];
