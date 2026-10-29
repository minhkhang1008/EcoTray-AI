---
name: EcoTray AI
description: "Giao diện vận hành căn tin rõ nguồn dữ liệu, ưu tiên quyết định của bếp."
colors:
  "green": "#28694f"
  "ink": "#253c33"
  "muted": "#627169"
  "line": "#dfe5df"
  "surface": "#ffffff"
  "canvas": "#f6f7f4"
  "sage": "#e9f0e7"
  "warning": "#856125"
  "warning-dot": "#ac8035"
  "demo-text": "#79602d"
  "demo-bg": "#f7f0df"
  "demo-border": "#e8ddbf"
  "priority-surface": "#f3f6ef"
  "focus": "#9c7a29"
  "rice-bar": "#a6b2a3"
  "vegetables": "#237f67"
  "main-bar": "#b68c58"
  "rice-line": "#8a9984"
  "main-line": "#ad8050"
  "green-hover": "#185740"
typography:
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.03em"
  decision-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.025em"
  section-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.015em"
  metric:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
    fontSize: "30px"
    fontWeight: 550
    lineHeight: 1.35
    letterSpacing: "-0.025em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
  decision-body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
    fontSize: "13px"
    lineHeight: 1.75
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
    fontSize: "11px"
  badge:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    letterSpacing: "0.015em"
rounded:
  "badge": "4px"
  "input": "6px"
  "control": "7px"
  "image": "8px"
  "popover": "10px"
  "surface": "12px"
  "live-dialog": "16px"
spacing:
  "4": "4px"
  "6": "6px"
  "8": "8px"
  "10": "10px"
  "12": "12px"
  "14": "14px"
  "16": "16px"
  "18": "18px"
  "20": "20px"
  "22": "22px"
  "24": "24px"
  "28": "28px"
  "30": "30px"
  "32": "32px"
  "36": "36px"
  "40": "40px"
  "48": "48px"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  button-primary-hover:
    backgroundColor: "{colors.green-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  button-text:
    textColor: "#326345"
    typography: "{typography.label}"
    height: "32px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "10px 12px"
  nav-item:
    textColor: "#5a685f"
    rounded: "{rounded.control}"
    padding: "11px 12px"
    height: "46px"
  nav-item-active:
    backgroundColor: "{colors.sage}"
    textColor: "#225b3d"
    rounded: "{rounded.control}"
  badge:
    backgroundColor: "#f2f5ee"
    textColor: "#50634e"
    rounded: "{rounded.badge}"
    padding: "4px 7px"
    typography: "{typography.badge}"
  badge-demo:
    backgroundColor: "{colors.demo-bg}"
    textColor: "{colors.demo-text}"
    rounded: "{rounded.badge}"
    padding: "4px 7px"
    typography: "{typography.badge}"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.surface}"
    padding: "24px"
  decision-main:
    backgroundColor: "{colors.surface}"
    padding: "24px 28px"
  filter-popover:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.popover}"
    padding: "20px"
---

# Design System: EcoTray AI

## Overview

**Creative North Star: "Bàn làm việc của bếp"**

Bàn làm việc của bếp đặt sự rõ ràng và khả năng thao tác lên trước. Nền trắng và trắng ngả xanh, chữ xanh đậm, khoảng cách có nhịp và đường viền nhẹ tạo cảm giác bình tĩnh, phù hợp với quản lý căn tin và nhân viên ghi nhận khay. Nhận diện hiện diện qua sắc xanh, kiểu chữ hệ thống và bộ biểu tượng nét đồng nhất.

Màn hình Tổng quan hiện tại mở bằng việc cần xem xét cùng hành động tiếp theo; số liệu và giải thích hỗ trợ quyết định. Cấu trúc này là lựa chọn cho Tổng quan, không phải yêu cầu mọi tab phải mở bằng cùng một khối. Giữ lời nhắc nguồn dữ liệu và giới hạn kiểm chứng gần nội dung mà chúng giải thích.

**Key Characteristics:**
- Bề mặt trắng, nền trung tính và điểm nhấn xanh lá dịu.
- Phân cấp bằng chữ, khoảng cách và đường viền; ít bóng đổ.
- Hành động cho bếp rõ, thông tin chi tiết mở theo nhu cầu.
- Nguồn dữ liệu, trạng thái và đơn vị luôn có nhãn đọc được.
- Thao tác bàn phím, bố cục điện thoại và giảm chuyển động được giữ nguyên.

