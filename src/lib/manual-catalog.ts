// ============================================================================
// PhysBoard Complete Feature & Illustrated Manual Catalog
// Single source of truth for:
//   1. In-App FeatureGuideModal (20 illustrated topics + 100% Feature Search)
//   2. Complete Illustrated A4 PDF Manual (14 Chapters, zero omissions)
// ============================================================================

import { WHITEBOARD_COMMANDS } from "./commands";
import { TOOL_GUIDE_CATALOG } from "./tool-guides";

export interface ScreenshotCallout {
  num: number;
  label: string;
  desc: string;
}

export interface InAppGuideChapter {
  id: string;
  stepLabel: string;
  icon: string;
  shortTitle: string;
  title: string;
  badge: string;
  pdfChapterNum: number;
  screenshotSrc: string;
  videoSrc?: string;
  tutorialBoardId?: string;
  summary: string;
  callouts: ScreenshotCallout[];
  pcSteps: string[];
  tabletSteps: string[];
  highlights: Array<{ label: string; detail: string }>;
  tip: string;
}

export interface PdfBookChapterMeta {
  num: number;
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  intro: string;
  screenshots: Array<{
    file: string;
    caption: string;
    callouts: ScreenshotCallout[];
  }>;
  pedagogyNote: string;
}

export interface FeatureCatalogEntry {
  id: string;
  /** References toolId / commandId for automated 100% coverage audit */
  toolKeys?: string[];
  chapterNum: number;
  categoryLabel: string;
  icon: string;
  name: string;
  whereToFind: string;
  shortcut: string;
  pcHowTo: string;
  tabletHowTo: string;
  resultDesc: string;
  guideChapterId: string;
}

export const SUPPORT_INFO = {
  appName: "PhysBoard",
  version: "1.4.4",
  zaloPhone: "0853769246",
  zaloDisplay: "0853 769 246",
  email: "ngocgao2024@gmail.com",
  githubRepo: "https://github.com/NeoGao-com/PhysBoard",
};

// ============================================================================
// 1. 20 Chuyên đề Minh hoạ Chi tiết trong Ứng dụng (FeatureGuideModal)
// ============================================================================

