/**
 * Central Command Registry & Customizable Keyboard Shortcuts for Mathvera Whiteboard.
 */

export type CommandCategory =
  | "tools"
  | "plane"
  | "space"
  | "functions"
  | "physics"
  | "actions";

export interface CommandDescriptor {
  id: string;
  label: string;
  category: CommandCategory;
  icon: string;
  defaultShortcut: string | null;
  description?: string;
  keywords?: string;
}

export const SHORTCUTS_STORAGE_KEY = "wb_custom_shortcuts_v1";

export const COMMAND_CATEGORY_LABELS: Array<{
  id: CommandCategory | "all";
  label: string;
}> = [
  { id: "all", label: "Tất cả" },
  { id: "tools", label: "Công cụ vẽ" },
  { id: "plane", label: "Hình phẳng" },
  { id: "space", label: "Không gian 3D" },
  { id: "functions", label: "Hàm số & Thống kê" },
  { id: "physics", label: "Vật lý & Thí nghiệm" },
  { id: "actions", label: "Thao tác & Trang" },
];

export const WHITEBOARD_COMMANDS: CommandDescriptor[] = [
  // --- Công cụ vẽ ---
  {
    id: "tool:select",
    label: "Chọn / Di chuyển",
    category: "tools",
    icon: "↖",
    defaultShortcut: "V",
    description: "Chuyển về con trỏ chọn và chỉnh sửa đối tượng",
    keywords: "chon select pointer cursor",
  },
  {
    id: "tool:select:marquee",
    label: "Quét chọn vùng",
    category: "tools",
    icon: "▢",
    defaultShortcut: "M",
    description: "Kéo khung chữ nhật để chọn nhiều đối tượng",
    keywords: "quet chon vung marquee box",
  },
  {
    id: "tool:ink",
    label: "Bút tự do",
    category: "tools",
    icon: "✎",
    defaultShortcut: "P",
    description: "Vẽ nét tự do mượt mà",
    keywords: "but ve ink pen",
  },
  {
    id: "tool:ink:fountain",
    label: "Bút máy (nét thanh đậm)",
    category: "tools",
    icon: "✒",
    defaultShortcut: "B",
    description: "Vẽ nét bút máy có độ thanh đậm theo góc nghiêng",
    keywords: "but may calligraphy fountain pen",
  },
  {
    id: "tool:erase",
    label: "Tẩy",
    category: "tools",
    icon: "⌫",
    defaultShortcut: "E",
    description: "Chạm để xoá nét vẽ hoặc hình khối",
    keywords: "tay xoa eraser",
  },
  {
    id: "tool:point",
    label: "Chấm điểm",
    category: "tools",
    icon: "•",
    defaultShortcut: ".",
    description: "Đặt điểm tự động đánh tên A, B, C...",
    keywords: "diem point geompoint",
  },
  {
    id: "tool:c:segment",
    label: "Đoạn thẳng",
    category: "tools",
    icon: "╱",
    defaultShortcut: "L",
    description: "Vẽ đoạn thẳng nối 2 điểm",
    keywords: "doan thang segment",
  },
  {
    id: "tool:c:line",
    label: "Đường thẳng",
    category: "tools",
    icon: "↔",
    defaultShortcut: "Shift+L",
    description: "Vẽ đường thẳng vô hạn qua 2 điểm",
    keywords: "duong thang line",
  },
  {
    id: "tool:c:ray",
    label: "Tia",
    category: "tools",
    icon: "→",
    defaultShortcut: "R",
    description: "Vẽ tia xuất phát từ một điểm",
    keywords: "tia ray",
  },
  {
    id: "tool:c:vector",
    label: "Vectơ",
    category: "tools",
    icon: "⟶",
    defaultShortcut: "Shift+V",
    description: "Vẽ vectơ có hướng và mũi tên",
    keywords: "vecto vector",
  },
  {
    id: "tool:circle",
    label: "Đường tròn",
    category: "tools",
    icon: "◯",
    defaultShortcut: "C",
    description: "Kéo từ tâm ra để vẽ đường tròn",
    keywords: "duong tron hinh tron circle",
  },
  {
    id: "tool:polygon",
    label: "Đa giác tự do",
    category: "tools",
    icon: "⬠",
    defaultShortcut: "Shift+P",
    description: "Chấm các đỉnh liên tiếp để tạo đa giác khép kín",
    keywords: "da giac polygon",
  },
  {
    id: "tool:formula",
    label: "Công thức toán (LaTeX)",
    category: "tools",
    icon: "∑",
    defaultShortcut: "T",
    description: "Chèn công thức toán học MathLive / KaTeX",
    keywords: "cong thuc formula latex math text",
  },
  {
    id: "tool:floodFill",
    label: "Tô màu vùng",
    category: "tools",
    icon: "🪣",
    defaultShortcut: "G",
    description: "Đổ màu vào miền kín hoặc mặt hình khối",
    keywords: "to mau fill bucket",
  },
  {
    id: "tool:pan",
    label: "Kéo bảng (Pan)",
    category: "tools",
    icon: "✋",
    defaultShortcut: "H",
    description: "Di chuyển vùng nhìn bảng vẽ",
    keywords: "keo bang pan hand",
  },

  // --- Hình phẳng ---
  {
    id: "tool:c:triRight",
    label: "Tam giác vuông",
    category: "plane",
    icon: "◺",
    defaultShortcut: "Shift+1",
    description: "Chèn mẫu tam giác vuông ABC (vuông tại A)",
    keywords: "tam giac vuong right triangle",
  },
  {
    id: "tool:c:triRightIso",
    label: "Tam giác vuông cân",
    category: "plane",
    icon: "◺",
    defaultShortcut: null,
    keywords: "tam giac vuong can right isosceles",
  },
  {
    id: "tool:c:triIso",
    label: "Tam giác cân",
    category: "plane",
    icon: "△",
    defaultShortcut: null,
    keywords: "tam giac can isosceles",
  },
  {
    id: "tool:c:triEqui",
    label: "Tam giác đều",
    category: "plane",
    icon: "▲",
    defaultShortcut: "Shift+2",
    keywords: "tam giac deu equilateral",
  },
  {
    id: "tool:c:altitude",
    label: "Đường cao tam giác",
    category: "plane",
    icon: "⊥",
    defaultShortcut: "Alt+1",
    description: "Dựng trực tiếp trên tam giác đang chọn hoặc bấm đỉnh + cạnh đối",
    keywords: "duong cao altitude",
  },
  {
    id: "tool:c:median",
    label: "Đường trung tuyến",
    category: "plane",
    icon: "╱",
    defaultShortcut: "Alt+2",
    description: "Dựng trực tiếp trên tam giác đang chọn hoặc bấm đỉnh + cạnh đối",
    keywords: "trung tuyen median",
  },
  {
    id: "tool:c:bisector",
    label: "Đường phân giác",
    category: "plane",
    icon: "∠",
    defaultShortcut: "Alt+3",
    description: "Dựng trực tiếp trên tam giác đang chọn hoặc bấm đỉnh + cạnh đối",
    keywords: "phan giac bisector",
  },
  {
    id: "tool:c:centroid",
    label: "Trọng tâm G của tam giác",
    category: "plane",
    icon: "G",
    defaultShortcut: "Alt+G",
    description: "Tự dựng trên tam giác đang chọn hoặc bấm tam giác / 3 đỉnh",
    keywords: "trong tam g centroid",
  },
  {
    id: "tool:c:ortho",
    label: "Trực tâm H của tam giác",
    category: "plane",
    icon: "H",
    defaultShortcut: "Alt+H",
    description: "Tự dựng trên tam giác đang chọn hoặc bấm tam giác / 3 đỉnh",
    keywords: "truc tam h orthocenter",
  },
  {
    id: "tool:c:circum",
    label: "Đường tròn ngoại tiếp tam giác",
    category: "plane",
    icon: "◯",
    defaultShortcut: "Alt+O",
    description: "Tự dựng tâm O và đường tròn ngoại tiếp tam giác đang chọn",
    keywords: "duong tron ngoai tiep circumcircle",
  },
  {
    id: "tool:c:incircle",
    label: "Đường tròn nội tiếp tam giác",
    category: "plane",
    icon: "◎",
    defaultShortcut: "Alt+I",
    description: "Tự dựng tâm I và đường tròn nội tiếp tam giác đang chọn",
    keywords: "duong tron noi tiep incircle",
  },
  {
    id: "tool:c:midpoint",
    label: "Trung điểm đoạn thẳng",
    category: "plane",
    icon: "•",
    defaultShortcut: "Alt+M",
    keywords: "trung diem midpoint",
  },
  {
    id: "tool:c:perpbis",
    label: "Đường trung trực",
    category: "plane",
    icon: "┼",
    defaultShortcut: "Alt+T",
    keywords: "trung truc perpendicular bisector",
  },
  {
    id: "tool:c:perp",
    label: "Đường vuông góc",
    category: "plane",
    icon: "⊥",
    defaultShortcut: "Alt+V",
    keywords: "vuong goc perpendicular",
  },
  {
    id: "tool:c:parallel",
    label: "Đường song song",
    category: "plane",
    icon: "∥",
    defaultShortcut: "Alt+S",
    keywords: "song song parallel",
  },
  {
    id: "tool:c:intersect",
    label: "Giao điểm hai đường / đường tròn",
    category: "plane",
    icon: "✕",
    defaultShortcut: "Alt+X",
    keywords: "giao diem intersection",
  },
  {
    id: "tool:c:reflect",
    label: "Điểm đối xứng",
    category: "plane",
    icon: "⇋",
    defaultShortcut: null,
    keywords: "doi xung reflect symmetry",
  },
  {
    id: "tool:c:tangent",
    label: "Tiếp tuyến đường tròn",
    category: "plane",
    icon: "⟋",
    defaultShortcut: null,
    keywords: "tiep tuyen tangent",
  },
  {
    id: "tool:c:rect",
    label: "Hình chữ nhật",
    category: "plane",
    icon: "▭",
    defaultShortcut: null,
    keywords: "hinh chu nhat rectangle",
  },
  {
    id: "tool:c:square",
    label: "Hình vuông",
    category: "plane",
    icon: "□",
    defaultShortcut: null,
    keywords: "hinh vuong square",
  },
  {
    id: "tool:c:pgram",
    label: "Hình bình hành",
    category: "plane",
    icon: "▱",
    defaultShortcut: null,
    keywords: "hinh binh hanh parallelogram",
  },
  {
    id: "tool:c:rhombus",
    label: "Hình thoi",
    category: "plane",
    icon: "◇",
    defaultShortcut: null,
    keywords: "hinh thoi rhombus",
  },
  {
    id: "action:toggleConstructMarks",
    label: "Bật / Tắt tự vẽ ký hiệu (vuông góc, bằng nhau)",
    category: "plane",
    icon: "☑",
    defaultShortcut: null,
    keywords: "tu ve ky hieu o vuong gach bang nhau",
  },

  // --- Không gian 3D ---
  {
    id: "tool:p3:pyramid:3",
    label: "Hình chóp tam giác (S.ABC)",
    category: "space",
    icon: "△",
    defaultShortcut: null,
    keywords: "chop tam giac tu dien pyramid",
  },
  {
    id: "tool:p3:pyramid:4",
    label: "Hình chóp tứ giác (S.ABCD)",
    category: "space",
    icon: "△",
    defaultShortcut: null,
    keywords: "chop tu giac pyramid",
  },
  {
    id: "tool:p3:box",
    label: "Hình hộp chữ nhật",
    category: "space",
    icon: "▱",
    defaultShortcut: null,
    keywords: "hop chu nhat box 3d",
  },
  {
    id: "tool:p3:cube",
    label: "Hình lập phương",
    category: "space",
    icon: "◻",
    defaultShortcut: null,
    keywords: "lap phuong cube 3d",
  },
  {
    id: "tool:p3:prism:3",
    label: "Lăng trụ tam giác",
    category: "space",
    icon: "◹",
    defaultShortcut: null,
    keywords: "lang tru prism 3d",
  },
  {
    id: "tool:p3:cylinder",
    label: "Hình trụ",
    category: "space",
    icon: "▭",
    defaultShortcut: null,
    keywords: "hinh tru cylinder 3d",
  },
  {
    id: "tool:p3:cone",
    label: "Hình nón",
    category: "space",
    icon: "◭",
    defaultShortcut: null,
    keywords: "hinh non cone 3d",
  },
  {
    id: "tool:p3:sphere",
    label: "Hình cầu",
    category: "space",
    icon: "●",
    defaultShortcut: null,
    keywords: "hinh cau sphere 3d",
  },
  {
    id: "tool:p3:axes",
    label: "Hệ trục toạ độ Oxyz",
    category: "space",
    icon: "⟂",
    defaultShortcut: null,
    keywords: "oxyz toa do khong gian axes3d",
  },
  {
    id: "tool:c:section",
    label: "Dựng thiết diện (mặt cắt 3D)",
    category: "space",
    icon: "▱",
    defaultShortcut: null,
    keywords: "thiet dien mat cat section 3d",
  },
  {
    id: "tool:c:circumsphere",
    label: "Mặt cầu ngoại tiếp khối đa diện",
    category: "space",
    icon: "◯",
    defaultShortcut: null,
    keywords: "mat cau ngoai tiep circumsphere 3d",
  },

  // --- Hàm số & Thống kê ---
  {
    id: "tool:p3:oxy",
    label: "Đặt hệ trục toạ độ Oxy",
    category: "functions",
    icon: "┼",
    defaultShortcut: null,
    keywords: "he truc oxy axes2d",
  },
  {
    id: "action:openPlotDialog",
    label: "Vẽ đồ thị hàm số y = f(x)",
    category: "functions",
    icon: "∿",
    defaultShortcut: "F",
    description: "Mở hộp thoại nhập hàm số & tham số m",
    keywords: "do thi ham so plot graph",
  },
  {
    id: "action:axesPoint",
    label: "Đặt điểm (x; y) trên hệ trục Oxy",
    category: "functions",
    icon: "•",
    defaultShortcut: null,
    keywords: "diem toa do oxy point",
  },
  {
    id: "action:axesVector",
    label: "Vẽ vectơ (x; y) trên hệ trục Oxy",
    category: "functions",
    icon: "⟶",
    defaultShortcut: null,
    keywords: "vecto toa do oxy vector",
  },
  {
    id: "action:axesEquation",
    label: "Phương trình ẩn F(x, y) = 0",
    category: "functions",
    icon: "═",
    defaultShortcut: null,
    keywords: "phuong trinh duong thang duong tron conic",
  },
  {
    id: "action:axesInequality",
    label: "Bất phương trình / Hệ bất phương trình (gạch miền)",
    category: "functions",
    icon: "◩",
    defaultShortcut: null,
    keywords: "bat phuong trinh he bpt mien nghiem inequality",
  },
  {
    id: "action:axesParametric",
    label: "Đường cong tham số x(t), y(t)",
    category: "functions",
    icon: "➰",
    defaultShortcut: null,
    keywords: "duong cong tham so parametric",
  },
  {
    id: "action:axesSequence",
    label: "Biểu diễn dãy số (uₙ)",
    category: "functions",
    icon: "⋯",
    defaultShortcut: null,
    keywords: "day so un sequence",
  },
  {
    id: "tool:bang-bien-thien",
    label: "Bảng biến thiên",
    category: "functions",
    icon: "↗",
    defaultShortcut: null,
    keywords: "bang bien thien vartable",
  },
  {
    id: "tool:bang-xet-dau",
    label: "Bảng xét dấu",
    category: "functions",
    icon: "±",
    defaultShortcut: null,
    keywords: "bang xet dau signtable",
  },
  {
    id: "tool:trig-circle",
    label: "Đường tròn lượng giác",
    category: "functions",
    icon: "◔",
    defaultShortcut: null,
    keywords: "luong giac trig circle sin cos",
  },
  {
    id: "action:openChartDialog",
    label: "Biểu đồ thống kê & số liệu",
    category: "functions",
    icon: "📊",
    defaultShortcut: null,
    keywords: "bieu do thong ke chart boxplot histogram",
  },
  {
    id: "action:openRealWorldDrawer",
    label: "Kho hình thực tế (100+ vật thể)",
    category: "functions",
    icon: "🖼",
    defaultShortcut: null,
    keywords: "hinh thuc te realworld clipart",
  },

  // --- Thao tác & Trang ---
  {
    id: "action:openCommands",
    label: "Cửa sổ lệnh & Quản lý phím tắt",
    category: "actions",
    icon: "⌘",
    defaultShortcut: "Ctrl+K",
    description: "Tìm nhanh chức năng, chạy lệnh hoặc gán phím tắt mới",
    keywords: "cua so lenh phim tat command palette shortcut",
  },
  {
    id: "action:duplicate",
    label: "Nhân bản đối tượng đang chọn",
    category: "actions",
    icon: "⧉",
    defaultShortcut: "Ctrl+D",
    keywords: "nhan ban duplicate clone",
  },
  {
    id: "action:zoomIn",
    label: "Phóng to bảng",
    category: "actions",
    icon: "＋",
    defaultShortcut: "=",
    keywords: "phong to zoom in",
  },
  {
    id: "action:zoomOut",
    label: "Thu nhỏ bảng",
    category: "actions",
    icon: "－",
    defaultShortcut: "-",
    keywords: "thu nho zoom out",
  },
  {
    id: "action:zoomReset",
    label: "Đặt lại tỷ lệ 100%",
    category: "actions",
    icon: "100%",
    defaultShortcut: "0",
    keywords: "dat lai zoom reset 100",
  },
  {
    id: "action:fitView",
    label: "Thu gọn vừa màn hình",
    category: "actions",
    icon: "⊡",
    defaultShortcut: "Shift+0",
    keywords: "vua man hinh fit view",
  },
  {
    id: "action:toggleGrid",
    label: "Bật / Tắt lưới ô vuông",
    category: "actions",
    icon: "#",
    defaultShortcut: "Shift+G",
    keywords: "luoi grid background",
  },
  {
    id: "action:prevPage",
    label: "Chuyển sang trang trước",
    category: "actions",
    icon: "◀",
    defaultShortcut: "PageUp",
    keywords: "trang truoc prev page",
  },
  {
    id: "action:nextPage",
    label: "Chuyển sang trang sau",
    category: "actions",
    icon: "▶",
    defaultShortcut: "PageDown",
    keywords: "trang sau next page",
  },
  {
    id: "action:addPage",
    label: "Thêm trang trắng mới",
    category: "actions",
    icon: "+",
    defaultShortcut: "Alt+N",
    keywords: "them trang moi add page",
  },
  {
    id: "action:fullscreen",
    label: "Bật / Tắt toàn màn hình",
    category: "actions",
    icon: "⛶",
    defaultShortcut: "Alt+Enter",
    keywords: "toan man hinh fullscreen",
  },
  {
    id: "action:openExam",
    label: "Chế độ soạn Đề thi",
    category: "actions",
    icon: "📝",
    defaultShortcut: "Ctrl+E",
    keywords: "soan de thi exam editor",
  },
  {
    id: "action:exportPng",
    label: "Xuất ảnh PNG",
    category: "actions",
    icon: "🖼",
    defaultShortcut: null,
    keywords: "xuat anh png export",
  },
  {
    id: "action:exportPdf",
    label: "Xuất tài liệu PDF",
    category: "actions",
    icon: "📄",
    defaultShortcut: null,
    keywords: "xuat pdf export",
  },
  {
    id: "action:exportTikz",
    label: "Xuất mã LaTeX TikZ",
    category: "actions",
    icon: "📐",
    defaultShortcut: null,
    keywords: "xuat tikz latex code",
  },
  {
    id: "action:openJson",
    label: "Mở / Xuất JSON bảng vẽ",
    category: "actions",
    icon: "{ }",
    defaultShortcut: null,
    keywords: "json import export",
  },
  // --- Vật lý & Thí nghiệm ---
  {
    id: "phys:drawer",
    label: "Mở Thư viện Vật lý THPT (10–11–12)",
    category: "physics",
    icon: "⚛",
    defaultShortcut: null,
    description: "Mở ngăn kéo thí nghiệm, sơ đồ, công thức, hằng số, đổi đơn vị",
    keywords: "vat ly thu vien thi nghiem lop 10 11 12",
  },
  {
    id: "phys:sim:projectile",
    label: "Thí nghiệm Ném xiên / Ném ngang",
    category: "physics",
    icon: "🎯",
    defaultShortcut: null,
    keywords: "nem xien nem ngang quy dao parabol",
  },
  {
    id: "phys:sim:incline_newton",
    label: "Thí nghiệm Mặt phẳng nghiêng & Ma sát",
    category: "physics",
    icon: "📐",
    defaultShortcut: null,
    keywords: "mat nghieng ma sat newton",
  },
  {
    id: "phys:sim:spring_pendulum",
    label: "Thí nghiệm Con lắc lò xo & Cơ năng",
    category: "physics",
    icon: "🌀",
    defaultShortcut: null,
    keywords: "con lac lo xo dao dong co nang",
  },
  {
    id: "phys:sim:simple_pendulum",
    label: "Thí nghiệm Con lắc đơn",
    category: "physics",
    icon: "🕰",
    defaultShortcut: null,
    keywords: "con lac don chu ky",
  },
  {
    id: "phys:sim:young_double_slit",
    label: "Thí nghiệm Giao thoa ánh sáng Y-âng",
    category: "physics",
    icon: "🌈",
    defaultShortcut: null,
    keywords: "giao thoa yang anh sang khoang van",
  },
  {
    id: "phys:sim:ideal_gas",
    label: "Thí nghiệm Khí lý tưởng p–V–T",
    category: "physics",
    icon: "🌡",
    defaultShortcut: null,
    keywords: "khi ly tuong boyler dang nhiet",
  },
  {
    id: "phys:sim:rlc_ac_osc",
    label: "Thí nghiệm Mạch RLC & Dao động ký",
    category: "physics",
    icon: "〰",
    defaultShortcut: null,
    keywords: "rlc xoay chieu cong huong",
  },
  {
    id: "phys:diag:circuit",
    label: "Vẽ Mạch điện DC thông minh",
    category: "physics",
    icon: "⚡",
    defaultShortcut: null,
    keywords: "mach dien khoa k ampe ke von ke",
  },
  {
    id: "phys:diag:fbd",
    label: "Vẽ Sơ đồ Phân tích lực & Chiếu Ox/Oy",
    category: "physics",
    icon: "↗",
    defaultShortcut: null,
    keywords: "phan tich luc vector chieu ox oy",
  },
  {
    id: "phys:diag:optics",
    label: "Vẽ Quang hình học (Thấu kính 3 tia)",
    category: "physics",
    icon: "🔍",
    defaultShortcut: null,
    keywords: "thau kinh guong cau quang hinh tia sang",
  },
  {
    id: "phys:inst:ruler",
    label: "Chèn Thước đo tỉ lệ cm/mm",
    category: "physics",
    icon: "📏",
    defaultShortcut: null,
    keywords: "thuoc do ti le cm",
  },
  {
    id: "phys:inst:protractor",
    label: "Chèn Thước đo góc 0°–180°",
    category: "physics",
    icon: "📐",
    defaultShortcut: null,
    keywords: "thuoc do goc e ke",
  },
  {
    id: "phys:inst:stopwatch",
    label: "Chèn Đồng hồ bấm giây",
    category: "physics",
    icon: "⏱",
    defaultShortcut: null,
    keywords: "dong ho bam giay",
  },
  {
    id: "phys:labtable",
    label: "Chèn Bảng số liệu thực hành & Hồi quy",
    category: "physics",
    icon: "📝",
    defaultShortcut: null,
    keywords: "bang so lieu thuc hanh hoi quy",
  },
];