Đây là bản ghi hệ thống đã triển khai, đối chiếu `PRODUCT.md`, `src/product.css`, các lớp CSS nền và các thành phần đang gắn vào ứng dụng. Frontmatter lưu giá trị thực tế; các tên vai trò mô tả cách dùng, không tạo thêm biến CSS. Dải sắc OKLCH trong sidecar chỉ phục vụ bảng xem thử, không phải token đã được triển khai. `README.md` tiếp tục là nguồn chuẩn cho nghiệp vụ, số liệu và tuyên bố; tài liệu này chỉ quy định cách thể hiện chúng.

## Colors

Bảng màu trắng và xanh lá giảm nhiễu, với hổ phách dành cho tín hiệu cần xem xét hoặc nguồn mô phỏng.

### Primary

- **Xanh vận hành** (`green`): nút hành động chính, dấu trạng thái bình thường và dấu nhấn tương tác. `green-hover` là trạng thái rê chuột của nút chính.
- **Xanh xô thơm** (`sage`): nền điều hướng đang chọn và bộ đếm bộ lọc; giữ nhịp định hướng trên nền trắng.

### Secondary

- **Hổ phách cảnh báo** (`warning`, `warning-dot`): hệ màu ngữ nghĩa cho chú ý. Dấu chú ý phải đi kèm chữ như “Cần bếp xem xét”. Không dùng làm điểm nhấn trang trí.
- **Hổ phách nguồn mẫu** (`demo-text`, `demo-bg`, `demo-border`): thẻ dữ liệu mô phỏng. Dải thông báo nguồn mẫu dùng các sắc hổ phách gần nhau theo CSS hiện tại; không suy diễn đây là một thang màu đã chuẩn hóa.
- **Màu biểu đồ**: Rau dùng `vegetables`; Cơm và Món chính có sắc riêng cho đường (`rice-line`, `main-line`) và thanh (`rice-bar`, `main-bar`). Đây là các giá trị hiện có, không tự đồng nhất chúng. Tên thành phần và số liệu bổ sung cho màu.

### Neutral

- **Mực xanh** (`ink`): chữ nội dung, nhãn và các giá trị cần đọc rõ.
- **Chữ phụ** (`muted`): chú giải, đơn vị, mô tả và thông tin lưu cục bộ.
- **Trắng bề mặt** (`surface`): thanh bên, thanh trên, bảng và khung phân tích.
- **Nền giấy dịu** (`canvas`): nền làm việc; **nền ưu tiên** (`priority-surface`) phân biệt vùng món cần theo dõi.
- **Viền nhẹ** (`line`): phân chia bố cục mà không tạo cảm giác bảng điều khiển dày đặc.
- **Vòng focus hổ phách** (`focus`): đường viền bàn phím, tách biệt với màu chọn xanh.

**The Source Stays Visible Rule.** Nhãn nguồn và lời giải thích đi cùng dữ liệu cả khi đổi tab, thu gọn điều khiển hoặc in báo cáo.

## Typography

**Body Font:** ngăn xếp hệ thống `-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`. Toàn bộ giao diện sản phẩm dùng cùng họ chữ, không có font display riêng hoặc font tải ngoài bắt buộc.

**Character:** gọn, trung tính và đọc nhanh. Trọng lượng vừa cùng khoảng chữ âm nhẹ ở tiêu đề tạo phân cấp; không biến màn hình vận hành thành poster.

### Hierarchy

- **Headline** (`headline`): tiêu đề trang. Trên điện thoại giảm xuống (25px).
- **Decision title** (`decision-title`): việc bếp cần xem xét; giảm xuống (22px) ở vùng hẹp.
- **Section title** (`section-title`): tiêu đề khung phân tích, giảm xuống (14px) trên điện thoại.
- **Metric** (`metric`): số tổng hợp, dùng `font-variant-numeric: tabular-nums`; giảm xuống (28px) ở màn hình hẹp. Đơn vị đi kèm nhỏ hơn (14px).
- **Body** (`body`): gốc tài liệu. Đoạn khuyến nghị dùng `decision-body`, giới hạn (63ch) để dễ quét mắt; nội dung phụ phổ biến (12–13px).
- **Label** (`label`): nút và nhãn trường; **caption** (`caption`) cho mô tả phụ; **badge** (`badge`) cho thẻ nguồn. Nhãn điều hướng nhóm là ngoại lệ viết hoa nhỏ (10px, tracking 0.08em).