export const IN_APP_GUIDE_CHAPTERS: InAppGuideChapter[] = [
  {
    id: "01-interface-navigation",
    stepLabel: "01",
    icon: "🧭",
    shortTitle: "Giao diện, Chọn & Zoom",
    title: "1. Giao diện Thanh công cụ cố định, Chọn đối tượng & Điều hướng bảng",
    badge: "Cơ bản",
    pdfChapterNum: 1,
    screenshotSrc: "./guide-shots/01-interface-navigation.webp",
    tutorialBoardId: "tut_01_basics",
    summary:
      "Thanh công cụ được gắn cố định sát viền trên cùng giúp tối đa hoá diện tích viết bảng. Bạn dễ dàng chọn từng hình, quét chọn cả nhóm, di chuyển bảng, thu phóng và bật Toàn màn hình.",
    callouts: [
      { num: 1, label: "Thanh công cụ sát viền trên", desc: "Chứa toàn bộ công cụ vẽ, hình học, đồ thị, vật lý; tự cuộn ngang gọn gàng trên màn hình hẹp." },
      { num: 2, label: "Thanh bên Sổ tay (PageSidebar)", desc: "Quản lý trang, Thu gọn bảng, Phím tắt Ctrl+K, Hướng dẫn, Báo lỗi, Lớp học, Cài đặt & Nút Toàn màn hình." },
      { num: 3, label: "Cụm Chọn / Quét chọn / Hoàn tác", desc: "Chuyển nhanh giữa Con trỏ Chọn (V), Quét chọn vùng (M), Kéo bảng (H) và Undo/Redo." },
      { num: 4, label: "HUD Tỷ lệ Zoom & Toàn màn hình", desc: "Hiển thị % thu phóng hiện tại (8%–600%), bấm để đặt lại 100% hoặc phóng to toàn màn hình." },
    ],
    pcSteps: [
      "Chọn / Di chuyển: bấm nút Chọn (V) hoặc quét khung chữ nhật (M) để gom nhiều đối tượng cùng lúc; giữ Shift + Click để chọn thêm.",
      "Cuộn & Thu phóng: giữ Space + kéo chuột (hoặc bấm nút Kéo bảng H) để di chuyển; lăn con lăn chuột để Zoom tại vị trí con trỏ; bấm 0 về 100%, Shift+0 để Vừa màn hình.",
      "Nhân bản / Xoá nhanh: Ctrl+D để nhân bản, Delete/Backspace để xoá, Ctrl+Z hoàn tác, Alt+Enter bật Toàn màn hình.",
    ],
    tabletSteps: [
      "Chạm nút Chọn để kéo từng hình, kéo núm góc để đổi kích thước hoặc xoay.",
      "Dùng 2 ngón tay đặt lên vùng trống để kéo di chuyển bảng và chụm/mở 2 ngón để thu phóng mượt mà.",
      "Bấm biểu tượng Toàn màn hình (⛶) ở góc trên phải hoặc thanh bên trái để ẩn thanh điều hướng hệ thống Android khi chiếu bảng.",
    ],
    highlights: [
      { label: "Thanh ngữ cảnh (SelectionBar)", detail: "Mỗi khi chọn 1 hình (Điểm, Hình 3D, Trục Oxy/Oxyz, Công thức...), thanh thao tác riêng tự hiện phía dưới." },
      { label: "Ẩn tạm & Hiện lại đối tượng", detail: "Cho phép tạm ẩn đáp án / lời giải mẫu trên bảng, rồi bấm nút Hiện tất cả khi giảng xong." },
      { label: "Thu gọn thanh bên 1 chạm", detail: "Bấm mũi tên thu gọn ở mép trên trái để mở rộng tối đa không gian viết bài." },
      { label: "Phóng to/thu nhỏ cỡ Thanh công cụ", detail: "Trong Cài đặt hoặc mép phải thanh công cụ cho phép chỉnh tỷ lệ nút bấm từ 80% đến 130% cho máy chiếu." },
    ],
    tip: "Trên máy tính bảng khi đứng dọc, bấm nút Toàn màn hình ở thanh bên hoặc Ctrl+K gõ 'toan man hinh' để tận dụng 100% diện tích màn hình.",
  },
  {
    id: "02-home-notebooks-folders",
    stepLabel: "02",
    icon: "🗂️",
    shortTitle: "Trang chủ Sổ tay & Thư mục",
    title: "2. Trang chủ Sổ tay (Samsung Notes), Thư mục con nhiều cấp & Sao lưu",
    badge: "Quản lý bài giảng",
    pdfChapterNum: 2,
    screenshotSrc: "./guide-shots/02-home-notebooks-folders.webp",
    videoSrc: "./demos/08-crop-and-notes.mp4",
    tutorialBoardId: "tut_01_basics",
    summary:
      "Giao diện Trang chủ sáng trực quan kiểu Samsung Notes giúp sắp xếp hàng trăm bài giảng theo Thư mục nhiều cấp (ví dụ: Khối 12 → Chương 2 → Đề thi), đổi bìa sổ tay bắt mắt và sao lưu trọn gói.",
    callouts: [
      { num: 1, label: "Thanh bên Danh mục & Cây Thư mục", desc: "Lọc Tất cả ghi chú, Yêu thích, Thùng rác và bấm + / + Con để tạo thư mục lồng nhau nhiều cấp." },
      { num: 2, label: "Thư mục Sổ tay Thực hành mẫu", desc: "Chứa sẵn 9 bài mẫu tương tác sống kèm nút ↺ Khôi phục Sổ tay mẫu gốc." },
      { num: 3, label: "Thẻ Sổ tay & Bìa tuỳ chỉnh", desc: "Chuyển xem Lưới/Danh sách, tìm kiếm tên, ghim Yêu thích (★), Khoá sổ hoặc bấm ⋮ Đổi bìa đẹp." },
      { num: 4, label: "Sao lưu & Khôi phục (.physbackup.json)", desc: "Xuất toàn bộ sổ tay, trang viết và PDF ra 1 file dự phòng để chép sang máy khác." },
    ],
    pcSteps: [
      "Bấm 'Quản lý bảng / Trang chủ' ở đáy thanh bên trái (hoặc góc trên) để mở Trang chủ Sổ tay.",
      "Tạo thư mục cha bằng nút '+ Thư mục', rê chuột vào thư mục bất kỳ và bấm '+ Con' để tạo thư mục con bên trong (không giới hạn số cấp).",
      "Bấm chuột phải hoặc nút '⋮' trên từng sổ tay để Đổi tên, Đổi bìa (Chọn hoạ tiết/màu/sticker), Di chuyển thư mục, Sao chép hoặc Khoá.",
    ],
    tabletSteps: [
      "Chạm 'Quản lý trang / Sổ tay' ở góc dưới trái để về Trang chủ Sổ tay sáng, chữ to dễ bấm.",
      "Chạm '+ Tạo sổ tay mới' ở góc trên phải hoặc chạm nút Chọn nhiều để xoá / chuyển thư mục hàng loạt.",
      "Khi muốn chuyển bài giảng từ laptop sang máy tính bảng Android, dùng nút 'Xuất file Sao lưu (.physbackup.json)' rồi Nhập lại trên máy tính bảng.",
    ],
    highlights: [
      { label: "Bộ 9 Sổ tay Hướng dẫn mẫu", detail: "Đã dựng sẵn hình 2D/3D/Đồ thị sống trong thư mục '📘 Sổ tay Hướng dẫn & Thực hành mẫu' để bạn thử ngay." },
      { label: "Đổi Bìa Sổ tay (BoardCoverArt)", detail: "Chọn hoạ tiết ô ly/chấm bi/hình học, màu bìa pastel/đậm, bố cục dải màu và icon sticker môn học." },
      { label: "Thùng rác an toàn", detail: "Sổ tay xoá nhầm được giữ trong Thùng rác để khôi phục lại, chỉ mất hẳn khi bạn bấm Xoá vĩnh viễn." },
      { label: "Sắp xếp & Tìm kiếm nhanh", detail: "Lọc sổ tay theo ngày cập nhật, tên A–Z và tìm không phân biệt dấu tiếng Việt." },
    ],
    tip: "Hãy tạo thư mục theo từng Lớp (10, 11, 12) rồi tạo thư mục con theo từng Chương để tìm bài giảng trên lớp chỉ trong 2 giây.",
  },
  {
    id: "03-pages-backgrounds-lock",
    stepLabel: "03",
    icon: "📄",
    shortTitle: "Trang giấy, Nền bảng & Khoá",
    title: "3. Quản lý Trang, Khổ A4 / Vô hạn, 6 Nền bảng & Khoá khối vào trang",
    badge: "Trang & Nền",
    pdfChapterNum: 2,
    screenshotSrc: "./guide-shots/03-pages-backgrounds-lock.webp",
    tutorialBoardId: "tut_09_exam_a4",
    summary:
      "Chuyển đổi linh hoạt giữa Bảng vô hạn (phóng khoáng khi vẽ hình lớn) và Khổ trang A4 Dọc/Ngang (chuẩn in PDF gửi học sinh), cùng 6 mẫu nền giấy/bảng phấn và tính năng Khoá cố định khối.",
    callouts: [
      { num: 1, label: "Thanh bên Quản lý Trang", desc: "Xem ảnh thu nhỏ từng trang, bấm '+ Thêm trang' (Alt+N) hoặc mở lưới Quản lý trang (nhân bản/xoá nhiều trang)." },
      { num: 2, label: "Chọn Khổ giấy & Nền bảng", desc: "Đổi giữa Bảng vô hạn / A4 Dọc / A4 Ngang và 6 nền: Trắng, Ô ly, Chấm bi, Kẻ ngang, Bảng đen, Bảng xanh." },
      { num: 3, label: "Nút Khoá vào trang (🔒) & Danh sách Mở khoá (🔓)", desc: "Khoá cố định đề bài hoặc hình nền để khi tẩy hay quét chọn không làm xê dịch; mở khoá riêng từng khối ở góc dưới trái." },
    ],
    pcSteps: [
      "Mở menu Nền bảng trong Cài đặt nhanh/Thanh bên để chọn Vô hạn hoặc A4 Dọc/Ngang, bật/tắt Lưới (Shift+G).",
      "Ở chế độ A4, kéo cuộn xuống quá mép cuối trang và giữ 0,4s — hệ thống tự thêm trang A4 mới liền mạch!",
      "Chọn ảnh đề bài hoặc hình mẫu → bấm '🔒 Khóa vào trang' trên SelectionBar; khi cần sửa lại, bấm danh sách '🔒 X khối đang khóa' ở góc dưới trái để mở khoá riêng khối đó hoặc mở hết.",
    ],
    tabletSteps: [
      "Vuốt trên danh sách trang bên trái để chuyển trang nhanh (hoặc dùng nút Trang trước/sau).",
      "Khi dạy ban đêm hoặc phòng chiếu sáng, chuyển sang Nền Bảng xanh phấn trắng hoặc Bảng đen để dịu mắt.",
      "Đề bài PDF khi chèn hoặc cắt lên bảng sẽ mặc định được Khoá sẵn để bạn tì bút viết đè trực tiếp không bị trôi đề.",
    ],
    highlights: [
      { label: "Nhân bản & Sắp xếp trang hàng loạt", detail: "Mở 'Quản lý trang' để chọn nhiều trang, nhân bản mẫu trang tiêu đề hoặc xoá bớt trang nháp." },
      { label: "Tự thêm trang khi cuộn đáy (A4)", detail: "Viết hết trang A4 chỉ cần cuộn giữ ở đáy trang 0,35s là tự sinh trang A4 kế tiếp cùng nền giấy." },
      { label: "Khoá & Mở khoá độc lập từng khối", detail: "Di chuột/chạm vào danh sách khoá để làm nổi bật đúng khối đang cần mở khoá." },
      { label: "Xuất PDF luôn giữ nền trắng sạch", detail: "Dù đang viết bảng xanh phấn trắng, khi xuất PDF bạn vẫn có thể chọn nền giấy trắng để học sinh in rõ." },
    ],
    tip: "Nếu chuẩn bị giáo án in phát cho học sinh, hãy chọn ngay Khổ A4 Dọc + Nền kẻ ngang từ trang 1 để căn lề chuẩn khi xuất PDF.",
  },
  {
    id: "04-pens-inktoshape-stylus",
    stepLabel: "04",
    icon: "✒️",
    shortTitle: "6 Đầu bút, Nắn hình & Stylus",
    title: "4. Bộ 6 Đầu bút Vector, Tự nắn hình (Ink-to-Shape), Chống tì tay & Tẩy",
    badge: "Viết & Vẽ tay",
    pdfChapterNum: 3,
    screenshotSrc: "./guide-shots/04-pens-inktoshape-stylus.webp",
    tutorialBoardId: "tut_01_basics",
    summary:
      "6 ngòi bút mượt mà chuẩn sư phạm (Bút mực, Bút máy nét thanh đậm, Bút chì, Dạ quang, Bút lông, Nét đứt), tính năng giữ bút 0,34s tự nắn thẳng/tròn/tam giác và chống tì tay chuyên dụng cho Tablet.",
    callouts: [
      { num: 1, label: "Bảng chọn Kiểu Bút & Màu sắc", desc: "Chọn 1 trong 6 đầu bút, 8 màu nhanh hoặc bảng mã Hex tuỳ ý, 4 cỡ nét và kiểu nét liền/đứt." },
      { num: 2, label: "Nét Bút máy & Bút Dạ quang", desc: "Bút máy tự tạo nét thanh đậm theo tốc độ/lực nhấn; Bút dạ quang nằm dưới chữ không che mờ đề." },
      { num: 3, label: "Nút Tẩy (E) & Chỉ viết Stylus (Pen-Only)", desc: "Tẩy va chạm xoá chính xác nét chạm vào; bật Pen-Only để tì lòng bàn tay thoải mái khi viết S Pen." },
    ],
    pcSteps: [
      "Bấm P (Bút tự do), B (Bút máy nét thanh đậm), hoặc bấm mũi tên ▾ cạnh nút Bút để chọn Bút chì (2), Dạ quang (3), Bút lông (4), Nét đứt (5).",
      "Bật/Tắt Tự nắn hình trong Cài đặt: vẽ phác một đoạn thẳng, hình tròn hay tam giác rồi giữ yên chuột/bút khoảng 0,34 giây — nét vẽ tự nắn thẳng đẹp.",
      "Bấm E chọn Cục tẩy rồi quét qua nét cần xoá (tẩy theo khoảng cách va chạm từng đoạn, không làm mất hình xung quanh).",
    ],
    tabletSteps: [
      "Bật nút 'Chỉ bút Stylus' (biểu tượng ngòi bút chống tay) ngay trên thanh công cụ: mọi chạm từ lòng bàn tay/ngón tay sẽ bị bỏ qua khi vẽ, chỉ nhận đầu bút S Pen / Stylus.",
      "Dùng 2 ngón tay để cuộn/zoom bảng ngay cả khi đang ở chế độ Bút viết.",
      "Nếu bút có nút bấm vật lý (S Pen), giữ nút cạnh thân bút để chuyển nhanh sang Tẩy rồi nhả ra để viết tiếp (tùy chỉnh trong Cài đặt).",
    ],
    highlights: [
      { label: "Mực Vector phóng to không rỗ", detail: "Khác với ảnh bitmap, nét viết bằng PhysBoard được nội suy đường cong Bezier sắc nét ở mọi mức Zoom." },
      { label: "Dạ quang thông minh dưới nét chữ", detail: "Tô đè lên chữ viết hoặc ảnh đề PDF mà không làm mờ nội dung bên dưới." },
      { label: "Đổi màu / độ dày sau khi vẽ", detail: "Dùng công cụ Chọn (V) khoanh các nét cũ rồi đổi màu hoặc cỡ nét hàng loạt." },
      { label: "Tuỳ chọn tự chuyển về Chọn sau khi vẽ", detail: "Trong Cài đặt có thể bật tự chuyển công cụ sau khi vẽ xong hình để đỡ phải bấm lại." },
    ],
    tip: "Khi giảng đề bài PDF, dùng Bút dạ quang (phím 3) màu vàng để gạch chân dữ kiện quan trọng, rồi dùng Bút máy (B) màu xanh/đỏ để viết lời giải.",
  },
  {
    id: "05-laser-guidebar",
    stepLabel: "05",
    icon: "🔴",
    shortTitle: "Bút Laser & Chỉ dẫn bước",
    title: "5. Bút chỉ Laser trình chiếu (2 chế độ) & Thanh bóng đèn chỉ dẫn từng bước",
    badge: "Trình chiếu",
    pdfChapterNum: 3,
    screenshotSrc: "./guide-shots/05-laser-guidebar.webp",
    videoSrc: "./demos/10-shortcuts-settings-feedback.mp4",
    summary:
      "Thu hút sự tập trung của học sinh khi giảng bài trên máy chiếu bằng Bút Laser (Chấm đỏ di chuyển hoặc Vệt sáng tự biến mất sau 1,5 giây) và Thanh gợi ý thao tác thông minh ngay dưới thanh công cụ.",
    callouts: [
      { num: 1, label: "Nút Laser (L) & Tuỳ chỉnh ⚙ Laser", desc: "Bấm lần 1 để dùng Vệt sáng tự mờ (hoặc Chấm đỏ), bấm lại vào nút Laser để đổi chế độ; bấm ⚙ đổi màu/cỡ/tốc độ mờ." },
      { num: 2, label: "Vệt sáng Laser trên bảng", desc: "Khoanh vùng nhấn mạnh công thức hoặc đỉnh tam giác khi giảng, tự mờ dần sạch bảng mà không tạo rác." },
      { num: 3, label: "Thanh Bóng đèn Chỉ dẫn (💡)", desc: "Luôn hiện tên công cụ, phím tắt và bước tiếp theo cần bấm (vd: 'Chọn điểm thứ 2'), có nút ✕ Hủy bước & Thu gọn." },
    ],
    pcSteps: [
      "Bấm nút Laser (hoặc phím L) để kích hoạt. Bấm trực tiếp lại vào nút Laser lần nữa để chuyển qua lại giữa 'Chấm đỏ' và 'Vệt sáng tự mờ'.",
      "Bấm biểu tượng bánh răng ⚙ cạnh nút Laser để mở Hộp thoại Cài đặt Laser (chọn màu Đỏ/Xanh/Vàng, độ dày và thời gian mờ).",
      "Quan sát thanh 💡 ngay bên dưới thanh công cụ bất cứ khi nào chọn phép dựng hình mới; bấm '✕ Hủy bước' hoặc phím Esc nếu muốn dừng giữa chừng.",
    ],
    tabletSteps: [
      "Rê đầu bút Stylus hoặc ngón tay ở chế độ Laser khi đang hướng dẫn cả lớp mà không để lại nét mực vĩnh viễn trên bài giảng.",
      "Nếu thấy thanh 💡 chỉ dẫn chiếm chỗ trên màn hình nhỏ, chạm mũi tên ▴ để thu gọn thành viên thuốc nhỏ hoặc chạm '✕ Tắt' (bật lại được trong Cài đặt).",
    ],
    highlights: [
      { label: "Laser không lưu vào lịch sử Undo", detail: "Các vệt chỉ dẫn biến mất hoàn toàn, không làm bẩn trang bài giảng khi xuất PDF." },
      { label: "Đổi màu Laser phù hợp nền bảng", detail: "Dùng Laser vàng/xanh lá sáng khi đang giảng trên Nền Bảng xanh hoặc Bảng đen." },
      { label: "Thanh 💡 bám sát trạng thái dựng hình", detail: "Khi bạn chọn 1 tam giác hoặc 1 khối 3D, thanh 💡 tự đổi sang hướng dẫn thao tác ngữ cảnh tương ứng." },
      { label: "Hỗ trợ đa nền tảng mượt mà", detail: "Lớp vẽ Laser tách biệt hoàn toàn khỏi cây DOM chính nên đạt 60fps trên cả máy tính bảng tầm trung." },
    ],
    tip: "Khi giảng bài trên nền bảng xanh phấn trắng, hãy đổi màu Vệt sáng Laser sang Vàng chanh hoặc Xanh ngọc để học sinh cuối lớp nhìn rõ nhất.",
  },
  {
    id: "06-plane-points-lines-circles",
    stepLabel: "06",
    icon: "📏",
    shortTitle: "Điểm, Đoạn, Đường & Tròn",
    title: "6. Hình phẳng Cơ bản: Điểm (A+/A-), Đoạn/Đường/Tia/Vectơ & Số đo trực tiếp",
    badge: "Hình phẳng 2D",
    pdfChapterNum: 4,
    screenshotSrc: "./guide-shots/06-plane-points-lines-circles.webp",
    videoSrc: "./demos/01-plane-geometry.mp4",
    tutorialBoardId: "tut_02_plane_2d",
    summary:
      "Dựng chuẩn xác các đối tượng cơ sở: Điểm tự đánh tên A, B, C...; Đoạn thẳng, Đường thẳng, Tia, Vectơ, Đường tròn — đặc biệt hiển thị trực tiếp số đo độ dài (d = ...) và bán kính (R = ...) ngay khi đang kéo chuột/bút!",
    callouts: [
      { num: 1, label: "Cụm công cụ Điểm, Đoạn/Đường/Tia/Vectơ & Tròn", desc: "Chạm nhanh trên thanh công cụ; bấm mũi tên cạnh Đoạn thẳng để đổi sang Nét đứt, Đường thẳng, Tia hoặc Vectơ." },
      { num: 2, label: "Hiển thị trực tiếp số đo khi kéo (d = ... / R = ...)", desc: "Ngay trong lúc kéo vẽ Đoạn thẳng hoặc Đường tròn, số đo độ dài/bán kính hiện lên theo thời gian thực và tự ẩn khi thả tay." },
      { num: 3, label: "Thanh ngữ cảnh Điểm trên SelectionBar", desc: "Khi chọn Điểm: Đổi tên (nhấp đúp chữ), Ẩn/Hiện tên, đổi kiểu chấm (• / × / ○), chỉnh cỡ chấm và phóng cỡ chữ nhãn (A- / A+)." },
    ],
    pcSteps: [
      "Chọn Điểm (.) và bấm lên bảng hoặc lên cạnh/đường tròn có sẵn (tự động bắt dính) để đặt điểm A, B, C (không bao giờ trùng tên).",
      "Chọn Đoạn thẳng (L) hoặc Đường tròn (C): kéo từ điểm đầu đến điểm cuối — theo dõi nhãn số đo 'd = ...' / 'R = ...' hiện ngay cạnh con trỏ; giữ Shift để khoá góc ngang/dọc/45°.",
      "Chọn một Điểm đã vẽ rồi dùng thanh dưới đáy để bấm '✎ Đổi tên', '🙈 Ẩn tên', đổi chấm '• / × / ○' hoặc bấm 'A+' tăng cỡ chữ cho cả lớp dễ nhìn.",
    ],
    tabletSteps: [
      "Chạm giữ và kéo để vẽ đoạn thẳng hoặc đường tròn từ tâm; số đo d hoặc R hiện rõ ngay khi kéo, thả tay là biến mất giữ hình sạch sẽ.",
      "Chạm đúp trực tiếp vào tên chữ cái (A, B, C...) để sửa thành M, N, H, O hoặc S' ngay lập tức.",
      "Nhờ bắt dính (Snap) thông minh, khi kéo gần vào đỉnh cũ hay giao điểm có sẵn, vòng tròn bắt dính sẽ sáng lên giúp nối hình khít tuyệt đối.",
    ],
    highlights: [
      { label: "Đo độ dài & bán kính tức thì khi kéo", detail: "Giúp vẽ các đoạn có độ dài tỷ lệ chính xác (ví dụ d = 4, d = 6 hoặc R = 3) mà không cần bật thước phụ." },
      { label: "Đoạn thẳng nét đứt chuyên biệt", detail: "Có ngay lựa chọn Đoạn nét đứt ở menu con cạnh nút Đoạn để vẽ đường gióng hoặc cạnh khuất." },
      { label: "Phóng to cỡ nhãn điểm cho máy chiếu", detail: "Bấm A+ / A- để tăng giảm kích thước chữ cái tên điểm đồng bộ rất rõ khi chiếu tivi." },
      { label: "Ràng buộc động tuyệt đối", detail: "Khi kéo di chuyển Điểm gốc, mọi đoạn thẳng, tia, vectơ và đường tròn đi qua nó đều co giãn liền mạch theo." },
    ],
    tip: "Để nối nhanh giữa 2 đỉnh có sẵn mà không tạo thêm điểm thừa, đưa đầu bút tới gần đỉnh cũ cho đến khi thấy vòng sáng bắt dính rồi mới kéo.",
  },
  {
    id: "07-plane-polygons-fill",
    stepLabel: "07",
    icon: "⬡",
    shortTitle: "Tam giác, Tứ giác & Tô màu",
    title: "7. Tam giác đặc biệt, Tứ giác đặc biệt, Đa giác tự do & Tô màu miền kín",
    badge: "Hình phẳng 2D",
    pdfChapterNum: 4,
    screenshotSrc: "./guide-shots/07-plane-polygons-fill.webp",
    tutorialBoardId: "tut_02_plane_2d",
    summary:
      "Dựng nhanh 4 loại Tam giác đặc biệt (Vuông, Vuông cân, Cân, Đều), 4 loại Tứ giác đặc biệt (Bình hành, Thoi, Chữ nhật, Vuông), Đa giác nhiều cạnh tự do và Thùng sơn Tô màu miền khép kín.",
    callouts: [
      { num: 1, label: "Công cụ Đa giác tự do & Thùng sơn Tô màu (G)", desc: "Chấm lần lượt các đỉnh rồi bấm lại đỉnh đầu để khép đa giác; dùng Thùng sơn đổ màu bán trong suốt vào bên trong." },
      { num: 2, label: "Menu Hình phẳng — Nhóm Vẽ Tam giác & Tứ giác", desc: "Bấm Hình phẳng ▾ để chọn ngay Tam giác Vuông (Shift+1), Vuông cân, Cân, Đều (Shift+2) hoặc Hình bình hành, Thoi, Chữ nhật, Vuông." },
      { num: 3, label: "Hình mẫu kèm ký hiệu tự động SGK", desc: "Các tam giác/tứ giác đặc biệt tự giữ tính chất vuông góc / bằng nhau / song song và tự gắn ký hiệu góc vuông, vạch bằng nhau." },
    ],
    pcSteps: [
      "Tam giác đặc biệt: mở Hình phẳng ▾ → chọn Tam giác vuông (hoặc bấm Shift+1), bấm chọn 2 điểm đáy → tự dựng đỉnh thứ 3 chuẩn vuông góc.",
      "Tứ giác đặc biệt: chọn Hình bình hành (bấm 3 đỉnh liên tiếp A, B, C → đỉnh D tự dựng), Hình thoi, Hình chữ nhật hoặc Hình vuông.",
      "Tô màu miền: bấm nút Thùng sơn (G), bấm mũi tên ▾ bên cạnh để chọn màu và độ mờ rồi bấm vào bên trong đa giác, hình tròn hoặc vùng giao cắt bất kỳ.",
    ],
    tabletSteps: [
      "Với Đa giác tự do: chạm từng điểm đỉnh quanh bảng rồi chạm lại vào đỉnh A đầu tiên (hoặc bấm nút Hoàn tất) để khép kín hình.",
      "Chạm giữ kéo bất kỳ đỉnh nào của Hình bình hành hay Tam giác cân — hình tự giữ nguyên tính chất song song / cân bằng nhau.",
    ],
    highlights: [
      { label: "Dựng hình 1 chạm đúng chuẩn hình học", detail: "Tam giác đều luôn giữ 3 góc 60°, hình thoi luôn giữ 4 cạnh bằng nhau dù bạn kéo đỉnh." },
      { label: "Thùng sơn Flood Fill thông minh", detail: "Tô được cả vùng giao nhau phức tạp (miền chung của 2 đường tròn, phần quạt tròn, tam giác nội tiếp)." },
      { label: "Tuỳ chỉnh màu tô & nét viền độc lập", detail: "Bấm chọn đa giác để đổi độ dày viền, chuyển nét đứt hoặc bỏ màu nền bất cứ lúc nào." },
      { label: "Không trùng lặp tên đỉnh", detail: "Hệ thống tự cấp tên đỉnh theo thứ tự A, B, C, D... tránh trùng với các hình đang có trên trang." },
    ],
    tip: "Khi minh hoạ bài toán chứng minh diện tích bằng nhau, dùng Thùng sơn tô 2 màu nhẹ (độ mờ 25–30%) cho 2 tam giác để học sinh nhìn phát ra ngay!",
  },
  {
    id: "08-plane-centers-relations",
    stepLabel: "08",
    icon: "📐",
    shortTitle: "Đường & Tâm Tam giác",
    title: "8. Đường cao, Trung tuyến, Phân giác, 4 Tâm Tam giác & Ký hiệu SGK",
    badge: "Hình động SGK",
    pdfChapterNum: 5,
    screenshotSrc: "./guide-shots/08-plane-centers-relations.webp",
    videoSrc: "./demos/01-plane-geometry.mp4",
    tutorialBoardId: "tut_02_plane_2d",
    summary:
      "Bộ công cụ Hình học động 1 chạm cho tam giác: dựng Đường cao (Alt+1), Trung tuyến (Alt+2), Phân giác (Alt+3), Trọng tâm G (Alt+G), Trực tâm H (Alt+H), Đường tròn Ngoại tiếp O (Alt+O) & Nội tiếp I (Alt+I), tự gắn ký hiệu SGK.",
    callouts: [
      { num: 1, label: "Menu Hình phẳng ▾ → Tam giác & Tâm của Tam giác", desc: "Chứa đủ 3 đường đặc biệt và 4 tâm/đường tròn kinh điển của tam giác." },
      { num: 2, label: "Công tắc ☑ Tự vẽ ký hiệu SGK", desc: "Ngay dưới menu Hình phẳng: bật để tự thêm ô vuông góc, gạch bằng nhau, cung bằng nhau chuẩn SGK." },
      { num: 3, label: "Hình Tam giác Động đang kéo thử", desc: "Kéo thử đỉnh A chạy vòng quanh: mọi đường cao, trực tâm H và đường tròn ngoại tiếp O tự co giãn theo tức thì." },
    ],
    pcSteps: [
      "Cách nhanh 1 chạm: bấm chọn sẵn hình Tam giác → nhấn Alt+1 (Đường cao), Alt+2 (Trung tuyến), Alt+3 (Phân giác), Alt+G (Trọng tâm), Alt+H (Trực tâm), Alt+O (Ngoại tiếp) hoặc Alt+I (Nội tiếp).",
      "Cách chọn đỉnh: kích hoạt công cụ trong menu Hình phẳng ▾ rồi bấm lần lượt 1 đỉnh + cạnh đối diện (hoặc 3 đỉnh của tam giác).",
      "Nếu muốn hình vẽ trơn không hiện ký hiệu ô vuông/vạch bằng nhau, bỏ chọn ô '☑ Tự vẽ ký hiệu' ở cuối menu Hình phẳng.",
    ],
    tabletSteps: [
      "Chạm vào tam giác rồi mở Hình phẳng ▾ → chạm thẳng vào '◯ Đường tròn ngoại tiếp' để dựng ngay đường tròn đi qua 3 đỉnh.",
      "Dùng ngón tay hoặc đầu bút kéo từ từ một đỉnh để minh hoạ trực quan cho học sinh quỹ tích trực tâm H hoặc khi tam giác tù thì trực tâm H nằm ngoài tam giác.",
    ],
    highlights: [
      { label: "Dựng tức thì trên tam giác đang chọn", detail: "Không cần chọn lại từng đỉnh nhiều lần nếu đã bấm chọn sẵn tam giác." },
      { label: "Kéo động giữ nguyên chân đường cao", detail: "Chân đường cao H luôn chạy đúng trên đường thẳng chứa cạnh đối diện kể cả khi góc tù." },
      { label: "Phân biệt rõ Trọng tâm G & Trực tâm H", detail: "Tự động đặt tên điểm tâm G, H, O, I chuẩn ký hiệu chương trình Toán Việt Nam." },
      { label: "Tích hợp công tắc ký hiệu SGK", detail: "Bật là có sẵn ô vuông 90° và vạch chia trung điểm ngay lập tức." },
    ],
    tip: "Dựng đồng thời Trọng tâm G, Trực tâm H và Tâm ngoại tiếp O trên cùng 1 tam giác rồi nối lại bằng Đường thẳng để chứng minh trực quan Đường thẳng Euler cho học sinh giỏi!",
  },
  {
    id: "09-plane-constructions",
    stepLabel: "09",
    icon: "✕",
    shortTitle: "Quan hệ & Phép dựng 2D",
    title: "9. Quan hệ Điểm – Đường – Đường tròn: Giao điểm, Tiếp tuyến, Đối xứng & Góc",
    badge: "Hình phẳng nâng cao",
    pdfChapterNum: 5,
    screenshotSrc: "./guide-shots/09-plane-constructions.webp",
    tutorialBoardId: "tut_02_plane_2d",
    summary:
      "Đầy đủ các phép dựng hình phẳng nâng cao phục vụ ôn thi vào 10 & THPT: Điểm trượt trên cạnh/cung, Trung điểm, Trung trực, Đường kính, Vuông góc, Song song, Giao điểm (kể cả với đường tròn), Đối xứng, Dựng góc theo số đo & Tiếp tuyến.",
    callouts: [
      { num: 1, label: "Nhóm Điểm · Đường thẳng & Đường tròn", desc: "Bao gồm 10 công cụ quan hệ chính xác ở nửa dưới menu Hình phẳng ▾." },
      { num: 2, label: "Ô nhập Góc theo số đo (°)", desc: "Khi dùng công cụ '∠ Góc theo số đo', nhập trực tiếp giá trị như 30°, 45°, 60°, 120° để dựng tia chính xác." },
      { num: 3, label: "Tiếp tuyến & Giao điểm với Đường tròn", desc: "Tự tìm cả 2 tiếp điểm khi điểm nằm ngoài đường tròn và tự tìm giao điểm chính xác giữa đường thẳng và đường tròn." },
    ],
    pcSteps: [
      "Vuông góc (Alt+V) / Song song (Alt+S): bấm chọn đường thẳng/đoạn thẳng gốc, sau đó bấm điểm nằm ngoài (hoặc trên) đường đó.",
      "Trung điểm (Alt+M) / Trung trực (Alt+T) / Đường kính: bấm trực tiếp vào 1 đoạn thẳng (hoặc chọn 2 đầu mút); với Đường kính bấm tâm O rồi bấm 1 điểm trên đường tròn.",
      "Giao điểm (Alt+X): bấm lần lượt 2 đường (2 đoạn thẳng, 2 đường tròn hoặc đường thẳng + đường tròn) để sinh điểm giao cắt chuẩn xác.",
      "Tiếp tuyến: chọn công cụ Tiếp tuyến → bấm chọn 1 điểm (nằm trên hoặc ngoài đường tròn) → bấm vào đường tròn.",
    ],
    tabletSteps: [
      "Khi muốn lấy điểm M di chuyển tự do trên cung tròn hoặc cạnh BC: chọn '• Điểm trên đường / đường tròn' rồi chạm vào cạnh/cung đó.",
      "Với công cụ '⇋ Điểm đối xứng': chạm điểm gốc trước, rồi chạm điểm tâm đối xứng (hoặc trục đối xứng).",
    ],
    highlights: [
      { label: "Điểm trượt bị ràng buộc chặt", detail: "Điểm tạo bằng 'Điểm trên đường / đường tròn' luôn bám trên đường/cung đó khi bạn kéo thử." },
      { label: "Tự sinh cả 2 tiếp tuyến từ điểm ngoài", detail: "Chấm 1 điểm ngoài (O) và chạm đường tròn → PhysBoard vẽ đủ 2 tiếp tuyến PA, PB chuẩn xác." },
      { label: "Giao điểm đường thẳng – đường tròn", detail: "Hỗ trợ bắt đủ giao điểm khi bài toán có cát tuyến hoặc đường kính cắt dây cung." },
      { label: "Dựng góc tuỳ ý bằng bàn phím", detail: "Hộp thoại nhỏ bật lên ngay tại chỗ cho phép nhập bất kỳ góc độ nào." },
    ],
    tip: "Luôn dùng '✕ Giao điểm (Alt+X)' thay vì chấm tay ước lượng ở chỗ 2 đường cắt nhau — như vậy khi bạn kéo đỉnh tam giác, điểm giao nhau cũng trượt đúng theo giao điểm thật.",
  },
  {
    id: "10-space-solids-orbit",
    stepLabel: "10",
    icon: "🧊",
    shortTitle: "Khối 3D & Xoay OrbitBar",
    title: "10. Hình Không gian 3D: Kho khối Đa diện, Tròn xoay & Thanh Xoay OrbitBar",
    badge: "Không gian 3D",
    pdfChapterNum: 6,
    screenshotSrc: "./guide-shots/10-space-solids-orbit.webp",
    videoSrc: "./demos/02-space-geometry-3d.mp4",
    tutorialBoardId: "tut_03_space_3d",
    summary:
      "Chèn tức thì đủ loại khối Đa diện (Hộp, Lập phương, Lăng trụ, Chóp, Chóp cụt đều, Mặt phẳng P) và khối Tròn xoay (Trụ, Nón, Cầu) kèm thanh Xoay hình 3D tự động đổi nét đứt / nét liền theo góc nhìn.",
    callouts: [
      { num: 1, label: "Menu Không gian ▾ — Kho Đa diện & Tròn xoay", desc: "Chạm chọn Hộp, Lập phương, Lăng trụ (3/5/6 giác), Chóp (3/4/5/6 giác), Chóp cụt, Trụ, Nón, Cầu." },
      { num: 2, label: "Khối 3D Tự ẩn nét khuất thời gian thực", desc: "Các cạnh bị mặt trước che khuất tự động chuyển thành nét đứt đúng chuẩn SGK." },
      { num: 3, label: "Thanh Xoay hình 3D (OrbitBar)", desc: "Kéo xoay 360°, trượt chính xác góc Ngang/Nghiêng, bật ▶ Tự xoay 3D hoặc bấm ↺ Góc ban đầu." },
    ],
    pcSteps: [
      "Mở menu Không gian ▾ → chọn loại khối muốn vẽ (ví dụ Chóp tứ giác S.ABCD) → bấm lên vị trí trên bảng để đặt khối.",
      "Thanh 'Xoay hình 3D' (OrbitBar) tự động mở ở cạnh phải: kéo chuột trực tiếp trên vùng Xoay 3D, trượt 2 thanh Ngang/Nghiêng hoặc bấm '▶ Tự xoay 3D'.",
      "Kéo các đỉnh đáy hoặc đỉnh chóp trên bảng để điều chỉnh kích thước, chiều cao, độ nghiêng của khối 3D.",
    ],
    tabletSteps: [
      "Chạm chọn khối 3D rồi kéo ngón tay/bút ngay trên khung tròn ở OrbitBar bên phải để xoay mọi góc quan sát.",
      "Trên màn hình dọc, OrbitBar tự thu gọn vừa vặn để không che phần hình chóp ở giữa bảng.",
    ],
    highlights: [
      { label: "Đủ 14+ mẫu khối chuẩn THPT", detail: "Từ Tứ diện S.ABC, Chóp đều S.ABCD, Lăng trụ đứng, Chóp cụt đều đến Hình nón, Hình trụ, Mặt cầu." },
      { label: "Thuật toán ẩn nét khuất tự động", detail: "Xoay sang trái, sang phải hay nhìn từ trên xuống thì nét đứt/nét liền luôn đúng quy tắc hình học không gian." },
      { label: "Kho khối Tròn xoay sắc nét", detail: "Hình trụ, Hình nón và Hình cầu hiển thị elip đáy/xích đạo mượt mà với nửa cung sau nét đứt." },
      { label: "Chèn Mặt phẳng (P) riêng biệt", detail: "Cho phép đặt nhanh hình bình hành biểu diễn mặt phẳng (P) khi giảng bài quan hệ song song/vuông góc." },
    ],
    tip: "Nếu góc nhìn mặc định làm 2 cạnh bị trùng khít lên nhau, kéo nhẹ thanh Ngang trên OrbitBar lệch khoảng 10°–15° là hình chóp sẽ thoáng rõ ngay!",
  },
  {
    id: "11-space-face-edge-unfold",
    stepLabel: "11",
    icon: "◫",
    shortTitle: "Chọn Mặt/Cạnh & Trải phẳng",
    title: "11. Chọn trực tiếp từng Mặt & Cạnh 3D, Tách mặt ra hình thật 2D & Trải phẳng Net",
    badge: "Không gian 3D",
    pdfChapterNum: 6,
    screenshotSrc: "./guide-shots/11-space-face-edge-unfold.webp",
    tutorialBoardId: "tut_03_space_3d",
    summary:
      "Bấm thẳng vào 1 mặt bên hoặc 1 cạnh bất kỳ của khối 3D để thao tác chuyên sâu: Tách riêng mặt đó ra hình phẳng 2D đúng kích thước và góc thật, Tô màu mặt, Hiện độ dài cạnh, Lấy trung điểm cạnh hoặc Trải phẳng toàn bộ khối thành bản Net 2D.",
    callouts: [
      { num: 1, label: "Vùng Mặt / Cạnh được chọn sáng trên khối 3D", desc: "Chạm vào bên trong mặt bên (vd: Mặt SAB) hoặc chạm trực tiếp lên một cạnh để làm nổi bật." },
      { num: 2, label: "Thanh thao tác Mặt 3D (Tách hình thật / Tô mặt)", desc: "Các nút trên SelectionBar: ◫ Tách ra hình thật, 🪣 Tô mặt, ▱ Mở rộng thành mặt phẳng, 🎯 Lấy tâm mặt." },
      { num: 3, label: "Hình phẳng 2D thật & Bản Trải phẳng (Unfold Net 2D)", desc: "Mặt được tách giữ đúng góc vuông/cân thật, hoặc trải toàn bộ khối ra 2D để dạy diện tích xung quanh." },
    ],
    pcSteps: [
      "Chọn Mặt: dùng con trỏ Chọn (V) bấm trực tiếp vào phần ruột của 1 mặt (ví dụ mặt bên SAB của hình chóp). Bấm '◫ Tách ra hình thật' để đưa tam giác SAB đúng góc thật ra bên cạnh.",
      "Chọn Cạnh: bấm vào 1 cạnh bất kỳ của khối 3D rồi bấm '📏 Độ dài' để hiện số đo, '• Trung điểm' để gắn chặt trung điểm vào cạnh (tự xoay theo khối), hoặc '• Điểm trên cạnh'.",
      "Trải phẳng toàn bộ khối: chọn khối 3D (hoặc dùng Không gian ▾ → ◫ Trải phẳng đa diện Net 2D) và bấm vào khối để xem khai triển tất cả các mặt.",
    ],
    tabletSteps: [
      "Chạm 1 chạm vào mặt tam giác bên của hình chóp → dùng thanh nút lớn phía dưới chạm 'Tô mặt' để phân biệt mặt bên với mặt đáy.",
      "Nếu lỡ chọn 1 mặt mà muốn chọn cả khối để di chuyển/xoay, chạm nút 'Chọn cả khối' ngay trên thanh chọn phía dưới.",
    ],
    highlights: [
      { label: "Tách mặt ra hình thật 2D cực lợi hại", detail: "Học sinh không bị đánh lừa bởi góc nghiêng phối cảnh 3D khi tính đường cao hay góc trong mặt bên." },
      { label: "Trung điểm gắn chặt trên cạnh 3D", detail: "Khi xoay khối bằng OrbitBar, trung điểm và điểm trên cạnh 3D xoay đồng bộ chuẩn toạ độ." },
      { label: "Trải phẳng đa diện (Unfold Net 2D)", detail: "Minh hoạ trực quan diện tích xung quanh, diện tích toàn phần và bài toán đường đi ngắn nhất trên mặt khối." },
      { label: "Mở rộng thành mặt phẳng", detail: "Biến 1 mặt đáy hoặc mặt bên thành mặt phẳng vô hạn để dễ tưởng tượng giao tuyến mở rộng." },
    ],
    tip: "Khi giải bài tính diện tích xung quanh hình chóp đều hoặc đường đi con kiến trên mặt nón/hộp, hãy bấm 'Trải phẳng đa diện (Net 2D)' ngay cạnh khối gốc để học sinh hiểu bản chất trong 5 giây.",
  },
  {
    id: "12-space-sections-distances",
    stepLabel: "12",
    icon: "▱",
    shortTitle: "Thiết diện, Khoảng cách & Góc 3D",
    title: "12. Dựng Thiết diện 3D, Giao tuyến, Hình chiếu, Khoảng cách, Góc nhị diện & Mặt cầu",
    badge: "Không gian nâng cao",
    pdfChapterNum: 7,
    screenshotSrc: "./guide-shots/12-space-sections-distances.webp",
    videoSrc: "./demos/02-space-geometry-3d.mp4",
    tutorialBoardId: "tut_04_section_3d",
    summary:
      "Trọn bộ phép dựng Hình học Không gian Lớp 11–12: cắt Thiết diện qua 3 điểm, Giao tuyến 2 mặt phẳng, Giao điểm đường–mặt, Hình chiếu vuông góc, Khoảng cách điểm–mặt, Đoạn vuông góc chung 2 đường chéo nhau, Góc nhị diện, Mặt cầu ngoại tiếp & Quy tắc hình hộp.",
    callouts: [
      { num: 1, label: "Nhóm Dựng trong Không gian (Menu Không gian ▾)", desc: "Danh sách 19 phép dựng không gian 3D chuẩn sách giáo khoa THPT." },
      { num: 2, label: "Đa giác Thiết diện tô nổi bật qua 3 điểm", desc: "Chọn 3 điểm (M, N, P) trên các cạnh → tự tìm toàn bộ giao tuyến cắt các mặt còn lại thành thiết diện khép kín." },
      { num: 3, label: "Đoạn Khoảng cách / Hình chiếu H / Góc 3D", desc: "Tự động dựng chân đường vuông góc H, hiển thị đoạn vuông góc chung và giá trị góc giữa đường–mặt hoặc nhị diện." },
    ],
    pcSteps: [
      "Dựng Thiết diện: đặt trước các điểm M, N, P trên cạnh (dùng Trung điểm hoặc Điểm trên cạnh) → chọn '▱ Thiết diện' → lần lượt bấm 3 điểm M, N, P.",
      "Tìm Giao tuyến / Giao điểm đường–mặt: bấm lần lượt 3 điểm xác định mặt phẳng thứ nhất (vd S, A, C) rồi 3 điểm mặt thứ hai (vd S, B, D).",
      "Khoảng cách & Hình chiếu: chọn '⊥ Hình chiếu' hoặc '📏 Khoảng cách từ điểm đến mặt phẳng' → bấm điểm cần xét (vd đỉnh S hoặc A) rồi bấm 3 điểm xác định mặt phẳng.",
      "Mặt cầu ngoại tiếp & Quy tắc hình hộp: bấm chọn khối đa diện để dựng Mặt cầu tâm I đi qua các đỉnh; hoặc chọn '⟶ Quy tắc hình hộp' bấm A và 3 đỉnh kề B, D, A'.",
    ],
    tabletSteps: [
      "Trong mọi phép dựng 3D nhiều bước, luôn nhìn lên thanh 💡 chỉ dẫn ở trên để biết bước hiện tại cần chạm điểm nào tiếp theo.",
      "Nếu chạm nhầm đỉnh khi đang dựng giao tuyến hoặc thiết diện, chạm '✕ Hủy bước' trên thanh chỉ dẫn để làm lại.",
    ],
    highlights: [
      { label: "Thiết diện tự tính đủ cạnh cắt khuất/thấy", detail: "Tự nối khép kín các đoạn giao tuyến với từng mặt của hình chóp, lăng trụ, hình hộp." },
      { label: "Đoạn vuông góc chung 2 đường chéo nhau", detail: "Công cụ hiếm có giúp học sinh nhìn rõ đường vuông góc ngắn nhất nối hai đường chéo nhau." },
      { label: "Đo Góc 3D, Đường–Mặt & Góc Nhị diện", detail: "Phù hợp chương trình GDPT 2018 (bổ sung chuyên đề góc phẳng nhị diện Lớp 11)." },
      { label: "Quy tắc vectơ hình hộp Toán 12", detail: "Hiển thị trực quan tổng 3 vectơ xuất phát từ 1 đỉnh tạo thành vectơ đường chéo khối hộp." },
    ],
    tip: "Để dạy bài Thiết diện cực rõ, sau khi cắt xong đa giác thiết diện bằng '▱ Thiết diện', kéo nhẹ OrbitBar xoay khối 3D đi vài góc — mặt cắt thiết diện tự động xoay khớp hoàn hảo trong khối!",
  },
  {
    id: "13-oxyz-analytics",
    stepLabel: "13",
    icon: "🛰️",
    shortTitle: "Hệ trục Không gian Oxyz",
    title: "13. Hệ trục Toạ độ Không gian Oxyz (Toán 12): Điểm, Vectơ, Mặt phẳng, Đường & Mặt cầu",
    badge: "Toạ độ Oxyz",
    pdfChapterNum: 8,
    screenshotSrc: "./guide-shots/13-oxyz-analytics.webp",
    videoSrc: "./demos/03-oxyz-3d.mp4",
    tutorialBoardId: "tut_05_oxyz",
    summary:
      "Hệ trục Oxyz 3 chiều xoay tự do 360° kèm 5 công cụ toạ độ hoá đầy đủ cho Giải tích Không gian Toán 12: Điểm M(x; y; z) có đường gióng, Vectơ u⃗, Mặt phẳng Ax+By+Cz+D=0, Đường thẳng (d) và Mặt cầu (S).",
    callouts: [
      { num: 1, label: "Nút đặt Hệ trục Oxyz (Menu Không gian ▾)", desc: "Đặt nhanh hệ trục Oxyz màu sắc phân biệt 3 trục Ox, Oy, Oz tại vị trí bất kỳ trên bảng." },
      { num: 2, label: "Thanh ngữ cảnh 5 phép dựng Oxyz", desc: "Khi chọn hệ trục Oxyz, hiện ngay 5 nút: + Điểm, + Vectơ, ◩ Mặt phẳng, ⁄ Đường thẳng, ◯ Mặt cầu." },
      { num: 3, label: "Các đối tượng Oxyz xoay theo OrbitBar", desc: "Điểm kèm đường gióng hộp chữ nhật toạ độ, mặt phẳng cắt trục và mặt cầu tâm I bán kính R." },
    ],
    pcSteps: [
      "Mở Không gian ▾ → chọn '⟂ Hệ trục Oxyz' → bấm lên bảng để đặt trục.",
      "Trên thanh chọn phía dưới của hệ trục Oxyz, bấm lần lượt để nhập toạ độ: '+ Điểm M(x; y; z)', '+ Vectơ u⃗(x; y; z)', '◩ Mặt phẳng Ax+By+Cz+D=0', '⁄ Đường thẳng (d)' hoặc '◯ Mặt cầu (S)'.",
      "Dùng thanh 'Xoay hình 3D' (OrbitBar) bên phải để quay hệ trục sang góc nhìn thuận lợi nhất quan sát tương giao giữa đường thẳng, mặt phẳng và mặt cầu.",
    ],
    tabletSteps: [
      "Chạm vào gốc O hoặc mũi tên trục của hệ trục Oxyz để làm hiện thanh 5 nút chức năng phía dưới.",
      "Khi nhập phương trình mặt phẳng hoặc toạ độ điểm trên máy tính bảng, hộp thoại tự hiện gọn phía trên tránh bị bàn phím ảo che.",
    ],
    highlights: [
      { label: "Đường gióng toạ độ 3 trục rõ ràng", detail: "Điểm M(x; y; z) có sẵn các nét đứt gióng xuống mặt phẳng Oxy và từng trục Ox, Oy, Oz." },
      { label: "Nhập trực tiếp phương trình chuẩn SGK", detail: "Nhập hệ số A, B, C, D của mặt phẳng hoặc điểm đi qua + VTCP (a; b; c) của đường thẳng." },
      { label: "Minh hoạ Mặt cầu cắt Mặt phẳng", detail: "Vẽ đồng thời mặt cầu (S) và mặt phẳng (P) để học sinh thấy rõ hình tròn giao tuyến." },
      { label: "Xoay 3D không mất toạ độ gốc", detail: "Mọi điểm và vectơ Oxyz đều gắn chặt vào hệ trục, xoay mượt mà theo OrbitBar." },
    ],
    tip: "Để dạy học sinh lập phương trình hình chiếu vuông góc trên Oxyz, đặt điểm M(2; 3; 4) trước — học sinh sẽ thấy ngay toạ độ hình chiếu trên các trục từ 3 đường gióng có sẵn!",
  },
  {
    id: "14-math-editor-solver",
    stepLabel: "14",
    icon: "∑",
    shortTitle: "Công thức Toán & Giải PT",
    title: "14. Trình soạn Công thức (MathLive/KaTeX), Bàn phím ảo 6 thẻ & Giải PT / Hệ PT",
    badge: "Đại số & Công thức",
    pdfChapterNum: 9,
    screenshotSrc: "./guide-shots/14-math-editor-solver.webp",
    videoSrc: "./demos/04-math-editor-functions.mp4",
    tutorialBoardId: "tut_06_calculus_oxy",
    summary:
      "Soạn mọi công thức Toán học sắc nét bằng bàn phím ảo 6 thẻ tiếng Việt hoặc gõ LaTeX; tích hợp sẵn bộ giải Phương trình & Hệ Phương trình tự động trả về nghiệm căn thức/phân số chính xác cùng 3 nút chuyển thẳng sang Đồ thị, Bảng biến thiên và Tích phân.",
    callouts: [
      { num: 1, label: "Công cụ ∑ Công thức (F) & Văn bản (T)", desc: "Bấm bất kỳ đâu trên bảng để mở trình soạn công thức MathLive hoặc hộp văn bản ghi chú." },
      { num: 2, label: "Bàn phím Toán học ảo 6 chuyên mục", desc: "Mẫu (phân số, căn, hệ PT 2/3 ẩn, vectơ), Quan hệ (có chia hết ⋮), Logic & Tập hợp, Giải tích, Hình học, Hy Lạp." },
      { num: 3, label: "4 Nút thông minh & Kết quả Giải PT", desc: "⚡ Giải PT / Hệ PT (trả nghiệm chính xác + xấp xỉ, chèn lời giải lên bảng), 📈 Vẽ đồ thị, 📋 Lập BBT, ∫ Tô miền tích phân." },
    ],
    pcSteps: [
      "Bấm công cụ '∑ Công thức' (phím F) rồi bấm lên bảng để mở ô soạn thảo. Dùng bàn phím gõ tự nhiên (vd: '/' ra phân số, '^' ra số mũ, 'sqrt' ra căn) hoặc bấm nút trên Bàn phím ảo 6 thẻ.",
      "Khi đang có phương trình hoặc hệ phương trình trong ô, bấm '⚡ Giải PT / Hệ PT' để xem ngay các bước & nghiệm chính xác (dạng phân số/căn) rồi bấm Chèn lên bảng.",
      "Để sửa một công thức đã có trên bảng, nhấp đúp trực tiếp vào công thức đó (hoặc bấm nút ✎ Sửa trên SelectionBar).",
    ],
    tabletSteps: [
      "Chạm vị trí muốn đặt công thức → dùng ngay Bàn phím Toán học ảo 6 thẻ để chạm chèn phân số, hệ phương trình 2–3 ẩn, dấu tích phân hay chữ cái Hy Lạp (α, β, Δ, π) không cần bàn phím cứng.",
      "Bấm thẳng nút '⚡ Giải PT' bên dưới công thức vừa chọn mà không phải gõ lại.",
    ],
    highlights: [
      { label: "Đủ ký hiệu chuẩn Việt Nam", detail: "Có sẵn nút Hệ 2 ẩn, Hệ 3 ẩn, ký hiệu chia hết (⋮), không chia hết, đồng dư, cung tròn, vectơ và góc." },
      { label: "Nghiệm chính xác (Exact & Decimal)", detail: "Hiển thị cả dạng nghiệm phân số / căn thức (vd: x = (1 ± √5)/2) lẫn giá trị thập phân xấp xỉ." },
      { label: "1 chạm nối sang Đồ thị & Bảng biến thiên", detail: "Gõ xong hàm số chỉ cần bấm nút '📈 Vẽ đồ thị' hoặc '📋 Tạo bảng biến thiên' ngay bên dưới ô nhập." },
      { label: "Tách riêng Hộp Văn bản ghi chú (T)", detail: "Ngoài công thức KaTeX, dùng nút Văn bản (T) để gõ đoạn đề bài hoặc nhận xét tiếng Việt dài có xuống dòng tự nhiên." },
    ],
    tip: "Trong trình soạn công thức, gõ nhanh phím tắt '\\frac' + Space cho phân số, '\\sqrt' + Space cho căn bậc hai, hoặc bấm thẻ 'Mẫu' trên bàn phím ảo để chèn sẵn khung Hệ PT 2/3 ẩn.",
  },
  {
    id: "15-oxy-plots-conics",
    stepLabel: "15",
    icon: "📈",
    shortTitle: "Hệ trục Oxy, Đồ thị & Cônic",
    title: "15. Hệ trục Oxy, Đồ thị có Thanh trượt tham số m, BPT 2 ẩn, PT ẩn & 3 đường Cônic",
    badge: "Giải tích Oxy",
    pdfChapterNum: 10,
    screenshotSrc: "./guide-shots/15-oxy-plots-conics.webp",
    videoSrc: "./demos/04-math-editor-functions.mp4",
    tutorialBoardId: "tut_06_calculus_oxy",
    summary:
      "Hệ trục Oxy đa năng cùng toàn bộ công cụ vẽ đồ thị của THPT: Hàm số y = f(x) kèm Thanh trượt tham số động (m, a, b), Hệ Bất phương trình gạch miền nghiệm, Phương trình ẩn F(x,y)=0, Đường cong tham số, Dãy số (uₙ) và 3 đường Cônic (Elip, Parabol, Hypebol).",
    callouts: [
      { num: 1, label: "Menu Hàm số ▾ & Thanh ngữ cảnh Oxy", desc: "Chứa + Hệ trục Oxy, Cônic (Elip/Parabol/Hypebol), Vẽ đồ thị y=f(x); khi chọn trục Oxy có thêm Điểm, Vectơ, PT ẩn, BPT, Tham số, Dãy số, Đổi vạch π." },
      { num: 2, label: "Đồ thị y = f(x) & Các điểm đặc biệt", desc: "Tự động đánh dấu giao điểm trục tung, nghiệm cắt trục hoành, cực trị và tiệm cận trên đường cong." },
      { num: 3, label: "Thanh trượt Tham số động (m) & Miền nghiệm BPT", desc: "Kéo thanh trượt tham số m để thấy đồ thị chạy trực tiếp trên Oxy; hoặc gạch/tô miền nghiệm hệ bất phương trình bậc nhất hai ẩn." },
    ],
    pcSteps: [
      "Mở Hàm số ▾ → chọn '+ Hệ trục Oxy' (hoặc chọn thẳng 'ƒ Vẽ đồ thị' để tự tạo trục kèm đồ thị). Nhập hàm chứa tham số như `x^3 - 3*m*x + 2` để tự sinh Thanh trượt tham số m.",
      "Chọn trục Oxy trên bảng → dùng thanh ngữ cảnh phía dưới để: Thêm điểm (x; y), Vẽ vectơ (x; y), Bật/tắt lưới phụ, Đổi vạch chia số nguyên ↔ vạch π lượng giác.",
      "Để vẽ Miền nghiệm Bất phương trình (vd `2x + y <= 4`), Phương trình ẩn (`x^2 + y^2 = 9`), Đường cong tham số hoặc Dãy số: chọn trục Oxy rồi bấm nút tương ứng trên SelectionBar (hoặc dùng Ctrl+K).",
    ],
    tabletSteps: [
      "Chạm giữ kéo con trượt tham số m ngay trên bảng bằng ngón tay để học sinh quan sát số giao điểm với trục hoành thay đổi liên tục theo m.",
      "Khi dạy Cônic (Elip, Parabol, Hypebol) lớp 10: mở Hàm số ▾ → chạm ngay pill 'Elip / Parabol / Hypebol' rồi nhập a, b hoặc p.",
    ],
    highlights: [
      { label: "Tham số m động thời gian thực", detail: "Hỗ trợ đồng thời nhiều tham số (a, b, m...) kèm giới hạn min/max và bước nhảy tuỳ chỉnh." },
      { label: "Đổi vạch chia π 1 chạm", detail: "Chuyển trục hoành sang …, -π, -π/2, 0, π/2, π, 2π… cực chuẩn cho hàm sin, cos, tan và dao động điều hoà." },
      { label: "Hệ Bất phương trình tô/gạch miền nghiệm", detail: "Minh hoạ bài toán Quy hoạch tuyến tính Toán 10 rõ nét từng nửa mặt phẳng." },
      { label: "Ba đường Cônic chuẩn sách giáo khoa", detail: "Tự động vẽ kèm tiêu điểm F₁, F₂, đường chuẩn và hai đường tiệm cận của Hypebol." },
    ],
    tip: "Dạy bài biện luận số nghiệm phương trình f(x) = m? Vẽ đồng thời đồ thị `y = x^3 - 3x` và đồ thị thứ hai là `y = m` trên cùng hệ trục Oxy — kéo thanh trượt m là đường thẳng ngang chạy lên xuống cắt đồ thị cực dễ hiểu!",
  },
  {
    id: "16-vartable-trig-integral",
    stepLabel: "16",
    icon: "↗",
    shortTitle: "Bảng biến thiên & Lượng giác",
    title: "16. Bảng biến thiên tự động, Bảng xét dấu, Tô miền Tích phân & Đường tròn Lượng giác",
    badge: "Giải tích & Lượng giác",
    pdfChapterNum: 10,
    screenshotSrc: "./guide-shots/16-vartable-trig-integral.webp",
    tutorialBoardId: "tut_06_calculus_oxy",
    summary:
      "Tự động tính đạo hàm, lập Bảng biến thiên hoàn chỉnh từ công thức hàm số (hoặc khung Bảng trống tự điền tay), Bảng xét dấu nhị thức/tam thức, Tô miền Tích phân trên [a; b] và Đường tròn lượng giác tương tác đầy đủ sin, cos, tan, cot.",
    callouts: [
      { num: 1, label: "Nhóm Bảng & Lượng giác (Menu Hàm số ▾)", desc: "Gồm Bảng biến thiên tự động, Bảng xét dấu, Bảng biến thiên trống và Đường tròn lượng giác." },
      { num: 2, label: "Bảng biến thiên & Bảng xét dấu tự lập", desc: "Tự phân tích cực trị, tiệm cận đứng (dấu hai gạch ‖), chiều mũi tên tăng/giảm và giá trị tại biên ±∞." },
      { num: 3, label: "Tô miền Tích phân [a; b] & Đường tròn Lượng giác", desc: "Tô màu diện tích hình phẳng giới hạn bởi f(x) và Ox; Đường tròn lượng giác hiển thị các cung đặc biệt." },
    ],
    pcSteps: [
      "Mở Hàm số ▾ → chọn '↗ Bảng biến thiên' (hoặc '± Bảng xét dấu') → nhập hàm số như `(2x+1)/(x-1)` hoặc `x^3 - 3x + 2` → bấm Tạo để chèn thẳng lên bảng.",
      "Nếu muốn học sinh tự điền kết quả lên bảng: chọn '▦ Bảng biến thiên trống (tự điền)' rồi dùng Bút viết tay vào các ô.",
      "Tô miền Tích phân: chọn hàm số trong trình soạn Công thức → bấm '∫ Tô miền tích phân' (hoặc gắn từ Oxy) và nhập cận a, b.",
      "Đường tròn lượng giác: Hàm số ▾ → '◯ Đường tròn lượng giác' → bấm đặt lên bảng; nhấp vào để thay đổi góc α và các đường sin/cos/tan/cot.",
    ],
    tabletSteps: [
      "Chèn Bảng biến thiên trống khi luyện tập cho học sinh lên bảng điện tử hoặc máy tính bảng dùng S Pen tự viết dấu +/− và mũi tên biến thiên.",
      "Bấm đúp vào Bảng biến thiên tự động để sửa nhanh biểu thức hàm số mà không cần xoá tạo lại.",
    ],
    highlights: [
      { label: "Nhận diện cả Tiệm cận đứng (‖)", detail: "Với hàm phân thức (ax+b)/(cx+d), bảng biến thiên tự kẻ vạch hai gạch tại nghiệm mẫu số." },
      { label: "Tích phân hình học trực quan", detail: "Tô màu diện tích phần nằm trên và nằm dưới trục hoành rõ ràng giúp giảng ứng dụng tích phân." },
      { label: "Đường tròn lượng giác đủ 4 trục", detail: "Hiển thị đồng thời sin, cos, tan, cot và các điểm cung lượng giác đặc biệt π/6, π/4, π/3, π/2." },
      { label: "Khung bảng trống luyện tập", detail: "Rất tiện khi giáo viên muốn giảng từng bước dấu đạo hàm trước khi hiện kết quả." },
    ],
    tip: "Khi ôn thi Giải tích 12, kết hợp cùng lúc Đồ thị hàm số bên trái và Bảng biến thiên tương ứng bên phải trên cùng 1 trang bảng để học sinh đối chiếu sự tương ứng giữa đồ thị và bảng biến thiên.",
  },
  {
    id: "17-stats-bayes-sets-realworld",
    stepLabel: "17",
    icon: "📊",
    shortTitle: "Thống kê, Bayes & Thực tế",
    title: "17. Thống kê, Đếm, Cây xác suất Bayes, Venn, Trục số, Đồ thị Đỉnh–Cạnh & Vật thể Thực tế",
    badge: "GDPT 2018 & Ứng dụng",
    pdfChapterNum: 11,
    screenshotSrc: "./guide-shots/17-stats-bayes-sets-realworld.webp",
    videoSrc: "./demos/09-classroom-tools.mp4",
    tutorialBoardId: "tut_07_stats_bayes",
    summary:
      "Chuyên mục mới bám sát GDPT 2018: Biểu đồ thống kê & số đặc trưng mẫu ghép nhóm, Hoán vị–Chỉnh hợp–Tổ hợp, Cây xác suất & Công thức Bayes P(A|B), Biểu đồ Venn, Trục số tập hợp, Đồ thị đỉnh–cạnh cùng Kho 100+ Vật thể Thực tế & Trang trí đoạn đo.",
    callouts: [
      { num: 1, label: "Menu Thống kê ▾ & Thực tế ▾", desc: "Truy cập Biểu đồ, Hoán vị/Chỉnh hợp/Tổ hợp, Cây & Bayes, Venn, Trục số, Đồ thị đỉnh–cạnh và 100+ hình Thực tế." },
      { num: 2, label: "Sơ đồ cây Xác suất toàn phần & Bayes", desc: "Tự động tính P(B) và P(A|B), P(Ā|B) từ cây xác suất nhiều nhánh kèm công thức tường minh." },
      { num: 3, label: "Biểu đồ Venn, Trục số, Network & Kho Thực tế", desc: "Minh hoạ phép toán tập hợp [a; b), đồ thị Euler/Hamilton và ghép Cây, Toà nhà, Thuyền, Máy bay, Mặt đất vào bài toán thực tế." },
    ],
    pcSteps: [
      "Biểu đồ & Bayes: mở Thống kê ▾ → chọn '📊 Biểu đồ' (Cột, Đường, Quạt tròn, Histogram, Boxplot) hoặc 'P(B), P(A|B) — Bayes' → nhập số liệu và bấm Tạo.",
      "Tập hợp & Chuyên đề: chọn '◎ Biểu đồ Venn', '↔ Trục số' (gõ khoảng/đoạn như `(-∞; 3] ∩ [1; 5)`), hoặc '⬡ Đồ thị (đỉnh – cạnh)' cho chuyên đề Toán 11.",
      "Vật thể Thực tế & Trang trí đoạn: mở Thực tế ▾ → chọn nhanh Cây, Người, Toà nhà, Thuyền... (hoặc bấm '🔎 Tìm vật khác…' mở kho 100+ hình); chọn đoạn thẳng rồi gắn Trang trí kích thước, mặt đất, mặt nước hoặc nhãn chữ.",
    ],
    tabletSteps: [
      "Chạm Thực tế ▾ để chèn hình ảnh minh hoạ bài toán đo chiều cao cây/toà nhà hoặc góc nâng – góc hạ ngay bên cạnh tam giác vuông đã dựng.",
      "Dùng Trục số để học sinh thấy ngay phần giao/hợp/hiệu được tô đậm trực tiếp trên trục thực.",
    ],
    highlights: [
      { label: "Tính tự động Công thức Bayes", detail: "Giảm thời gian vẽ cây xác suất phức tạp và tránh tính nhầm khi giảng trên lớp." },
      { label: "Hỗ trợ mẫu số liệu ghép nhóm", detail: "Tính ngay số trung bình, trung vị, tứ phân vị và độ lệch chuẩn cho chương Thống kê 11–12." },
      { label: "Kho 100+ Vật thể Thực tế phân theo nhóm", detail: "Thiên nhiên, Giao thông, Kiến trúc, Đời sống, Dụng cụ... phục vụ bài toán ứng dụng liên môn." },
      { label: "Trang trí đoạn thẳng (LineDecor)", detail: "Vẽ ngay dấu mặt đất có gạch nghiêng, mặt nước gợn sóng và mũi tên ghi chú kích thước." },
    ],
    tip: "Mở sẵn Bài mẫu 7 & 8 trong thư mục Sổ tay Thực hành để xem cách ghép Cây xác suất Bayes và bài toán đo chiều cao toà nhà chuẩn đẹp!",
  },
  {
    id: "18-drawers-periodic-casio",
    stepLabel: "18",
    icon: "🧮",
    shortTitle: "Công thức 3 môn & Casio",
    title: "18. Bộ 3 Ngăn kéo Công thức (Toán · Lý · Hoá), Bảng Tuần Hoàn 118 NT & Máy tính Casio fx-580VN",
    badge: "Toán · Lý · Hoá",
    pdfChapterNum: 12,
    screenshotSrc: "./guide-shots/18-drawers-periodic-casio.webp",
    videoSrc: "./demos/05-formulas-periodic.mp4",
    tutorialBoardId: "tut_08_realworld_stem",
    summary:
      "3 Ngăn kéo tra cứu chuyên đề theo chương trình GDPT 2018 (tìm không dấu + chèn LaTeX 1 chạm), Bộ đổi đơn vị Vật lý kèm hằng số CODATA, Bảng Tuần Hoàn 118 nguyên tố tương tác và Máy tính giả lập Casio fx-580VN X màn hình HiDPI.",
    callouts: [
      { num: 1, label: "Cụm nút Toán (∑) · Vật lý (⚛) · Hoá học (🧪) · Máy tính (🧮)", desc: "Mở ngay 3 ngăn kéo trượt cạnh phải và cửa sổ máy tính khoa học nổi trên bảng." },
      { num: 2, label: "Ngăn kéo Công thức & Bảng Tuần Hoàn 118 NT", desc: "Gõ không dấu để lọc công thức Toán/Lý/Hoá; bấm vào bất kỳ nguyên tố nào xem M, OXH & '+ Chèn cấu hình e'; dùng tab Đổi đơn vị Vật lý." },
      { num: 3, label: "Máy tính giả lập Casio fx-580VN X", desc: "Kéo thả vị trí tự do, đổi kích thước vỏ máy, bấm chuột/chạm tay hoặc gõ thẳng từ bàn phím số trên laptop." },
    ],
    pcSteps: [
      "Mở một trong 3 ngăn kéo trên thanh công cụ (hoặc qua Ctrl+K): gõ từ khoá tiếng Việt không dấu (vd 'dao ham', 'luong giac', 'nhiet', 'dien hoa') và bấm '+ Chèn' để thả thẳng công thức lên bảng.",
      "Trong Ngăn kéo Hoá: chuyển sang thẻ 'Bảng Tuần Hoàn' → lọc theo nhóm hoặc tìm ký hiệu/tên (vd 'Fe', 'sat') → bấm vào ô nguyên tố xem chi tiết & chèn cấu hình electron.",
      "Trong Ngăn kéo Vật lý: mở tab 'Hằng số Vật lý' xem bảng CODATA hoặc tab 'Đổi đơn vị' để quy đổi nhanh km/h ↔ m/s, eV ↔ J...",
      "Bấm '🧮 Máy tính': kéo vỏ máy tính đến góc thuận tiện, bấm phím hoặc gõ trực tiếp bằng bàn phím cứng, sau đó chép nhanh kết quả thành khối công thức lên bảng.",
    ],
    tabletSteps: [
      "Các phím trên máy tính Casio fx-580VN X được phóng lớn sắc nét trên màn hình HiDPI để giáo viên bấm bằng ngón tay hoặc bút S Pen dễ dàng khi hướng dẫn lớp.",
      "Các ngăn kéo công thức trượt gọn ở mép phải, chạm nút ✕ hoặc chạm ra bảng để đóng lại ngay.",
    ],
    highlights: [
      { label: "Tìm kiếm tiếng Việt không dấu siêu nhanh", detail: "Gõ 'cosi', 'viet', 'tich phan', 'con lac' đều ra đúng công thức cần thiết." },
      { label: "Bộ đổi đơn vị Vật lý 2 chiều", detail: "Có nút đảo chiều quy đổi và hiển thị công thức tỷ số quy đổi cho học sinh ghi nhớ." },
      { label: "118 Nguyên tố đầy đủ đến Og (Z=118)", detail: "Hiển thị phân nhóm màu sắc Kim loại kiềm / Chuyển tiếp / Phi kim / Khí hiếm rõ ràng." },
      { label: "Casio chuẩn bố cục phím Việt Nam", detail: "Hỗ trợ SHIFT, ALPHA, SOLVE, phân số, tích phân số, đạo hàm, STO và chuyển đổi S⇔D." },
    ],
    tip: "Khi đang mở Máy tính Casio, bạn có thể bấm nút thu gọn hoặc kéo kích thước vỏ máy nhỏ lại để không che mất phần đề bài bên trái.",
  },
  {
    id: "19-phet-simulations",
    stepLabel: "19",
    icon: "⚗️",
    shortTitle: "Thí nghiệm PhET & Offline",
    title: "19. Thí nghiệm Mô phỏng PhET Online tiếng Việt & Kho File HTML Offline Toàn màn hình",
    badge: "Mô phỏng STEM",
    pdfChapterNum: 12,
    screenshotSrc: "./guide-shots/19-phet-simulations.webp",
    videoSrc: "./demos/06-phet-simulations.mp4",
    summary:
      "Chạy toàn màn hình các bài thí nghiệm tương tác PhET (tự ưu tiên tiếng Việt) hoặc kho file .html tải sẵn chạy 100% không cần Internet; tích hợp nút thu nhỏ xuống góc để viết bảng song song và lớp kính vẽ chú thích trực tiếp lên mô phỏng.",
    callouts: [
      { num: 1, label: "Nút ⚗ Thí nghiệm (PhET Online & HTML Offline)", desc: "Mở thư viện 28+ thí nghiệm chọn lọc (Toán · Lý · Hoá) hoặc thẻ 'File HTML Offline' để nạp file tải sẵn từ máy." },
      { num: 2, label: "Cửa sổ Mô phỏng Toàn màn hình (FullscreenSimOverlay)", desc: "Chạy thí nghiệm sắc nét chiếm trọn màn hình mà không phải thoát ra trình duyệt ngoài." },
      { num: 3, label: "Thanh công cụ nổi: '─ Về bảng trắng' & '✏ Vẽ chú thích'", desc: "Thu nhỏ cửa sổ thí nghiệm giữ nguyên trạng thái chạy, hoặc bật lớp kính trong suốt vẽ mũi tên lực/khoanh chú thích lên thí nghiệm." },
    ],
    pcSteps: [
      "Bấm '⚗ Thí nghiệm' ở thanh bên/thanh công cụ → chọn môn (Vật lý, Hoá học, Toán) hoặc dán đường link PhET bất kỳ ở cuối hộp thoại.",
      "Để dạy khi phòng học mất Wi-Fi: ở nhà hãy tải các file `_all.html` hoặc `_vi.html` từ trang PhET rồi vào thẻ 'File HTML Offline' bấm Nạp file — ứng dụng lưu vĩnh viễn trong bộ nhớ IndexedDB.",
      "Trong lúc thí nghiệm đang chạy: bấm '✏ Vẽ chú thích' ở góc trên để khoanh vùng/vẽ vectơ ngay trên thí nghiệm; bấm '─ Về bảng trắng' để thu nhỏ cửa sổ thí nghiệm và viết công thức giải thích bên cạnh.",
    ],
    tabletSteps: [
      "Thí nghiệm PhET HTML5 hỗ trợ cảm ứng đa điểm trực tiếp (kéo lò xo, điều chỉnh biến trở, kéo thấu kính bằng ngón tay hoặc bút Stylus).",
      "Kho File HTML Offline chạy cực nhẹ và không tốn 4G/Wi-Fi trên máy tính bảng Android khi lên lớp.",
    ],
    highlights: [
      { label: "Ưu tiên tự động giao diện Tiếng Việt", detail: "Tự động nạp thông số `?locale=vi` cho các bài PhET có hỗ trợ bản dịch tiếng Việt." },
      { label: "Thu nhỏ giữ nguyên trạng thái đang chạy", detail: "Con lắc đang dao động hay mạch điện đang sáng không bị load lại khi bạn chuyển về bảng viết." },
      { label: "Lớp kính vẽ chú thích trực tiếp", detail: "Vẽ lực trọng trường, chiều dòng điện, tia phản xạ đè lên đúng vị trí đang mô phỏng." },
      { label: "Lưu Offline lâu dài trên máy", detail: "File .html một khi đã nạp vào sẽ nằm sẵn trong danh sách để mở chỉ trong 1 giây." },
    ],
    tip: "Khi cần chạy mô phỏng không có mạng ở vùng sâu hoặc phòng chiếu trường học, nhớ chuẩn bị trước 3–5 file `.html` PhET tải từ trang chủ vào thẻ 'File HTML Offline' từ ở nhà.",
  },
  {
    id: "20-pdf-crop-classroom-settings",
    stepLabel: "20",
    icon: "✂️",
    shortTitle: "Cắt đề AI, PDF, Lớp học & Cài đặt",
    title: "20. Chèn & Cắt đề PDF AI tự động, Xuất PDF A4, Lớp học, Phím tắt Ctrl+K & Báo lỗi Zalo",
    badge: "Tiện ích & Hệ thống",
    pdfChapterNum: 13,
    screenshotSrc: "./guide-shots/20-pdf-crop-classroom-settings.webp",
    videoSrc: "./demos/08-crop-and-notes.mp4",
    tutorialBoardId: "tut_09_exam_a4",
    summary:
      "Tất cả tiện ích sư phạm hoàn chỉnh: Chèn PDF nhiều trang; Cắt câu hỏi bằng tay / Ctrl+V / AI Tự nhận diện câu hỏi trên 1 hay nhiều trang & Ghép câu vắt qua 2 trang; Xuất PDF A4; Đồng hồ & Gọi tên học sinh; Phím tắt Ctrl+K; Tự cập nhật & Báo lỗi qua Zalo 0853769246.",
    callouts: [
      { num: 1, label: "Công cụ ✂ Cắt đề & AI Tự tách câu hỏi", desc: "Mở PDF/Ảnh hoặc dán Ctrl+V → kéo khung cắt tay hoặc bấm AI Tự nhận diện câu hỏi, ghép câu vắt trang, chèn hàng loạt chỉnh khoảng cách." },
      { num: 2, label: "Xuất PDF / PNG & Công cụ Lớp học", desc: "Xuất PDF chọn trang/tất cả/dải trang trên nền trắng sạch; Đồng hồ đếm ngược có chuông & Vòng quay gọi tên không trùng." },
      { num: 3, label: "Cửa sổ Lệnh Ctrl+K & Cài đặt Ẩn/Hiện nút + Báo lỗi Zalo", desc: "Gán lại phím tắt tuỳ ý, tắt bớt công cụ không dùng, kiểm tra cập nhật và nhắn trực tiếp tác giả qua Zalo 0853769246." },
    ],
    pcSteps: [
      "Cắt đề nhanh: bấm '✂ Cắt đề' ở thanh bên trái → mở file PDF/Ảnh hoặc bấm Ctrl+V để dán ảnh vừa chụp màn hình → kéo chọn vùng câu hỏi (hoặc bấm nút ✨ AI Tự tách câu hỏi) → bấm '✂ Cắt & Ghim lên bảng'.",
      "Nếu 1 câu hỏi dài bị cắt đôi sang trang PDF sau: dùng tính năng 'Nối tiếp trang sau (Stitch)' ngay trong hộp thoại Cắt đề để ghép liền 2 nửa thành 1 ảnh câu hỏi hoàn chỉnh.",
      "Xuất PDF in ấn: mở thanh bên → Xuất PDF → chọn Trang hiện tại / Toàn bộ / Dải trang (vd 1-3, 5), bật 'Nền giấy trắng khi xuất PDF' → Tải file.",
      "Bấm Ctrl+K mở Cửa sổ lệnh nhanh và bấm vào cột Phím tắt cạnh bất kỳ lệnh nào để gán lại phím theo thói quen riêng.",
    ],
    tabletSteps: [
      "Vào Cài đặt (⚙) → thẻ 'Thanh công cụ': tắt bớt những nhóm môn học bạn không dạy để thanh công cụ trên cùng rộng thoáng hơn.",
      "Nếu gặp lỗi hay cần góp ý tính năng mới: mở Cài đặt → thẻ 'Báo lỗi' → bấm ngay nút Liên hệ Zalo (0853 769 246) hoặc Sao chép báo cáo thiết bị để gửi tin nhắn nhanh.",
    ],
    highlights: [
      { label: "AI Nhận diện câu hỏi ONNX + OCR Offline", detail: "Tự khoanh sẵn Câu 1, Câu 2, Câu 3... và căn khoảng hở vừa đủ chỗ để viết lời giải ngay dưới mỗi câu." },
      { label: "Ghép câu hỏi vắt qua 2 trang PDF", detail: "Tự động nối phần đầu ở cuối trang trước với phần cuối ở đầu trang sau thành 1 khối thống nhất." },
      { label: "Hỗ trợ PDF scan JBIG2/JPX tốc độ cao", detail: "Tích hợp sẵn nhân WASM & font offline giúp mở đề thi scan nặng 100 trang ngay cả khi không có mạng." },
      { label: "Liên hệ trực tiếp tác giả qua Zalo", detail: "Hỗ trợ nhanh cho giáo viên qua số Zalo 0853769246 ngay trong tab Báo lỗi." },
    ],
    tip: "Khi cắt đề kiểm tra 40–50 câu trắc nghiệm, hãy dùng tính năng 'Quét nhiều trang hàng loạt' + chỉnh khoảng cách 'Rộng' để tự động trải đều toàn bộ đề lên các trang A4 trong 1 lần bấm!",
  },
];

