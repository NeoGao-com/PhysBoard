/**
 * Core Grade 10–12 (GDPT 2018) Physics simulation catalog, time synchronization,
 * and deterministic numerical/analytical solvers for 15 curriculum experiments.
 */

import type {
  PhysicsSimKind,
  PhysicsSimMeta,
  PhysicsSimProps,
} from "@/types/physics";

export const PHYSICS_SIM_CATALOG: ReadonlyArray<PhysicsSimMeta> = [
  // ======================== LỚP 10 (CƠ HỌC) ========================
  {
    kind: "kinematics_rect",
    grade: 10,
    title: "Chuyển động thẳng BĐĐ & Rơi tự do",
    shortTitle: "Thẳng BĐĐ / Rơi tự do",
    icon: "🚗",
    description:
      "Khảo sát tọa độ x(t), vận tốc v(t) của xe chuyển động thẳng biến đổi đều hoặc vật rơi tự do.",
    keywords: ["chuyen dong", "gia toc", "roi tu do", "van toc", "lop 10"],
    params: [
      { key: "v0", label: "Vận tốc đầu", symbol: "v₀", unit: "m/s", min: -10, max: 15, step: 0.5, defaultValue: 2 },
      { key: "a", label: "Gia tốc", symbol: "a", unit: "m/s²", min: -6, max: 10, step: 0.5, defaultValue: 2 },
      { key: "h0", label: "Độ cao rơi", symbol: "h", unit: "m", min: 5, max: 50, step: 1, defaultValue: 20 },
    ],
    defaultModeOptions: [
      { value: "linear", label: "Thẳng BĐĐ" },
      { value: "freefall", label: "Rơi tự do" },
    ],
    graphAxesLabel: { xLabel: "t (s)", yLabel: "x (m), v (m/s)", title: "Đồ thị x(t) & v(t)" },
    relatedFormulas: ["v = v_0 + at", "x = x_0 + v_0 t + \\frac{1}{2}at^2", "v^2 - v_0^2 = 2as"],
  },
  {
    kind: "projectile",
    grade: 10,
    title: "Chuyển động ném ngang / Ném xiên",
    shortTitle: "Ném ngang / Ném xiên",
    icon: "🎯",
    description:
      "Theo dõi quỹ đạo parabol, vectơ vận tốc thành phần vx, vy, tầm xa L và độ cao cực đại H.",
    keywords: ["nem xien", "nem ngang", "quy dao", "parabol", "lop 10"],
    params: [
      { key: "v0", label: "Vận tốc ném", symbol: "v₀", unit: "m/s", min: 5, max: 35, step: 1, defaultValue: 18 },
      { key: "angle", label: "Góc ném", symbol: "α", unit: "°", min: 0, max: 85, step: 1, defaultValue: 45 },
      { key: "h0", label: "Độ cao ban đầu", symbol: "h₀", unit: "m", min: 0, max: 25, step: 1, defaultValue: 0 },
      { key: "g", label: "Gia tốc g", symbol: "g", unit: "m/s²", min: 1.6, max: 15, step: 0.2, defaultValue: 9.8 },
    ],
    graphAxesLabel: { xLabel: "x (m)", yLabel: "y (m)", title: "Quỹ đạo ném y(x)" },
    relatedFormulas: [
      "y = x\\tan\\alpha - \\frac{g x^2}{2 v_0^2 \\cos^2\\alpha}",
      "L = \\frac{v_0^2 \\sin(2\\alpha)}{g}",
      "H = \\frac{v_0^2 \\sin^2\\alpha}{2g}",
    ],
  },
  {
    kind: "incline_newton",
    grade: 10,
    title: "Mặt phẳng nghiêng & Lực ma sát (Newton II)",
    shortTitle: "Mặt nghiêng & Ma sát",
    icon: "📐",
    description:
      "Phân tích P, N, Fms, F kéo trên mặt phẳng nghiêng góc α; kiểm chứng định luật II Newton.",
    keywords: ["mat phang nghiem", "ma sat", "newton", "dong luc hoc", "lop 10"],
    params: [
      { key: "alpha", label: "Góc nghiêng", symbol: "α", unit: "°", min: 5, max: 60, step: 1, defaultValue: 30 },
      { key: "m", label: "Khối lượng", symbol: "m", unit: "kg", min: 0.5, max: 10, step: 0.5, defaultValue: 2 },
      { key: "mu", label: "Hệ số ma sát", symbol: "μ", unit: "", min: 0, max: 0.8, step: 0.05, defaultValue: 0.15 },
      { key: "F", label: "Lực kéo", symbol: "F", unit: "N", min: 0, max: 60, step: 1, defaultValue: 0 },
    ],
    graphAxesLabel: { xLabel: "t (s)", yLabel: "v (m/s)", title: "Vận tốc theo thời gian" },
    relatedFormulas: [
      "\\vec{F}_{hl} = \\vec{P} + \\vec{N} + \\vec{F}_{ms} + \\vec{F} = m\\vec{a}",
      "N = mg\\cos\\alpha",
      "a = g(\\sin\\alpha - \\mu\\cos\\alpha)",
    ],
  },
  {
    kind: "collision_momentum",
    grade: 10,
    title: "Va chạm & Bảo toàn động lượng",
    shortTitle: "Va chạm (Động lượng)",
    icon: "🎱",
    description:
      "Thử nghiệm va chạm đàn hồi (e=1) và va chạm mềm (e=0) giữa hai xe/bi, theo dõi p và Wđ.",
    keywords: ["va cham", "dong luong", "dan hoi", "mem", "lop 10"],
    params: [
      { key: "m1", label: "Khối lượng 1", symbol: "m₁", unit: "kg", min: 0.5, max: 8, step: 0.5, defaultValue: 2 },
      { key: "v1", label: "Vận tốc đầu 1", symbol: "v₁", unit: "m/s", min: -6, max: 8, step: 0.5, defaultValue: 4 },
      { key: "m2", label: "Khối lượng 2", symbol: "m₂", unit: "kg", min: 0.5, max: 8, step: 0.5, defaultValue: 3 },
      { key: "v2", label: "Vận tốc đầu 2", symbol: "v₂", unit: "m/s", min: -6, max: 6, step: 0.5, defaultValue: -1 },
      { key: "e", label: "Hệ số đàn hồi", symbol: "e", unit: "", min: 0, max: 1, step: 0.1, defaultValue: 1 },
    ],
    graphAxesLabel: { xLabel: "t (s)", yLabel: "v₁, v₂ (m/s)", title: "Vận tốc trước & sau va chạm" },
    relatedFormulas: ["m_1\\vec{v}_1 + m_2\\vec{v}_2 = m_1\\vec{v}_1' + m_2\\vec{v}_2'"],
  },
  {
    kind: "circular_motion",
    grade: 10,
    title: "Chuyển động tròn đều & Lực hướng tâm",
    shortTitle: "Tròn đều & Fht",
    icon: "🎡",
    description:
      "Quan sát tốc độ góc ω, tốc độ dài v tiếp tuyến, gia tốc hướng tâm và lực hướng tâm.",
    keywords: ["tron deu", "huong tam", "toc do goc", "lop 10"],
    params: [
      { key: "R", label: "Bán kính", symbol: "R", unit: "m", min: 0.5, max: 5, step: 0.25, defaultValue: 2 },
      { key: "omega", label: "Tốc độ góc", symbol: "ω", unit: "rad/s", min: 0.5, max: 6, step: 0.25, defaultValue: 2 },
      { key: "m", label: "Khối lượng", symbol: "m", unit: "kg", min: 0.5, max: 5, step: 0.5, defaultValue: 1 },
    ],
    graphAxesLabel: { xLabel: "t (s)", yLabel: "x (m)", title: "Hình chiếu Ox theo thời gian" },
    relatedFormulas: ["v = \\omega R", "a_{ht} = \\frac{v^2}{R} = \\omega^2 R", "F_{ht} = m\\omega^2 R"],
  },

  // ======================== LỚP 11 (DAO ĐỘNG & SÓNG) ========================
  {
    kind: "spring_pendulum",
    grade: 11,
    title: "Con lắc lò xo & Bảo toàn cơ năng",
    shortTitle: "Con lắc lò xo",
    icon: "🌀",
    description:
      "Mô phỏng dao động điều hòa và tắt dần của con lắc lò xo; đối chiếu đồng thời Wđ, Wt, W.",
    keywords: ["con lac lo xo", "dao dong dieu hoa", "co nang", "tat dan", "lop 11"],
    params: [
      { key: "m", label: "Khối lượng", symbol: "m", unit: "kg", min: 0.1, max: 2, step: 0.05, defaultValue: 0.4 },
      { key: "k", label: "Độ cứng", symbol: "k", unit: "N/m", min: 10, max: 160, step: 5, defaultValue: 40 },
      { key: "A", label: "Biên độ", symbol: "A", unit: "cm", min: 2, max: 16, step: 1, defaultValue: 10 },
      { key: "damping", label: "Hệ số cản", symbol: "c", unit: "", min: 0, max: 0.5, step: 0.02, defaultValue: 0 },
    ],
    defaultModeOptions: [
      { value: "horizontal", label: "Nằm ngang" },
      { value: "vertical", label: "Thẳng đứng" },
    ],
    graphAxesLabel: { xLabel: "t (s)", yLabel: "x (cm)", title: "Đồ thị li độ x(t)" },
    relatedFormulas: [
      "T = 2\\pi\\sqrt{\\frac{m}{k}}",
      "x = A\\cos(\\omega t + \\varphi)",
      "W = \\frac{1}{2}kA^2 = W_\\text{đ} + W_t",
    ],
  },
  {
    kind: "simple_pendulum",
    grade: 11,
    title: "Con lắc đơn",
    shortTitle: "Con lắc đơn",
    icon: "🕰",
    description:
      "Khảo sát chu kỳ T phụ thuộc chiều dài l và g; theo dõi lực căng dây T_căng và li độ góc.",
    keywords: ["con lac don", "chu ky", "day treo", "lop 11"],
    params: [
      { key: "l", label: "Chiều dài dây", symbol: "l", unit: "m", min: 0.3, max: 3, step: 0.1, defaultValue: 1.0 },
      { key: "alpha0", label: "Biên độ góc", symbol: "α₀", unit: "°", min: 3, max: 35, step: 1, defaultValue: 12 },
      { key: "g", label: "Gia tốc g", symbol: "g", unit: "m/s²", min: 1.6, max: 15, step: 0.2, defaultValue: 9.8 },
    ],
    graphAxesLabel: { xLabel: "t (s)", yLabel: "α (°)", title: "Li độ góc α(t)" },
    relatedFormulas: ["T = 2\\pi\\sqrt{\\frac{l}{g}}", "v = \\sqrt{2gl(\\cos\\alpha - \\cos\\alpha_0)}"],
  },
  {
    kind: "harmonic_phasor",
    grade: 11,
    title: "Dao động điều hòa ↔ Vòng tròn lượng giác & Tổng hợp",
    shortTitle: "Vòng tròn pha & Tổng hợp",
    icon: "🧭",
    description:
      "Liên hệ vectơ quay với đồ thị hình sin; tổng hợp hai dao động cùng tần số bằng giản đồ Fresnel.",
    keywords: ["vong tron luong giac", "pha", "tong hop dao dong", "fresnel", "lop 11"],
    params: [
      { key: "A1", label: "Biên độ A₁", symbol: "A₁", unit: "cm", min: 2, max: 10, step: 0.5, defaultValue: 6 },
      { key: "phi1", label: "Pha đầu φ₁", symbol: "φ₁", unit: "°", min: -180, max: 180, step: 15, defaultValue: 0 },
      { key: "A2", label: "Biên độ A₂", symbol: "A₂", unit: "cm", min: 0, max: 10, step: 0.5, defaultValue: 4 },
      { key: "phi2", label: "Pha đầu φ₂", symbol: "φ₂", unit: "°", min: -180, max: 180, step: 15, defaultValue: 90 },
      { key: "omega", label: "Tần số góc ω", symbol: "ω", unit: "rad/s", min: 1, max: 8, step: 0.5, defaultValue: 3 },
    ],
    graphAxesLabel: { xLabel: "t (s)", yLabel: "x (cm)", title: "Tổng hợp dao động x = x₁ + x₂" },
    relatedFormulas: ["A^2 = A_1^2 + A_2^2 + 2A_1A_2\\cos(\\varphi_2 - \\varphi_1)"],
  },
  {
    kind: "standing_wave",
    grade: 11,
    title: "Sóng cơ & Sóng dừng trên dây",
    shortTitle: "Sóng dừng trên dây",
    icon: "〰",
    description:
      "Quan sát sóng truyền hoặc sóng dừng tạo nút – bụng khi thay đổi tần số f và điều kiện hai đầu dây.",
    keywords: ["song dung", "song co", "nut song", "bung song", "buoc song", "lop 11"],
    params: [
      { key: "n", label: "Số bó sóng (k)", symbol: "k", unit: "", min: 1, max: 6, step: 1, defaultValue: 3 },
      { key: "f", label: "Tần số", symbol: "f", unit: "Hz", min: 0.5, max: 5, step: 0.25, defaultValue: 1.5 },
      { key: "A", label: "Biên độ bụng", symbol: "A", unit: "cm", min: 1, max: 6, step: 0.5, defaultValue: 3 },
    ],
    defaultModeOptions: [
      { value: "fixed_fixed", label: "2 đầu cố định" },
      { value: "fixed_free", label: "1 đầu tự do" },
    ],
    graphAxesLabel: { xLabel: "x (m)", yLabel: "u (cm)", title: "Biên độ sóng dọc dây" },
    relatedFormulas: ["\\lambda = \\frac{v}{f}", "l = k\\frac{\\lambda}{2} \\text{ (2 đầu cố định)}"],
  },
  {
    kind: "wave_interference",
    grade: 11,
    title: "Giao thoa sóng hai nguồn kết hợp",
    shortTitle: "Giao thoa sóng nước",
    icon: "🌊",
    description:
      "Hiển thị trực quan gợn sóng lồi/lõm từ hai nguồn A, B và các vân cực đại (nét liền), cực tiểu (đứt).",
    keywords: ["giao thoa song", "cuc dai", "cuc tieu", "hai nguon", "lop 11"],
    params: [
      { key: "lambda", label: "Bước sóng λ", symbol: "λ", unit: "cm", min: 1.2, max: 5, step: 0.2, defaultValue: 2.4 },
      { key: "d", label: "Khoảng cách AB", symbol: "AB", unit: "cm", min: 4, max: 16, step: 0.5, defaultValue: 10 },
      { key: "dphi", label: "Độ lệch pha", symbol: "Δφ", unit: "°", min: 0, max: 180, step: 30, defaultValue: 0 },
    ],
    graphAxesLabel: { xLabel: "x (cm)", yLabel: "A_M (cm)", title: "Biên độ dọc đoạn nối AB" },
    relatedFormulas: ["d_2 - d_1 = k\\lambda \\text{ (cực đại)}", "d_2 - d_1 = (k + 0.5)\\lambda \\text{ (cực tiểu)}"],
  },
  {
    kind: "young_double_slit",
    grade: 11,
    title: "Giao thoa ánh sáng (Thí nghiệm Y-âng)",
    shortTitle: "Giao thoa Y-âng",
    icon: "🌈",
    description:
      "Đổi bước sóng ánh sáng đơn sắc λ, khoảng cách khe a và màn D; quan sát vân sáng/tối và i.",
    keywords: ["giao thoa anh sang", "yang", "khoang van", "buoc song", "lop 11"],
    params: [
      { key: "lambdaNm", label: "Bước sóng λ", symbol: "λ", unit: "nm", min: 380, max: 760, step: 10, defaultValue: 590 },
      { key: "aMm", label: "Khoảng cách 2 khe a", symbol: "a", unit: "mm", min: 0.4, max: 3, step: 0.1, defaultValue: 1.0 },
      { key: "Dm", label: "Khoảng cách màn D", symbol: "D", unit: "m", min: 0.8, max: 4, step: 0.2, defaultValue: 2.0 },
    ],
    graphAxesLabel: { xLabel: "x (mm)", yLabel: "Cường độ I", title: "Phân bố cường độ sáng trên màn" },
    relatedFormulas: ["i = \\frac{\\lambda D}{a}", "x_s = k i", "x_t = (k + 0.5)i"],
  },

  // ======================== LỚP 12 (NHIỆT - TỪ - AC - HẠT NHÂN) ========================
  {
    kind: "ideal_gas",
    grade: 12,
    title: "Khí lý tưởng & Các đẳng quá trình",
    shortTitle: "Khí lý tưởng (p-V-T)",
    icon: "🌡",
    description:
      "Nén/giãn xi-lanh pít-tông với các phân tử chuyển động nhiệt theo T; vẽ đường đẳng nhiệt/áp/tích trên p-V.",
    keywords: ["khi ly tuong", "dang nhiet", "dang ap", "dang tich", "boyler", "lop 12"],
    params: [
      { key: "V", label: "Thể tích V", symbol: "V", unit: "lít", min: 1, max: 8, step: 0.2, defaultValue: 3 },
      { key: "T", label: "Nhiệt độ T", symbol: "T", unit: "K", min: 200, max: 600, step: 10, defaultValue: 300 },
      { key: "n", label: "Số mol n", symbol: "n", unit: "mol", min: 0.1, max: 1, step: 0.05, defaultValue: 0.2 },
    ],
    defaultModeOptions: [
      { value: "isothermal", label: "Đẳng nhiệt (T const)" },
      { value: "isobaric", label: "Đẳng áp (p const)" },
      { value: "isochoric", label: "Đẳng tích (V const)" },
    ],
    graphAxesLabel: { xLabel: "V (lít)", yLabel: "p (atm)", title: "Đồ thị p – V" },
    relatedFormulas: ["pV = nRT", "\\frac{p_1 V_1}{T_1} = \\frac{p_2 V_2}{T_2}"],
  },
  {
    kind: "em_induction",
    grade: 12,
    title: "Cảm ứng điện từ (Faraday & Len-xơ)",
    shortTitle: "Cảm ứng điện từ",
    icon: "🧲",
    description:
      "Đưa nam châm lại gần hoặc ra xa ống dây kín; quan sát chiều dòng cảm ứng và độ lệch kim điện kế G.",
    keywords: ["cam ung dien tu", "faraday", "len xo", "nam cham", "tu thong", "lop 12"],
    params: [
      { key: "B", label: "Cảm ứng từ cực đại", symbol: "B", unit: "mT", min: 10, max: 100, step: 5, defaultValue: 50 },
      { key: "N", label: "Số vòng dây", symbol: "N", unit: "vòng", min: 20, max: 200, step: 10, defaultValue: 100 },
      { key: "speedFactor", label: "Tốc độ dịch chuyển", symbol: "v", unit: "x", min: 0.5, max: 3, step: 0.25, defaultValue: 1.25 },
    ],
    graphAxesLabel: { xLabel: "t (s)", yLabel: "e_c (V)", title: "Suất điện động cảm ứng e(t)" },
    relatedFormulas: ["\\Phi = N B S \\cos\\alpha", "e_c = -\\frac{\\Delta\\Phi}{\\Delta t}"],
  },
  {
    kind: "rlc_ac_osc",
    grade: 12,
    title: "Mạch RLC xoay chiều & Dao động ký",
    shortTitle: "Mạch RLC & Dao động ký",
    icon: "〰",
    description:
      "Điều chỉnh R, L, C, f; theo dõi đồng thời sóng u(t), i(t), giản đồ Fresnel và trạng thái cộng hưởng.",
    keywords: ["rlc", "xoay chieu", "cong huong", "tong tro", "fresnel", "lop 12"],
    params: [
      { key: "U", label: "Hiệu điện thế U", symbol: "U", unit: "V", min: 20, max: 220, step: 10, defaultValue: 100 },
      { key: "f", label: "Tần số f", symbol: "f", unit: "Hz", min: 20, max: 120, step: 2, defaultValue: 50 },
      { key: "R", label: "Điện trở R", symbol: "R", unit: "Ω", min: 10, max: 200, step: 5, defaultValue: 50 },
      { key: "LmH", label: "Độ tự cảm L", symbol: "L", unit: "mH", min: 50, max: 600, step: 10, defaultValue: 318 },
      { key: "CuF", label: "Điện dung C", symbol: "C", unit: "μF", min: 10, max: 150, step: 5, defaultValue: 32 },
    ],
    graphAxesLabel: { xLabel: "t (ms)", yLabel: "u (V), i (A)", title: "Sóng u(t) & i(t)" },
    relatedFormulas: [
      "Z = \\sqrt{R^2 + (Z_L - Z_C)^2}",
      "\\tan\\varphi = \\frac{Z_L - Z_C}{R}",
      "f_0 = \\frac{1}{2\\pi\\sqrt{LC}}",
    ],
  },
  {
    kind: "photoelectric_nuclear",
    grade: 12,
    title: "Quang điện ngoài & Phóng xạ hạt nhân",
    shortTitle: "Quang điện & Phóng xạ",
    icon: "☢",
    description:
      "Hai chế độ: (1) Bứt electron quang điện theo bước sóng λ và (2) Phóng xạ hạt nhân theo chu kỳ bán rã T.",
    keywords: ["quang dien", "hat nhan", "phong xa", "ban ra", "einstein", "lop 12"],
    params: [
      { key: "lambdaNm", label: "Bước sóng λ", symbol: "λ", unit: "nm", min: 200, max: 700, step: 10, defaultValue: 360 },
      { key: "workEv", label: "Công thoát A", symbol: "A", unit: "eV", min: 1.5, max: 5.0, step: 0.1, defaultValue: 2.3 },
      { key: "halfLife", label: "Chu kỳ bán rã T", symbol: "T", unit: "s", min: 1, max: 10, step: 0.5, defaultValue: 3 },
    ],
    defaultModeOptions: [
      { value: "photoelectric", label: "Quang điện ngoài" },
      { value: "radioactive", label: "Phóng xạ hạt nhân" },
    ],
    graphAxesLabel: { xLabel: "t (s) / f", yLabel: "N(t) / Wđ", title: "Đường cong đặc trưng" },
    relatedFormulas: [
      "\\frac{hc}{\\lambda} = A + \\frac{1}{2}m v_{0\\max}^2",
      "N(t) = N_0 2^{-t/T}",
    ],
  },
];