## Layout

Khung desktop là thanh bên trắng cố định theo chiều cuộn và vùng nội dung co giãn. Thanh bên (224px); thanh trên cao (58px); nội dung căn giữa, rộng tối đa (1512px), padding thường (30px 36px 0). Không có khối giới thiệu lớn ở Tổng quan hiện tại. Khuyến nghị đứng trước dải bốn chỉ số, sau đó hai khung biểu đồ và bảng món.

Khoảng cách chủ đạo giữa các khối là (24px), nội dung khung thường (24px); các nhóm nhỏ dùng (8–16px). Các giá trị frontmatter là khoảng cách được dùng thực tế, chưa phải một thang toán học buộc mọi khoảng cách phải khớp.

Các mốc của lớp giao diện sản phẩm trong `src/product.css`:

| Điều kiện | Thay đổi thực tế |
| --- | --- |
| Từ 1600px | Padding nội dung (40px 48px 0), thanh trên (0 48px), vùng khuyến nghị rộng hơn. |
| Tối đa 1190px | Thanh bên (200px), padding nội dung (26px 24px 0); tiêu đề và hành động xếp dọc; ảnh ưu tiên ẩn; thẻ món còn hai cột. |
| Tối đa 940px | Khuyến nghị và biểu đồ về một cột; chỉ số còn hai cột; ảnh ưu tiên xuất hiện lại; phần nhập liệu về một cột; quy trình hai cột. |
| Tối đa 700px | Thanh bên thành phần đầu trang, điều hướng lưới năm cột hiện đủ năm tab với SVG và nhãn ngắn; ẩn thông tin phụ của thanh bên. Nội dung (20px 16px 0), thanh trên (44px), chỉ số giữ hai cột; thẻ món một cột. Bộ lọc mở trong luồng trang thay vì lớp nổi. |
| Tối đa 390px | Ẩn ảnh ưu tiên; nút ghi nhận không còn đẩy sang phải; breadcrumb rút gọn bằng dấu ba chấm. |

Các mốc này mô tả giao diện sản phẩm mới. `styles.css` và `final-round.css` vẫn có mốc riêng cho Vision, phần cứng và hộp trình diễn; không xóa chúng chỉ vì tài liệu này ghi các mốc chính. Bảng món có chiều rộng tối thiểu (600px), bảng số liệu biểu đồ (380px), đều nằm trong vùng cuộn ngang để giữ nhãn và giá trị.

Khi in, bỏ điều hướng và các điều khiển; giữ thông báo nguồn, màu nguồn và khuyến nghị. Tránh ngắt trang giữa khối khuyến nghị, chỉ số và biểu đồ.

## Elevation & Depth

Không có bóng đổ trên các khung báo cáo ở trạng thái nghỉ. Nền trắng, sắc xanh nhạt và viền mảnh tạo chiều sâu. Lớp bộ lọc desktop có bóng nhẹ; hộp trình diễn có bóng sâu hơn và backdrop mờ để xác lập ngữ cảnh riêng.

### Shadow Vocabulary

- **Filter popover** (`0 10px 24px #29483412`): bộ lọc mở trên desktop; tắt bóng và chuyển vào luồng trang trên điện thoại.
- **Selected preset** (`0 1px 4px #254a3310`): lựa chọn kỳ dữ liệu.
- **Selected segment** (`0 1px 3px #214b3510`): lựa chọn trong nhóm phân đoạn.
- **Live dialog** (`0 24px 100px #152e3540`): chế độ trình diễn; backdrop (`#152e3570`) cùng blur (4px).

**The Flat Workspace Rule.** Bề mặt báo cáo dùng đường viền và khác biệt sắc nền; bóng đổ dành cho lớp nổi hoặc lựa chọn đang được nâng lên.

## Shapes