// ============================================================================
// 2. 14 Chương Sách PDF Cẩm nang Toàn tập (PhysBoard-Cam-Nang-Toan-Tap.pdf)
// ============================================================================

export const MANUAL_BOOK_CHAPTERS: PdfBookChapterMeta[] = [
  {
    num: 1,
    id: "ch-01",
    icon: "🧭",
    title: "Chương 1. Giao diện chung, Thanh công cụ cố định, Chọn & Điều hướng bảng",
    subtitle: "Làm chủ vùng làm việc bảng trắng Vector, các thao tác chọn, thu phóng, khoá khối và Toàn màn hình",
    intro:
      "PhysBoard bố trí thanh công cụ cố định sát viền trên cùng nhằm giữ không gian bảng rộng nhất có thể cho nội dung bài giảng. Mọi thao tác trên bảng đều hỗ trợ song song Chuột/Phím tắt (Windows/Web) và Cảm ứng/Bút Stylus (Android Tablet).",
    screenshots: [
      {
        file: "01-interface-navigation.webp",
        caption: "Bố cục giao diện chính: Thanh công cụ bám sát viền trên, Thanh bên Quản lý trang & Nút chức năng, HUD Zoom.",
        callouts: IN_APP_GUIDE_CHAPTERS[0].callouts,
      },
    ],
    pedagogyNote: "Khi giảng trên máy chiếu hoặc tivi lớp học, luôn bật Toàn màn hình (Alt+Enter hoặc nút ⛶) và dùng Zoom 100% / Vừa màn hình (Shift+0) để nội dung hiển thị trọn vẹn không bị cắt chữ.",
  },
  {
    num: 2,
    id: "ch-02",
    icon: "🗂️",
    title: "Chương 2. Trang chủ Sổ tay (Samsung Notes), Thư mục nhiều cấp, Trang giấy & Sao lưu",
    subtitle: "Tổ chức bài giảng theo cây thư mục nhiều cấp, đổi bìa sổ, khổ giấy A4/Vô hạn, 6 nền bảng & file sao lưu .physbackup.json",
    intro:
      "Trang chủ Sổ tay sử dụng giao diện sáng hiện đại kiểu Samsung Notes với hệ thống thư mục con lồng nhau không giới hạn, Thùng rác an toàn và bộ 9 Sổ tay Hướng dẫn Thực hành mẫu có thể khôi phục bất kỳ lúc nào.",
    screenshots: [
      {
        file: "02-home-notebooks-folders.webp",
        caption: "Trang chủ Sổ tay Sáng: Danh mục Yêu thích/Thùng rác, Cây thư mục nhiều cấp và Bộ 9 Sổ tay Thực hành mẫu.",
        callouts: IN_APP_GUIDE_CHAPTERS[1].callouts,
      },
      {
        file: "03-pages-backgrounds-lock.webp",
        caption: "Quản lý Trang, Khổ A4 Dọc/Ngang, 6 mẫu nền bảng & Danh sách Khoá/Mở khoá từng khối.",
        callouts: IN_APP_GUIDE_CHAPTERS[2].callouts,
      },
    ],
    pedagogyNote: "Nên sao lưu toàn bộ bài giảng định kỳ bằng nút Xuất Sao lưu (.physbackup.json) để giữ an toàn dữ liệu và đồng bộ dễ dàng giữa laptop ở nhà với máy tính bảng mang lên lớp.",
  },
  {
    num: 3,
    id: "ch-03",
    icon: "✒️",
    title: "Chương 3. Bộ Bút viết Vector, Tự nắn hình, Chống tì tay Stylus, Tẩy & Laser",
    subtitle: "6 đầu bút viết bảng mượt mà, nhận dạng hình phác thảo 0,34s, chế độ chỉ bút Stylus, Tẩy va chạm và Laser trình chiếu",
    intro:
      "Mỗi nét viết trên PhysBoard là dữ liệu Vector siêu nhẹ hỗ trợ lực nhấn bút cảm ứng (S Pen, Apple Pencil, bảng vẽ Wacom). Bạn có thể tuỳ biến màu, cỡ nét, kiểu nét liền/đứt, bật chống tì tay hoặc dùng Laser trình chiếu.",
    screenshots: [
      {
        file: "04-pens-inktoshape-stylus.webp",
        caption: "Bảng chọn 6 đầu bút, bảng màu Hex, Tự nắn hình (Ink-to-Shape), Tẩy và Chế độ Chỉ bút Stylus.",
        callouts: IN_APP_GUIDE_CHAPTERS[3].callouts,
      },
      {
        file: "05-laser-guidebar.webp",
        caption: "Bút chỉ Laser 2 chế độ (Chấm đỏ / Vệt sáng), Cài đặt Laser & Thanh bóng đèn chỉ dẫn từng bước.",
        callouts: IN_APP_GUIDE_CHAPTERS[4].callouts,
      },
    ],
    pedagogyNote: "Kết hợp Bút máy nét thanh đậm (phím B) để viết chữ và Bút dạ quang (phím 3) để tô nổi bật giả thiết quan trọng ngay trên đề bài PDF.",
  },
  {
    num: 4,
    id: "ch-04",
    icon: "📐",
    title: "Chương 4. Hình học Phẳng 2D Cơ bản — Điểm, Đường, Tròn, Đa giác & Đo trực tiếp",
    subtitle: "Điểm tự đặt tên A–Z, tuỳ biến nhãn cho máy chiếu (A+/A-), Đoạn/Đường/Tia/Vectơ/Đường tròn hiển thị số đo khi kéo, Tam giác & Tứ giác đặc biệt, Tô màu",
    intro:
      "Nhóm công cụ Hình phẳng Cơ bản giúp dựng mọi đối tượng nền tảng chính xác tuyệt đối nhờ cơ chế tự động bắt dính (Snap) và hiển thị tức thì độ dài đoạn thẳng (d = ...) hoặc bán kính đường tròn (R = ...) ngay trong lúc kéo vẽ.",
    screenshots: [
      {
        file: "06-plane-points-lines-circles.webp",
        caption: "Dựng Điểm, Đoạn thẳng, Đường tròn kèm số đo trực tiếp d/R khi kéo và Thanh tuỳ chỉnh nhãn Điểm.",
        callouts: IN_APP_GUIDE_CHAPTERS[5].callouts,
      },
      {
        file: "07-plane-polygons-fill.webp",
        caption: "Tam giác đặc biệt, Tứ giác đặc biệt, Đa giác tự do và Tô màu miền khép kín (Flood Fill).",
        callouts: IN_APP_GUIDE_CHAPTERS[6].callouts,
      },
    ],
    pedagogyNote: "Khi chiếu cho lớp đông học sinh, hãy chọn các điểm đỉnh rồi bấm A+ trên thanh dưới để phóng to tên điểm A, B, C giúp cuối lớp vẫn nhìn rõ.",
  },
  {
    num: 5,
    id: "ch-05",
    icon: "🎯",
    title: "Chương 5. Hình học Phẳng 2D Động — Đường & Tâm Tam giác, Quan hệ & Ký hiệu SGK",
    subtitle: "Đường cao, Trung tuyến, Phân giác, Trọng tâm G, Trực tâm H, Đường tròn Ngoại tiếp/Nội tiếp, Tiếp tuyến, Giao điểm, Đối xứng & Góc theo số đo",
    intro:
      "Bộ nhân Hình học động của PhysBoard bảo toàn mọi ràng buộc toán học: khi bạn kéo một đỉnh bất kỳ di chuyển, toàn bộ đường cao, trực tâm, tiếp tuyến và giao điểm tự động cập nhật chạy theo trong thời gian thực.",
    screenshots: [
      {
        file: "08-plane-centers-relations.webp",
        caption: "Dựng 1 chạm Đường cao, Trung tuyến, Phân giác, Trọng tâm, Trực tâm, Ngoại tiếp/Nội tiếp & Tự vẽ ký hiệu SGK.",
        callouts: IN_APP_GUIDE_CHAPTERS[7].callouts,
      },
      {
        file: "09-plane-constructions.webp",
        caption: "Các phép dựng Đường vuông góc, Song song, Trung trực, Tiếp tuyến, Giao điểm đường tròn, Đối xứng & Dựng góc.",
        callouts: IN_APP_GUIDE_CHAPTERS[8].callouts,
      },
    ],
    pedagogyNote: "Hãy thử kéo đỉnh A của một tam giác có sẵn trực tâm H: học sinh sẽ lập tức hiểu vì sao tam giác tù thì trực tâm H nằm ngoài tam giác!",
  },
  {
    num: 6,
    id: "ch-06",
    icon: "🧊",
    title: "Chương 6. Hình Không gian 3D — Đa diện, Tròn xoay, OrbitBar & Chọn Mặt/Cạnh",
    subtitle: "14+ khối Đa diện & Tròn xoay tự ẩn nét khuất, Thanh Xoay 3D OrbitBar, Chọn riêng từng Mặt (Tách hình thật 2D) và từng Cạnh 3D",
    intro:
      "Hệ thống Hình học Không gian 3D giúp loại bỏ hoàn toàn nỗi vất vả vẽ hình không gian bằng tay: nét khuất/nét liền tự cập nhật ở mọi góc xoay và cho phép bấm thẳng vào từng mặt bên hoặc từng cạnh để phân tích kích thước thật.",
    screenshots: [
      {
        file: "10-space-solids-orbit.webp",
        caption: "Menu Không gian ▾, Khối Đa diện & Tròn xoay tự ẩn nét đứt cùng Thanh điều khiển Xoay hình 3D (OrbitBar).",
        callouts: IN_APP_GUIDE_CHAPTERS[9].callouts,
      },
      {
        file: "11-space-face-edge-unfold.webp",
        caption: "Chọn trực tiếp Mặt 3D để Tách ra hình thật 2D / Tô mặt và Khai triển Trải phẳng đa diện (Unfold Net 2D).",
        callouts: IN_APP_GUIDE_CHAPTERS[10].callouts,
      },
    ],
    pedagogyNote: "Tính năng 'Tách ra hình thật' rất hiệu quả khi giảng định lý Pytago hoặc hệ thức lượng trong mặt bên hình chóp — học sinh dễ bị rối bởi góc nghiêng phối cảnh 3D.",
  },
  {
    num: 7,
    id: "ch-07",
    icon: "▱",
    title: "Chương 7. Hình Không gian 3D Nâng cao — Thiết diện, Khoảng cách, Góc & Mặt cầu",
    subtitle: "Giao tuyến, Giao điểm đường–mặt, Cắt Thiết diện qua 3 điểm, Khoảng cách điểm–mặt, Đoạn vuông góc chung 2 đường chéo nhau, Góc nhị diện & Mặt cầu ngoại tiếp",
    intro:
      "Phục vụ toàn bộ chuyên đề Quan hệ Song song, Quan hệ Vuông góc (Toán 11) và Khối đa diện (Toán 12) với đầy đủ các phép dựng không gian chuẩn xác.",
    screenshots: [
      {
        file: "12-space-sections-distances.webp",
        caption: "Thiết diện đa giác cắt qua 3 điểm, Khoảng cách điểm–mặt, Hình chiếu vuông góc & Mặt cầu ngoại tiếp.",
        callouts: IN_APP_GUIDE_CHAPTERS[11].callouts,
      },
    ],
    pedagogyNote: "Khi giảng bài Thiết diện hoặc Khoảng cách, dựng xong hình rồi kéo nhẹ thanh OrbitBar để học sinh quan sát từ nhiều phía.",
  },
  {
    num: 8,
    id: "ch-08",
    icon: "🛰️",
    title: "Chương 8. Hệ trục Toạ độ Không gian Oxyz (Toán 12)",
    subtitle: "Hệ trục Oxyz xoay 360° cùng 5 công cụ toạ độ hoá: Điểm M(x; y; z), Vectơ u⃗, Mặt phẳng (P), Đường thẳng (d) & Mặt cầu (S)",
    intro:
      "Giúp bài giảng Phương pháp toạ độ trong không gian Oxyz trở nên sống động thay vì hình vẽ phẳng khó tưởng tượng.",
    screenshots: [
      {
        file: "13-oxyz-analytics.webp",
        caption: "Hệ trục Oxyz tương tác, thanh 5 nút ngữ cảnh và minh hoạ Điểm, Vectơ, Mặt phẳng, Mặt cầu trong không gian.",
        callouts: IN_APP_GUIDE_CHAPTERS[12].callouts,
      },
    ],
    pedagogyNote: "Có thể tạo nhanh hình hộp chữ nhật/tứ diện vuông trên Oxyz bằng cách đặt lần lượt các điểm đỉnh rồi nối lại bằng Đoạn thẳng.",
  },
  {
    num: 9,
    id: "ch-09",
    icon: "∑",
    title: "Chương 9. Trình soạn Công thức Toán, Bàn phím ảo 6 thẻ, Giải PT/Hệ PT & Văn bản",
    subtitle: "Soạn thảo MathLive/KaTeX trực quan, chèn nhanh hệ PT 2/3 ẩn, ký hiệu ⋮, 4 nút xử lý thông minh và hộp Văn bản ghi chú",
    intro:
      "Cho phép giáo viên soạn thảo nhanh công thức Toán học chuẩn sách giáo khoa hoặc bấm 1 nút để giải phương trình, vẽ ngay đồ thị và lập bảng biến thiên từ công thức vừa gõ.",
    screenshots: [
      {
        file: "14-math-editor-solver.webp",
        caption: "Khung soạn Công thức MathLive, Bàn phím ảo 6 thẻ và Cửa sổ Giải phương trình / Hệ phương trình.",
        callouts: IN_APP_GUIDE_CHAPTERS[13].callouts,
      },
    ],
    pedagogyNote: "Đừng quên nút Sửa công thức (nhấp đúp lên công thức có sẵn) giúp sửa nhanh tham số đề bài ngay trên lớp mà không cần gõ lại từ đầu.",
  },
  {
    num: 10,
    id: "ch-10",
    icon: "📈",
    title: "Chương 10. Hệ trục Oxy, Đồ thị Tham số, BPT, Cônic, Bảng biến thiên & Lượng giác",
    subtitle: "Đồ thị hàm số có thanh trượt m, Hệ BPT gạch miền nghiệm, PT ẩn, Tham số, Dãy số, Cônic, Bảng biến thiên, Bảng xét dấu & Đường tròn lượng giác",
    intro:
      "Bao trọn toàn bộ kiến thức Đại số & Giải tích THPT từ Bất phương trình lớp 10, Lượng giác lớp 11 cho tới Khảo sát hàm số & Tích phân lớp 12.",
    screenshots: [
      {
        file: "15-oxy-plots-conics.webp",
        caption: "Menu Hàm số ▾, Hệ trục Oxy với đồ thị tham số m, Cônic và Miền nghiệm Bất phương trình.",
        callouts: IN_APP_GUIDE_CHAPTERS[14].callouts,
      },
      {
        file: "16-vartable-trig-integral.webp",
        caption: "Bảng biến thiên tự động, Bảng xét dấu, Tô miền Tích phân [a; b] và Đường tròn Lượng giác.",
        callouts: IN_APP_GUIDE_CHAPTERS[15].callouts,
      },
    ],
    pedagogyNote: "Đổi vạch chia sang dạng π trên thanh chọn Hệ trục Oxy khi giảng các bài đồ thị lượng giác hoặc dao động điều hoà Vật lý 11.",
  },
  {
    num: 11,
    id: "ch-11",
    icon: "📊",
    title: "Chương 11. Thống kê, Xác suất Bayes, Tập hợp, Đồ thị Đỉnh–Cạnh & Vật thể Thực tế",
    subtitle: "Biểu đồ thống kê, Đếm, Sơ đồ cây Bayes, Venn, Trục số, Đồ thị Euler/Hamilton và Kho 100+ hình minh hoạ bài toán thực tế",
    intro:
      "Bộ công cụ chuyên biệt cho các nội dung mới của chương trình GDPT 2018 cùng thư viện hơn 100 vật thể và trang trí kích thước phục vụ bài toán ứng dụng thực tế.",
    screenshots: [
      {
        file: "17-stats-bayes-sets-realworld.webp",
        caption: "Menu Thống kê ▾, Sơ đồ cây Bayes, Biểu đồ Venn, Trục số, Đồ thị Đỉnh–Cạnh và Kho Thực tế ▾.",
        callouts: IN_APP_GUIDE_CHAPTERS[16].callouts,
      },
    ],
    pedagogyNote: "Chèn Cây/Toà nhà/Thuyền từ Kho Thực tế rồi dựng Tam giác vuông đè lên cạnh bên giúp học sinh dễ hình dung đề toán ứng dụng lượng giác lớp 9–10.",
  },
  {
    num: 12,
    id: "ch-12",
    icon: "⚛️",
    title: "Chương 12. Ngăn kéo Công thức 3 môn, Bảng Tuần Hoàn 118 NT, PhET & Casio fx-580VN",
    subtitle: "Tra cứu công thức Toán · Lý · Hoá không dấu, Đổi đơn vị Vật lý, Bảng Tuần Hoàn 118 nguyên tố, PhET Online/Offline & Máy tính Casio HiDPI",
    intro:
      "Tích hợp trọn bộ tài nguyên tra cứu và thực hành liên môn Toán – Vật lý – Hoá học ngay trong một cửa sổ duy nhất, không cần mở nhiều ứng dụng phụ.",
    screenshots: [
      {
        file: "18-drawers-periodic-casio.webp",
        caption: "Ngăn kéo Công thức Toán/Lý/Hoá, Bảng Tuần Hoàn 118 NT tương tác & Máy tính Casio fx-580VN X.",
        callouts: IN_APP_GUIDE_CHAPTERS[17].callouts,
      },
      {
        file: "19-phet-simulations.webp",
        caption: "Thư viện Thí nghiệm Mô phỏng PhET Online / File .html Offline & Lớp kính vẽ chú thích toàn màn hình.",
        callouts: IN_APP_GUIDE_CHAPTERS[18].callouts,
      },
    ],
    pedagogyNote: "Nạp sẵn file `.html` PhET tải từ phet.colorado.edu vào thẻ 'File HTML Offline' để dạy trơn tru ở mọi lớp học không có Wi-Fi.",
  },
  {
    num: 13,
    id: "ch-13",
    icon: "✂️",
    title: "Chương 13. Chèn PDF, Cắt câu hỏi AI tự động, Ghép trang & Xuất PDF / PNG in ấn",
    subtitle: "Nhập PDF nhiều trang, Cắt đề bằng tay / Ctrl+V / AI tách tự động đa trang, Ghép nối câu vắt trang và Xuất PDF nền trắng sạch",
    intro:
      "Giúp giáo viên chuyển toàn bộ đề thi, sách bài tập định dạng PDF hoặc ảnh chụp sang bảng trắng giảng dạy chỉ trong vài giây.",
    screenshots: [
      {
        file: "20-pdf-crop-classroom-settings.webp",
        caption: "Công cụ Cắt đề AI tự động, Hộp thoại Xuất PDF nền trắng, Công cụ Lớp học & Cài đặt Hệ thống.",
        callouts: IN_APP_GUIDE_CHAPTERS[19].callouts,
      },
    ],
    pedagogyNote: "Khi cắt đề PDF scan cũ bị nặng hoặc mờ, công cụ tích hợp sẵn WASM JBIG2/JPX cho độ nét cực cao và hỗ trợ nút 'Cắt & Cắt tiếp câu khác'.",
  },
  {
    num: 14,
    id: "ch-14",
    icon: "⚙️",
    title: "Chương 14. Công cụ Lớp học, Phím tắt Ctrl+K, Cá nhân hoá, Tự cập nhật & Hỗ trợ Zalo",
    subtitle: "Đồng hồ đếm ngược, Gọi tên ngẫu nhiên, Gán phím tắt Ctrl+K, Ẩn/Hiện nút công cụ, Tự cập nhật Windows/Android & Báo lỗi nhanh Zalo 0853769246",
    intro:
      "Các công cụ hỗ trợ quản lý lớp học và tuỳ biến phần mềm gọn gàng theo đúng bộ môn giảng dạy của từng giáo viên.",
    screenshots: [
      {
        file: "20-pdf-crop-classroom-settings.webp",
        caption: "Cài đặt hệ thống, Ẩn/Hiện nút thanh công cụ, Cửa sổ lệnh Ctrl+K, Lớp học và Liên hệ Zalo 0853769246.",
        callouts: IN_APP_GUIDE_CHAPTERS[19].callouts,
      },
    ],
    pedagogyNote: "Nếu bạn chỉ dạy Toán hoặc chỉ dạy Vật lý/Hoá, hãy vào Cài đặt → Thanh công cụ để tắt bớt các nhóm công cụ không dùng giúp màn hình thoáng đẹp.",
  },
];