const SIM_META_MAP = new Map<PhysicsSimKind, PhysicsSimMeta>(
  PHYSICS_SIM_CATALOG.map((m) => [m.kind, m])
);

export function getPhysicsSimMeta(kind: PhysicsSimKind): PhysicsSimMeta {
  return SIM_META_MAP.get(kind) ?? PHYSICS_SIM_CATALOG[0];
}

export function createDefaultPhysicsSimProps(
  kind: PhysicsSimKind
): PhysicsSimProps {
  const meta = getPhysicsSimMeta(kind);
  const params: Record<string, number> = {};
  for (const p of meta.params) {
    params[p.key] = p.defaultValue;
  }
  return {
    kind,
    playing: false,
    speed: 1,
    simTime: 0,
    params,
    mode: meta.defaultModeOptions?.[0]?.value,
    showVectors: true,
    showGraph: true,
    width: 11.2,
    height: 7.2,
  };
}

/**
 * Computes deterministic simulation elapsed time at `nowMs`.
 */
export function getEffectiveSimTime(
  props: Pick<PhysicsSimProps, "playing" | "simTime" | "speed" | "anchorEpoch">,
  nowMs = Date.now()
): number {
  const base = Number.isFinite(props.simTime) ? props.simTime : 0;
  if (!props.playing || !props.anchorEpoch) return Math.max(0, base);
  const dt = Math.max(0, (nowMs - props.anchorEpoch) / 1000) * (props.speed || 1);
  return base + dt;
}