Khung nội dung bo nhẹ và nhất quán (`surface`), điều khiển gọn hơn (`control`), trường nhập (`input`), thẻ nguồn nhỏ (`badge`). Ảnh món dùng `object-fit: cover` trong khung bo nhẹ; ảnh tham chiếu không được kéo méo. Chấm trạng thái và bước quy trình dùng hình tròn; không biến mọi thông tin thành pill.

Viền thường là (1px), dùng `line` hoặc sắc viền trường hiện có. Hộp trình diễn lớn dùng góc `live-dialog`; hộp món trong sản phẩm theo góc `surface`. Giữ sự khác biệt giữa nút có khung, liên kết hành động và hàng món có đường phân chia.

## Components

### Buttons

Nút gọn, có chữ chỉ hành động rõ ràng. Nút chính dùng xanh vận hành và chữ trắng; nền đổi theo `button-primary-hover`. Nút phụ trắng với viền (`#dce4df`), hover nền (`#f2f6f3`) và viền (`#b5c8be`). Nút văn bản dùng xanh và gạch chân khi hover. Hành động trong khuyến nghị tối thiểu (40px), padding (10px 14px); nút ở header tối thiểu (40px), padding (9px 12px).

Hover đổi nền trong (0.15s). Khi nhấn, nút chưa bị vô hiệu dịch xuống (1px). Disabled có opacity (0.45), con trỏ `not-allowed`. Focus bàn phím là outline (3px) màu `focus`, offset (3px); không bỏ để thay bằng đổi màu chữ.

### Chips

Thẻ nguồn có chữ nhỏ, viền mảnh và góc `badge`. Mô phỏng có nền hổ phách; nguồn cá nhân/phân tích dùng nền trung tính xanh. Dải nguồn luôn có lời giải thích, không chỉ có thẻ màu. Nút chọn nguồn không thay thế cho dải nguồn dưới header.

### Cards / Containers

Khung báo cáo trắng, viền nhẹ, góc `surface`, padding (24px), xuống (20px 16px) trên điện thoại. Khối khuyến nghị có hai vùng desktop (1.1fr 1fr), một vùng trắng và một vùng xanh rất nhạt; giữ hành động cùng nội dung giải thích. Thẻ món chứa ảnh, nhãn nguồn và chỉ số theo thứ tự ổn định; số liệu hiện tại không được gọi là kết quả can thiệp thực tế.

### Inputs / Fields

Trường trắng, viền (`#dce4df`), góc `input`, padding (10px 12px), màu caret xanh vận hành. Nhãn chữ nằm trước trường; không chỉ dùng placeholder. Trường trong bộ lọc không dùng khung riêng như biểu mẫu nhập; cao tối thiểu (40px). Biểu mẫu ghi nhận cao tối thiểu (42px). Giữ focus chung và trạng thái lỗi lưu hiện có; không mô tả việc lưu thành công trước khi ứng dụng xác nhận.

### Navigation

Thanh bên trắng với năm tab. Mục mặc định chữ xanh xám, hover nền (`#f1f4ee`); mục đang chọn nền `sage`, chữ (`#225b3d`), weight (600). Mục cao tối thiểu (46px); trên điện thoại chuyển thành lưới năm cột hiện đủ năm tab, mỗi mục cao tối thiểu (54px), padding (7px 2px), icon trên nhãn ngắn (10px). Tên đầy đủ vẫn có trong `aria-label`; không cần cuộn để tìm tab. Tab phụ là nhãn có gạch chân đang chọn, không phải thẻ nền đặc.

### Filters and disclosure

Phạm vi ngày/món đang xem vẫn hiển thị khi bộ lọc đóng. Điều khiển nằm trong `details/summary` có focus bàn phím; bộ đếm báo số điều kiện, trên điện thoại có thể ẩn bộ đếm nhưng vẫn giữ phạm vi. Giải thích vòng quyết định và số liệu vận hành chi tiết cũng mở theo nhu cầu. Không đặt nhãn nguồn quan trọng vào phần bị đóng mặc định.

### Charts and tables

Biểu đồ có nhãn ba thành phần và chú giải. Hover bổ sung thông tin; bảng trong “Xem số liệu theo ngày” cung cấp cùng giá trị mà không cần chuột. Bảng dùng caption, tiêu đề cột có scope, ngày và tỷ lệ rõ; giá trị thiếu là dấu gạch, không phải số không. Thông điệp dưới biểu đồ nói rõ tỷ lệ ước lượng, chưa quy đổi khối lượng. Giữ số mẫu hợp lệ và chú thích trước/sau lọc ngoại lai gần khuyến nghị tương ứng.