// ============================================================================
// 3. Từ điển Đầy đủ 100% Công cụ & Tính năng (COMPLETE_FEATURE_CATALOG)
// ============================================================================

export const COMPLETE_FEATURE_CATALOG: FeatureCatalogEntry[] = [
  // --- CHƯƠNG 1: Giao diện chung, Chọn & Điều hướng ---
  {
    id: "feat-select",
    toolKeys: ["tool:select", "select"],
    chapterNum: 1,
    categoryLabel: "Chọn & Điều hướng",
    icon: "↖",
    name: "Chọn, Di chuyển, Xoay & Đổi cỡ",
    whereToFind: "Thanh công cụ trên (góc trái) → nút ↖ Chọn",
    shortcut: "V",
    pcHowTo: "Bấm nút Chọn (hoặc phím V) → bấm vào hình để chọn; giữ Shift + Click để chọn thêm nhiều hình; kéo thân hình để di chuyển hoặc kéo 8 điểm neo/núm xoay.",
    tabletHowTo: "Chạm nút ↖ Chọn → chạm trực tiếp vào đối tượng để hiện khung chọn và thanh thao tác ngữ cảnh phía dưới; kéo ngón tay/bút để di chuyển hoặc đổi kích thước.",
    resultDesc: "Chọn chính xác đối tượng, mở SelectionBar chứa các công cụ chuyên biệt theo loại hình đang chọn.",
    guideChapterId: "01-interface-navigation",
  },
  {
    id: "feat-marquee",
    toolKeys: ["tool:select:marquee", "select:marquee"],
    chapterNum: 1,
    categoryLabel: "Chọn & Điều hướng",
    icon: "⬚",
    name: "Quét chọn vùng chữ nhật",
    whereToFind: "Thanh công cụ trên → mũi tên cạnh ↖ Chọn → Quét chọn",
    shortcut: "M / Shift+V",
    pcHowTo: "Kích hoạt Quét chọn (M) → nhấn giữ chuột trái kéo khung chữ nhật bao quanh nhiều hình/nét mực cần chọn cùng lúc.",
    tabletHowTo: "Chạm Quét chọn → kéo bút/ngón tay qua nhóm nét vẽ để gom tất cả thành 1 nhóm chọn.",
    resultDesc: "Chọn toàn bộ các đối tượng không bị khoá nằm trong vùng quét để kéo đi, đổi màu hoặc xoá hàng loạt.",
    guideChapterId: "01-interface-navigation",
  },
  {
    id: "feat-pan",
    toolKeys: ["tool:pan", "pan"],
    chapterNum: 1,
    categoryLabel: "Chọn & Điều hướng",
    icon: "✋",
    name: "Kéo di chuyển bảng (Hand / Pan)",
    whereToFind: "Thanh công cụ trên / HUD góc dưới phải → nút ✋ Kéo bảng",
    shortcut: "H / Giữ Space",
    pcHowTo: "Bấm H (hoặc giữ phím Space trong khi đang dùng công cụ khác) rồi kéo chuột để trượt bảng tự do; cũng có thể bấm giữ nút cuộn giữa chuột.",
    tabletHowTo: "Đặt 2 ngón tay lên bảng và kéo theo mọi hướng ngay cả khi đang cầm bút vẽ, hoặc chọn nút ✋ để kéo bằng 1 ngón.",
    resultDesc: "Di chuyển khung nhìn trên bảng vô hạn hoặc dọc theo các trang A4.",
    guideChapterId: "01-interface-navigation",
  },
  {
    id: "feat-zoom",
    toolKeys: ["action:zoomIn", "action:zoomOut", "action:zoomReset", "action:fitView"],
    chapterNum: 1,
    categoryLabel: "Chọn & Điều hướng",
    icon: "🔍",
    name: "Thu phóng (8%–600%), Đặt lại 100% & Vừa màn hình",
    whereToFind: "HUD góc dưới phải (Zoom: XX%) hoặc Cửa sổ lệnh Ctrl+K",
    shortcut: "= / - / 0 / Shift+0",
    pcHowTo: "Lăn con lăn chuột để phóng to/thu nhỏ đúng tại vị trí trỏ chuột; bấm '=' phóng to, '-' thu nhỏ, '0' về 100%, 'Shift+0' để thu gọn toàn bộ nội dung vừa màn hình.",
    tabletHowTo: "Chụm / mở 2 ngón tay trực tiếp trên màn hình để Zoom mượt, hoặc chạm vào hộp 'Zoom: ...%' ở góc dưới phải để về 100% / Vừa màn hình.",
    resultDesc: "Thu phóng bảng vẽ Vector từ 8% đến 600% mà mọi nét chữ và công thức vẫn sắc nét.",
    guideChapterId: "01-interface-navigation",
  },
  {
    id: "feat-clipboard-history",
    toolKeys: ["action:duplicate"],
    chapterNum: 1,
    categoryLabel: "Thao tác Đối tượng",
    icon: "↩️",
    name: "Hoàn tác (Undo), Làm lại (Redo), Nhân bản, Copy/Cut/Paste",
    whereToFind: "Thanh công cụ trên (↩ / ↪) & SelectionBar khi đang chọn hình",
    shortcut: "Ctrl+Z / Ctrl+Y / Ctrl+D",
    pcHowTo: "Dùng Ctrl+Z (Hoàn tác), Ctrl+Y hoặc Ctrl+Shift+Z (Làm lại), Ctrl+C / Ctrl+X / Ctrl+V (Sao chép/Cắt/Dán), Ctrl+D (Nhân bản tức thì) hoặc nút Xoá / Delete.",
    tabletHowTo: "Chạm nút Hoàn tác (↩) / Làm lại (↪) trên thanh công cụ hoặc chạm Nhân bản / Sao chép / Xoá trên thanh chọn phía dưới.",
    resultDesc: "Khôi phục lại từng bước vẽ/xoá trước đó hoặc nhân bản nhanh các hình mẫu giống nhau.",
    guideChapterId: "01-interface-navigation",
  },
  {
    id: "feat-hide-clear",
    chapterNum: 1,
    categoryLabel: "Thao tác Đối tượng",
    icon: "🙈",
    name: "Ẩn tạm đối tượng, Hiện lại & Xoá sạch trang",
    whereToFind: "SelectionBar (nút 🙈 Ẩn / Hiện X ẩn) & nút 🗑 Xoá sạch trang trên Thanh công cụ",
    shortcut: "Delete",
    pcHowTo: "Chọn khối lời giải/đáp án → bấm '🙈 Ẩn' trên SelectionBar để tạm giấu đi; bấm nút '👁 Hiện X đối tượng ẩn' để mở lại khi cần; bấm biểu tượng Thùng rác trên thanh công cụ để xoá sạch trang hiện tại.",
    tabletHowTo: "Chạm chọn khối muốn tạm giấu → chạm 'Ẩn'; chạm nút Hiện lại ở góc dưới khi muốn trình chiếu đáp án cho học sinh.",
    resultDesc: "Giúp giáo viên giấu sẵn đáp án trên bảng và cho hiện ra đúng lúc cần chữa bài.",
    guideChapterId: "01-interface-navigation",
  },
  {
    id: "feat-fullscreen",
    toolKeys: ["action:fullscreen"],
    chapterNum: 1,
    categoryLabel: "Chọn & Điều hướng",
    icon: "⛶",
    name: "Chế độ Toàn màn hình (PC & Android Tablet)",
    whereToFind: "Thanh bên Sổ tay (hoặc góc trên phải thanh công cụ) → nút ⛶ Toàn màn hình",
    shortcut: "Alt+Enter",
    pcHowTo: "Bấm Alt+Enter hoặc bấm nút ⛶ Toàn màn hình để mở rộng ứng dụng tràn toàn màn hình máy tính/máy chiếu; bấm Esc hoặc bấm lại nút để thoát.",
    tabletHowTo: "Chạm nút ⛶ Toàn màn hình (hiển thị ổn định ở cả chế độ xoay ngang và xoay dọc): tự động ẩn thanh trạng thái & thanh điều hướng hệ thống Android.",
    resultDesc: "Dành 100% diện tích màn hình cho bảng dạy học, không bị thanh taskbar che khuất.",
    guideChapterId: "01-interface-navigation",
  },
  {
    id: "feat-toolbar-ux",
    chapterNum: 1,
    categoryLabel: "Giao diện",
    icon: "🧰",
    name: "Thanh công cụ sát viền trên, Phóng cỡ nút & Thanh Thuộc tính",
    whereToFind: "Mép trên cùng màn hình & góc phải thanh công cụ (+/-)",
    shortcut: "—",
    pcHowTo: "Thanh công cụ luôn neo gọn sát viền trên (top: 0); dùng nút +/- cỡ thanh công cụ để phóng lớn nút cho màn hình độ phân giải cao.",
    tabletHowTo: "Trên máy tính bảng khi màn hình hẹp, vuốt ngang trực tiếp trên thanh công cụ để cuộn tới các nút phía sau mà không bị chồng lấn.",
    resultDesc: "Giao diện ổn định, không trôi lạc nút và chạm chính xác bằng ngón tay hoặc bút.",
    guideChapterId: "01-interface-navigation",
  },

  // --- CHƯƠNG 2: Trang chủ Sổ tay, Thư mục nhiều cấp, Trang & Sao lưu ---
  {
    id: "feat-board-manager",
    chapterNum: 2,
    categoryLabel: "Quản lý Sổ tay",
    icon: "🗂️",
    name: "Trang chủ Sổ tay (Giao diện sáng Samsung Notes)",
    whereToFind: "Thanh bên Sổ tay → nút 'Quản lý bảng / Sổ tay' ở đáy bên trái",
    shortcut: "—",
    pcHowTo: "Bấm 'Quản lý bảng' để mở Trang chủ: xem Tất cả ghi chú, Yêu thích (★), Thùng rác, tìm kiếm tên sổ tay, chuyển dạng Lưới/Danh sách, sắp xếp theo ngày/tên.",
    tabletHowTo: "Chạm nút ở góc dưới trái để mở Trang chủ Sổ tay sáng rõ ràng; chạm vào thẻ sổ tay bất kỳ để chuyển sang dạy bài đó ngay lập tức.",
    resultDesc: "Quản lý hàng chục/hàng trăm giáo án và sổ tay độc lập trên cùng một ứng dụng.",
    guideChapterId: "02-home-notebooks-folders",
  },
  {
    id: "feat-nested-folders",
    chapterNum: 2,
    categoryLabel: "Quản lý Sổ tay",
    icon: "📁",
    name: "Tạo Thư mục & Thư mục con nhiều cấp (+ / + Con)",
    whereToFind: "Trang chủ Sổ tay → Cột Thư mục bên trái (+ Thư mục / nút + Con) hoặc menu ⋮",
    shortcut: "—",
    pcHowTo: "Bấm '+ Thư mục' để tạo thư mục gốc (vd: Toán 12); rê chuột vào thư mục vừa tạo và bấm '+ Con' để tạo thư mục con bên trong; lặp lại tương tự để tạo nhiều tầng sâu hơn.",
    tabletHowTo: "Chạm vào 1 thư mục hoặc mở menu '+' bên góc cây thư mục để chọn 'Tạo thư mục con trong mục này', đổi màu thư mục để phân biệt môn học.",
    resultDesc: "Xây dựng cây thư mục phân cấp khoa học giống hệt Samsung Notes.",
    guideChapterId: "02-home-notebooks-folders",
  },
  {
    id: "feat-board-cover-multiselect",
    chapterNum: 2,
    categoryLabel: "Quản lý Sổ tay",
    icon: "🎨",
    name: "Đổi Bìa sổ tay, Ghim Yêu thích, Khoá sổ & Chọn hàng loạt",
    whereToFind: "Trang chủ Sổ tay → nút ⋮ trên thẻ sổ tay / nút ☑ Chọn ở góc trên",
    shortcut: "—",
    pcHowTo: "Bấm ⋮ trên thẻ sổ → chọn 'Đổi bìa' để chọn hoạ tiết (ô ly, chấm bi, sóng, hình học), màu sắc, bố cục dải bìa và sticker; hoặc ghim Yêu thích, Khoá, Chuyển thư mục, Xoá vào Thùng rác.",
    tabletHowTo: "Chạm nút ☑ Chọn để đánh dấu nhiều sổ tay cùng lúc rồi Di chuyển thư mục hoặc Xoá hàng loạt.",
    resultDesc: "Nhận diện ngay giáo án qua ảnh bìa trực quan và tránh xoá nhầm sổ tay quan trọng.",
    guideChapterId: "02-home-notebooks-folders",
  },
  {
    id: "feat-tutorial-notebooks",
    chapterNum: 2,
    categoryLabel: "Quản lý Sổ tay",
    icon: "📘",
    name: "Bộ 9 Sổ tay Hướng dẫn & Thực hành mẫu + Khôi phục mẫu gốc",
    whereToFind: "Trang chủ Sổ tay → Thư mục '📘 Sổ tay Hướng dẫn & Thực hành mẫu' / nút ↺ Khôi phục mẫu",
    shortcut: "—",
    pcHowTo: "Mở thư mục '📘 Sổ tay Hướng dẫn & Thực hành mẫu' chọn 1 trong 9 bài thực hành mẫu có sẵn hình động 2D/3D/đồ thị; hoặc bấm '🧪 Thực hành ngay' từ bên trong cửa sổ 🎓 Hướng dẫn. Bấm '↺ Khôi phục Sổ tay mẫu' để đặt lại bản sạch gốc.",
    tabletHowTo: "Chạm mở từng sổ tay mẫu để kéo thử đỉnh tam giác, xoay hình chóp 3D hoặc vẽ thử ngay trên bảng thực hành.",
    resultDesc: "Vừa đọc hướng dẫn vừa được chạm tay thao tác trực tiếp trên bài mẫu dựng sẵn.",
    guideChapterId: "02-home-notebooks-folders",
  },
  {
    id: "feat-backup-restore",
    chapterNum: 2,
    categoryLabel: "Quản lý Sổ tay",
    icon: "💾",
    name: "Sao lưu & Khôi phục trọn gói (.physbackup.json)",
    whereToFind: "Trang chủ Sổ tay / Cài đặt → Sao lưu & Khôi phục dữ liệu",
    shortcut: "—",
    pcHowTo: "Bấm 'Xuất file Sao lưu' để tải về 1 file `.physbackup.json` chứa toàn bộ thư mục, sổ tay và nét vẽ; dùng 'Nhập bản sao lưu' trên máy khác để đồng bộ đầy đủ.",
    tabletHowTo: "Chọn Sao lưu ra bộ nhớ máy tính bảng rồi gửi qua Zalo/Drive sang máy tính hoặc ngược lại.",
    resultDesc: "An toàn tuyệt đối trước khi cài lại máy hoặc chuyển đổi thiết bị giảng dạy.",
    guideChapterId: "02-home-notebooks-folders",
  },
  {
    id: "feat-pages-sidebar",
    toolKeys: ["action:addPage", "action:prevPage", "action:nextPage"],
    chapterNum: 2,
    categoryLabel: "Quản lý Trang",
    icon: "📑",
    name: "Thanh bên Quản lý Trang, Thêm trang, Overscroll A4 & Lưới Quản lý trang",
    whereToFind: "Thanh bên trái (PageSidebar) → '+ Thêm trang' / 'Quản lý trang'",
    shortcut: "Alt+N / PageUp / PageDown",
    pcHowTo: "Bấm '+ Thêm trang' (Alt+N) để tạo trang mới; bấm PageUp/PageDown (hoặc bấm thumbnail) để chuyển trang; bấm 'Quản lý trang' mở lưới chọn nhiều trang để nhân bản hoặc xoá bớt. Ở chế độ A4, cuộn giữ đáy trang 0,35s sẽ tự thêm trang mới.",
    tabletHowTo: "Vuốt chọn từng trang thu nhỏ ở cột bên trái; chạm nút thu gọn (◀) ở góc trên thanh bên để ẩn sidebar khi cần rộng màn hình.",
    resultDesc: "Tổ chức bài giảng dài nhiều trang mạch lạc như một quyển vở điện tử.",
    guideChapterId: "03-pages-backgrounds-lock",
  },
  {
    id: "feat-board-formats-themes",
    toolKeys: ["action:toggleGrid"],
    chapterNum: 2,
    categoryLabel: "Trang & Nền bảng",
    icon: "📋",
    name: "Khổ bảng (Vô hạn / A4 Dọc / A4 Ngang) & 6 Nền bảng",
    whereToFind: "Thanh bên trái / Cài đặt → Khổ trang & Mẫu nền",
    shortcut: "Shift+G (Bật/tắt lưới)",
    pcHowTo: "Chọn giữa Bảng vô hạn, A4 Dọc hoặc A4 Ngang và 6 kiểu nền: Giấy trắng, Ô ly vuông, Chấm bi, Kẻ ngang, Bảng đen, Bảng xanh phấn trắng. Bấm 'Áp dụng tất cả trang' nếu muốn đồng bộ cả sổ.",
    tabletHowTo: "Chuyển sang nền Bảng xanh hoặc Bảng đen giúp chữ phấn trắng/vàng nổi bật và đỡ chói mắt trên máy tính bảng.",
    resultDesc: "Phù hợp mọi môn học và nhu cầu in ấn tài liệu phát học sinh.",
    guideChapterId: "03-pages-backgrounds-lock",
  },
  {
    id: "feat-lock-unlock",
    toolKeys: ["action:unlockAll"],
    chapterNum: 2,
    categoryLabel: "Khoá đối tượng",
    icon: "🔒",
    name: "Khoá cố định vào trang & Danh sách Mở khoá độc lập từng khối",
    whereToFind: "SelectionBar → '🔒 Khóa vào trang' & Góc dưới trái → '🔒 X khối đang khóa'",
    shortcut: "—",
    pcHowTo: "Chọn ảnh đề, khung hình hoặc văn bản mẫu → bấm '🔒 Khóa vào trang'. Khi cần chỉnh sửa lại, bấm vào viên thuốc '🔒 X khối đang khóa' ở góc dưới trái để rê chuột kiểm tra và bấm 'Mở khóa' riêng đúng khối đó (hoặc 'Mở khóa tất cả').",
    tabletHowTo: "Chạm khoá đề PDF/ảnh ngay sau khi đặt vị trí xong để thoải mái viết tay đè lên mà không làm trượt ảnh.",
    resultDesc: "Bảo vệ bố cục nền đề bài và hình mẫu khỏi thao tác tẩy hoặc quét chọn nhầm.",
    guideChapterId: "03-pages-backgrounds-lock",
  },

  // --- CHƯƠNG 3: Bộ Bút viết, Tự nắn hình, Stylus, Tẩy & Laser ---
  {
    id: "feat-pen-ink",
    toolKeys: ["tool:ink", "ink"],
    chapterNum: 3,
    categoryLabel: "Bút viết Vector",
    icon: "✎",
    name: "Bút mực tự do (Standard Ink)",
    whereToFind: "Thanh công cụ trên → nút ✒ Bút",
    shortcut: "P",
    pcHowTo: "Bấm nút Bút (hoặc phím P) rồi kéo chuột viết tự do; bấm mũi tên ▾ bên cạnh để đổi màu sắc, mã màu Hex, độ dày nét (1–8) và kiểu nét liền/đứt.",
    tabletHowTo: "Viết mượt mà bằng bút Stylus hoặc ngón tay với độ trễ cực thấp và đường nét tự làm mịn.",
    resultDesc: "Tạo nét viết mượt mà sắc nét cho chữ viết và ký hiệu bảng.",
    guideChapterId: "04-pens-inktoshape-stylus",
  },
  {
    id: "feat-pen-fountain",
    toolKeys: ["tool:ink:fountain", "ink:fountain"],
    chapterNum: 3,
    categoryLabel: "Bút viết Vector",
    icon: "✒",
    name: "Bút máy thư pháp (nét thanh đậm)",
    whereToFind: "Thanh công cụ trên → mũi tên ▾ cạnh Bút → Bút máy",
    shortcut: "B / 1",
    pcHowTo: "Chọn Bút máy (B hoặc 1) để viết nét thanh đậm tự động thay đổi độ rộng theo tốc độ rê chuột.",
    tabletHowTo: "Tương thích lực nhấn S Pen / Apple Pencil giúp chữ viết tay có nét thanh lên và nét đậm xuống tự nhiên.",
    resultDesc: "Tạo bài giảng chữ đẹp chuẩn sư phạm.",
    guideChapterId: "04-pens-inktoshape-stylus",
  },
  {
    id: "feat-pen-variants",
    toolKeys: ["ink:pencil", "ink:highlighter", "ink:brush", "ink:dashed"],
    chapterNum: 3,
    categoryLabel: "Bút viết Vector",
    icon: "🖍",
    name: "Bút chì, Bút dạ quang, Bút lông & Bút nét đứt tự do",
    whereToFind: "Thanh công cụ trên → mũi tên ▾ cạnh Bút → Chọn đầu bút",
    shortcut: "2 / 3 / 4 / 5",
    pcHowTo: "Bấm phím 2 (Bút chì mảnh), 3 (Bút dạ quang bán trong suốt nằm dưới chữ), 4 (Bút lông nét dày), 5 (Bút nét đứt vẽ đường gióng tay).",
    tabletHowTo: "Dùng Bút dạ quang chạm tô đè trực tiếp lên dòng công thức hoặc đề bài cần nhấn mạnh.",
    resultDesc: "Đáp ứng đủ nhu cầu phác thảo, đánh dấu nổi bật và chú thích bài giảng.",
    guideChapterId: "04-pens-inktoshape-stylus",
  },
  {
    id: "feat-ink-to-shape",
    chapterNum: 3,
    categoryLabel: "Bút viết thông minh",
    icon: "✨",
    name: "Tự nắn hình thông minh (Ink-to-Shape — giữ 0,34s)",
    whereToFind: "Cài đặt / StylePicker → Bật công tắc Tự nắn hình",
    shortcut: "—",
    pcHowTo: "Khi đang bật Tự nắn hình, vẽ một nét đường thẳng, hình tròn, elip hoặc tam giác rồi giữ yên con trỏ chuột khoảng 0,34 giây trước khi nhả nút chuột.",
    tabletHowTo: "Vẽ phác bằng đầu bút Stylus rồi giữ yên đầu bút tại điểm cuối 0,34s cho đến khi nét tự nắn thẳng đẹp rồi mới nhấc bút.",
    resultDesc: "Tự động biến nét vẽ tay nguệch ngoạc thành đường thẳng, tròn, tam giác ngay ngắn.",
    guideChapterId: "04-pens-inktoshape-stylus",
  },
  {
    id: "feat-pen-only",
    chapterNum: 3,
    categoryLabel: "Bút cảm ứng",
    icon: "✍",
    name: "Chế độ Chỉ viết bằng bút Stylus (Pen-Only chống tì tay)",
    whereToFind: "Thanh công cụ trên → nút Chống tì tay (Chỉ bút) & Cài đặt → Bút Stylus / S-Pen",
    shortcut: "—",
    pcHowTo: "Bấm bật nút Chỉ bút Stylus trên thanh công cụ khi dùng màn hình cảm ứng Windows/bảng vẽ để chuột/bút hoạt động còn chạm tay ngẫu nhiên bị chặn; cấu hình thêm nút phụ S Pen trong Cài đặt.",
    tabletHowTo: "Bật chế độ này trước khi viết: thoải mái tì cổ tay/lòng bàn tay lên màn hình iPad/Galaxy Tab để viết bằng S Pen mà không bị lem nét.",
    resultDesc: "Loại bỏ hoàn toàn nét rác do tì tay khi viết bảng trên máy tính bảng.",
    guideChapterId: "04-pens-inktoshape-stylus",
  },
  {
    id: "feat-eraser",
    toolKeys: ["tool:erase", "erase"],
    chapterNum: 3,
    categoryLabel: "Tẩy & Sửa",
    icon: "⌫",
    name: "Cục Tẩy / Gôm va chạm chính xác",
    whereToFind: "Thanh công cụ trên → nút ⌫ Tẩy",
    shortcut: "E",
    pcHowTo: "Bấm E chọn Tẩy → giữ chuột quét qua nét viết (ngưỡng 12px) hoặc cạnh/tâm hình (ngưỡng 24px) để xoá nhanh đúng đối tượng chạm phải.",
    tabletHowTo: "Chạm Tẩy hoặc nhấn giữ nút vật lý trên thân bút S Pen rồi di đầu bút qua nét cần xoá.",
    resultDesc: "Xoá gọn từng nét mực hoặc hình khối mà không ảnh hưởng các khối đã Khoá (🔒).",
    guideChapterId: "04-pens-inktoshape-stylus",
  },
  {
    id: "feat-laser",
    toolKeys: ["ink:laser"],
    chapterNum: 3,
    categoryLabel: "Trình chiếu",
    icon: "🔴",
    name: "Bút chỉ Laser 2 chế độ (Chấm đỏ / Vệt sáng) & Cài đặt ⚙ Laser",
    whereToFind: "Thanh công cụ trên → nút 🔴 Laser & nút ⚙ cạnh bên",
    shortcut: "L",
    pcHowTo: "Bấm Laser (L) để sử dụng; bấm trực tiếp lại vào nút Laser lần nữa để đổi giữa chế độ Vệt sáng tự mờ dần (1,5s) và Chấm đỏ; bấm ⚙ đổi màu, độ lớn, thời gian mờ.",
    tabletHowTo: "Di đầu bút hoặc ngón tay để chỉ dẫn điểm trọng tâm trên máy chiếu không để lại dấu mực.",
    resultDesc: "Hỗ trợ thuyết trình bài giảng chuyên nghiệp như bút thuyết trình lớp học.",
    guideChapterId: "05-laser-guidebar",
  },
  {
    id: "feat-guide-bar",
    chapterNum: 3,
    categoryLabel: "Trợ giúp trực tiếp",
    icon: "💡",
    name: "Thanh bóng đèn Chỉ dẫn từng bước & Nút Hủy bước",
    whereToFind: "Ngay bên dưới Thanh công cụ chính (dòng 💡) / Bật-tắt trong Cài đặt",
    shortcut: "—",
    pcHowTo: "Quan sát tên công cụ, phím tắt và bước tiếp theo cần bấm; bấm ▴ để thu gọn thành viên thuốc hoặc bấm '✕ Hủy bước' khi đang dựng hình nhiều bước.",
    tabletHowTo: "Rất hữu ích cho người mới khi dùng các phép dựng 3D/2D cần chọn 2–3 điểm theo thứ tự.",
    resultDesc: "Hướng dẫn tức thì tại chỗ cho 100% công cụ đang chọn.",
    guideChapterId: "05-laser-guidebar",
  },

  // --- CHƯƠNG 4: Hình học Phẳng 2D Cơ bản ---
  {
    id: "feat-point",
    toolKeys: ["tool:point", "point", "geometry.point"],
    chapterNum: 4,
    categoryLabel: "Hình phẳng Cơ bản",
    icon: "•",
    name: "Điểm hình học tự đặt tên (A, B, C...)",
    whereToFind: "Thanh công cụ trên → nút • Điểm",
    shortcut: ". / A",
    pcHowTo: "Bấm Điểm (.) → bấm lên bảng (hoặc chạm vào cạnh/đường tròn để bắt dính) tạo điểm tự đánh nhãn tuần tự không trùng lặp.",
    tabletHowTo: "Chạm để chấm điểm; kéo trực tiếp vào điểm đã tạo để di chuyển toàn bộ hình gắn với điểm đó.",
    resultDesc: "Sinh điểm động làm điểm tựa cho mọi đoạn thẳng, đường tròn và phép dựng.",
    guideChapterId: "06-plane-points-lines-circles",
  },
  {
    id: "feat-point-customize",
    chapterNum: 4,
    categoryLabel: "Hình phẳng Cơ bản",
    icon: "🏷️",
    name: "Tuỳ chỉnh Điểm: Đổi tên, Ẩn/Hiện tên, Kiểu chấm (•/×/○) & Cỡ nhãn (A+/A-)",
    whereToFind: "Chọn 1 hoặc nhiều Điểm → Thanh SelectionBar phía dưới",
    shortcut: "Nhấp đúp vào tên điểm",
    pcHowTo: "Nhấp đúp vào chữ cái tên điểm để gõ đổi tên nhanh (vd: M, S, O'), hoặc chọn điểm rồi bấm Đổi tên / Ẩn tên / Kiểu chấm / A- / A+ trên thanh dưới.",
    tabletHowTo: "Chạm chọn điểm → chạm nút A+ nhiều lần để chữ cái tên đỉnh lớn rõ cho học sinh cuối lớp đọc từ tivi/máy chiếu.",
    resultDesc: "Tuỳ biến hiển thị tên đỉnh sắc nét đúng ký hiệu của từng bài toán.",
    guideChapterId: "06-plane-points-lines-circles",
  },
  {
    id: "feat-segment",
    toolKeys: ["tool:c:segment", "segment", "c:segment"],
    chapterNum: 4,
    categoryLabel: "Hình phẳng Cơ bản",
    icon: "―",
    name: "Đoạn thẳng & Hiển thị số đo độ dài d khi kéo",
    whereToFind: "Thanh công cụ trên → nút ╱ Đoạn thẳng",
    shortcut: "L / S",
    pcHowTo: "Kéo từ điểm đầu đến điểm cuối (hoặc bấm lần lượt 2 điểm có sẵn); giữ Shift để khoá ngang/dọc/45°. Trong lúc đang kéo sẽ hiện số đo 'd = ...' và tự biến mất khi thả chuột.",
    tabletHowTo: "Kéo đầu bút từ đỉnh thứ nhất tới đỉnh thứ hai; xem ngay số đo d hiển thị cạnh đầu bút để căn độ dài chính xác.",
    resultDesc: "Tạo đoạn thẳng động co giãn theo 2 đầu mút với số đo hiển thị trực tiếp khi vẽ.",
    guideChapterId: "06-plane-points-lines-circles",
  },
  {
    id: "feat-dashed-seg-line-ray-vec",
    toolKeys: ["c:dseg", "tool:c:line", "c:line", "tool:c:ray", "c:ray", "tool:c:vector", "c:vector"],
    chapterNum: 4,
    categoryLabel: "Hình phẳng Cơ bản",
    icon: "⟶",
    name: "Đoạn nét đứt, Đường thẳng (Shift+L), Tia (R) & Vectơ (Shift+V)",
    whereToFind: "Thanh công cụ trên → mũi tên ▾ cạnh Đoạn thẳng",
    shortcut: "Shift+L / R / Shift+V",
    pcHowTo: "Mở menu con cạnh nút Đoạn thẳng để chọn: Đoạn nét đứt (cạnh khuất), Đường thẳng vô hạn 2 phía (Shift+L), Tia xuất phát từ 1 gốc (R) hoặc Vectơ có mũi tên hướng (Shift+V).",
    tabletHowTo: "Chạm mũi tên ▾ cạnh Đoạn thẳng rồi chạm chọn loại đường mong muốn → kéo qua 2 điểm.",
    resultDesc: "Tạo đủ 4 biến thể đường thẳng và vectơ phục vụ cả hình phẳng lẫn vật lý.",
    guideChapterId: "06-plane-points-lines-circles",
  },
  {
    id: "feat-circle",
    toolKeys: ["tool:circle", "circle", "c:circle"],
    chapterNum: 4,
    categoryLabel: "Hình phẳng Cơ bản",
    icon: "◯",
    name: "Đường tròn (Tâm & Điểm) + Hiển thị bán kính R khi kéo",
    whereToFind: "Thanh công cụ trên → nút ◯ Đường tròn",
    shortcut: "C",
    pcHowTo: "Chọn Đường tròn (C) → bấm tâm và kéo ra ngoài (hoặc bấm điểm tâm rồi bấm 1 điểm trên biên); trong lúc kéo luôn hiển thị trực tiếp bán kính 'R = ...' và biến mất khi thả.",
    tabletHowTo: "Chạm giữ tại tâm O rồi kéo ra ngoài theo bán kính R hiển thị trực tiếp ngay trên màn hình.",
    resultDesc: "Tạo đường tròn động thay đổi bán kính hoặc di chuyển theo điểm tâm và điểm biên.",
    guideChapterId: "06-plane-points-lines-circles",
  },
  {
    id: "feat-polygon",
    toolKeys: ["tool:polygon", "polygon", "c:polygon"],
    chapterNum: 4,
    categoryLabel: "Hình phẳng Cơ bản",
    icon: "⬡",
    name: "Đa giác tự do nhiều cạnh",
    whereToFind: "Thanh công cụ trên → nút ⬡ Đa giác",
    shortcut: "Shift+P / G",
    pcHowTo: "Bấm lần lượt các đỉnh của đa giác, rồi bấm lại đỉnh đầu tiên để khép hình (hoặc bấm Esc để huỷ khi đang vẽ dở).",
    tabletHowTo: "Chạm từng vị trí đỉnh theo vòng khép kín rồi chạm vào đỉnh A đầu tiên để hoàn thành.",
    resultDesc: "Dựng hình tam giác, tứ giác, ngũ giác, lục giác tuỳ ý với các đỉnh tự do kéo chỉnh.",
    guideChapterId: "07-plane-polygons-fill",
  },
  {
    id: "feat-special-triangles",
    toolKeys: ["tool:c:triRight", "c:triRight", "tool:c:triRightIso", "c:triRightIso", "tool:c:triIso", "c:triIso", "tool:c:triEqui", "c:triEqui"],
    chapterNum: 4,
    categoryLabel: "Tam giác đặc biệt",
    icon: "◺",
    name: "4 Tam giác đặc biệt: Vuông, Vuông cân, Cân, Đều",
    whereToFind: "Thanh công cụ trên → Hình phẳng ▾ → VẼ TAM GIÁC",
    shortcut: "Shift+1 (Vuông) / Shift+2 (Đều)",
    pcHowTo: "Chọn loại tam giác đặc biệt → bấm chọn hoặc kéo 2 đỉnh của cạnh đáy/cạnh góc vuông; đỉnh thứ 3 tự dựng chính xác kèm ký hiệu góc vuông / cạnh bằng nhau.",
    tabletHowTo: "Mở Hình phẳng ▾ → chạm '◺ Tam giác vuông' / '△ Tam giác cân' / '▲ Tam giác đều' → kéo cạnh đáy.",
    resultDesc: "Dựng tức thì tam giác chuẩn hình học và bảo toàn tính chất khi kéo giãn.",
    guideChapterId: "07-plane-polygons-fill",
  },
  {
    id: "feat-special-quads",
    toolKeys: ["tool:c:pgram", "c:pgram", "tool:c:rhombus", "c:rhombus", "tool:c:rect", "c:rect", "tool:c:square", "c:square"],
    chapterNum: 4,
    categoryLabel: "Tứ giác đặc biệt",
    icon: "▱",
    name: "4 Tứ giác đặc biệt: Bình hành, Thoi, Chữ nhật, Hình vuông",
    whereToFind: "Thanh công cụ trên → Hình phẳng ▾ → TỨ GIÁC",
    shortcut: "—",
    pcHowTo: "Chọn loại tứ giác cần vẽ: Bình hành (bấm 3 đỉnh A, B, C), Hình thoi / Hình vuông (kéo 1 cạnh), Hình chữ nhật (kéo đường chéo 2 góc đối hoặc bấm 3 đỉnh).",
    tabletHowTo: "Mở Hình phẳng ▾ → chọn mẫu tứ giác mong muốn và kéo trên bảng.",
    resultDesc: "Đảm bảo 4 góc vuông, 4 cạnh bằng nhau hoặc các cặp cạnh đối song song chính xác.",
    guideChapterId: "07-plane-polygons-fill",
  },
  {
    id: "feat-flood-fill",
    toolKeys: ["tool:floodFill", "floodFill"],
    chapterNum: 4,
    categoryLabel: "Tô màu miền",
    icon: "🪣",
    name: "Thùng sơn Tô màu miền kín (Flood Fill)",
    whereToFind: "Thanh công cụ trên → nút 🪣 Tô màu (mũi tên ▾ đổi màu tô)",
    shortcut: "G / K",
    pcHowTo: "Bấm G (hoặc nút Thùng sơn) → bấm vào phần ruột của đa giác, đường tròn hay bất kỳ vùng kín giao cắt nào để tô màu nền bán trong suốt.",
    tabletHowTo: "Chạm nút 🪣 → chọn màu tô trên thanh phụ → chạm vào bên trong miền cần làm nổi bật.",
    resultDesc: "Tô màu hình học phẳng trực quan khi giảng diện tích hay phân biệt các miền.",
    guideChapterId: "07-plane-polygons-fill",
  },

  // --- CHƯƠNG 5: Hình học Phẳng 2D Nâng cao ---
  {
    id: "feat-tri-lines",
    toolKeys: ["tool:c:altitude", "c:altitude", "tool:c:median", "c:median", "tool:c:bisector", "c:bisector"],
    chapterNum: 5,
    categoryLabel: "Đường trong Tam giác",
    icon: "⊥",
    name: "Đường cao (Alt+1), Trung tuyến (Alt+2) & Phân giác (Alt+3)",
    whereToFind: "Hình phẳng ▾ → TAM GIÁC (hoặc chọn sẵn tam giác rồi bấm Alt+1 / 2 / 3)",
    shortcut: "Alt+1 / Alt+2 / Alt+3",
    pcHowTo: "Cách 1 chạm: chọn sẵn tam giác → nhấn Alt+1 / Alt+2 / Alt+3. Cách thủ công: chọn công cụ → bấm đỉnh rồi bấm cạnh đối diện (hoặc 3 đỉnh cho Phân giác).",
    tabletHowTo: "Chạm chọn tam giác → mở Hình phẳng ▾ → chạm Đường cao / Trung tuyến / Phân giác.",
    resultDesc: "Dựng đường đặc biệt gắn chặt với tam giác kèm ký hiệu vuông góc hoặc chia đôi.",
    guideChapterId: "08-plane-centers-relations",
  },
  {
    id: "feat-tri-centers",
    toolKeys: ["tool:c:centroid", "c:centroid", "tool:c:ortho", "c:ortho", "tool:c:circum", "c:circum", "tool:c:incircle", "c:incircle"],
    chapterNum: 5,
    categoryLabel: "Tâm Tam giác",
    icon: "◎",
    name: "Trọng tâm G, Trực tâm H, Đường tròn Ngoại tiếp O & Nội tiếp I",
    whereToFind: "Hình phẳng ▾ → TÂM CỦA TAM GIÁC",
    shortcut: "Alt+G / Alt+H / Alt+O / Alt+I",
    pcHowTo: "Chọn tam giác rồi bấm Alt+G (Trọng tâm G), Alt+H (Trực tâm H), Alt+O (Ngoại tiếp O), Alt+I (Nội tiếp I) — hoặc chọn công cụ và bấm 3 đỉnh.",
    tabletHowTo: "Chạm chọn tam giác rồi chạm thẳng phép dựng tâm/đường tròn tương ứng trong menu Hình phẳng.",
    resultDesc: "Tâm và đường tròn tự động di chuyển đúng toán học mỗi khi bạn kéo đổi hình tam giác.",
    guideChapterId: "08-plane-centers-relations",
  },
  {
    id: "feat-construct-marks",
    toolKeys: ["action:toggleConstructMarks"],
    chapterNum: 5,
    categoryLabel: "Ký hiệu SGK",
    icon: "☑",
    name: "Công tắc Tự vẽ ký hiệu SGK (Vuông góc, Bằng nhau, Cung góc)",
    whereToFind: "Cuối menu Hình phẳng ▾ → ☑ Tự vẽ ký hiệu",
    shortcut: "—",
    pcHowTo: "Bật/tắt ô kiểm 'Tự vẽ ký hiệu' ở đáy menu Hình phẳng tuỳ theo nhu cầu vẽ hình chuẩn SGK hay hình trơn.",
    tabletHowTo: "Chạm bật/tắt trực tiếp trên menu Hình phẳng.",
    resultDesc: "Tự thêm ô vuông 90°, vạch bằng nhau cho trung tuyến/cân và cung góc phân giác.",
    guideChapterId: "08-plane-centers-relations",
  },
  {
    id: "feat-plane-relations",
    toolKeys: ["c:onedge", "tool:c:midpoint", "c:midpoint", "tool:c:perpbis", "c:perpbis", "c:diameter", "tool:c:perp", "c:perp", "tool:c:parallel", "c:parallel"],
    chapterNum: 5,
    categoryLabel: "Quan hệ 2D",
    icon: "∥",
    name: "Điểm trên đường, Trung điểm, Trung trực, Đường kính, Vuông góc & Song song",
    whereToFind: "Hình phẳng ▾ → ĐIỂM · ĐƯỜNG THẲNG",
    shortcut: "Alt+M / Alt+T / Alt+V / Alt+S",
    pcHowTo: "Trung điểm (Alt+M) / Trung trực (Alt+T): bấm 1 đoạn hoặc 2 điểm. Vuông góc (Alt+V) / Song song (Alt+S): bấm đường gốc + 1 điểm. Đường kính: bấm tâm O + điểm trên đường tròn.",
    tabletHowTo: "Mở Hình phẳng ▾, chạm chọn công cụ và nhìn dòng gợi ý 💡 phía trên để biết điểm tiếp theo cần chạm.",
    resultDesc: "Xây dựng hệ thống ràng buộc điểm – đường chuẩn xác.",
    guideChapterId: "09-plane-constructions",
  },
  {
    id: "feat-plane-advanced",
    toolKeys: ["tool:c:intersect", "c:intersect", "tool:c:reflect", "c:reflect", "c:angleval", "tool:c:tangent", "c:tangent"],
    chapterNum: 5,
    categoryLabel: "Phép dựng nâng cao",
    icon: "⟋",
    name: "Giao điểm (với đường tròn), Điểm đối xứng, Góc theo số đo & Tiếp tuyến",
    whereToFind: "Hình phẳng ▾ → ĐIỂM · ĐƯỜNG THẲNG & ĐƯỜNG TRÒN",
    shortcut: "Alt+X (Giao điểm)",
    pcHowTo: "Giao điểm (Alt+X): bấm 2 đường cắt nhau. Đối xứng: bấm điểm gốc + tâm/trục đối xứng. Góc số đo: bấm đỉnh + điểm tia gốc rồi nhập độ. Tiếp tuyến: bấm điểm + đường tròn.",
    tabletHowTo: "Thực hiện từng chạm theo chỉ dẫn 💡; với Tiếp tuyến từ điểm ngoài đường tròn, hệ thống tự vẽ đủ cả 2 tiếp tuyến.",
    resultDesc: "Giải trọn vẹn các bài toán tiếp tuyến, cát tuyến và biến hình đối xứng lớp 9–11.",
    guideChapterId: "09-plane-constructions",
  },

  // --- CHƯƠNG 6: Hình Không gian 3D & Chọn Mặt/Cạnh ---
  {
    id: "feat-3d-polyhedra",
    toolKeys: ["tool:p3:box", "p3:box", "tool:p3:cube", "p3:cube", "tool:p3:prism:3", "p3:prism:3", "p3:prism:5", "p3:prism:6", "tool:p3:pyramid:3", "p3:pyramid:3", "tool:p3:pyramid:4", "p3:pyramid:4", "p3:pyramid:5", "p3:pyramid:6", "p3:frustum:3", "p3:frustum:4", "p3:frustum:6", "plane"],
    chapterNum: 6,
    categoryLabel: "Khối Đa diện 3D",
    icon: "△",
    name: "Hộp chữ nhật, Lập phương, Lăng trụ, Chóp, Chóp cụt đều & Mặt phẳng (P)",
    whereToFind: "Thanh công cụ trên → Không gian ▾ → KHỐI ĐA DIỆN",
    shortcut: "—",
    pcHowTo: "Chọn khối đa diện muốn vẽ (ví dụ Chóp tam giác S.ABC, Chóp tứ giác S.ABCD, Lăng trụ tam/ngũ/lục giác, Chóp cụt, Hộp, Lập phương, Mặt phẳng P) → bấm đặt lên bảng.",
    tabletHowTo: "Mở Không gian ▾ → chạm biến thể đáy tương ứng → chạm vị trí trống trên bảng.",
    resultDesc: "Đặt nhanh khối 3D tự động đổi nét đứt / nét liền khi xoay góc nhìn.",
    guideChapterId: "10-space-solids-orbit",
  },
  {
    id: "feat-3d-round",
    toolKeys: ["tool:p3:cylinder", "p3:cylinder", "tool:p3:cone", "p3:cone", "tool:p3:sphere", "p3:sphere"],
    chapterNum: 6,
    categoryLabel: "Khối Tròn xoay 3D",
    icon: "◭",
    name: "Hình trụ, Hình nón & Hình cầu / Mặt cầu 3D",
    whereToFind: "Thanh công cụ trên → Không gian ▾ → KHỐI TRÒN XOAY",
    shortcut: "—",
    pcHowTo: "Chọn Hình trụ, Hình nón hoặc Hình cầu → bấm lên bảng để chèn khối; kéo các điểm neo để đổi bán kính R và chiều cao h.",
    tabletHowTo: "Chạm chọn Hình trụ/Nón/Cầu → xoay bằng OrbitBar để minh hoạ thiết diện qua trục hoặc xích đạo.",
    resultDesc: "Vẽ khối tròn xoay chuẩn phối cảnh kèm đường sinh, trục và elip đáy nét đứt.",
    guideChapterId: "10-space-solids-orbit",
  },
  {
    id: "feat-orbitbar",
    chapterNum: 6,
    categoryLabel: "Điều khiển 3D",
    icon: "🔄",
    name: "Thanh Xoay hình 3D (OrbitBar) & Tự động ẩn nét khuất",
    whereToFind: "Tự động xuất hiện bên phải màn hình khi chọn khối 3D / hệ trục Oxyz",
    shortcut: "—",
    pcHowTo: "Kéo chuột trên khung Kéo xoay 3D, kéo 2 thanh trượt góc Ngang (Azimuth) và góc Nghiêng (Elevation), bấm ▶ Tự xoay 3D hoặc ↺ Góc ban đầu.",
    tabletHowTo: "Vuốt ngón tay trực tiếp trên khung xoay 3D của OrbitBar bên phải để quay mượt mà mọi góc.",
    resultDesc: "Cập nhật góc nhìn 3D thời gian thực và tự chuyển nét khuất thành nét đứt.",
    guideChapterId: "10-space-solids-orbit",
  },
  {
    id: "feat-3d-face-edge",
    chapterNum: 6,
    categoryLabel: "Mặt & Cạnh 3D",
    icon: "⧉",
    name: "Chọn trực tiếp Mặt & Cạnh 3D (Tách mặt thật 2D, Tô mặt, Đo cạnh, Trung điểm)",
    whereToFind: "Bấm thẳng vào 1 Mặt bên/đáy hoặc 1 Cạnh của khối 3D → SelectionBar",
    shortcut: "—",
    pcHowTo: "Bấm vào bên trong mặt khối 3D → dùng SelectionBar bấm '◫ Tách ra hình thật 2D', '🪣 Tô mặt', '▱ Mở rộng mặt phẳng' hoặc '🎯 Lấy tâm mặt'. Bấm vào 1 cạnh → chọn '📏 Độ dài', '• Trung điểm', '• Điểm trên cạnh' hoặc '⊥ Trung trực'.",
    tabletHowTo: "Chạm thẳng vào mặt tam giác bên của hình chóp hoặc chạm cạnh bên rồi chọn thao tác trên thanh dưới.",
    resultDesc: "Phân tích tách bạch từng mặt phẳng thật mà không bị biến dạng do góc phối cảnh.",
    guideChapterId: "11-space-face-edge-unfold",
  },
  {
    id: "feat-3d-unfold",
    toolKeys: ["c:flatten", "c:unfold"],
    chapterNum: 6,
    categoryLabel: "Khai triển 3D → 2D",
    icon: "◫",
    name: "Trải phẳng đa diện (Unfold Net 2D) & Tách mặt theo 3 đỉnh",
    whereToFind: "Không gian ▾ → ◫ Trải phẳng đa diện / ⧉ Tách mặt phẳng (hoặc nút trên SelectionBar)",
    shortcut: "—",
    pcHowTo: "Chọn khối 3D rồi bấm 'Trải phẳng đa diện (Net 2D)' (hoặc chọn công cụ trong Không gian ▾ rồi bấm vào khối); với Tách mặt 3 đỉnh, bấm lần lượt 3 đỉnh S, A, B.",
    tabletHowTo: "Chạm 1 chạm để trải toàn bộ các mặt chóp/lăng trụ/hộp thành hình khai triển 2D ngay bên cạnh.",
    resultDesc: "Giúp học sinh hiểu trực quan diện tích xung quanh và bài toán đường đi ngắn nhất trên bề mặt.",
    guideChapterId: "11-space-face-edge-unfold",
  },

  // --- CHƯƠNG 7: Hình Không gian 3D Nâng cao ---
  {
    id: "feat-3d-section",
    toolKeys: ["tool:c:section", "c:section", "c:lineplane", "c:giaotuyen"],
    chapterNum: 7,
    categoryLabel: "Không gian Nâng cao",
    icon: "▱",
    name: "Thiết diện (Mặt cắt 3D), Giao tuyến 2 mặt phẳng & Giao điểm đường–mặt",
    whereToFind: "Thanh công cụ trên → Không gian ▾ → DỰNG TRONG KHÔNG GIAN",
    shortcut: "—",
    pcHowTo: "Với Thiết diện: bấm lần lượt 3 điểm nằm trên cạnh/mặt của khối 3D. Với Giao tuyến / Giao đường–mặt: bấm đủ 3 điểm mỗi mặt phẳng và 2 đầu đường thẳng theo thanh chỉ dẫn 💡.",
    tabletHowTo: "Chấm sẵn các điểm trên cạnh trước (dùng Trung điểm hoặc Điểm trên cạnh) rồi chạm chọn phép dựng Thiết diện.",
    resultDesc: "Tự động tính chính xác đa giác thiết diện và tô nổi bật trong lòng khối 3D.",
    guideChapterId: "12-space-sections-distances",
  },
  {
    id: "feat-3d-perp-dist-angle",
    toolKeys: ["c:perp3d", "c:footplane", "c:distplane", "c:commonperp", "c:measure", "c:anglelp", "c:angleplanes"],
    chapterNum: 7,
    categoryLabel: "Khoảng cách & Góc 3D",
    icon: "📏",
    name: "Vuông góc 3D, Hình chiếu, Khoảng cách điểm–mặt, Vuông góc chung, Góc & Nhị diện",
    whereToFind: "Thanh công cụ trên → Không gian ▾ → DỰNG TRONG KHÔNG GIAN",
    shortcut: "—",
    pcHowTo: "Chọn phép dựng cần dùng (Hình chiếu H, Khoảng cách điểm–mặt, Đoạn vuông góc chung 2 đường chéo nhau, Góc đường–mặt, Góc nhị diện) rồi bấm chọn điểm/đường/mặt theo hướng dẫn 💡.",
    tabletHowTo: "Thực hiện chạm từng điểm theo gợi ý phía trên thanh công cụ; xoay nhẹ OrbitBar để quan sát góc nhị diện rõ hơn.",
    resultDesc: "Hiển thị trực quan chân đường cao H, đoạn vuông góc và giá trị khoảng cách/góc.",
    guideChapterId: "12-space-sections-distances",
  },
  {
    id: "feat-3d-circumsphere-boxrule",
    toolKeys: ["tool:c:circumsphere", "c:circumsphere", "c:boxrule"],
    chapterNum: 7,
    categoryLabel: "Mặt cầu & Vectơ 3D",
    icon: "◯",
    name: "Mặt cầu ngoại tiếp đa diện & Quy tắc vectơ hình hộp",
    whereToFind: "Không gian ▾ → DỰNG TRONG KHÔNG GIAN",
    shortcut: "—",
    pcHowTo: "Mặt cầu ngoại tiếp: chọn công cụ rồi bấm vào khối đa diện (tự dựng tâm I và mặt cầu qua các đỉnh). Quy tắc hình hộp: bấm đỉnh A rồi 3 đỉnh kề B, D, A'.",
    tabletHowTo: "Chạm trực tiếp vào đỉnh hoặc khối đa diện để dựng nhanh mặt cầu ngoại tiếp hoặc minh hoạ cộng vectơ hình hộp.",
    resultDesc: "Xác định nhanh tâm, bán kính mặt cầu ngoại tiếp và phép cộng vectơ Toán 12.",
    guideChapterId: "12-space-sections-distances",
  },

  // --- CHƯƠNG 8: Hệ trục Không gian Oxyz ---
  {
    id: "feat-oxyz",
    toolKeys: ["tool:p3:axes", "p3:axes"],
    chapterNum: 8,
    categoryLabel: "Hệ trục Oxyz",
    icon: "⟂",
    name: "Hệ trục Toạ độ Không gian Oxyz & 5 công cụ toạ độ hoá (Điểm, Vectơ, Mặt phẳng, Đường thẳng, Mặt cầu)",
    whereToFind: "Không gian ▾ → TOẠ ĐỘ → Hệ trục Oxyz (chọn trục để mở 5 nút trên SelectionBar)",
    shortcut: "—",
    pcHowTo: "Đặt hệ trục Oxyz lên bảng → chọn trục để hiện 5 nút trên SelectionBar: + Điểm M(x;y;z), + Vectơ u⃗(x;y;z), ◩ Mặt phẳng Ax+By+Cz+D=0, ⁄ Đường thẳng (d), ◯ Mặt cầu (S).",
    tabletHowTo: "Chạm đặt Oxyz, dùng bảng nhập số liệu gọn nhẹ và xoay tự do bằng OrbitBar bên phải.",
    resultDesc: "Minh hoạ trọn vẹn hình học giải tích không gian Oxyz Toán 12 với đường gióng trục rõ ràng.",
    guideChapterId: "13-oxyz-analytics",
  },

  // --- CHƯƠNG 9: Trình soạn Công thức Toán, Giải PT & Văn bản ---
  {
    id: "feat-formula-editor",
    toolKeys: ["tool:formula", "formula"],
    chapterNum: 9,
    categoryLabel: "Công thức Toán",
    icon: "∑",
    name: "Trình soạn Công thức Toán (MathLive/KaTeX) & Bàn phím ảo 6 chuyên mục",
    whereToFind: "Thanh công cụ trên → nút ∑ Công thức",
    shortcut: "F / T",
    pcHowTo: "Bấm vị trí đặt công thức → gõ tự nhiên hoặc bấm phím trên 6 thẻ Bàn phím ảo (Mẫu có Hệ PT 2/3 ẩn, Quan hệ có chia hết ⋮, Logic & Tập hợp, Giải tích, Hình học, Hy Lạp); nhấp đúp lên công thức cũ để sửa.",
    tabletHowTo: "Chạm Bàn phím Toán học ảo tích hợp ngay dưới khung nhập để chèn phân số, tích phân, căn, vectơ không cần bàn phím cứng.",
    resultDesc: "Hiển thị công thức LaTeX sắc nét chuẩn in sách giáo khoa.",
    guideChapterId: "14-math-editor-solver",
  },
  {
    id: "feat-math-smart-actions",
    chapterNum: 9,
    categoryLabel: "Tính toán thông minh",
    icon: "⚡",
    name: "4 Nút thông minh: Giải PT/Hệ PT, Vẽ đồ thị, Lập BBT & Tô miền Tích phân",
    whereToFind: "Bên dưới khung nhập MathEditor & SelectionBar khi chọn Công thức",
    shortcut: "—",
    pcHowTo: "Sau khi nhập biểu thức hoặc phương trình/hệ PT, bấm 1 trong 4 nút: ⚡ Giải PT / Hệ PT (trả về nghiệm chính xác + xấp xỉ và nút chèn lời giải), 📈 Vẽ đồ thị, 📋 Tạo BBT, ∫ Tô miền tích phân.",
    tabletHowTo: "Chạm 1 nút duy nhất dưới công thức đang soạn để sinh ngay kết quả hoặc đồ thị tương ứng.",
    resultDesc: "Kết nối tức thì công thức viết tay với công cụ tính toán và trực quan hoá.",
    guideChapterId: "14-math-editor-solver",
  },
  {
    id: "feat-text-write",
    toolKeys: ["text.write"],
    chapterNum: 9,
    categoryLabel: "Văn bản",
    icon: "T",
    name: "Hộp Văn bản & Ghi chú đề bài",
    whereToFind: "Thanh công cụ trên → mũi tên cạnh Công thức → Văn bản / Ghi chú",
    shortcut: "T",
    pcHowTo: "Bấm vị trí trên bảng để gõ đoạn văn bản tiếng Việt dài, tiêu đề hoặc đề bài nhiều dòng; chọn kiểu chữ, cỡ chữ, màu sắc.",
    tabletHowTo: "Chạm đặt khung văn bản và nhập ghi chú bằng bàn phím ảo hệ thống.",
    resultDesc: "Trình bày lời văn tiếng Việt mạch lạc kết hợp cùng công thức Toán.",
    guideChapterId: "14-math-editor-solver",
  },

  // --- CHƯƠNG 10: Hệ trục Oxy, Đồ thị, BPT, Cônic, BBT & Lượng giác ---
  {
    id: "feat-oxy-axes",
    toolKeys: ["tool:p3:oxy", "p3:oxy", "action:axesPoint", "action:axesVector"],
    chapterNum: 10,
    categoryLabel: "Hệ trục Oxy",
    icon: "┼",
    name: "Hệ trục Oxy phẳng, Điểm (x;y), Vectơ (x;y), Lưới phụ & Đổi vạch chia π",
    whereToFind: "Hàm số ▾ → HỆ TRỤC TOẠ ĐỘ → + Hệ trục Oxy (chọn trục để mở nút trên SelectionBar)",
    shortcut: "—",
    pcHowTo: "Đặt Hệ trục Oxy → bấm chọn trục để dùng các nút ngữ cảnh: Vẽ đồ thị, + Điểm (x; y), + Vectơ (x; y), Bật/tắt lưới ô vuông, Đổi vạch chia Số nguyên ↔ π.",
    tabletHowTo: "Kéo gốc toạ độ O để dời hệ trục, phóng to thu nhỏ để quan sát chi tiết giao điểm.",
    resultDesc: "Hệ trục Oxy sắc nét hỗ trợ đầy đủ cả toạ độ nguyên và vạch chia π lượng giác.",
    guideChapterId: "15-oxy-plots-conics",
  },
  {
    id: "feat-plot-sliders",
    toolKeys: ["action:openPlotDialog", "p3:plot"],
    chapterNum: 10,
    categoryLabel: "Đồ thị Hàm số",
    icon: "ƒ",
    name: "Vẽ đồ thị y = f(x) kèm Thanh trượt tham số động (m, a, b)",
    whereToFind: "Hàm số ▾ → ĐỒ THỊ → Vẽ đồ thị trên hệ trục Oxy",
    shortcut: "F",
    pcHowTo: "Nhập hàm số (vd `x^3 - 3*m*x + 2`), hệ thống tự nhận diện tham số m/a/b và sinh thanh trượt động trên bảng kèm đánh dấu nghiệm, cực trị, giao trục tung và tiệm cận.",
    tabletHowTo: "Kéo thanh trượt tham số trực tiếp bằng ngón tay để học sinh xem đồ thị biến đổi theo thời gian thực.",
    resultDesc: "Minh hoạ cực mạnh các bài toán tương giao và cực trị chứa tham số.",
    guideChapterId: "15-oxy-plots-conics",
  },
  {
    id: "feat-oxy-advanced-curves",
    toolKeys: ["action:axesEquation", "action:axesInequality", "action:axesParametric", "action:axesSequence"],
    chapterNum: 10,
    categoryLabel: "Phương trình & Miền nghiệm",
    icon: "◩",
    name: "Phương trình ẩn F(x,y)=0, Hệ Bất phương trình gạch miền, Đường cong tham số & Dãy số (uₙ)",
    whereToFind: "Chọn Hệ trục Oxy → SelectionBar (hoặc Ctrl+K)",
    shortcut: "—",
    pcHowTo: "Chọn Hệ trục Oxy trên bảng → bấm nút Phương trình ẩn, Bất phương trình/Hệ BPT (tự gạch/tô miền nghiệm), Tham số x(t),y(t) hoặc Dãy số uₙ trên SelectionBar.",
    tabletHowTo: "Chạm trục Oxy trước → chọn chức năng tương ứng ngay trên thanh dưới rồi nhập biểu thức.",
    resultDesc: "Biểu diễn trực quan miền nghiệm Quy hoạch tuyến tính Toán 10, đường tròn phương trình ẩn và đồ thị dãy số.",
    guideChapterId: "15-oxy-plots-conics",
  },
  {
    id: "feat-conics",
    toolKeys: ["conic:ellipse", "conic:parabola", "conic:hyperbola"],
    chapterNum: 10,
    categoryLabel: "Ba đường Cônic",
    icon: "⬭",
    name: "Ba đường Cônic chuẩn: Elip, Parabol & Hypebol",
    whereToFind: "Hàm số ▾ → Cônic: Elip | Parabol | Hypebol",
    shortcut: "—",
    pcHowTo: "Chọn loại Cônic trên menu Hàm số ▾ → nhập bán trục a, b (hoặc tham số tiêu p) → vẽ kèm tiêu điểm F₁, F₂, đường chuẩn và tiệm cận.",
    tabletHowTo: "Chạm trực tiếp nút Elip / Parabol / Hypebol ở hàng đầu menu Hàm số.",
    resultDesc: "Dựng hình 3 đường Cônic Toán 10 chuẩn xác kèm các yếu tố tiêu cự.",
    guideChapterId: "15-oxy-plots-conics",
  },
  {
    id: "feat-vartables",
    toolKeys: ["tool:bang-bien-thien", "vartable:variation", "tool:bang-xet-dau", "vartable:sign", "bang-trong"],
    chapterNum: 10,
    categoryLabel: "Bảng Giải tích",
    icon: "↗",
    name: "Bảng biến thiên tự động, Bảng xét dấu & Bảng biến thiên trống",
    whereToFind: "Hàm số ▾ → BẢNG",
    shortcut: "—",
    pcHowTo: "Chọn Bảng biến thiên / Bảng xét dấu rồi nhập biểu thức hàm số để tự tính y', tìm nghiệm, điền dấu +/- và vẽ mũi tên; hoặc chọn 'Bảng biến thiên trống' để học sinh tự điền.",
    tabletHowTo: "Nhấp đúp vào bảng đã đặt để sửa nhanh biểu thức hàm số; dùng Bút viết tay trực tiếp lên khung Bảng trống.",
    resultDesc: "Xuất bảng biến thiên và bảng xét dấu sạch đẹp như sách giáo khoa.",
    guideChapterId: "16-vartable-trig-integral",
  },
  {
    id: "feat-trig-circle",
    toolKeys: ["tool:trig-circle", "trig-circle"],
    chapterNum: 10,
    categoryLabel: "Lượng giác",
    icon: "◔",
    name: "Đường tròn Lượng giác tương tác",
    whereToFind: "Hàm số ▾ → LƯỢNG GIÁC → Đường tròn lượng giác",
    shortcut: "—",
    pcHowTo: "Chọn Đường tròn lượng giác → bấm đặt lên bảng; tuỳ chọn hiển thị sin, cos, tan, cot và các cung đặc biệt theo radian hoặc độ.",
    tabletHowTo: "Chạm điều chỉnh góc quay trên đường tròn để giải phương trình lượng giác trực quan.",
    resultDesc: "Hiển thị đầy đủ 4 trục sin, cos, tan, cot và giá trị các góc đặc biệt.",
    guideChapterId: "16-vartable-trig-integral",
  },

  // --- CHƯƠNG 11: Thống kê, Bayes, Tập hợp, Đồ thị Đỉnh-Cạnh & Thực tế ---
  {
    id: "feat-stats-charts",
    toolKeys: ["action:openChartDialog", "p3:chart"],
    chapterNum: 11,
    categoryLabel: "Thống kê",
    icon: "📊",
    name: "Biểu đồ Thống kê & Mẫu số liệu ghép nhóm (Cột, Đường, Quạt tròn, Histogram, Boxplot)",
    whereToFind: "Thanh công cụ trên → Thống kê ▾ → Biểu đồ",
    shortcut: "—",
    pcHowTo: "Mở Thống kê ▾ → chọn Biểu đồ → chọn loại biểu đồ (Cột, Đường, Quạt tròn, Tần số ghép nhóm, Hộp) và nhập bảng số liệu để tự tính thêm các số đặc trưng.",
    tabletHowTo: "Chạm chọn nhanh mẫu số liệu và hiển thị biểu đồ trực quan lên bảng.",
    resultDesc: "Phục vụ chương Thống kê & Số liệu ghép nhóm lớp 10–11–12.",
    guideChapterId: "17-stats-bayes-sets-realworld",
  },
  {
    id: "feat-counting",
    toolKeys: ["count-perm", "count-arr", "count-comb"],
    chapterNum: 11,
    categoryLabel: "Quy tắc Đếm",
    icon: "🔢",
    name: "Mô hình Hoán vị (Pₙ), Chỉnh hợp (Aₙᵏ) & Tổ hợp (Cₙᵏ)",
    whereToFind: "Thanh công cụ trên → Thống kê ▾ → ĐẾM",
    shortcut: "—",
    pcHowTo: "Chọn Hoán vị, Chỉnh hợp hoặc Tổ hợp trong menu Thống kê ▾ rồi bấm đặt lên bảng để trực quan hoá tập phần tử và công thức đếm.",
    tabletHowTo: "Chạm đặt khung trực quan minh hoạ sự khác biệt giữa có thứ tự (Chỉnh hợp) và không thứ tự (Tổ hợp).",
    resultDesc: "Giúp học sinh dễ phân biệt Pₙ, Aₙᵏ, Cₙᵏ.",
    guideChapterId: "17-stats-bayes-sets-realworld",
  },
  {
    id: "feat-bayes-tree",
    toolKeys: ["tree", "bayes", "p3:bayes"],
    chapterNum: 11,
    categoryLabel: "Xác suất Bayes",
    icon: "🌿",
    name: "Sơ đồ hình cây & Công thức Xác suất toàn phần / Bayes P(A|B)",
    whereToFind: "Thanh công cụ trên → Thống kê ▾ → XÁC SUẤT",
    shortcut: "—",
    pcHowTo: "Chọn 'Sơ đồ hình cây' để đặt cây mẫu nhanh, hoặc chọn 'P(B), P(A|B) — Xác suất toàn phần / Bayes' để nhập P(A), P(B|A), P(B|Ā) và tự động tính kết quả.",
    tabletHowTo: "Chỉnh xác suất từng nhánh ngay trong hộp thoại rồi chèn cây kết quả sắc nét lên bảng.",
    resultDesc: "Giải và trình bày trực quan chuyên đề Xác suất có điều kiện Toán 12 mới.",
    guideChapterId: "17-stats-bayes-sets-realworld",
  },
  {
    id: "feat-venn-numberline-network",
    toolKeys: ["venn", "numberline", "p3:numberline", "network"],
    chapterNum: 11,
    categoryLabel: "Tập hợp & Lý thuyết đồ thị",
    icon: "◎",
    name: "Biểu đồ Venn, Trục số Tập hợp & Đồ thị (Đỉnh – Cạnh)",
    whereToFind: "Thanh công cụ trên → Thống kê ▾ → TẬP HỢP & CHUYÊN ĐỀ",
    shortcut: "—",
    pcHowTo: "Chọn 'Biểu đồ Venn', 'Trục số' (nhập biểu thức tập hợp như `(-2; 4] ∪ [1; +∞)`) hoặc 'Đồ thị (đỉnh – cạnh)' cho Chuyên đề Toán 11.",
    tabletHowTo: "Chạm đặt trực tiếp lên bảng để minh hoạ phép toán tập hợp hoặc tìm đường đi Euler/Hamilton.",
    resultDesc: "Tạo hình minh hoạ chuẩn xác chỉ trong 1 giây.",
    guideChapterId: "17-stats-bayes-sets-realworld",
  },
  {
    id: "feat-realworld-linedecor",
    toolKeys: ["action:openRealWorldDrawer"],
    chapterNum: 11,
    categoryLabel: "Thực tế & Trang trí",
    icon: "🏞",
    name: "Kho Vật thể Thực tế (100+ hình) & Trang trí đoạn (kích thước, mặt đất, mặt nước)",
    whereToFind: "Thanh công cụ trên → Thực tế ▾",
    shortcut: "—",
    pcHowTo: "Mở Thực tế ▾ để chèn nhanh Cây, Người, Toà nhà, Cột đèn, Thuyền, Máy bay... hoặc bấm '🔎 Tìm vật khác…' xem toàn bộ kho 100+ vật thể; chọn đoạn thẳng + dùng Trang trí đoạn để thêm gạch mặt đất/nước và ghi chú kích thước.",
    tabletHowTo: "Chạm chọn vật thể chèn ngay vào cạnh tam giác vuông trong bài toán thực tế.",
    resultDesc: "Biến bài toán thực tế khô khan thành hình minh hoạ sinh động hấp dẫn học sinh.",
    guideChapterId: "17-stats-bayes-sets-realworld",
  },

  // --- CHƯƠNG 12: Ngăn kéo Toán - Lý - Hoá, PhET & Casio ---
  {
    id: "feat-math-drawer",
    toolKeys: ["math:drawer"],
    chapterNum: 12,
    categoryLabel: "Ngăn kéo Công thức",
    icon: "∑",
    name: "Ngăn kéo Công thức Toán THPT (10–11–12)",
    whereToFind: "Thanh công cụ trên → nút 📐 Công thức Toán (hoặc Ctrl+K)",
    shortcut: "—",
    pcHowTo: "Mở ngăn kéo Toán ở cạnh phải, chọn 1 trong 6 chủ đề (Đại số, Lượng giác, Giải tích, Hình 2D/Oxy, Không gian/Oxyz, Tổ hợp–Xác suất) hoặc gõ không dấu để lọc và bấm '+ Chèn'.",
    tabletHowTo: "Chạm thẻ chủ đề hoặc ô tìm kiếm không dấu, chạm '+ Chèn' để đặt công thức KaTeX thẳng ra giữa bảng.",
    resultDesc: "Tra cứu và chèn công thức Toán chuẩn xác không cần gõ lại LaTeX dài.",
    guideChapterId: "18-drawers-periodic-casio",
  },
  {
    id: "feat-physics-drawer",
    toolKeys: ["phys:drawer"],
    chapterNum: 12,
    categoryLabel: "Vật lý THPT",
    icon: "⚛",
    name: "Ngăn kéo Vật lý: Công thức SGK 10–11–12, Hằng số CODATA & Đổi đơn vị",
    whereToFind: "Thanh công cụ trên → nút ⚛ Vật lý",
    shortcut: "—",
    pcHowTo: "Chuyển qua lại 3 thẻ: Bảng Công thức Vật lý, Hằng số Vật lý (g, c, h, e, Nₐ, k_B, R...) và Bộ Đổi đơn vị (có ô nhập số, đảo chiều quy đổi và chèn hệ số).",
    tabletHowTo: "Tìm nhanh theo tên công thức không dấu (vd 'con lac', 'song dung', 'om') và chạm chèn lên bảng.",
    resultDesc: "Đủ công thức, hằng số chuẩn và công cụ đổi đơn vị ngay khi giảng Vật lý.",
    guideChapterId: "18-drawers-periodic-casio",
  },
  {
    id: "feat-chemistry-periodic",
    toolKeys: ["chem:drawer"],
    chapterNum: 12,
    categoryLabel: "Hoá học & BTH",
    icon: "🧪",
    name: "Ngăn kéo Công thức Hoá học & Bảng Tuần Hoàn 118 Nguyên tố tương tác",
    whereToFind: "Thanh công cụ trên → nút 🧪 Hoá học / Bảng Tuần Hoàn",
    shortcut: "—",
    pcHowTo: "Xem 6 nhóm công thức Hoá (Mol, Nguyên tử, pH, Điện hoá, Hữu cơ, Giải nhanh) hoặc mở thẻ Bảng Tuần Hoàn → bấm vào nguyên tố bất kỳ xem M, độ âm điện, số OXH & bấm '+ Chèn cấu hình e'.",
    tabletHowTo: "Chạm ô nguyên tố (vd Fe, Cu, Cl) trên bảng tuần hoàn đầy đủ 118 nguyên tố để chiếu thông số chi tiết cho cả lớp xem.",
    resultDesc: "Bảng tuần hoàn sống động kèm nút chèn cấu hình electron lên bảng trắng.",
    guideChapterId: "18-drawers-periodic-casio",
  },
  {
    id: "feat-casio",
    chapterNum: 12,
    categoryLabel: "Máy tính Casio",
    icon: "🧮",
    name: "Máy tính Khoa học giả lập kiểu Casio fx-580VN X (HiDPI LCD)",
    whereToFind: "Thanh công cụ trên → nút 🧮 Máy tính",
    shortcut: "—",
    pcHowTo: "Bấm mở cửa sổ máy tính nổi trên bảng; kéo di chuyển vị trí, đổi kích thước vỏ, bấm phím bằng chuột hoặc gõ trực tiếp từ bàn phím số laptop; bấm nút chép kết quả thành công thức lên bảng.",
    tabletHowTo: "Chạm các phím bố cục chuẩn fx-580VN để hướng dẫn học sinh thao tác SHIFT / ALPHA / SOLVE / Tích phân số rõ trên màn chiếu.",
    resultDesc: "Mô phỏng trực quan thao tác bấm máy cho học sinh không cần cài thêm phần mềm khác.",
    guideChapterId: "18-drawers-periodic-casio",
  },
  {
    id: "feat-phet-sim",
    toolKeys: ["sim:launcher"],
    chapterNum: 12,
    categoryLabel: "Thí nghiệm PhET",
    icon: "⚗",
    name: "Thí nghiệm PhET Online tiếng Việt, File .html Offline, Thu nhỏ & Vẽ chú thích",
    whereToFind: "Thanh công cụ trên / Thanh bên trái → nút ⚗ Thí nghiệm",
    shortcut: "—",
    pcHowTo: "Mở 28+ thí nghiệm PhET chọn lọc (tự động ưu tiên ?locale=vi), dán link PhET bất kỳ hoặc vào thẻ 'File HTML Offline' nạp sẵn file .html chạy không cần Wi-Fi. Bấm '─ Về bảng trắng' để thu nhỏ giữ trạng thái hoặc '✏ Vẽ chú thích' viết đè lên thí nghiệm.",
    tabletHowTo: "Thao tác thí nghiệm toàn màn hình bằng cảm ứng đa điểm mượt mà ngay cả khi trường học không có Internet.",
    resultDesc: "Kết hợp linh hoạt giữa thí nghiệm trực quan và bảng viết phân tích vật lý/hoá học.",
    guideChapterId: "19-phet-simulations",
  },

  // --- CHƯƠNG 13: Nhập PDF, Cắt đề AI & Xuất PDF ---
  {
    id: "feat-insert-pdf",
    chapterNum: 13,
    categoryLabel: "Chèn tài liệu",
    icon: "📄",
    name: "Chèn PDF nhiều trang lên bảng (tự khoá nền)",
    whereToFind: "Thanh bên Sổ tay / Thanh công cụ → 📄 Chèn PDF",
    shortcut: "—",
    pcHowTo: "Chọn file PDF đề thi hoặc giáo án nhiều trang (hỗ trợ cả file scan JBIG2/JPX offline) → hệ thống tự dàn mỗi trang PDF vào 1 trang bảng và khoá nền để viết chữa bài trực tiếp.",
    tabletHowTo: "Chọn file PDF từ bộ nhớ máy tính bảng → dùng S Pen viết chú thích và giải bài tập thẳng lên từng trang.",
    resultDesc: "Đưa nguyên bộ đề/tài liệu lên bảng nhanh chóng mà không bị trôi trang khi viết.",
    guideChapterId: "20-pdf-crop-classroom-settings",
  },
  {
    id: "feat-question-crop",
    toolKeys: ["action:cropQuestion"],
    chapterNum: 13,
    categoryLabel: "Cắt đề thi",
    icon: "✂",
    name: "Cắt câu hỏi từ PDF / Ảnh / Ctrl+V, AI Tự tách đa trang & Ghép câu vắt trang",
    whereToFind: "Thanh bên Sổ tay → nút ✂ Cắt đề",
    shortcut: "Ctrl+V (trong hộp thoại Cắt đề)",
    pcHowTo: "Kéo thả PDF/Ảnh hoặc bấm Ctrl+V dán ảnh chụp → kéo khung cắt tay (có nút Cắt & Cắt tiếp) hoặc bấm ✨ AI Tự nhận diện câu hỏi (1 trang hoặc quét dải nhiều trang); dùng tính năng Nối tiếp trang sau khi câu hỏi bị chia đôi giữa 2 trang PDF.",
    tabletHowTo: "Chạm mở file đề PDF trên máy tính bảng, kéo chọn vùng câu hỏi hoặc dùng AI tách hàng loạt rồi chèn lên bảng với khoảng trống lời giải rộng tuỳ chọn.",
    resultDesc: "Chuẩn bị đề chữa bài sạch đẹp trong 2 giây với đề bài tự động được Khoá sẵn.",
    guideChapterId: "20-pdf-crop-classroom-settings",
  },
  {
    id: "feat-export-pdf-png",
    toolKeys: ["action:exportPdf", "action:exportPng"],
    chapterNum: 13,
    categoryLabel: "Xuất tài liệu",
    icon: "🖨️",
    name: "Xuất ảnh PNG & Xuất PDF A4 (Trang hiện tại / Tất cả / Dải trang & Nền trắng in ấn)",
    whereToFind: "Thanh bên trái / Menu Thêm → 📄 Xuất PDF / 🖼 Xuất PNG",
    shortcut: "—",
    pcHowTo: "Mở Xuất PDF → đặt tên file, chọn xuất Trang hiện tại, Toàn bộ sổ tay hoặc Dải trang (vd 1-3, 5); giữ công tắc 'Chuyển nền giấy trắng khi xuất PDF' để in bài giảng bảng đen/xanh ra giấy trắng rõ nét.",
    tabletHowTo: "Xuất trọn bài giảng sau tiết học thành 1 file PDF gửi thẳng qua nhóm Zalo lớp cho học sinh ôn tập.",
    resultDesc: "Tạo file PDF nhiều trang sắc nét chuẩn in ấn.",
    guideChapterId: "20-pdf-crop-classroom-settings",
  },

  // --- CHƯƠNG 14: Công cụ Lớp học, Phím tắt, Cài đặt & Hỗ trợ Zalo ---
  {
    id: "feat-classroom-tools",
    toolKeys: ["action:classroomTools"],
    chapterNum: 14,
    categoryLabel: "Công cụ Lớp học",
    icon: "⏱",
    name: "Công cụ Lớp học: Đồng hồ Đếm ngược & Gọi tên ngẫu nhiên không trùng",
    whereToFind: "Thanh bên Sổ tay → nút ⏱ Lớp học",
    shortcut: "—",
    pcHowTo: "Tab Đếm ngược: chọn nhanh 1p, 3p, 5p, 10p, 15p hoặc nhập phút:giây tuỳ ý (có chuông reo hết giờ). Tab Gọi tên: dán danh sách lớp 1 lần (tự lưu) rồi bấm Quay gọi tên học sinh ngẫu nhiên.",
    tabletHowTo: "Kéo cửa sổ đồng hồ ra góc bảng để tính giờ làm bài tập nhóm hoặc gọi học sinh lên bảng công bằng.",
    resultDesc: "Tăng hứng thú và kỷ luật thời gian trong tiết học.",
    guideChapterId: "20-pdf-crop-classroom-settings",
  },
  {
    id: "feat-command-palette",
    toolKeys: ["action:openCommands"],
    chapterNum: 14,
    categoryLabel: "Phím tắt & Lệnh",
    icon: "⌘",
    name: "Cửa sổ Lệnh nhanh & Gán lại Phím tắt (Ctrl+K)",
    whereToFind: "Thanh bên Sổ tay → nút ⌘ Phím tắt & Lệnh",
    shortcut: "Ctrl+K",
    pcHowTo: "Nhấn Ctrl+K → gõ tên bất kỳ tính năng nào bằng tiếng Việt không dấu để kích hoạt ngay, hoặc bấm vào nút phím tắt cạnh mỗi lệnh để đổi sang phím tắt quen tay riêng.",
    tabletHowTo: "Mở từ thanh bên trái khi cần tìm nhanh một lệnh vẽ/dựng hình ít dùng.",
    resultDesc: "Truy cập và cá nhân hoá mọi phím tắt trên toàn bộ ứng dụng.",
    guideChapterId: "20-pdf-crop-classroom-settings",
  },
  {
    id: "feat-settings-toolbar-update",
    chapterNum: 14,
    categoryLabel: "Cài đặt Hệ thống",
    icon: "⚙",
    name: "Ẩn/Hiện Công cụ theo môn dạy, Bút Stylus, Tự chuyển công cụ & Tự cập nhật",
    whereToFind: "Thanh bên Sổ tay → nút ⚙ Cài đặt",
    shortcut: "—",
    pcHowTo: "Trong Cài đặt: bật/tắt từng nút hoặc từng nhóm môn học trên Thanh công cụ; cấu hình tự chuyển về Chọn sau khi vẽ; kiểm tra & tải bản cập nhật Windows (.exe) mới trực tiếp.",
    tabletHowTo: "Chỉnh nút phụ S Pen, bật Pen-Only và kiểm tra cập nhật bản Android (.apk) có thanh tiến trình % ngay trong ứng dụng.",
    resultDesc: "Giao diện gọn nhẹ theo đúng nhu cầu giảng dạy và luôn cập nhật phiên bản mới.",
    guideChapterId: "20-pdf-crop-classroom-settings",
  },
  {
    id: "feat-support-zalo-manual",
    toolKeys: ["action:reportBug"],
    chapterNum: 14,
    categoryLabel: "Hướng dẫn & Hỗ trợ",
    icon: "💬",
    name: "Cẩm nang Hướng dẫn, Trình đọc PDF Offline & Báo lỗi trực tiếp qua Zalo (0853769246)",
    whereToFind: "Thanh bên Sổ tay → 🎓 Hướng dẫn / 🪲 Báo lỗi (hoặc Cài đặt → Báo lỗi)",
    shortcut: "—",
    pcHowTo: "Mở 🎓 Hướng dẫn để xem 20 chuyên đề minh hoạ, tra cứu 100% công cụ hoặc bấm '📄 Đọc / Tải Sách PDF Cẩm nang'. Khi cần hỗ trợ nhanh hoặc báo lỗi, mở thẻ Báo lỗi bấm 'Nhắn Zalo (0853 769 246)', Copy báo cáo hệ thống hoặc gửi GitHub Issues/Email.",
    tabletHowTo: "Chạm nút 'Liên hệ Zalo (0853769246)' ngay trong mục Báo lỗi để nhắn tin gửi ảnh chụp màn hình trực tiếp cho tác giả không cần đăng nhập GitHub.",
    resultDesc: "Dễ dàng tra cứu mọi lúc không cần mạng và được hỗ trợ kỹ thuật nhanh chóng.",
    guideChapterId: "20-pdf-crop-classroom-settings",
  },
];