export interface SimReadoutMetric {
  label: string;
  value: string;
}

export interface SimGraphPoint {
  x: number;
  y: number;
  y2?: number;
}

export interface EvaluatedSimState {
  metrics: SimReadoutMetric[];
  /** Primary (x, y) sample representing current time/state for lab table recording. */
  recordPoint: { x: number; y: number };
  /** Series for plotting on inline scope or exporting to Axes2D. */
  series: SimGraphPoint[];
  /** Normalized state fields used by PhysicsSimElement SVG renderer. */
  data: Record<string, number | string | boolean>;
}

const H_PLANCK = 6.626e-34;
const C_LIGHT = 3e8;
const E_CHARGE = 1.602e-19;
const R_GAS = 0.0821; // atm.L / (mol.K)

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function evaluatePhysicsSim(
  kind: PhysicsSimKind,
  t: number,
  params: Record<string, number>,
  mode?: string
): EvaluatedSimState {
  switch (kind) {
    case "kinematics_rect": {
      const isFreefall = mode === "freefall";
      if (isFreefall) {
        const g = 9.8;
        const h0 = params.h0 ?? 20;
        const tFall = Math.sqrt((2 * h0) / g);
        const tc = Math.min(t, tFall);
        const s = 0.5 * g * tc * tc;
        const y = Math.max(0, h0 - s);
        const v = g * tc;
        const series: SimGraphPoint[] = [];
        const steps = 40;
        for (let i = 0; i <= steps; i++) {
          const ti = (i / steps) * Math.max(tFall, 1);
          const tt = Math.min(ti, tFall);
          series.push({ x: ti, y: h0 - 0.5 * g * tt * tt, y2: g * tt });
        }
        return {
          metrics: [
            { label: "t", value: `${tc.toFixed(2)} s` },
            { label: "y", value: `${y.toFixed(2)} m` },
            { label: "v", value: `${v.toFixed(2)} m/s` },
            { label: "t_chạm", value: `${tFall.toFixed(2)} s` },
          ],
          recordPoint: { x: Number(tc.toFixed(3)), y: Number(s.toFixed(3)) },
          series,
          data: { isFreefall: 1, y, h0, v, tFall, tc },
        };
      }
      const v0 = params.v0 ?? 2;
      const a = params.a ?? 2;
      const tc = t % 8;
      const x = v0 * tc + 0.5 * a * tc * tc;
      const v = v0 + a * tc;
      const series: SimGraphPoint[] = [];
      for (let i = 0; i <= 40; i++) {
        const ti = (i / 40) * 6;
        series.push({ x: ti, y: v0 * ti + 0.5 * a * ti * ti, y2: v0 + a * ti });
      }
      return {
        metrics: [
          { label: "t", value: `${tc.toFixed(2)} s` },
          { label: "x", value: `${x.toFixed(2)} m` },
          { label: "v", value: `${v.toFixed(2)} m/s` },
          { label: "a", value: `${a.toFixed(2)} m/s²` },
        ],
        recordPoint: { x: Number(tc.toFixed(3)), y: Number(x.toFixed(3)) },
        series,
        data: { isFreefall: 0, x, v, a, tc },
      };
    }

    case "projectile": {
      const v0 = params.v0 ?? 18;
      const alpha = degToRad(params.angle ?? 45);
      const h0 = params.h0 ?? 0;
      const g = params.g ?? 9.8;
      const vx = v0 * Math.cos(alpha);
      const vy0 = v0 * Math.sin(alpha);
      const tFlight = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * h0)) / g;
      const tc = t > 0 ? Math.min(t, tFlight) : 0;
      const x = vx * tc;
      const y = Math.max(0, h0 + vy0 * tc - 0.5 * g * tc * tc);
      const vy = vy0 - g * tc;
      const range = vx * tFlight;
      const hMax = h0 + (vy0 * vy0) / (2 * g);
      const series: SimGraphPoint[] = [];
      for (let i = 0; i <= 45; i++) {
        const ti = (i / 45) * tFlight;
        series.push({
          x: vx * ti,
          y: Math.max(0, h0 + vy0 * ti - 0.5 * g * ti * ti),
        });
      }
      return {
        metrics: [
          { label: "x", value: `${x.toFixed(1)} m` },
          { label: "y", value: `${y.toFixed(1)} m` },
          { label: "L_max", value: `${range.toFixed(1)} m` },
          { label: "H_max", value: `${hMax.toFixed(1)} m` },
        ],
        recordPoint: { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) },
        series,
        data: { x, y, vx, vy, range, hMax, tFlight, tc, h0 },
      };
    }

    case "incline_newton": {
      const alpha = degToRad(params.alpha ?? 30);
      const m = params.m ?? 2;
      const mu = params.mu ?? 0.15;
      const F = params.F ?? 0;
      const g = 9.8;
      const P = m * g;
      const Px = P * Math.sin(alpha);
      const N = P * Math.cos(alpha);
      const fMax = mu * N;
      // Positive axis points down-slope; F pulls up-slope (negative)
      const drive = Px - F;
      let a = 0;
      let fms = drive;
      if (Math.abs(drive) > fMax) {
        const sign = drive > 0 ? 1 : -1;
        fms = sign * fMax;
        a = (drive - fms) / m;
      } else {
        a = 0;
        fms = drive;
      }
      const tc = t % 4;
      const s = 0.5 * a * tc * tc;
      const v = a * tc;
      const series: SimGraphPoint[] = [];
      for (let i = 0; i <= 30; i++) {
        const ti = (i / 30) * 4;
        series.push({ x: ti, y: a * ti });
      }
      return {
        metrics: [
          { label: "P", value: `${P.toFixed(1)} N` },
          { label: "N", value: `${N.toFixed(1)} N` },
          { label: "F_ms", value: `${Math.abs(fms).toFixed(1)} N` },
          { label: "a", value: `${a.toFixed(2)} m/s²` },
        ],
        recordPoint: { x: Number(tc.toFixed(2)), y: Number(v.toFixed(2)) },
        series,
        data: { alphaDeg: params.alpha ?? 30, m, P, N, fms, F, a, s, v, tc },
      };
    }

    case "collision_momentum": {
      const m1 = params.m1 ?? 2;
      const v1 = params.v1 ?? 4;
      const m2 = params.m2 ?? 3;
      const v2 = params.v2 ?? -1;
      const e = params.e ?? 1;
      const x10 = -3.2;
      const x20 = 3.2;
      const halfW = 0.55;
      const gap0 = x20 - x10 - 2 * halfW;
      const relV = v1 - v2;
      const tCol = relV > 0.05 ? gap0 / relV : 999;
      const v1p = (m1 * v1 + m2 * v2 + m2 * e * (v2 - v1)) / (m1 + m2);
      const v2p = (m1 * v1 + m2 * v2 + m1 * e * (v1 - v2)) / (m1 + m2);
      const tc = t % 5;
      let x1 = x10 + v1 * tc;
      let x2 = x20 + v2 * tc;
      let cv1 = v1;
      let cv2 = v2;
      if (tc >= tCol) {
        const xc = x10 + v1 * tCol;
        const dt = tc - tCol;
        x1 = xc + v1p * dt;
        x2 = xc + 2 * halfW + v2p * dt;
        cv1 = v1p;
        cv2 = v2p;
      }
      const pTotal = m1 * cv1 + m2 * cv2;
      const keTotal = 0.5 * m1 * cv1 * cv1 + 0.5 * m2 * cv2 * cv2;
      const series: SimGraphPoint[] = [];
      for (let i = 0; i <= 40; i++) {
        const ti = (i / 40) * 4;
        const after = ti >= tCol;
        series.push({ x: ti, y: after ? v1p : v1, y2: after ? v2p : v2 });
      }
      return {
        metrics: [
          { label: "p_tổng", value: `${pTotal.toFixed(2)} kg.m/s` },
          { label: "v₁'", value: `${v1p.toFixed(2)} m/s` },
          { label: "v₂'", value: `${v2p.toFixed(2)} m/s` },
          { label: "W_đ", value: `${keTotal.toFixed(1)} J` },
        ],
        recordPoint: { x: Number(tc.toFixed(2)), y: Number(cv1.toFixed(2)) },
        series,
        data: { x1, x2, cv1, cv2, v1p, v2p, tCol, tc, m1, m2 },
      };
    }

    case "circular_motion": {
      const R = params.R ?? 2;
      const omega = params.omega ?? 2;
      const m = params.m ?? 1;
      const theta = omega * t;
      const v = omega * R;
      const aht = omega * omega * R;
      const fht = m * aht;
      const T = (2 * Math.PI) / omega;
      const series: SimGraphPoint[] = [];
      for (let i = 0; i <= 40; i++) {
        const ti = (i / 40) * 2 * T;
        series.push({ x: ti, y: R * Math.cos(omega * ti) });
      }
      return {
        metrics: [
          { label: "v", value: `${v.toFixed(2)} m/s` },
          { label: "a_ht", value: `${aht.toFixed(2)} m/s²` },
          { label: "F_ht", value: `${fht.toFixed(2)} N` },
          { label: "T", value: `${T.toFixed(2)} s` },
        ],
        recordPoint: { x: Number(t.toFixed(2)), y: Number((R * Math.cos(theta)).toFixed(2)) },
        series,
        data: { R, omega, theta, v, aht, fht, T },
      };
    }

    case "spring_pendulum": {
      const m = params.m ?? 0.4;
      const k = params.k ?? 40;
      const A = params.A ?? 10; // cm
      const damping = params.damping ?? 0;
      const omega = Math.sqrt(k / m);
      const T = (2 * Math.PI) / omega;
      const decay = Math.exp(-damping * t);
      const x = A * decay * Math.cos(omega * t);
      const v = -A * 0.01 * omega * decay * Math.sin(omega * t);
      const aVal = -omega * omega * x * 0.01;
      const AM = A * 0.01 * decay;
      const W = 0.5 * k * AM * AM;
      const Wt = 0.5 * k * (x * 0.01) * (x * 0.01);
      const Wd = Math.max(0, W - Wt);
      const series: SimGraphPoint[] = [];
      for (let i = 0; i <= 50; i++) {
        const ti = (i / 50) * Math.max(2 * T, 2);
        series.push({
          x: ti,
          y: A * Math.exp(-damping * ti) * Math.cos(omega * ti),
        });
      }
      return {
        metrics: [
          { label: "T", value: `${T.toFixed(3)} s` },
          { label: "x", value: `${x.toFixed(1)} cm` },
          { label: "v", value: `${v.toFixed(2)} m/s` },
          { label: "W_đ / W_t", value: `${(Wd * 1000).toFixed(0)} / ${(Wt * 1000).toFixed(0)} mJ` },
        ],
        recordPoint: { x: Number(m.toFixed(2)), y: Number((T * T).toFixed(4)) },
        series,
        data: {
          isVertical: mode === "vertical" ? 1 : 0,
          x,
          v,
          aVal,
          A,
          omega,
          T,
          Wd,
          Wt,
          W,
          deltaL0Cm: ((m * 9.8) / k) * 100,
        },
      };
    }

    case "simple_pendulum": {
      const l = params.l ?? 1;
      const alpha0Deg = params.alpha0 ?? 12;
      const g = params.g ?? 9.8;
      const omega = Math.sqrt(g / l);
      const T = (2 * Math.PI) / omega;
      const alphaDeg = alpha0Deg * Math.cos(omega * t);
      const alphaRad = degToRad(alphaDeg);
      const alpha0Rad = degToRad(alpha0Deg);
      const v = Math.sqrt(Math.max(0, 2 * g * l * (Math.cos(alphaRad) - Math.cos(alpha0Rad))));
      const Tnorm = 3 * Math.cos(alphaRad) - 2 * Math.cos(alpha0Rad);
      const series: SimGraphPoint[] = [];
      for (let i = 0; i <= 45; i++) {
        const ti = (i / 45) * 2 * T;
        series.push({ x: ti, y: alpha0Deg * Math.cos(omega * ti) });
      }
      return {
        metrics: [
          { label: "T", value: `${T.toFixed(3)} s` },
          { label: "α", value: `${alphaDeg.toFixed(1)}°` },
          { label: "v", value: `${v.toFixed(2)} m/s` },
          { label: "T_căng/P", value: `${Tnorm.toFixed(2)}` },
        ],
        recordPoint: { x: Number(l.toFixed(2)), y: Number((T * T).toFixed(4)) },
        series,
        data: { l, alphaDeg, alphaRad, alpha0Deg, omega, T, v, Tnorm },
      };
    }

    case "harmonic_phasor": {
      const A1 = params.A1 ?? 6;
      const phi1 = degToRad(params.phi1 ?? 0);
      const A2 = params.A2 ?? 4;
      const phi2 = degToRad(params.phi2 ?? 90);
      const omega = params.omega ?? 3;
      const x1 = A1 * Math.cos(omega * t + phi1);
      const x2 = A2 * Math.cos(omega * t + phi2);
      const xSum = x1 + x2;
      const rx = A1 * Math.cos(phi1) + A2 * Math.cos(phi2);
      const ry = A1 * Math.sin(phi1) + A2 * Math.sin(phi2);
      const A = Math.hypot(rx, ry);
      const phiDeg = (Math.atan2(ry, rx) * 180) / Math.PI;
      const T = (2 * Math.PI) / omega;
      const series: SimGraphPoint[] = [];
      for (let i = 0; i <= 50; i++) {
        const ti = (i / 50) * 2 * T;
        const y1 = A1 * Math.cos(omega * ti + phi1);
        const y2 = A2 * Math.cos(omega * ti + phi2);
        series.push({ x: ti, y: y1 + y2, y2: y1 });
      }
      return {
        metrics: [
          { label: "A_tổng", value: `${A.toFixed(2)} cm` },
          { label: "φ_tổng", value: `${phiDeg.toFixed(1)}°` },
          { label: "x₁ / x₂", value: `${x1.toFixed(1)} / ${x2.toFixed(1)}` },
          { label: "x", value: `${xSum.toFixed(2)} cm` },
        ],
        recordPoint: { x: Number(t.toFixed(2)), y: Number(xSum.toFixed(2)) },
        series,
        data: {
          A1,
          A2,
          A,
          a1: omega * t + phi1,
          a2: omega * t + phi2,
          aSum: omega * t + Math.atan2(ry, rx),
          x1,
          x2,
          xSum,
        },
      };
    }

    case "standing_wave": {
      const k = Math.max(1, Math.round(params.n ?? 3));
      const f = params.f ?? 1.5;
      const A = params.A ?? 3;
      const isFreeEnd = mode === "fixed_free";
      const halfWaves = isFreeEnd ? k - 0.5 : k;
      const omega = 2 * Math.PI * f;
      const series: SimGraphPoint[] = [];
      for (let i = 0; i <= 60; i++) {
        const uNorm = i / 60;
        const env = Math.sin(halfWaves * Math.PI * uNorm);
        series.push({ x: uNorm, y: A * env * Math.cos(omega * t) });
      }
      return {
        metrics: [
          { label: "Số bó/nút", value: isFreeEnd ? `${k} nút, ${k} bụng` : `${k} bó, ${k + 1} nút` },
          { label: "f", value: `${f.toFixed(2)} Hz` },
          { label: "λ/L", value: `${(2 / halfWaves).toFixed(2)}` },
        ],
        recordPoint: { x: k, y: f },
        series,
        data: { k, halfWaves, f, A, phase: omega * t, isFreeEnd: isFreeEnd ? 1 : 0 },
      };
    }

    case "wave_interference": {
      const lambda = params.lambda ?? 2.4;
      const d = params.d ?? 10;
      const dphiRad = degToRad(params.dphi ?? 0);
      const nMax = Math.floor(d / lambda);
      const series: SimGraphPoint[] = [];
      for (let i = 0; i <= 60; i++) {
        const xPos = -d / 2 + (i / 60) * d;
        const d1 = Math.abs(xPos + d / 2);
        const d2 = Math.abs(xPos - d / 2);
        const amp = Math.abs(2 * Math.cos((Math.PI * (d2 - d1)) / lambda - dphiRad / 2));
        series.push({ x: xPos, y: amp });
      }
      return {
        metrics: [
          { label: "λ", value: `${lambda.toFixed(1)} cm` },
          { label: "AB/λ", value: `${(d / lambda).toFixed(2)}` },
          { label: "Số cực đại", value: `${2 * nMax + 1}` },
        ],
        recordPoint: { x: Number(lambda.toFixed(2)), y: 2 * nMax + 1 },
        series,
        data: { lambda, d, dphiRad, t },
      };
    }

    case "young_double_slit": {
      const lambdaNm = params.lambdaNm ?? 590;
      const aMm = params.aMm ?? 1.0;
      const Dm = params.Dm ?? 2.0;
      const iMm = ((lambdaNm * 1e-6) * (Dm * 1000)) / aMm;
      const series: SimGraphPoint[] = [];
      for (let idx = 0; idx <= 60; idx++) {
        const xMm = -5 + (idx / 60) * 10;
        const I = Math.pow(Math.cos((Math.PI * xMm) / iMm), 2);
        series.push({ x: xMm, y: I });
      }
      return {
        metrics: [
          { label: "λ", value: `${lambdaNm} nm` },
          { label: "i (khoảng vân)", value: `${iMm.toFixed(3)} mm` },
          { label: "x_s(k=2)", value: `${(2 * iMm).toFixed(2)} mm` },
        ],
        recordPoint: { x: Number(Dm.toFixed(2)), y: Number(iMm.toFixed(4)) },
        series,
        data: { lambdaNm, aMm, Dm, iMm },
      };
    }

    case "ideal_gas": {
      const V = params.V ?? 3;
      const T = params.T ?? 300;
      const n = params.n ?? 0.2;
      const p = (n * R_GAS * T) / Math.max(0.4, V);
      const vRmsRatio = Math.sqrt(T / 300);
      const series: SimGraphPoint[] = [];
      for (let idx = 0; idx <= 35; idx++) {
        const Vi = 1 + (idx / 35) * 7;
        if (mode === "isobaric") {
          series.push({ x: Vi, y: p });
        } else if (mode === "isochoric") {
          series.push({ x: V, y: 0.5 + (idx / 35) * 3.5 });
        } else {
          series.push({ x: Vi, y: (n * R_GAS * T) / Vi });
        }
      }
      return {
        metrics: [
          { label: "p", value: `${p.toFixed(2)} atm` },
          { label: "V", value: `${V.toFixed(2)} lít` },
          { label: "T", value: `${T} K (${(T - 273).toFixed(0)}°C)` },
          { label: "pV/T", value: `${((p * V) / T).toFixed(4)}` },
        ],
        recordPoint: { x: Number(V.toFixed(2)), y: Number(p.toFixed(3)) },
        series,
        data: { V, T, n, p, vRmsRatio, t },
      };
    }

    case "em_induction": {
      const B = (params.B ?? 50) * 1e-3;
      const N = params.N ?? 100;
      const spd = params.speedFactor ?? 1.25;
      const S = 0.02; // m^2 coil area
      const omega = 2.2 * spd;
      const magX = Math.sin(omega * t); // -1..1 magnet sweep
      // Flux peaks when magnet center passes coil (x = 0)
      const flux = N * B * S * Math.exp(-3.5 * magX * magX);
      const dMagDt = omega * Math.cos(omega * t);
      const emf = -N * B * S * (-7 * magX * dMagDt) * Math.exp(-3.5 * magX * magX);
      const series: SimGraphPoint[] = [];
      for (let i = 0; i <= 45; i++) {
        const ti = (i / 45) * 3.2;
        const mx = Math.sin(omega * ti);
        const dm = omega * Math.cos(omega * ti);
        const eVal = -N * B * S * (-7 * mx * dm) * Math.exp(-3.5 * mx * mx);
        series.push({ x: ti, y: eVal });
      }
      return {
        metrics: [
          { label: "Φ", value: `${(flux * 1000).toFixed(2)} mWb` },
          { label: "e_c", value: `${emf.toFixed(2)} V` },
          { label: "Chiều i_c", value: Math.abs(emf) < 0.05 ? "≈ 0" : emf > 0 ? "Thuận" : "Ngược" },
        ],
        recordPoint: { x: Number(t.toFixed(2)), y: Number(emf.toFixed(3)) },
        series,
        data: { magX, flux, emf },
      };
    }

    case "rlc_ac_osc": {
      const U = params.U ?? 100;
      const f = params.f ?? 50;
      const R = params.R ?? 50;
      const L = (params.LmH ?? 318) * 1e-3;
      const C = (params.CuF ?? 32) * 1e-6;
      const omega = 2 * Math.PI * f;
      const ZL = omega * L;
      const ZC = 1 / (omega * C);
      const Z = Math.sqrt(R * R + (ZL - ZC) * (ZL - ZC));
      const I = U / Z;
      const phiRad = Math.atan2(ZL - ZC, R);
      const phiDeg = (phiRad * 180) / Math.PI;
      const cosPhi = R / Z;
      const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));
      const uInst = U * Math.SQRT2 * Math.cos(2 * Math.PI * 1.2 * t);
      const iInst = I * Math.SQRT2 * Math.cos(2 * Math.PI * 1.2 * t - phiRad);
      const series: SimGraphPoint[] = [];
      for (let i = 0; i <= 60; i++) {
        const ti = (i / 60) * 40; // ms
        const th = 2 * Math.PI * (ti / 20);
        series.push({
          x: ti,
          y: U * Math.SQRT2 * Math.cos(th),
          y2: I * Math.SQRT2 * Math.cos(th - phiRad) * 25,
        });
      }
      return {
        metrics: [
          { label: "Z_L / Z_C", value: `${ZL.toFixed(1)} / ${ZC.toFixed(1)} Ω` },
          { label: "Z", value: `${Z.toFixed(1)} Ω` },
          { label: "I", value: `${I.toFixed(2)} A` },
          { label: "φ / cosφ", value: `${phiDeg.toFixed(1)}° / ${cosPhi.toFixed(2)}` },
          { label: "f_cộng hưởng", value: `${f0.toFixed(1)} Hz` },
        ],
        recordPoint: { x: f, y: Number(I.toFixed(3)) },
        series,
        data: { U, f, R, ZL, ZC, Z, I, phiRad, phiDeg, f0, uInst, iInst, phase: 2 * Math.PI * 1.2 * t },
      };
    }

    case "photoelectric_nuclear": {
      if (mode === "radioactive") {
        const T = params.halfLife ?? 3;
        const N0 = 100;
        const remainPct = 100 * Math.pow(2, -t / T);
        const series: SimGraphPoint[] = [];
        for (let i = 0; i <= 40; i++) {
          const ti = (i / 40) * 4 * T;
          series.push({ x: ti, y: N0 * Math.pow(2, -ti / T) });
        }
        return {
          metrics: [
            { label: "t / T", value: `${(t / T).toFixed(2)}` },
            { label: "N còn lại", value: `${remainPct.toFixed(1)}%` },
            { label: "ΔN đã phân rã", value: `${(100 - remainPct).toFixed(1)}%` },
          ],
          recordPoint: { x: Number(t.toFixed(2)), y: Number(remainPct.toFixed(2)) },
          series,
          data: { isRadioactive: 1, T, remainPct, t },
        };
      }
      const lambdaNm = params.lambdaNm ?? 360;
      const workEv = params.workEv ?? 2.3;
      const photonEv = H_PLANCK * C_LIGHT / (lambdaNm * 1e-9 * E_CHARGE);
      const lambda0Nm = (H_PLANCK * C_LIGHT) / (workEv * E_CHARGE * 1e-9);
      const kMaxEv = Math.max(0, photonEv - workEv);
      const emitted = photonEv >= workEv;
      const series: SimGraphPoint[] = [];
      for (let i = 0; i <= 35; i++) {
        const lNm = 200 + (i / 35) * 500;
        const eP = (H_PLANCK * C_LIGHT) / (lNm * 1e-9 * E_CHARGE);
        series.push({ x: lNm, y: Math.max(0, eP - workEv) });
      }
      return {
        metrics: [
          { label: "ε (photon)", value: `${photonEv.toFixed(2)} eV` },
          { label: "λ₀ (giới hạn)", value: `${lambda0Nm.toFixed(0)} nm` },
          { label: "W_đ max", value: `${kMaxEv.toFixed(2)} eV` },
          { label: "Bức xạ e⁻", value: emitted ? "Có" : "Không (λ > λ₀)" },
        ],
        recordPoint: { x: lambdaNm, y: Number(kMaxEv.toFixed(3)) },
        series,
        data: { isRadioactive: 0, lambdaNm, workEv, photonEv, lambda0Nm, kMaxEv, emitted: emitted ? 1 : 0, t },
      };
    }
  }
}

/**
 * Converts a light wavelength (nm) in [380..760] into a crisp RGB hex color.
 */
export function wavelengthToHex(nm: number): string {
  if (nm < 420) return "#7c3aed";
  if (nm < 475) return "#2563eb";
  if (nm < 510) return "#0891b2";
  if (nm < 570) return "#16a34a";
  if (nm < 600) return "#eab308";
  if (nm < 635) return "#ea580c";
  return "#dc2626";
}