export type ShortcutMap = Record<string, string | null>;

export function stripVietnameseDiacritics(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function normalizeCombo(combo: string | null | undefined): string | null {
  if (!combo) return null;
  const parts = combo
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  let hasCtrl = false;
  let hasAlt = false;
  let hasShift = false;
  let mainKey = "";

  for (const part of parts) {
    const low = part.toLowerCase();
    if (low === "ctrl" || low === "control" || low === "cmd" || low === "meta") {
      hasCtrl = true;
    } else if (low === "alt" || low === "option") {
      hasAlt = true;
    } else if (low === "shift") {
      hasShift = true;
    } else {
      if (part.length === 1) {
        mainKey = /[a-z]/i.test(part) ? part.toUpperCase() : part;
      } else {
        mainKey = part[0].toUpperCase() + part.slice(1);
      }
    }
  }

  if (!mainKey) return null;
  const out: string[] = [];
  if (hasCtrl) out.push("Ctrl");
  if (hasAlt) out.push("Alt");
  if (hasShift) out.push("Shift");
  out.push(mainKey);
  return out.join("+");
}

const MODIFIER_ONLY_KEYS = new Set([
  "Control",
  "Shift",
  "Alt",
  "Meta",
  "CapsLock",
  "NumLock",
  "ScrollLock",
  "Dead",
  "Process",
]);

const RESERVED_SYSTEM_KEYS = new Set(["Escape", "Tab", "Backspace", "Delete"]);

export function eventToShortcutCombo(e: KeyboardEvent): string | null {
  if (MODIFIER_ONLY_KEYS.has(e.key)) return null;
  if (RESERVED_SYSTEM_KEYS.has(e.key) && !e.altKey && !e.ctrlKey && !e.metaKey) {
    return null;
  }

  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");

  let key = e.key;
  if (key === " ") {
    key = "Space";
  } else if (key === "+") {
    // '+' key (often Shift+'=') stays clean as '=' without forcing Shift+=
    key = "=";
  } else if (key.length === 1) {
    key = /[a-z]/i.test(key) ? key.toUpperCase() : key;
  }

  // Only preserve explicit Shift for letters or non-character keys (e.g. Shift+L, Shift+1)
  const isCharacterSymbolShifted =
    e.shiftKey &&
    key.length === 1 &&
    !/[a-z0-9]/i.test(key) &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey;

  if (e.shiftKey && !isCharacterSymbolShifted) {
    // Handle digits when shifted on standard US layout (e.g. '!' with code Digit1 -> Shift+1)
    if (e.code?.startsWith("Digit") && e.code.length === 6) {
      parts.push("Shift");
      key = e.code.slice(5);
    } else if (e.key !== "=") {
      parts.push("Shift");
    }
  }

  parts.push(key);
  return normalizeCombo(parts.join("+"));
}

export function buildDefaultShortcutMap(): ShortcutMap {
  const map: ShortcutMap = {};
  for (const cmd of WHITEBOARD_COMMANDS) {
    map[cmd.id] = normalizeCombo(cmd.defaultShortcut);
  }
  return map;
}

export function getShortcutMap(): ShortcutMap {
  const defaults = buildDefaultShortcutMap();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(SHORTCUTS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Record<string, string | null>;
    for (const [cmdId, combo] of Object.entries(parsed)) {
      if (cmdId in defaults) {
        defaults[cmdId] = combo === null ? null : normalizeCombo(combo);
      }
    }
  } catch {
    // ignore storage errors
  }
  return defaults;
}

export function saveShortcutMap(map: ShortcutMap): void {
  if (typeof window === "undefined") return;
  try {
    const defaults = buildDefaultShortcutMap();
    const diff: Record<string, string | null> = {};
    for (const [id, val] of Object.entries(map)) {
      if (val !== defaults[id]) {
        diff[id] = val;
      }
    }
    if (Object.keys(diff).length === 0) {
      window.localStorage.removeItem(SHORTCUTS_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(diff));
    }
  } catch {
    // ignore storage errors
  }
}

export function setCommandShortcut(
  currentMap: ShortcutMap,
  commandId: string,
  combo: string | null
): { nextMap: ShortcutMap; replacedCommand?: CommandDescriptor } {
  const normalized = normalizeCombo(combo);
  const nextMap: ShortcutMap = { ...currentMap };
  let replacedCommand: CommandDescriptor | undefined;

  if (normalized) {
    for (const [otherId, otherCombo] of Object.entries(nextMap)) {
      if (otherId !== commandId && otherCombo === normalized) {
        nextMap[otherId] = null;
        replacedCommand = WHITEBOARD_COMMANDS.find((c) => c.id === otherId);
      }
    }
  }

  nextMap[commandId] = normalized;
  saveShortcutMap(nextMap);
  return { nextMap, replacedCommand };
}

export function resetAllShortcuts(): ShortcutMap {
  const defaults = buildDefaultShortcutMap();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(SHORTCUTS_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  return defaults;
}

export function matchCommandForKeyEvent(
  e: KeyboardEvent,
  shortcutMap: ShortcutMap
): CommandDescriptor | null {
  const combo = eventToShortcutCombo(e);
  if (!combo) return null;

  for (const cmd of WHITEBOARD_COMMANDS) {
    if (shortcutMap[cmd.id] === combo) {
      return cmd;
    }
  }
  return null;
}

export function searchCommands(
  query: string,
  category: CommandCategory | "all" = "all",
  shortcutMap?: ShortcutMap
): CommandDescriptor[] {
  const q = stripVietnameseDiacritics(query.trim());
  return WHITEBOARD_COMMANDS.filter((cmd) => {
    if (category !== "all" && cmd.category !== category) return false;
    if (!q) return true;
    const shortcutText = shortcutMap?.[cmd.id] ?? cmd.defaultShortcut ?? "";
    const haystack = stripVietnameseDiacritics(
      `${cmd.label} ${cmd.id} ${cmd.keywords ?? ""} ${cmd.description ?? ""} ${shortcutText}`
    );
    return haystack.includes(q);
  });
}

export function getToolShortcutLabel(
  toolId: string,
  shortcutMap: ShortcutMap
): string | null {
  const cmdId = `tool:${toolId}`;
  return shortcutMap[cmdId] ?? null;
}
