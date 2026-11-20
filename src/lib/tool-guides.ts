// ============================================================================
// Tool Guides & Instructions Registry for PhysBoard
// Detailed Vietnamese instructions for all tools, primitives, constructions,
// 3D solids, mathematical analysis, and physics instruments.
// ============================================================================

export interface ToolGuideInfo {
  title: string;
  badge?: string;
  icon: string;
  desc: string;
  shortcut?: string;
  tips?: string;
}

/** Complete catalog of instruction guides for every tool in PhysBoard */
export const TOOL_GUIDE_CATALOG: Record<string, ToolGuideInfo> = {
  // --- 1. Selection & Canvas Navigation ---
  select: {
    title: "Chọn & Biến đổi đối tượng",
    badge: "Chọn",
    icon: "↖",
    desc: "Bấm chuột để chọn đối tượng, kéo để di chuyển. Kéo các điểm neo để đổi kích thước hoặc xoay. Nhấp đúp để chỉnh sửa nhanh.",
    shortcut: "V",
    tips: "Giữ phím Shift để chọn cùng lúc nhiều đối tượng.",
  },
  "select:marquee": {
    title: "Quét chọn vùng chữ nhật",
    badge: "Quét chọn",
    icon: "⬚",
    desc: "Nhấn giữ chuột trái và kéo một khung chữ nhật trên bảng để chọn nhanh tất cả các đối tượng nằm trong vùng đó.",
    shortcut: "Shift + V",
    tips: "Sau khi chọn có thể kéo di chuyển cả nhóm hoặc bấm Delete để xóa.",
  },
  pan: {
    title: "Di chuyển bảng vẽ (Hand tool)",
    badge: "Cuộn bảng",
    icon: "✋",
    desc: "Kéo thả chuột để di chuyển khung nhìn bảng vẽ tự do theo mọi hướng.",
    shortcut: "H / Giữ phím Space",
    tips: "Bạn cũng có thể giữ phím Space hoặc bấm giữ nút cuộn giữa của chuột để cuộn bảng nhanh.",
  },

  // --- 2. Inking Tools (Bút & Nét vẽ) ---
  ink: {
    title: "Bút mực / Bút máy",
    badge: "Bút viết",
    icon: "✒",
    desc: "Kéo thả chuột hoặc bút stylus để viết chữ và vẽ tự do với nét mực mượt mà theo lực nhấn.",
    shortcut: "P",
    tips: "Có thể đổi màu và độ dày nét viết trên thanh thuộc tính.",
  },
  "ink:fountain": {
    title: "Bút máy nét thanh đậm",
    badge: "Bút máy",
    icon: "✒",
    desc: "Kéo thả chuột hoặc bút stylus để viết chữ nét thanh nét đậm tự nhiên chuẩn sư phạm.",
    shortcut: "1",
    tips: "Tương thích hoàn hảo với bút cảm ứng S-Pen, Apple Pencil và bảng vẽ Wacom.",
  },
  "ink:pencil": {
    title: "Bút chì phác thảo",
    badge: "Bút chì",
    icon: "✏",
    desc: "Kéo thả để phác thảo nét vẽ thanh mảnh, tự nhiên như bút chì gỗ trên giấy tập.",
    shortcut: "2",
    tips: "Thích hợp phác họa sơ đồ hình học hoặc nháp trước khi vẽ nét chính.",
  },
  "ink:highlighter": {
    title: "Bút dạ quang (Bút nhớ dòng)",
    badge: "Dạ quang",
    icon: "🖍",
    desc: "Kéo qua văn bản, công thức hoặc hình vẽ để đánh dấu làm nổi bật với màu bán trong suốt.",
    shortcut: "3",
    tips: "Mực dạ quang nằm dưới nét chữ nên không làm che mờ chữ viết.",
  },
  "ink:brush": {
    title: "Bút lông thư pháp",
    badge: "Bút lông",
    icon: "🖌",
    desc: "Kéo thả bút để tạo các nét vẽ nghệ thuật dày dặn, uyển chuyển theo tốc độ rê bút.",
    shortcut: "4",
  },
  "ink:dashed": {
    title: "Bút nét đứt tự do",
    badge: "Bút nét đứt",
    icon: "╌",
    desc: "Kéo thả để vẽ các đường nét đứt tự do (thích hợp vẽ đường gióng hoặc cạnh khuất).",
    shortcut: "5",
  },
  "ink:laser": {
    title: "Bút chỉ Laser trình chiếu",
    badge: "Laser",
    icon: "🔴",
    desc: "Chiếu dấu chấm laser đỏ vào nội dung bài giảng (chế độ Dấu chấm, không vẽ nét) hoặc kéo vệt sáng tự mờ dần sau 1.5s (chế độ Vệt sáng). Bấm lại nút Laser để chuyển đổi chế độ.",
    shortcut: "L",
    tips: "Bấm ⚙ cạnh nút Laser để chỉnh màu sắc và kích cỡ dấu chấm / vệt sáng.",
  },
  erase: {
    title: "Tẩy / Cục gôm xóa",
    badge: "Tẩy",
    icon: "⌫",
    desc: "Chạm hoặc quét qua nét vẽ hoặc đối tượng để xóa nhanh. Có thể đổi kích thước gôm trên thanh công cụ.",
    shortcut: "E",
    tips: "Bấm giữ nút phụ trên bút cảm ứng Stylus/S-Pen để chuyển nhanh sang tẩy.",
  },

  // --- 3. Text, Formula & Annotation ---
  formula: {
    title: "Công thức Toán học (LaTeX / KaTeX)",
    badge: "Công thức",
    icon: "∑",
    desc: "Bấm vào vị trí bất kỳ trên bảng để mở khung soạn thảo công thức Toán học chuẩn LaTeX / KaTeX trực quan.",
    shortcut: "F",
    tips: "Hỗ trợ gõ tắt phân số, căn thức, tích phân, ma trận và ký hiệu Hy Lạp.",
  },
  "text.write": {
    title: "Văn bản / Ghi chú đề bài",
    badge: "Văn bản",
    icon: "T",
    desc: "Bấm vào vị trí trên bảng để tạo hộp văn bản và nhập lời giải, ghi chú bài giảng.",
    shortcut: "T",
    tips: "Có thể đổi cỡ chữ, in đậm, đổi màu chữ và căn lề.",
  },

  // --- 4. Basic Geometric Primitives ---
  point: {
    title: "Điểm hình học",
    badge: "Điểm",
    icon: "•",
    desc: "Bấm chuột lên bảng hoặc trên các cạnh/đường để tạo điểm có gán nhãn chữ cái tự động (A, B, C...).",
    shortcut: "A",
    tips: "Kéo điểm để di chuyển, các đường nối liền sẽ tự động co giãn theo.",
  },
  "geometry.point": {
    title: "Điểm hình học",
    badge: "Điểm",
    icon: "•",
    desc: "Bấm chuột lên bảng hoặc trên các cạnh/đường để tạo điểm có gán nhãn chữ cái tự động (A, B, C...).",
    shortcut: "A",
  },
  segment: {
    title: "Đoạn thẳng",
    badge: "Đoạn thẳng",
    icon: "―",
    desc: "Bấm chọn 2 điểm có sẵn hoặc kéo chuột từ điểm đầu đến điểm cuối để vẽ đoạn thẳng.",
    shortcut: "S",
    tips: "Giữ phím Shift để tự động khóa góc nằm ngang, thẳng đứng hoặc 45°.",
  },
  "c:segment": {
    title: "Đoạn thẳng hình học",
    badge: "Đoạn thẳng",
    icon: "―",
    desc: "Bấm chọn 2 điểm hoặc kéo chuột từ điểm đầu đến điểm cuối để vẽ đoạn thẳng.",
    shortcut: "S",
  },
  "c:dseg": {
    title: "Đoạn thẳng nét đứt",
    badge: "Nét đứt",
    icon: "┄",
    desc: "Bấm chọn 2 điểm hoặc kéo chuột để vẽ đoạn thẳng nét đứt (thường dùng cho cạnh khuất hoặc đường gióng).",
    tips: "Có thể bấm chọn đoạn thẳng đã vẽ rồi đổi kiểu nét đứt trên thanh thuộc tính.",
  },
  "c:ray": {
    title: "Tia",
    badge: "Tia",
    icon: "→",
    desc: "Bấm chọn điểm gốc, sau đó bấm chọn điểm định hướng để vẽ tia kéo dài vô tận về một phía.",
    shortcut: "R",
  },
  "c:line": {
    title: "Đường thẳng",
    badge: "Đường thẳng",
    icon: "⟷",
    desc: "Bấm chọn 2 điểm để vẽ đường thẳng kéo dài vô hạn về cả hai phía.",
    shortcut: "D",
  },
  "c:vector": {
    title: "Vectơ định hướng",
    badge: "Vectơ",
    icon: "⟶",
    desc: "Bấm chọn điểm gốc rồi bấm điểm ngọn (hoặc kéo chuột) để vẽ vectơ có mũi tên chỉ hướng.",
    shortcut: "U",
  },
  circle: {
    title: "Đường tròn (Tâm & Điểm)",
    badge: "Đường tròn",
    icon: "◯",
    desc: "Bấm chọn điểm tâm, sau đó bấm chọn một điểm trên đường tròn (hoặc kéo chuột từ tâm để tạo bán kính).",
    shortcut: "C",
  },
  "c:circle": {
    title: "Đường tròn (Tâm & Điểm)",
    badge: "Đường tròn",
    icon: "◯",
    desc: "Bấm chọn điểm tâm, sau đó bấm chọn một điểm trên đường tròn (hoặc kéo chuột từ tâm để tạo bán kính).",
    shortcut: "C",
  },
  polygon: {
    title: "Đa giác tự do",
    badge: "Đa giác",
    icon: "⬡",
    desc: "Bấm lần lượt từng đỉnh của đa giác, sau đó bấm lại đỉnh đầu tiên để khép góc hoàn thành đa giác.",
    shortcut: "G",
    tips: "Nhấn phím Esc để hủy đa giác đang vẽ dở.",
  },
  "c:polygon": {
    title: "Đa giác hình học",
    badge: "Đa giác",
    icon: "⬡",
    desc: "Bấm lần lượt từng đỉnh của đa giác, sau đó bấm lại đỉnh đầu tiên để khép góc hoàn thành đa giác.",
    shortcut: "G",
  },
  floodFill: {
    title: "Tô màu diện tích (Thùng sơn)",
    badge: "Tô màu",
    icon: "🪣",
    desc: "Bấm chuột vào bên trong một đa giác, đường tròn hoặc miền khép kín bất kỳ để tô màu bề mặt.",
    shortcut: "K",
    tips: "Bấm mũi tên cạnh nút thùng sơn để chọn màu tô và độ trong suốt mong muốn.",
  },

  // --- 5. 2D Triangles (Tam giác đặc biệt) ---
  "c:triRight": {
    title: "Tam giác vuông",
    badge: "◺ Vuông",
    icon: "◺",
    desc: "Bấm chọn 2 đỉnh của cạnh góc vuông (hoặc kéo chuột) để tự động dựng tam giác vuông chuẩn xác.",
    tips: "Tự động hiển thị ký hiệu góc vuông tại đỉnh vuông.",
  },
  "c:triRightIso": {
    title: "Tam giác vuông cân",
    badge: "◺ Vuông cân",
    icon: "◺",
    desc: "Bấm chọn 2 đỉnh cạnh góc vuông để tự động dựng tam giác vuông cân (góc 90° và hai góc 45°).",
  },
  "c:triIso": {
    title: "Tam giác cân",
    badge: "△ Cân",
    icon: "△",
    desc: "Bấm chọn 2 đỉnh của cạnh đáy để dựng tam giác cân với đỉnh đối diện nằm trên đường trung trực.",
  },
  "c:triEqui": {
    title: "Tam giác đều",
    badge: "▲ Đều",
    icon: "▲",
    desc: "Bấm chọn 2 đỉnh của cạnh đáy để dựng tam giác đều có 3 cạnh bằng nhau và 3 góc bằng 60°.",
  },

  // --- 6. Triangle Lines & Centers (Đường & Tâm tam giác) ---
  "c:altitude": {
    title: "Đường cao tam giác",
    badge: "⊥ Đường cao",
    icon: "⊥",
    desc: "Bấm chọn 1 đỉnh của tam giác, rồi bấm cạnh đối diện (hoặc 2 đỉnh của cạnh đó) để hạ đường cao vuông góc.",
    tips: "Chân đường cao H sẽ tự động được đánh dấu ký hiệu vuông góc.",
  },
  "c:median": {
    title: "Đường trung tuyến tam giác",
    badge: "Trung tuyến",
    icon: "╱",
    desc: "Bấm chọn 1 đỉnh của tam giác, rồi bấm cạnh đối diện để vẽ đường trung tuyến nối đỉnh với trung điểm cạnh đối diện.",
  },
  "c:bisector": {
    title: "Đường phân giác góc",
    badge: "Phân giác",
    icon: "∠",
    desc: "Bấm lần lượt 3 đỉnh của góc (đỉnh thứ 2 là đỉnh góc) để vẽ tia phân giác chia đôi góc.",
  },
  "c:centroid": {
    title: "Trọng tâm tam giác (G)",
    badge: "G Trọng tâm",
    icon: "G",
    desc: "Bấm lần lượt 3 đỉnh của tam giác (hoặc bấm vào tam giác đã vẽ) để xác định trọng tâm G (giao điểm 3 trung tuyến).",
  },
  "c:ortho": {
    title: "Trực tâm tam giác (H)",
    badge: "H Trực tâm",
    icon: "H",
    desc: "Bấm lần lượt 3 đỉnh của tam giác để xác định trực tâm H (giao điểm 3 đường cao).",
  },
  "c:circum": {
    title: "Đường tròn ngoại tiếp tam giác",
    badge: "Ngoại tiếp",
    icon: "◯",
    desc: "Bấm lần lượt 3 đỉnh của tam giác để dựng đường tròn ngoại tiếp đi qua cả 3 đỉnh và hiển thị tâm O.",
  },
  "c:incircle": {
    title: "Đường tròn nội tiếp tam giác",
    badge: "Nội tiếp",
    icon: "◎",
    desc: "Bấm lần lượt 3 đỉnh của tam giác để dựng đường tròn nội tiếp tiếp xúc 3 cạnh và hiển thị tâm I.",
  },

  // --- 7. Geometric Relations (Quan hệ hình học) ---
  "c:onedge": {
    title: "Điểm trên đường / cạnh / đường tròn",
    badge: "Điểm trên đường",
    icon: "•",
    desc: "Bấm chuột vào một đoạn thẳng, đường thẳng hoặc đường tròn để tạo một điểm trượt nằm trên đường đó.",
  },
  "c:midpoint": {
    title: "Trung điểm đoạn thẳng",
    badge: "Trung điểm",
    icon: "•",
    desc: "Bấm chọn 2 điểm (hoặc bấm vào 1 đoạn thẳng) để tự động tạo điểm chính giữa (trung điểm).",
  },
  "c:perpbis": {
    title: "Đường trung trực",
    badge: "Trung trực",
    icon: "┼",
    desc: "Bấm chọn 2 điểm hoặc 1 đoạn thẳng để dựng đường trung trực vuông góc tại trung điểm.",
  },
  "c:diameter": {
    title: "Đường kính đường tròn",
    badge: "Đường kính",
    icon: "⌀",
    desc: "Bấm chọn tâm đường tròn, sau đó bấm 1 điểm trên đường tròn để vẽ đường kính đi qua tâm.",
  },
  "c:perp": {
    title: "Đường thẳng vuông góc",
    badge: "Vuông góc",
    icon: "⊥",
    desc: "Bấm chọn 1 đường thẳng/đoạn thẳng và 1 điểm ngoài đường đó để dựng đường vuông góc đi qua điểm.",
  },
  "c:parallel": {
    title: "Đường thẳng song song",
    badge: "Song song",
    icon: "∥",
    desc: "Bấm chọn 1 đường thẳng/đoạn thẳng và 1 điểm ngoài đường đó để dựng đường song song đi qua điểm.",
  },
  "c:intersect": {
    title: "Giao điểm của 2 đường",
    badge: "Giao điểm",
    icon: "✕",
    desc: "Bấm chọn lần lượt 2 đường thẳng, đoạn thẳng hoặc đường tròn cắt nhau để tạo điểm giao nhau chính xác.",
  },
  "c:reflect": {
    title: "Điểm đối xứng",
    badge: "Đối xứng",
    icon: "⇋",
    desc: "Bấm chọn điểm gốc, sau đó bấm điểm tâm đối xứng (hoặc trục đối xứng) để tạo điểm đối xứng tương ứng.",
  },
  "c:angleval": {
    title: "Dựng góc theo số đo cụ thể",
    badge: "Góc số đo",
    icon: "∠",
    desc: "Bấm đỉnh và tia gốc, sau đó nhập độ lớn góc (ví dụ: 30°, 45°, 60°, 120°) để vẽ tia tạo góc chuẩn xác.",
  },
  "c:tangent": {
    title: "Tiếp tuyến đường tròn",
    badge: "Tiếp tuyến",
    icon: "⟋",
    desc: "Bấm chọn 1 điểm (trên hoặc ngoài đường tròn) và chọn đường tròn để vẽ các đường tiếp tuyến.",
  },

  // --- 8. Quadrilaterals (Tứ giác) ---
  "c:pgram": {
    title: "Hình bình hành",
    badge: "Bình hành",
    icon: "▱",
    desc: "Bấm lần lượt 3 đỉnh liên tiếp A, B, C để dựng hình bình hành ABCD với đỉnh D tự động tính toán.",
  },
  "c:rhombus": {
    title: "Hình thoi",
    badge: "Hình thoi",
    icon: "◇",
    desc: "Bấm 2 điểm của một cạnh và kéo để dựng hình thoi có 4 cạnh bằng nhau.",
  },
  "c:rect": {
    title: "Hình chữ nhật",
    badge: "Chữ nhật",
    icon: "▭",
    desc: "Kéo chuột từ một góc đến góc đối diện (hoặc bấm 3 đỉnh) để dựng hình chữ nhật.",
  },
  "c:square": {
    title: "Hình vuông",
    badge: "Hình vuông",
    icon: "□",
    desc: "Bấm chọn 2 điểm của một cạnh để tự động dựng hình vuông đều 4 cạnh và 4 góc vuông.",
  },

  // --- 9. 3D Space Polyhedra & Solids (Hình học không gian) ---
  "p3:box": {
    title: "Hình hộp chữ nhật 3D",
    badge: "Hộp 3D",
    icon: "▱",
    desc: "Bấm lên bảng để đặt hình hộp chữ nhật 3D. Kéo các đỉnh để xoay không gian hoặc chỉnh dài, rộng, cao.",
    tips: "Cạnh khuất sẽ tự động vẽ nét đứt theo góc nhìn không gian.",
  },
  "p3:cube": {
    title: "Hình lập phương 3D",
    badge: "Lập phương",
    icon: "◻",
    desc: "Bấm lên bảng để đặt khối lập phương 3D có 6 mặt vuông bằng nhau. Dễ dàng xoay phối cảnh không gian.",
  },
  "p3:prism:3": {
    title: "Lăng trụ tam giác đứng 3D",
    badge: "Lăng trụ △",
    icon: "◹",
    desc: "Bấm lên bảng để đặt lăng trụ đứng đáy tam giác ABC.A'B'C'. Kéo các đỉnh để xoay góc quan sát.",
  },
  "p3:prism:5": {
    title: "Lăng trụ ngũ giác 3D",
    badge: "Lăng trụ ngũ giác",
    icon: "◹",
    desc: "Bấm lên bảng để đặt lăng trụ đứng đáy ngũ giác 3D.",
  },
  "p3:prism:6": {
    title: "Lăng trụ lục giác đều 3D",
    badge: "Lăng trụ lục giác",
    icon: "◹",
    desc: "Bấm lên bảng để đặt lăng trụ đứng lục giác đều 3D.",
  },
  "p3:pyramid:3": {
    title: "Hình chóp tam giác (Tứ diện) 3D",
    badge: "Chóp tam giác",
    icon: "△",
    desc: "Bấm lên bảng để đặt hình chóp tam giác S.ABC. Có thể vẽ thêm điểm, đường cao và thiết diện trên các mặt.",
  },
  "p3:pyramid:4": {
    title: "Hình chóp tứ giác 3D",
    badge: "Chóp tứ giác",
    icon: "△",
    desc: "Bấm lên bảng để đặt hình chóp tứ giác S.ABCD. Kéo chuột để thay đổi góc chiếu phối cảnh không gian.",
  },
  "p3:pyramid:5": {
    title: "Hình chóp ngũ giác 3D",
    badge: "Chóp ngũ giác",
    icon: "△",
    desc: "Bấm lên bảng để đặt hình chóp đáy ngũ giác S.ABCDE.",
  },
  "p3:pyramid:6": {
    title: "Hình chóp lục giác đều 3D",
    badge: "Chóp lục giác",
    icon: "△",
    desc: "Bấm lên bảng để đặt hình chóp đáy lục giác đều 3D.",
  },
  "p3:frustum:3": {
    title: "Hình chóp cụt tam giác 3D",
    badge: "Chóp cụt △",
    icon: "⏢",
    desc: "Bấm lên bảng để đặt hình chóp cụt đều đáy tam giác (hai đáy tam giác song song).",
  },
  "p3:frustum:4": {
    title: "Hình chóp cụt tứ giác 3D",
    badge: "Chóp cụt tứ giác",
    icon: "⏢",
    desc: "Bấm lên bảng để đặt hình chóp cụt đều đáy tứ giác.",
  },
  "p3:frustum:6": {
    title: "Hình chóp cụt lục giác 3D",
    badge: "Chóp cụt lục giác",
    icon: "⏢",
    desc: "Bấm lên bảng để đặt hình chóp cụt đáy lục giác đều.",
  },
  "p3:cylinder": {
    title: "Hình trụ tròn xoay 3D",
    badge: "Hình trụ",
    icon: "▭",
    desc: "Bấm lên bảng để đặt hình trụ 3D. Kéo các điểm neo để điều chỉnh bán kính đáy R và chiều cao h.",
  },
  "p3:cone": {
    title: "Hình nón tròn xoay 3D",
    badge: "Hình nón",
    icon: "◭",
    desc: "Bấm lên bảng để đặt hình nón 3D gồm đỉnh S, bán kính đáy R và đường sinh l.",
  },
  "p3:sphere": {
    title: "Hình cầu / Mặt cầu 3D",
    badge: "Hình cầu",
    icon: "●",
    desc: "Bấm lên bảng để đặt hình cầu 3D với tâm O, đường tròn lớn xích đạo và các trục tọa độ rõ ràng.",
  },
  "p3:axes": {
    title: "Hệ trục toạ độ không gian Oxyz",
    badge: "Trục Oxyz",
    icon: "⟂",
    desc: "Bấm lên bảng để đặt hệ trục toạ độ không gian 3 chiều Oxyz. Kéo xoay để đổi góc chiếu trục tọa độ.",
  },
  plane: {
    title: "Mặt phẳng biểu diễn trong không gian (P)",
    badge: "Mặt phẳng",
    icon: "▱",
    desc: "Bấm lên bảng để đặt hình bình hành biểu diễn mặt phẳng trong không gian 3 chiều.",
  },

  // --- 10. 3D Advanced Constructions (Dựng hình không gian nâng cao) ---
  "c:lineplane": {
    title: "Giao điểm đường thẳng – mặt phẳng",
    badge: "Giao đường-mặt",
    icon: "✕",
    desc: "Bấm chọn 1 đường thẳng và 3 điểm của mặt phẳng để tìm giao điểm trong không gian.",
  },
  "c:giaotuyen": {
    title: "Giao tuyến của hai mặt phẳng",
    badge: "Giao tuyến 3D",
    icon: "⟋",
    desc: "Bấm 3 điểm của mặt thứ nhất (vd: S, A, C) rồi 3 điểm của mặt thứ hai (vd: S, B, D) để dựng giao tuyến chung.",
  },
  "c:perp3d": {
    title: "Đoạn vuông góc từ điểm đến đường thẳng 3D",
    badge: "Vuông góc 3D",
    icon: "⊥",
    desc: "Bấm chọn 1 điểm và 1 đường thẳng trong không gian để dựng đoạn vuông góc kẻ từ điểm đến đường thẳng.",
  },
  "c:section": {
    title: "Thiết diện cắt đa diện",
    badge: "Thiết diện",
    icon: "▱",
    desc: "Bấm chọn 3 điểm nằm trên các cạnh hoặc mặt của khối 3D để tự động cắt và vẽ thiết diện đa giác chính xác kèm nét khuất.",
    tips: "Tự động xác định giao tuyến của mặt phẳng cắt với từng mặt của khối đa diện.",
  },
  "c:boxrule": {
    title: "Quy tắc vectơ hình hộp",
    badge: "Vectơ hộp",
    icon: "⟶",
    desc: "Bấm đỉnh gốc A, rồi 3 đỉnh kề B, D, A' để minh họa quy tắc cộng vectơ hình hộp: AB + AD + AA' = AC'.",
  },
  "c:circumsphere": {
    title: "Mặt cầu ngoại tiếp khối đa diện",
    badge: "Mặt cầu ngoại tiếp",
    icon: "◯",
    desc: "Bấm vào một khối đa diện để dựng mặt cầu đi qua tất cả các đỉnh và hiển thị tâm I.",
  },
  "c:flatten": {
    title: "Tách mặt phẳng ra hình thật (2D)",
    badge: "Tách mặt phẳng",
    icon: "⧉",
    desc: "Bấm 3 đỉnh của một mặt (vd: S, A, B) để tách và hiển thị hình phẳng với kích thước thật ngay bên cạnh khối 3D.",
    tips: "Giúp học sinh dễ dàng tính góc, diện tích và độ dài trên mặt phẳng thật.",
  },
  "c:unfold": {
    title: "Trải phẳng đa diện (Net 2D gấp hình)",
    badge: "Trải phẳng Net",
    icon: "◫",
    desc: "Bấm vào khối 3D (chóp, lăng trụ, hộp) để trải phẳng toàn bộ các mặt thành bản vẽ 2D gấp hình.",
  },
  "c:footplane": {
    title: "Hình chiếu của điểm lên mặt phẳng",
    badge: "Hình chiếu 3D",
    icon: "⊥",
    desc: "Bấm chọn điểm và chọn mặt phẳng (hoặc 3 đỉnh) để dựng hình chiếu vuông góc H của điểm lên mặt phẳng.",
  },
  "c:distplane": {
    title: "Khoảng cách từ điểm đến mặt phẳng",
    badge: "Khoảng cách 3D",
    icon: "📏",
    desc: "Bấm chọn điểm và mặt phẳng để hiển thị đoạn vuông góc đo khoảng cách kèm giá trị số đo.",
  },
  "c:commonperp": {
    title: "Đoạn vuông góc chung của 2 đường chéo nhau",
    badge: "Vuông góc chung",
    icon: "⟂",
    desc: "Bấm chọn 2 đường thẳng chéo nhau trong không gian để dựng đoạn vuông góc chung ngắn nhất giữa hai đường.",
  },
  "c:measure": {
    title: "Đo góc trong không gian",
    badge: "Đo góc 3D",
    icon: "∠",
    desc: "Bấm chọn 3 điểm trong không gian để đo độ lớn góc tạo bởi hai đoạn thẳng.",
  },
  "c:anglelp": {
    title: "Góc giữa đường thẳng và mặt phẳng",
    badge: "Góc đường-mặt",
    icon: "∠",
    desc: "Bấm chọn đường thẳng và 3 điểm của mặt phẳng để đo góc giữa đường thẳng và hình chiếu của nó trên mặt.",
  },
  "c:angleplanes": {
    title: "Góc giữa hai mặt phẳng (Góc nhị diện)",
    badge: "Góc 2 mặt",
    icon: "∠",
    desc: "Bấm lần lượt các điểm xác định hai mặt phẳng để đo góc nhị diện giữa hai mặt phẳng đó.",
  },

  // --- 11. Coordinate Systems, Functions & Statistics (Hàm số & Thống kê) ---
  "p3:oxy": {
    title: "Hệ trục toạ độ Oxy phẳng",
    badge: "Trục Oxy",
    icon: "┼",
    desc: "Bấm lên bảng để đặt hệ trục toạ độ vuông góc Oxy với các vạch chia số đo và mũi tên chuẩn.",
    tips: "Có thể kéo dời tâm O hoặc phóng to thu nhỏ tỉ lệ vạch chia.",
  },
  "p3:plot": {
    title: "Vẽ đồ thị hàm số y = f(x)",
    badge: "Đồ thị",
    icon: "ƒ",
    desc: "Nhập biểu thức hàm số y = f(x) (bậc 1, bậc 2, bậc 3, phân thức, lượng giác...) để vẽ đồ thị chính xác lên hệ trục Oxy.",
    tips: "Hỗ trợ tìm cực trị, điểm uốn và tiệm cận tự động.",
  },
  "conic:ellipse": {
    title: "Đường Elip chính tắc",
    badge: "Elip",
    icon: "⬭",
    desc: "Nhập độ dài bán trục lớn a và bán trục nhỏ b để vẽ đường elip kèm các tiêu điểm F1, F2.",
  },
  "conic:parabola": {
    title: "Đường Parabol chính tắc",
    badge: "Parabol",
    icon: "∪",
    desc: "Nhập tham số p để vẽ đường parabol chính tắc y² = 2px kèm tiêu điểm F và đường chuẩn.",
  },
  "conic:hyperbola": {
    title: "Đường Hypebol chính tắc",
    badge: "Hypebol",
    icon: ")(",
    desc: "Nhập tham số a, b để vẽ hai nhánh đường hypebol kèm tiêu điểm và các đường tiệm cận.",
  },
  "vartable:variation": {
    title: "Bảng biến thiên hàm số",
    badge: "Bảng biến thiên",
    icon: "↗",
    desc: "Nhập biểu thức hàm số để tự động tính đạo hàm, lập bảng xét dấu và vẽ chiều biến thiên của hàm số.",
  },
  "vartable:sign": {
    title: "Bảng xét dấu nhị thức / tam thức",
    badge: "Bảng xét dấu",
    icon: "±",
    desc: "Nhập biểu thức để lập bảng xét dấu nhị thức bậc nhất hoặc tam thức bậc hai trực quan.",
  },
  "p3:chart": {
    title: "Biểu đồ thống kê số liệu",
    badge: "Biểu đồ",
    icon: "📊",
    desc: "Nhập bảng số liệu thống kê để vẽ biểu đồ cột, biểu đồ đường hoặc biểu đồ đoạn thẳng.",
  },
  "p3:bayes": {
    title: "Sơ đồ cây xác suất Bayes",
    badge: "Xác suất Bayes",
    icon: "🌿",
    desc: "Tạo sơ đồ cây xác suất phân nhánh và tính xác suất có điều kiện theo công thức Bayes.",
  },
  "p3:numberline": {
    title: "Trục số thực & Biểu diễn tập hợp",
    badge: "Trục số",
    icon: "━",
    desc: "Vẽ trục số và biểu diễn các khoảng, đoạn số thực kèm các phép toán giao, hợp, hiệu.",
  },

  // --- 12. Physical Instruments (Dụng cụ đo đạc thực tế) ---
  "phys:inst:ruler": {
    title: "Thước kẻ học sinh (cm / mm)",
    badge: "Thước kẻ",
    icon: "📏",
    desc: "Kéo thân thước để di chuyển, kéo núm xoay ở đầu thước để đổi góc nghiêng đo đạc hoặc kẻ đường thẳng theo mép thước.",
    tips: "Đặt thước lên các đoạn thẳng hình học để đo chiều dài thực tế.",
  },
  "phys:inst:protractor": {
    title: "Thước đo góc (0°–180° / 360°)",
    badge: "Thước đo góc",
    icon: "📐",
    desc: "Kéo tâm thước vào đỉnh góc, xoay vạch 0° trùng cạnh góc ban đầu để đọc số đo góc trên vạch chia độ.",
  },
  "phys:inst:setsquare": {
    title: "Thước Êke (30°-60°-90° hoặc 45°-45°-90°)",
    badge: "Êke",
    icon: "📐",
    desc: "Kéo đặt êke vào vị trí cần vẽ, xoay góc theo đường thẳng để kẻ đường vuông góc hoặc góc mẫu chuẩn xác.",
  },
  "phys:inst:compass": {
    title: "Compa vẽ đường tròn thực hành",
    badge: "Compa",
    icon: "🧭",
    desc: "Kéo chân kim vào tâm, chỉnh bán kính độ mở của compa và kéo đầu bút chì để quay đường tròn.",
  },
  "phys:inst:stopwatch": {
    title: "Đồng hồ bấm giây thực hành",
    badge: "Bấm giây",
    icon: "⏱",
    desc: "Bấm Bắt đầu/Dừng (Start/Stop) để đếm thời gian thực hiện thí nghiệm, bấm Vòng (Lap) để ghi mốc đo.",
  },
  "phys:labtable": {
    title: "Bảng số liệu thực hành & Đường hồi quy",
    badge: "Bảng thực hành",
    icon: "📝",
    desc: "Nhập các cặp giá trị (x, y) đo được từ thực tế để tự động tính toán và vẽ đường hồi quy tương quan lên Oxy.",
  },

  // --- 13. Physics Diagrams & Simulations (Mô phỏng & Thí nghiệm Vật lý) ---
  "phys:diag:circuit": {
    title: "Mạch điện DC định luật Ôm toàn mạch",
    badge: "Mạch điện DC",
    icon: "⚡",
    desc: "Bấm lên bảng để đặt sơ đồ mạch điện. Bấm công tắc K để đóng/ngắt mạch, quan sát số chỉ Ampe kế & Vôn kế tức thời.",
    tips: "Thay đổi giá trị suất điện động E và điện trở R để xem dòng điện thay đổi theo định luật Ôm.",
  },
  "phys:diag:circuit_parallel": {
    title: "Mạch điện phân nhánh R1 // R2",
    badge: "Mạch song song",
    icon: "⚡",
    desc: "Sơ đồ mạch điện gồm các điện trở song song, tự động tính điện trở tương đương và dòng điện qua từng nhánh.",
  },
  "phys:diag:fbd": {
    title: "Sơ đồ phân tích lực (Mặt phẳng nghiêng)",
    badge: "Phân tích lực",
    icon: "↗",
    desc: "Kéo thanh trượt góc nghiêng α, khối lượng m và hệ số ma sát để xem trực quan các vectơ lực P, N, Fms và hợp lực.",
  },
  "phys:diag:optics": {
    title: "Quang hình học (Thấu kính & Gương)",
    badge: "Quang hình",
    icon: "🔍",
    desc: "Kéo thay đổi tiêu cự f và vị trí vật d để quan sát đường đi của 3 tia sáng đặc biệt và ảnh A'B' (thật/ảo, cùng/ngược chiều).",
  },
  htmlsim: {
    title: "Mô phỏng thí nghiệm Vật lý tương tác",
    badge: "Mô phỏng HTML",
    icon: "🔬",
    desc: "Khung mô phỏng thí nghiệm trực quan: bấm chạy, tạm dừng, kéo các con lắc, lò xo hoặc tương tác trực tiếp trên mô phỏng.",
  },
};