export interface IndividualToolRefEntry {
  key: string;
  chapterNum: number;
  icon: string;
  title: string;
  shortcut: string;
  desc: string;
  tips?: string;
}

function classifyToolChapter(key: string, category?: string): number {
  const clean = key.replace(/^tool:/, "");
  if (clean === "select" || clean === "select:marquee" || clean === "pan" || clean.startsWith("action:zoom") || clean === "action:fitView" || clean === "action:fullscreen" || clean === "action:duplicate") return 1;
  if (clean === "action:toggleGrid" || clean === "action:prevPage" || clean === "action:nextPage" || clean === "action:addPage" || clean === "action:unlockAll") return 2;
  if (clean.startsWith("ink") || clean === "erase") return 3;
  if (["point", "geometry.point", "segment", "c:segment", "c:dseg", "c:ray", "c:line", "c:vector", "circle", "c:circle", "polygon", "c:polygon", "floodFill", "c:triRight", "c:triRightIso", "c:triIso", "c:triEqui", "c:pgram", "c:rhombus", "c:rect", "c:square"].includes(clean)) return 4;
  if (clean.startsWith("c:") && !["c:lineplane", "c:giaotuyen", "c:perp3d", "c:section", "c:boxrule", "c:circumsphere", "c:flatten", "c:unfold", "c:footplane", "c:distplane", "c:commonperp", "c:measure", "c:anglelp", "c:angleplanes"].includes(clean)) return 5;
  if (clean === "action:toggleConstructMarks") return 5;
  if (["p3:box", "p3:cube", "p3:prism:3", "p3:prism:5", "p3:prism:6", "p3:pyramid:3", "p3:pyramid:4", "p3:pyramid:5", "p3:pyramid:6", "p3:frustum:3", "p3:frustum:4", "p3:frustum:6", "p3:cylinder", "p3:cone", "p3:sphere", "plane", "c:flatten", "c:unfold"].includes(clean)) return 6;
  if (["c:lineplane", "c:giaotuyen", "c:perp3d", "c:section", "c:boxrule", "c:circumsphere", "c:footplane", "c:distplane", "c:commonperp", "c:measure", "c:anglelp", "c:angleplanes"].includes(clean)) return 7;
  if (clean === "p3:axes") return 8;
  if (clean === "formula" || clean === "text.write") return 9;
  if (clean.startsWith("conic:") || clean.startsWith("vartable:") || clean.startsWith("action:axes") || clean === "action:openPlotDialog" || ["p3:oxy", "p3:plot", "bang-bien-thien", "bang-xet-dau", "trig-circle"].includes(clean)) return 10;
  if (["p3:chart", "p3:bayes", "p3:numberline", "action:openChartDialog", "action:openRealWorldDrawer"].includes(clean)) return 11;
  if (clean === "math:drawer" || clean === "phys:drawer" || clean === "chem:drawer" || clean === "sim:launcher" || clean.startsWith("phys:")) return 12;
  if (clean === "action:cropQuestion" || clean === "action:exportPdf" || clean === "action:exportPng") return 13;
  if (clean === "action:classroomTools" || clean === "action:openCommands" || clean === "action:reportBug") return 14;
  if (category === "plane") return 5;
  if (category === "space") return 6;
  if (category === "functions") return 10;
  if (category === "physics") return 12;
  return 14;
}