### Icons and imagery

Dùng bộ SVG tự vẽ trong `src/Icon.tsx`: viewBox (24×24), stroke (1.65), đầu và góc nét tròn, `currentColor`, không fill, cỡ mặc định (20px). Hành động gọn dùng cỡ (15–17px). Icon trang trí được ẩn khỏi trình đọc màn hình; nút chỉ có icon vẫn cần tên truy cập. Ảnh món là bằng chứng nguồn thực đơn, không phải bằng chứng độ chính xác Vision.

### Accessibility and motion

Giữ skip link hiện khi focus để tới nội dung chính. Dùng phần tử button, summary, input và select thật cho tương tác. Mọi hoạt ảnh và transition tắt khi `prefers-reduced-motion: reduce`; cuộn trở về `auto`. Chế độ trình diễn giữ các phím tắt hiện có và trạng thái fallback tách riêng. Bảng mẫu trong sidecar là minh họa thiết kế, không phải bản ghi thực địa.

## Do's and Don'ts

### Do:
- **Do** dùng token đang thắng trong src/product.css; kiểm tra cascade từ styles.css và final-round.css trước khi mở rộng giao diện.
- **Do** dùng tiếng Việt tự nhiên, đơn vị rõ và số theo định dạng Việt Nam; giữ tên Cơm, Rau, Món chính nhất quán.
- **Do** giữ lời giải thích: thực đơn và ảnh Portal PTNK là thật, số khay và tỷ lệ thừa của bộ mẫu là mô phỏng.
- **Do** ghi đúng trạng thái lưu trên thiết bị/trình duyệt; README.md là nguồn chuẩn cho nghiệp vụ, số liệu và mức kiểm chứng.
- **Do** giữ vùng focus, nhãn có thể đọc và bảng số liệu biểu đồ mở được bằng bàn phím.
- **Do** dùng ảnh món Portal đúng nguồn; dùng biểu tượng SVG hiện có và nội dung phù hợp Lite/Standard/Pro.

### Don't:
- **Don't** thay Tổng quan bằng phần giới thiệu lớn làm đẩy việc cần xử lý xuống dưới.
- **Don't** dùng màu cảnh báo như trang trí hoặc dùng màu làm tín hiệu duy nhất.
- **Don't** gộp dữ liệu thực địa, mô phỏng, sự kiện sân khấu, phần cứng và dự toán thành một kết quả đã kiểm chứng.
- **Don't** gọi dữ liệu localStorage là đã đồng bộ máy chủ hoặc coi thiết kế mới là bằng chứng nghiệm thu phần cứng.
- **Don't** làm mất phạm vi lọc đang xem khi thu gọn các điều khiển.
- **Don't** thêm emoji, icon font hoặc bộ biểu tượng có nét khác vào thanh điều hướng và các hành động sản phẩm.
- **Don't** dùng ảnh mặt, tên học sinh hoặc hình học sinh nhận diện được trong bản ghi khay.

## Tinh giản luồng công việc (30/10/2026)

Giữ nguyên màu, typography và năm tab. Danh sách thực đơn là chế độ mặc định; ở mobile mỗi món có tên và một hàng bốn giá trị (Khay/Cơm/Rau/Món chính), không kéo ngang để tìm tỷ lệ. Thẻ ảnh là chế độ phụ. Khi chưa có khay, Tổng quan chỉ hiển thị hướng dẫn cùng hành động ghi nhận/nhập CSV; không dựng biểu đồ và chỉ số rỗng.

Vision tách trạm, kiểm tra ảnh và kịch bản mô phỏng. Thuật ngữ mô hình và phương pháp ở phần kiểm định; nhãn nguồn, giới hạn ước lượng và trạng thái lưu ở gần kết quả liên quan. Cấu hình trường giữ lựa chọn gói; lộ trình, minh chứng và dự toán chuyển sang Thông tin dự án. Chi tiết món không chèn số liệu toàn căn tin hoặc ví dụ định lượng không thuộc món.