/** Contextual guide when objects are selected on canvas */
export function getSelectionGuide(
  selectedCount: number,
  primaryType?: string,
  extraLabel?: string
): ToolGuideInfo {
  if (selectedCount === 1) {
    switch (primaryType) {
      case "GeomPoint":
        return {
          title: `Đang chọn Điểm ${extraLabel || ""}`.trim(),
          badge: "Điểm",
          icon: "•",
          desc: "Kéo để di chuyển điểm (các đường và hình liên kết sẽ tự động co giãn theo). Bấm nút 'Đổi tên' trên thanh chọn để sửa nhãn.",
          tips: "Bấm nút Ẩn/Hiện tên hoặc Cỡ chấm để tùy chỉnh hiển thị.",
        };
      case "GeomSegment":
      case "GeomLine":
      case "GeomRay":
      case "GeomVector":
        return {
          title: "Đang chọn Đoạn thẳng / Đường thẳng",
          badge: "Đường",
          icon: "―",
          desc: "Kéo để di chuyển vị trí. Có thể đổi kiểu nét đứt, đổi màu sắc và độ dày nét trên thanh thuộc tính.",
          tips: "Bấm nút 'Thêm trung điểm' trên thanh công cụ để chia đôi đoạn thẳng.",
        };
      case "GeomCircle":
        return {
          title: "Đang chọn Đường tròn",
          badge: "Đường tròn",
          icon: "◯",
          desc: "Kéo tâm để di chuyển, kéo đường biên để thay đổi bán kính. Có thể đổi màu viền hoặc màu tô diện tích.",
        };
      case "GeomPolygon":
        return {
          title: "Đang chọn Đa giác",
          badge: "Đa giác",
          icon: "⬡",
          desc: "Kéo để di chuyển đa giác. Kéo từng đỉnh để chỉnh sửa hình dạng hoặc đổi màu viền, màu tô nền.",
        };
      case "Solid3D":
        return {
          title: "Đang chọn Khối hình không gian 3D",
          badge: "Khối 3D",
          icon: "🧊",
          desc: "Kéo thân khối để di chuyển. Kéo núm xoay tròn để thay đổi góc chiếu phối cảnh không gian. Bấm 'Trải phẳng' hoặc 'Thiết diện' để xử lý nâng cao.",
          tips: "Kéo các đỉnh đáy để điều chỉnh chiều dài, chiều rộng và chiều cao của khối.",
        };
      case "MathText":
        return {
          title: "Đang chọn Công thức Toán / Văn bản",
          badge: "Công thức",
          icon: "∑",
          desc: "Nhấp đúp vào công thức để mở trình soạn thảo KaTeX hoặc sửa mã LaTeX. Kéo để di chuyển vị trí.",
        };
      case "PhysicsInstrument":
        return {
          title: "Đang chọn Dụng cụ thực hành đo đạc",
          badge: "Dụng cụ",
          icon: "📏",
          desc: "Kéo thân dụng cụ để di chuyển trên bảng. Kéo núm xoay để điều chỉnh góc nghiêng đo đạc hoặc chỉnh vạch đo.",
        };
      case "Axes2D":
      case "Axes3D":
        return {
          title: "Đang chọn Hệ trục toạ độ",
          badge: "Hệ trục",
          icon: "┼",
          desc: "Kéo gốc toạ độ O để di chuyển hệ trục. Có thể gắn hàm số vẽ đồ thị hoặc chỉnh tỉ lệ vạch chia.",
        };
      case "VarTable":
        return {
          title: "Đang chọn Bảng biến thiên / Bảng xét dấu",
          badge: "Bảng",
          icon: "↗",
          desc: "Kéo để di chuyển bảng. Nhấp đúp để chỉnh sửa hàm số hoặc khoảng xét biến thiên.",
        };
      case "HtmlSim":
        return {
          title: "Đang chọn Khung mô phỏng thí nghiệm",
          badge: "Mô phỏng",
          icon: "🔬",
          desc: "Kéo thanh tiêu đề để di chuyển khung mô phỏng. Bấm các nút điều khiển bên trong để thao tác thí nghiệm trực tiếp.",
        };
      default:
        return {
          title: "Đang chọn 1 đối tượng",
          badge: "Chọn",
          icon: "↖",
          desc: "Kéo để di chuyển đối tượng, kéo các điểm góc để đổi kích thước hoặc xoay. Bấm phím Delete để xóa.",
        };
    }
  }

  return {
    title: `Đang chọn ${selectedCount} đối tượng`,
    badge: "Nhóm chọn",
    icon: "⬚",
    desc: `Kéo để di chuyển cả ${selectedCount} đối tượng cùng lúc. Có thể đổi màu sắc, độ dày nét chung hoặc bấm phím Delete/Backspace để xóa tất cả.`,
    tips: "Bấm chuột ra ngoài bảng trống để hủy chọn.",
  };
}