/**
 * Deduplicated individual sub-tools & commands list merged from TOOL_GUIDE_CATALOG and WHITEBOARD_COMMANDS
 * so neither the in-app encyclopedia nor the PDF manual omits any single tool.
 */
export const INDIVIDUAL_TOOL_REFERENCE: IndividualToolRefEntry[] = (() => {
  const map = new Map<string, IndividualToolRefEntry>();
  const shortcutByToolKey = new Map<string, string>();
  for (const cmd of WHITEBOARD_COMMANDS) {
    if (cmd.defaultShortcut) {
      shortcutByToolKey.set(cmd.id.replace(/^tool:/, ""), cmd.defaultShortcut);
    }
  }

  for (const [key, info] of Object.entries(TOOL_GUIDE_CATALOG)) {
    // Skip duplicate alias keys that point to identical action title when canonical key already covers it
    if (key === "geometry.point" || key === "segment" || key === "circle" || key === "polygon") continue;
    const ch = classifyToolChapter(key);
    map.set(key, {
      key,
      chapterNum: ch,
      icon: info.icon,
      title: info.title,
      shortcut: info.shortcut || shortcutByToolKey.get(key) || "—",
      desc: info.desc,
      tips: info.tips,
    });
  }

  for (const cmd of WHITEBOARD_COMMANDS) {
    const clean = cmd.id.replace(/^tool:/, "");
    if (map.has(clean) || (clean === "c:segment" && map.has("c:segment"))) continue;
    if (clean === "point" || clean === "circle" || clean === "polygon") continue;
    const ch = classifyToolChapter(cmd.id, cmd.category);
    map.set(cmd.id, {
      key: cmd.id,
      chapterNum: ch,
      icon: cmd.icon,
      title: cmd.label,
      shortcut: cmd.defaultShortcut || "—",
      desc: cmd.description || `Kích hoạt lệnh "${cmd.label}" nhanh từ thanh công cụ hoặc cửa sổ lệnh Ctrl+K.`,
    });
  }

  return Array.from(map.values()).sort((a, b) => a.chapterNum - b.chapterNum);
})();

