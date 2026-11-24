"use client";

import React, { useCallback, useEffect, useState } from "react";

export const FEATURE_GUIDE_SEEN_KEY = "physboard_feature_guide_seen_v1";

export function hasSeenFeatureGuide(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(FEATURE_GUIDE_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markFeatureGuideSeen(seen = true): void {
  if (typeof window === "undefined") return;
  try {
    if (seen) {
      window.localStorage.setItem(FEATURE_GUIDE_SEEN_KEY, "1");
    } else {
      window.localStorage.removeItem(FEATURE_GUIDE_SEEN_KEY);
    }
  } catch {
    // Ignore storage restriction errors in private contexts
  }
}

export interface GuideChapter {
  id: string;
  stepLabel: string;
  icon: string;
  shortTitle: string;
  title: string;
  badge: string;
  videoSrc: string;
  summary: string;
  highlights: Array<{ label: string; detail: string }>;
  tip: string;
}

export const FEATURE_GUIDE_CHAPTERS: GuideChapter[] = [
  {
    id: "01-plane-geometry",
    stepLabel: "01",
    icon: "📐",
    shortTitle: "Hình học Phẳng 2D",
    title: "1. Hình học Phẳng 2D Động & Ký hiệu chuẩn SGK",
    badge: "Hình phẳng 2D",
    videoSrc: "./demos/01-plane-geometry.mp4",
    summary:
      "Bộ nhân hình học động cho phép dựng điểm, đoạn/đường thẳng, tam giác, tứ giác, đường tròn và các đường đặc biệt giữ nguyên ràng buộc toán học khi kéo chỉnh.",
    highlights: [
      {
        label: "Tam giác & Tứ giác đặc biệt",
        detail:
          "Vẽ nhanh Tam giác vuông (Shift+1), Vuông cân, Cân, Đều (Shift+2), Hình bình hành, Thoi, Chữ nhật, Hình vuông — tự đánh tên đỉnh A, B, C.",
      },
      {
        label: "Đường & Tâm Tam giác 1 chạm",
        detail:
          "Dựng tức thì Đường cao (Alt+1), Trung tuyến (Alt+2), Phân giác (Alt+3), Trọng tâm G (Alt+G), Trực tâm H (Alt+H), Đường tròn ngoại tiếp (Alt+O) & nội tiếp (Alt+I).",
      },
      {
        label: "Quan hệ Điểm – Đường – Đường tròn",
        detail:
          "Điểm trượt trên đường/cung, Trung điểm (Alt+M), Trung trực (Alt+T), Vuông góc (Alt+V), Song song (Alt+S), Tiếp tuyến, Giao điểm (Alt+X), Góc theo số đo & Tô màu miền (G).",
      },
      {
        label: "Tự động gắn ký hiệu & Chỉnh nhãn chiếu",
        detail:
          "Tự thêm ô vuông góc, gạch bằng nhau chuẩn SGK; hỗ trợ phóng to cỡ tên điểm (A+ / A-) để học sinh cuối lớp đọc rõ.",
      },
    ],
    tip: "Chọn sẵn một tam giác rồi bấm Alt+1 (Đường cao) hoặc Alt+O (Ngoại tiếp) để dựng ngay không cần chọn lại từng đỉnh.",
  },
  {
    id: "02-space-geometry-3d",
    stepLabel: "02",
    icon: "🧊",
    shortTitle: "Hình Không gian 3D",
    title: "2. Hình Không gian 3D — Tự ẩn nét đứt, Thiết diện & Trải phẳng",
    badge: "Không gian 3D",
    videoSrc: "./demos/02-space-geometry-3d.mp4",
    summary:
      "Chèn nhanh khối đa diện và khối tròn xoay, xoay tự do mọi góc nhìn với thuật toán tự động chuyển cạnh khuất thành nét đứt đúng quy tắc hình học không gian.",
    highlights: [
      {
        label: "Đầy đủ Khối đa diện & Tròn xoay",
        detail:
          "Hộp chữ nhật, Lập phương, Lăng trụ (tam/ngũ/lục giác), Chóp (tam/tứ/ngũ/lục giác), Chóp cụt đều, Hình trụ, Hình nón, Hình cầu & Mặt phẳng (P).",
      },
      {
        label: "Thanh Xoay hình 3D (OrbitBar)",
        detail:
          "Kéo xoay trực tiếp, chỉnh góc Ngang/Nghiêng chính xác hoặc bật Tự xoay 3D — nét khuất/nét liền tự cập nhật theo thời gian thực.",
      },
      {
        label: "Chọn trực tiếp từng Mặt & từng Cạnh",
        detail:
          "Chạm vào 1 mặt để Tách ra hình thật 2D, Tô màu mặt, Mở rộng thành mặt phẳng; chạm cạnh để Hiện độ dài, đặt Trung điểm / Điểm trên cạnh.",
      },
      {
        label: "Dựng Thiết diện, Giao tuyến, Khoảng cách & Trải phẳng",
        detail:
          "Hỗ trợ Tìm giao tuyến 2 mặt phẳng, Giao điểm đường – mặt, Dựng Thiết diện, Khoảng cách điểm – mặt, Đoạn vuông góc chung, Góc nhị diện, Mặt cầu ngoại tiếp & Trải phẳng Net 2D.",
      },
    ],
    tip: "Nhấn thẳng vào 1 mặt bên của hình chóp rồi chọn 'Tách ra hình thật' để học sinh nhìn rõ góc và cạnh thật của tam giác đó ngay bên cạnh.",
  },
  {
    id: "03-oxyz-3d",
    stepLabel: "03",
    icon: "🛰️",
    shortTitle: "Hệ trục Oxyz",
    title: "3. Hệ trục Toạ độ Không gian Oxyz tương tác (Toán 12)",
    badge: "Toạ độ Oxyz",
    videoSrc: "./demos/03-oxyz-3d.mp4",
    summary:
      "Dựng trực quan hệ trục Oxyz xoay 360° cùng bộ 5 công cụ toạ độ hoá đầy đủ cho chương Hình học Giải tích trong không gian Toán 12.",
    highlights: [
      {
        label: "+ Điểm M(x; y; z) & + Vectơ u⃗(x; y; z)",
        detail:
          "Nhập nhanh bộ ba toạ độ để đặt điểm kèm đường gióng trục hoặc vẽ vectơ chỉ phương / pháp tuyến trong không gian.",
      },
      {
        label: "◩ Mặt phẳng (P): Ax + By + Cz + D = 0",
        detail:
          "Biểu diễn mặt phẳng từ phương trình tổng quát ngay trên hệ trục Oxyz.",
      },
      {
        label: "⁄ Đường thẳng (d) & ◯ Mặt cầu (S)",
        detail:
          "Dựng đường thẳng tham số qua điểm + VTCP và mặt cầu tâm I(x; y; z) bán kính R để minh hoạ tương giao, tiếp xúc.",
      },
    ],
    tip: "Sau khi đặt hệ trục Oxyz, dùng thanh 'Xoay hình 3D' bên phải để quay sang góc nhìn dễ quan sát nhất trước khi chụp/giảng bài.",
  },
  {
    id: "04-math-editor-functions",
    stepLabel: "04",
    icon: "📈",
    shortTitle: "Công thức, Đồ thị & Thống kê",
    title: "4. Soạn Công thức Toán, Đồ thị Oxy, Bảng biến thiên & Thống kê",
    badge: "Đại số & Giải tích",
    videoSrc: "./demos/04-math-editor-functions.mp4",
    summary:
      "Hệ thống gõ công thức MathLive + KaTeX, vẽ đồ thị có thanh trượt tham số, lập bảng biến thiên tự động, cây xác suất Bayes và vật thể bài toán thực tế.",
    highlights: [
      {
        label: "∑ Công thức (T) + 4 Nút xử lý nhanh",
        detail:
          "Gõ LaTeX hoặc dùng bàn phím ảo 6 thẻ (có hệ PT 2/3 ẩn, ký hiệu ⋮) rồi bấm 1 chạm: Giải PT / Hệ PT, Vẽ đồ thị, Lập bảng biến thiên hoặc Tô miền tích phân.",
      },
      {
        label: "Hệ trục Oxy, BPT & Bảng biến thiên",
        detail:
          "Vẽ hàm số có thanh trượt tham số (a, b, m), Phương trình ẩn, Hệ BPT gạch miền nghiệm, Cônic (Elip/Parabol/Hypebol), Đường tròn lượng giác & đổi vạch chia π.",
      },
      {
        label: "Thống kê, Sơ đồ cây Bayes & Đồ thị đỉnh–cạnh",
        detail:
          "Đầy đủ Biểu đồ cột/tròn, Hoán vị–Chỉnh hợp–Tổ hợp, Cây xác suất Bayes P(A|B), Biểu đồ Venn, Trục số tập hợp & Lý thuyết đồ thị.",
      },
      {
        label: "Kho Vật thể Thực tế (100+ hình minh hoạ)",
        detail:
          "Chèn sẵn Cây, Người, Toà nhà, Thuyền, Máy bay, Cái thang, Mặt trời… cho bài toán ứng dụng thực tế.",
      },
    ],
    tip: "Đang viết bằng Bút tay (P), giữ yên đầu bút 0,34s sau khi vẽ phác đường thẳng, hình tròn hay tam giác — Ink-to-Shape sẽ tự nắn lại thật thẳng đẹp!",
  },
  {
    id: "05-formulas-periodic",
    stepLabel: "05",
    icon: "⚛️",
    shortTitle: "Công thức & Bảng Tuần Hoàn",
    title: "5. Bộ 3 Ngăn kéo Công thức GDPT 2018 & Bảng Tuần Hoàn 118 NT",
    badge: "Toán · Lý · Hoá",
    videoSrc: "./demos/05-formulas-periodic.mp4",
    summary:
      "Tra cứu tiếng Việt không dấu và chèn 1 chạm công thức LaTeX sắc nét lên bảng cho cả 3 môn Toán, Vật lý, Hoá học cùng Bảng Tuần Hoàn 118 nguyên tố.",
    highlights: [
      {
        label: "∑ Ngăn kéo Toán 10–11–12",
        detail:
          "Đại số & PT (Vi-ét, BĐT Cô-si/Bunyakovsky), Lượng giác, Đạo hàm/Nguyên hàm/Tích phân, Hình học 2D/Oxy, Oxyz và Tổ hợp – Xác suất.",
      },
      {
        label: "⚛ Ngăn kéo Vật lý & Đổi đơn vị trực quan",
        detail:
          "Công thức SGK theo từng chương, Bảng hằng số CODATA (g, c, h, e, Nₐ…) và Bộ đổi đơn vị kèm công thức hệ số (vd: 1 km/h = 1/3,6 m/s).",
      },
      {
        label: "🧪 Công thức Hoá & Bảng Tuần Hoàn 118 NT",
        detail:
          "6 nhóm công thức (Mol, pH, Điện hoá, Hữu cơ…) và Bảng Tuần Hoàn: bấm vào nguyên tố bất kỳ (vd Sắt Fe) để xem M, số OXH, cấu hình e & bấm '+ Chèn cấu hình e'.",
      },
    ],
    tip: "Ở ô tìm kiếm ngăn kéo công thức, bạn có thể gõ tiếng Việt không dấu như 'dao ham', 'luong giac', 'sat', 'mol' để lọc siêu nhanh.",
  },
  {
    id: "06-phet-simulations",
    stepLabel: "06",
    icon: "⚗️",
    shortTitle: "Thí nghiệm PhET & Offline",
    title: "6. Thí nghiệm Mô phỏng PhET Online & File HTML Offline Toàn màn hình",
    badge: "Mô phỏng trực quan",
    videoSrc: "./demos/06-phet-simulations.mp4",
    summary:
      "Chạy thí nghiệm như một cửa sổ toàn màn hình độc lập ngay trong PhysBoard, có sẵn lớp kính vẽ chú thích và chuyển về bảng trắng mà không mất trạng thái chạy.",
    highlights: [
      {
        label: "28+ bài PhET Online chọn lọc + Dán link bất kỳ",
        detail:
          "Phân loại theo Vật lý, Hoá học, Toán học 10–11–12; tự động ưu tiên bản tiếng Việt (_all.html?locale=vi).",
      },
      {
        label: "Kho File .html Offline (100% không cần Wi-Fi)",
        detail:
          "Nhập các file HTML5 đơn lẻ tải từ phet.colorado.edu lưu lâu dài trong IndexedDB — dạy mượt và nhẹ RAM kể cả trên máy tính bảng Android.",
      },
      {
        label: "─ Về bảng trắng & ✏ Vẽ chú thích trực tiếp",
        detail:
          "Thu nhỏ thí nghiệm xuống góc để ghi công thức trên bảng trắng trong khi mô phỏng vẫn chạy ngầm, hoặc bật bút vẽ đè ngay lên thí nghiệm.",
      },
    ],
    tip: "Khi dạy tiết Vật lý/Hoá học không có mạng trên lớp, hãy nạp sẵn file .html vào tab 'File HTML Offline' từ ở nhà để bật lên trong 1 giây.",
  },
  {
    id: "07-casio-calculator",
    stepLabel: "07",
    icon: "🧮",
    shortTitle: "Máy tính Casio fx-580VN",
    title: "7. Máy tính Khoa học giả lập kiểu Casio fx-580VN X (HiDPI LCD)",
    badge: "Bấm máy trực tiếp",
    videoSrc: "./demos/07-casio-calculator.mp4",
    summary:
      "Cửa sổ máy tính bỏ túi nổi ngay trên bảng trắng với màn hình Vector LCD sắc nét và bố cục phím chuẩn học sinh Việt Nam, hỗ trợ hướng dẫn bấm máy từng bước.",
    highlights: [
      {
        label: "Chuẩn bố cục phím fx-580VN X / fx-880BTG",
        detail:
          "Đầy đủ phím SHIFT, ALPHA, SOLVE, phân số, căn thức, logarit, lượng giác, tích phân, đạo hàm số, STO, S⇔D.",
      },
      {
        label: "Màn hình HiDPI sắc nét khi chiếu",
        detail:
          "Chữ và biểu thức hiển thị rõ từng dấu phân số, mũ luỹ thừa trên màn hình lớn hoặc máy chiếu lớp học.",
      },
      {
        label: "Kéo thả tự do & Chép kết quả lên bảng",
        detail:
          "Kéo di chuyển sang góc bảng thuận tay, phóng to/thu nhỏ vỏ máy tính và gửi nhanh kết quả thành khối công thức.",
      },
    ],
    tip: "Bạn có thể dùng chính bàn phím số vật lý trên laptop để gõ phép tính vào máy tính Casio khi đang mở trên bảng!",
  },
  {
    id: "08-crop-and-notes",
    stepLabel: "08",
    icon: "✂️",
    shortTitle: "Cắt đề PDF & Sổ tay",
    title: "8. Cắt câu hỏi từ PDF / Ảnh (Ctrl+V), Quản lý Sổ tay & Sao lưu",
    badge: "Đề thi & Sổ tay",
    videoSrc: "./demos/08-crop-and-notes.mp4",
    summary:
      "Tách từng câu hỏi từ sách/đề PDF scan kể cả file nén JBIG2/JPX trong 2 giây, tổ chức nhiều sổ tay bài giảng, xuất PDF in ấn và sao lưu trọn gói.",
    highlights: [
      {
        label: "✂ Cắt đề từ PDF / Ảnh / Ctrl+V",
        detail:
          "Kéo thả file PDF, nhảy nhanh tới số trang bất kỳ hoặc dán ảnh chụp (Ctrl+V) → khoanh cắt từng câu → tự động 🔒 Khoá vào trang để viết đè không bị trượt.",
      },
      {
        label: "Chèn PDF nhiều trang & Khổ giấy linh hoạt",
        detail:
          "Nhập toàn bộ đề thành nhiều trang, hỗ trợ Bảng vô hạn hoặc Khổ A4, đổi nền ô ly, chấm bi, kẻ ngang hoặc bảng đen/bảng xanh phấn trắng.",
      },
      {
        label: "Quản lý Sổ tay & Xuất PDF / PNG",
        detail:
          "Chia thư mục theo từng lớp/chuyên đề, có Thùng rác chống xoá nhầm; xuất PDF có tuỳ chọn tự chuyển nền giấy trắng để học sinh in rõ nét.",
      },
      {
        label: "💾 Sao lưu & Khôi phục (.physbackup.json)",
        detail:
          "Xuất toàn bộ sổ tay, hình vẽ và PDF ra 1 file dự phòng duy nhất để đồng bộ giữa Windows và máy tính bảng Android.",
      },
    ],
    tip: "Bấm '✂ Cắt & Cắt tiếp câu khác' khi muốn cắt liên tiếp nhiều câu hỏi từ cùng một trang đề mà không cần mở lại file.",
  },
  {
    id: "09-classroom-tools",
    stepLabel: "09",
    icon: "⏱️",
    shortTitle: "Công cụ Lớp học",
    title: "9. Công cụ Lớp học — Đồng hồ Đếm ngược & Gọi tên ngẫu nhiên",
    badge: "Tương tác lớp",
    videoSrc: "./demos/09-classroom-tools.mp4",
    summary:
      "Hai tiện ích nhỏ gọn nhưng cực kỳ hữu ích khi tổ chức làm bài tập nhóm, kiểm tra nhanh 5–15 phút hoặc gọi học sinh phát biểu trực tiếp trên lớp.",
    highlights: [
      {
        label: "⏱ Đồng hồ Đếm ngược làm bài",
        detail:
          "Chọn nhanh các mốc 1p, 3p, 5p, 10p, 15p hoặc đặt số phút tuỳ ý kèm thanh tiến trình trực quan và chuông báo khi hết giờ.",
      },
      {
        label: "🎲 Gọi tên học sinh ngẫu nhiên không trùng",
        detail:
          "Nhập danh sách lớp một lần (tự động lưu), quay chọn ngẫu nhiên học sinh mà không lặp lại bạn đã gọi trong cùng lượt.",
      },
    ],
    tip: "Thu gọn thanh bên nếu cần thêm diện tích viết bảng; đồng hồ đếm ngược vẫn tiếp tục chạy ổn định trên màn hình.",
  },
  {
    id: "10-shortcuts-settings-feedback",
    stepLabel: "10",
    icon: "⚙️",
    shortTitle: "Phím tắt, Cài đặt & Báo lỗi",
    title: "10. Phím tắt (Ctrl+K), Bút Stylus, Tự cập nhật & Báo lỗi trực tiếp",
    badge: "Cá nhân hoá",
    videoSrc: "./demos/10-shortcuts-settings-feedback.mp4",
    summary:
      "Cá nhân hoá thanh công cụ theo đúng môn bạn dạy, chống tì tay cho bút cảm ứng, nhận bản cập nhật mới 1 chạm và gửi phản hồi ngay trong ứng dụng.",
    highlights: [
      {
        label: "⌘ Cửa sổ Lệnh nhanh & Phím tắt (Ctrl+K)",
        detail:
          "Tìm mọi lệnh vẽ/dựng hình bằng tiếng Việt không dấu và tự gán phím tắt bàn phím theo thói quen riêng của bạn.",
      },
      {
        label: "✍ Chế độ Bút Stylus (Pen-Only) & Laser",
        detail:
          "Chống tì tay trên máy tính bảng Android/Windows; hỗ trợ Bút máy nét thanh đậm và Bút chỉ Laser chấm đỏ / vệt sáng tự mờ.",
      },
      {
        label: "👁 Ẩn/Hiện Công cụ & Cập nhật tự động",
        detail:
          "Tắt bớt các nút không dạy để thanh công cụ thoáng gọn; kiểm tra & tải cập nhật có hiển thị % tiến trình ngay trên Windows (.exe) và Android (.apk).",
      },
      {
        label: "🐛 Báo lỗi & Phản hồi 1 chạm",
        detail:
          "Gửi báo lỗi kèm thông số phiên bản qua GitHub Issues, Email hoặc Copy báo cáo gửi Zalo/Messenger.",
      },
    ],
    tip: "Nếu thanh công cụ quá dài khi dạy 1 môn, vào Cài đặt → Ẩn/Hiện Công cụ để tắt các nút không cần thiết — giao diện sẽ cực kỳ gọn!",
  },
];

export interface FeatureGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export const FeatureGuideModal: React.FC<FeatureGuideModalProps> = ({
  open,
  onClose,
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [dontShowOnStartup, setDontShowOnStartup] = useState(true);

  const chapter = FEATURE_GUIDE_CHAPTERS[activeIdx] ?? FEATURE_GUIDE_CHAPTERS[0];
  const total = FEATURE_GUIDE_CHAPTERS.length;

  const handleClose = useCallback(() => {
    markFeatureGuideSeen(dontShowOnStartup);
    onClose();
  }, [dontShowOnStartup, onClose]);

  const handlePrev = useCallback(() => {
    setActiveIdx((i) => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    if (activeIdx >= total - 1) {
      handleClose();
    } else {
      setActiveIdx((i) => Math.min(total - 1, i + 1));
    }
  }, [activeIdx, total, handleClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        handleClose();
      } else if (e.key === "ArrowRight") {
        e.stopPropagation();
        setActiveIdx((i) => Math.min(total - 1, i + 1));
      } else if (e.key === "ArrowLeft") {
        e.stopPropagation();
        setActiveIdx((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, total, handleClose]);

  if (!open) return null;

  return (
    <div
      data-testid="feature-guide-modal"
      data-export-skip="true"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9992,
        background: "rgba(15, 23, 42, 0.62)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <style>{`
        .fg-modal-card {
          width: min(1040px, 100%);
          max-height: min(92vh, 760px);
          background: #ffffff;
          border-radius: 18px;
          box-shadow: 0 24px 64px rgba(15, 23, 42, 0.34);
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .fg-body-split {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: row;
          overflow: hidden;
        }
        .fg-nav-rail {
          width: 268px;
          flex-shrink: 0;
          background: #f8fafc;
          border-right: 1px solid #e2e8f0;
          padding: 10px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .fg-nav-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          color: #334155;
          font-size: 12.5px;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease;
        }
        .fg-nav-btn:hover {
          background: #eef2ff;
        }
        .fg-nav-btn[data-active="true"] {
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.28);
        }
        .fg-content-pane {
          flex: 1;
          min-width: 0;
          overflow-y: auto;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: #ffffff;
        }
        .fg-content-pane > * {
          flex-shrink: 0;
        }
        .fg-video-shell {
          width: min(100%, 640px);
          margin: 0 auto;
          flex-shrink: 0;
          aspect-ratio: 16 / 9;
          border-radius: 12px;
          overflow: hidden;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
          position: relative;
        }
        .fg-video-shell video {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          background: #f8fafc;
        }
        .fg-highlights-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        @media (max-width: 780px) {
          .fg-modal-card {
            max-height: 94vh;
            border-radius: 14px;
          }
          .fg-body-split {
            flex-direction: column;
          }
          .fg-nav-rail {
            width: 100%;
            flex-shrink: 0;
            flex-direction: row;
            overflow-x: auto;
            overflow-y: hidden;
            border-right: none;
            border-bottom: 1px solid #e2e8f0;
            padding: 8px 10px;
            gap: 6px;
            scrollbar-width: none;
          }
          .fg-nav-btn {
            width: auto;
            white-space: nowrap;
            flex-shrink: 0;
            padding: 6px 10px;
            font-size: 12px;
            border: 1px solid #e2e8f0;
            background: #ffffff;
          }
          .fg-content-pane {
            padding: 12px 14px;
            gap: 10px;
          }
          .fg-highlights-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="fg-modal-card" role="dialog" aria-modal="true" aria-label="Hướng dẫn sử dụng PhysBoard">
        {/* Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #e2e8f0",
            background: "linear-gradient(135deg, #eef2ff 0%, #f0fdfa 55%, #fdf2f8 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "#ffffff",
                border: "1px solid #c7d2fe",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
                boxShadow: "0 2px 6px rgba(99, 102, 241, 0.14)",
              }}
            >
              🎓
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1e1b4b", lineHeight: 1.25 }}>
                Khám phá PhysBoard — Toàn bộ Tính năng Dạy học
              </div>
              <div style={{ fontSize: 11.5, color: "#475569", marginTop: 1 }}>
                Video thao tác thực tế kèm hướng dẫn nhanh ({activeIdx + 1}/{total} chuyên đề)
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Đóng hướng dẫn"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#475569",
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body Split */}
        <div className="fg-body-split">
          {/* Chapter List */}
          <nav className="fg-nav-rail" aria-label="Danh sách chuyên đề hướng dẫn">
            {FEATURE_GUIDE_CHAPTERS.map((item, idx) => {
              const isActive = idx === activeIdx;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="fg-nav-btn"
                  data-guide-chapter={item.id}
                  data-active={isActive ? "true" : "false"}
                  onClick={() => setActiveIdx(idx)}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 7,
                      background: isActive ? "rgba(255,255,255,0.22)" : "#e2e8f0",
                      color: isActive ? "#ffffff" : "#334155",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                    <span style={{ opacity: isActive ? 0.85 : 0.6, marginRight: 5, fontSize: 11 }}>
                      {item.stepLabel}.
                    </span>
                    {item.shortTitle}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Main Chapter View */}
          <div className="fg-content-pane">
            {/* Title + Summary */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  {chapter.badge}
                </span>
                <span style={{ fontSize: 11.5, color: "#64748b", fontWeight: 600 }}>
                  Chuyên đề {chapter.stepLabel} / {total}
                </span>
              </div>
              <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800, color: "#0f172a" }}>
                {chapter.title}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                {chapter.summary}
              </p>
            </div>

            {/* Recorded Cách 2 Video Player */}
            <div className="fg-video-shell">
              <video
                key={chapter.id}
                src={chapter.videoSrc}
                autoPlay
                loop
                muted
                playsInline
                controls
                preload="auto"
                data-testid="feature-guide-video"
              />
            </div>

            {/* Structured Feature Highlights */}
            <div className="fg-highlights-grid">
              {chapter.highlights.map((hl) => (
                <div
                  key={hl.label}
                  style={{
                    padding: "9px 11px",
                    borderRadius: 10,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1e293b" }}>
                    • {hl.label}
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.45 }}>
                    {hl.detail}
                  </div>
                </div>
              ))}
            </div>

            {/* Teaching Tip Callout */}
            <div
              style={{
                padding: "9px 12px",
                borderRadius: 10,
                background: "#fffbeb",
                border: "1px solid #fde68a",
                fontSize: 12.5,
                color: "#78350f",
                lineHeight: 1.45,
              }}
            >
              <strong>💡 Mẹo nhanh:</strong> {chapter.tip}
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid #e2e8f0",
            background: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 12.5,
              color: "#334155",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              data-testid="feature-guide-dont-show"
              checked={dontShowOnStartup}
              onChange={(e) => setDontShowOnStartup(e.target.checked)}
              style={{ accentColor: "#2563eb", cursor: "pointer" }}
            />
            <span>Không tự động hiện lại khi mở ứng dụng (luôn xem lại được ở nút 🎓 Hướng dẫn)</span>
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <button
              type="button"
              disabled={activeIdx === 0}
              onClick={handlePrev}
              style={{
                padding: "7px 13px",
                borderRadius: 9,
                border: "1px solid #cbd5e1",
                background: activeIdx === 0 ? "#f1f5f9" : "#ffffff",
                color: activeIdx === 0 ? "#94a3b8" : "#1e293b",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: activeIdx === 0 ? "not-allowed" : "pointer",
              }}
            >
              ← Trước
            </button>

            <button
              type="button"
              onClick={handleNext}
              data-testid="feature-guide-next"
              style={{
                padding: "7px 16px",
                borderRadius: 9,
                border: "none",
                background:
                  activeIdx >= total - 1
                    ? "linear-gradient(135deg, #16a34a 0%, #059669 100%)"
                    : "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
                color: "#ffffff",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 3px 10px rgba(37, 99, 235, 0.25)",
              }}
            >
              {activeIdx >= total - 1 ? "✓ Bắt đầu dạy học" : "Tiếp theo →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