/**
 * Intelligent resolver that returns a comprehensive instruction guide
 * for ANY tool, active construction step, or selection state without missing any feature.
 */
export function getToolGuide(
  activeTool: string | null,
  statusHint?: string | null,
  selectionInfo?: { count: number; type?: string; label?: string } | null
): ToolGuideInfo {
  // 1. If objects are actively selected and tool is select or default, show selection guide
  if (
    selectionInfo &&
    selectionInfo.count > 0 &&
    (activeTool === null || activeTool === "select" || activeTool === "select:marquee")
  ) {
    const selGuide = getSelectionGuide(
      selectionInfo.count,
      selectionInfo.type,
      selectionInfo.label
    );
    // If there is an active construction status hint, prioritize the interactive step
    if (statusHint) {
      return {
        ...selGuide,
        desc: `${statusHint} — ${selGuide.desc}`,
      };
    }
    return selGuide;
  }

  // 2. Normal tool lookup
  const toolKey = activeTool || "select";
  const catalogEntry = TOOL_GUIDE_CATALOG[toolKey];

  if (catalogEntry) {
    if (statusHint) {
      return {
        ...catalogEntry,
        desc: `${statusHint} — ${catalogEntry.desc}`,
      };
    }
    return catalogEntry;
  }

  // 3. Prefix & variant matches
  if (toolKey.startsWith("p3:prism")) {
    return {
      title: "Lăng trụ đứng 3D",
      badge: "Lăng trụ 3D",
      icon: "◹",
      desc: statusHint || "Bấm lên bảng để đặt lăng trụ đứng 3D. Kéo xoay chuột để quan sát các góc nhìn không gian.",
    };
  }

  if (toolKey.startsWith("p3:pyramid")) {
    return {
      title: "Hình chóp 3D",
      badge: "Chóp 3D",
      icon: "△",
      desc: statusHint || "Bấm lên bảng để đặt hình chóp 3D. Dễ dàng xoay phối cảnh và vẽ thêm điểm/đường trên các mặt.",
    };
  }

  if (toolKey.startsWith("p3:frustum")) {
    return {
      title: "Hình chóp cụt 3D",
      badge: "Chóp cụt 3D",
      icon: "⏢",
      desc: statusHint || "Bấm lên bảng để đặt hình chóp cụt đều 3D với 2 đáy song song.",
    };
  }

  if (toolKey.startsWith("fill:")) {
    return {
      title: "Tô màu diện tích",
      badge: "Tô màu",
      icon: "🪣",
      desc: statusHint || "Bấm chuột vào bên trong một hình hoặc miền khép kín bất kỳ để tô màu bề mặt.",
    };
  }

  if (toolKey.startsWith("phys:inst:")) {
    const kind = toolKey.slice(10);
    const instrumentEntry = TOOL_GUIDE_CATALOG[`phys:inst:${kind}`];
    if (instrumentEntry) return instrumentEntry;
    return {
      title: `Dụng cụ thực hành đo đạc (${kind})`,
      badge: "Dụng cụ",
      icon: "📏",
      desc: statusHint || "Bấm lên bảng để đặt dụng cụ đo đạc. Kéo để di chuyển và xoay chỉnh góc đo.",
    };
  }

  if (toolKey.startsWith("phys:diag:")) {
    const diagEntry = TOOL_GUIDE_CATALOG[toolKey];
    if (diagEntry) return diagEntry;
    return {
      title: "Sơ đồ / Thí nghiệm Vật lý",
      badge: "Vật lý",
      icon: "⚡",
      desc: statusHint || "Bấm lên bảng để đặt sơ đồ thí nghiệm Vật lý tương tác trực quan.",
    };
  }

  // 4. Fallback for any other dynamic tool
  return {
    title: `Chức năng: ${toolKey}`,
    badge: "Công cụ",
    icon: "💡",
    desc: statusHint || "Bấm chuột hoặc kéo thả trên bảng để sử dụng chức năng này. Bấm Esc để hủy hoặc chuyển công cụ.",
  };
}
