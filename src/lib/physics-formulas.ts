/**
 * Grade 10–12 (GDPT 2018) Physics LaTeX Formula Bank, Fundamental Constants,
 * and Quick Unit Converter helpers.
 */

import type {
  PhysicsConstantItem,
  PhysicsFormulaItem,
  PhysicsGrade,
} from "@/types/physics";

export function normalizeVietnameseQuery(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export const PHYSICS_FORMULAS: ReadonlyArray<PhysicsFormulaItem> = [
  // --- LỚP 10 ---
  {
    id: "f10_bdd_v",
    grade: 10,
    topic: "Động học",
    name: "Vận tốc & Quãng đường thẳng BĐĐ",
    latex: "v = v_0 + at,\\quad d = v_0 t + \\frac{1}{2}at^2,\\quad v^2 - v_0^2 = 2ad",
    note: "v₀: m/s, a: m/s², t: s",
    keywords: ["van toc", "gia toc", "quang duong", "thang bdd"],
  },
  {
    id: "f10_roi",
    grade: 10,
    topic: "Động học",
    name: "Rơi tự do",
    latex: "h = \\frac{1}{2}gt^2,\\quad v = gt = \\sqrt{2gh}",
    note: "g ≈ 9,8 m/s² (hoặc 10 m/s²)",
    keywords: ["roi tu do", "do cao", "trong truong"],
  },
  {
    id: "f10_nem",
    grade: 10,
    topic: "Động học",
    name: "Ném xiên (Tầm xa & Độ cao cực đại)",
    latex: "L = \\frac{v_0^2 \\sin(2\\alpha)}{g},\\quad H_{\\max} = \\frac{v_0^2 \\sin^2\\alpha}{2g}",
    note: "Ném ngang: α = 0, L = v₀√(2h/g)",
    keywords: ["nem xien", "nem ngang", "tam xa", "quy dao"],
  },
  {
    id: "f10_newton2",
    grade: 10,
    topic: "Động lực học",
    name: "Định luật II Newton & Lực ma sát",
    latex: "\\vec{F}_{\\text{hl}} = m\\vec{a},\\quad F_{ms} = \\mu N",
    note: "Mặt phẳng nghiêng α: N = mg cosα",
    keywords: ["newton", "luc ma sat", "hop luc", "mat nghieng"],
  },
  {
    id: "f10_moment",
    grade: 10,
    topic: "Tĩnh học",
    name: "Moment lực & Điều kiện cân bằng",
    latex: "M = F\\cdot d,\\quad \\sum M_{\\text{thuận}} = \\sum M_{\\text{ngược}}",
    note: "d: cánh tay đòn (m)",
    keywords: ["moment", "can bang", "canh tay don"],
  },
  {
    id: "f10_energy",
    grade: 10,
    topic: "Năng lượng",
    name: "Công, Động năng, Thế năng & Bảo toàn cơ năng",
    latex: "A = Fs\\cos\\alpha,\\quad W_\\text{đ} = \\frac{1}{2}mv^2,\\quad W_t = mgh,\\quad W = W_\\text{đ} + W_t = \\text{const}",
    note: "Định lý động năng: A = ΔWđ",
    keywords: ["cong", "dong nang", "the nang", "co nang", "bao toan"],
  },
  {
    id: "f10_momentum",
    grade: 10,
    topic: "Động lượng",
    name: "Động lượng & Định luật bảo toàn",
    latex: "\\vec{p} = m\\vec{v},\\quad m_1\\vec{v}_1 + m_2\\vec{v}_2 = m_1\\vec{v}_1' + m_2\\vec{v}_2'",
    note: "Va chạm mềm: v' = (m₁v₁ + m₂v₂)/(m₁ + m₂)",
    keywords: ["dong luong", "va cham", "xung luong"],
  },
  {
    id: "f10_circular",
    grade: 10,
    topic: "Chuyển động tròn",
    name: "Chuyển động tròn đều & Lực hướng tâm",
    latex: "v = \\omega r = \\frac{2\\pi r}{T},\\quad a_{ht} = \\frac{v^2}{r} = \\omega^2 r,\\quad F_{ht} = m\\omega^2 r",
    note: "ω = 2πf (rad/s)",
    keywords: ["tron deu", "huong tam", "toc do goc"],
  },

  // --- LỚP 11 ---
  {
    id: "f11_dddh",
    grade: 11,
    topic: "Dao động",
    name: "Phương trình Dao động điều hòa (x, v, a)",
    latex: "x = A\\cos(\\omega t + \\varphi),\\quad v = -\\omega A\\sin(\\omega t + \\varphi),\\quad a = -\\omega^2 x",
    note: "Độc lập thời gian: A² = x² + (v/ω)²",
    keywords: ["dao dong dieu hoa", "li do", "van toc", "gia toc", "doc lap"],
  },
  {
    id: "f11_conlac",
    grade: 11,
    topic: "Dao động",
    name: "Chu kỳ Con lắc lò xo & Con lắc đơn",
    latex: "T_{lx} = 2\\pi\\sqrt{\\frac{m}{k}},\\quad T_\\text{đơn} = 2\\pi\\sqrt{\\frac{l}{g}},\\quad W = \\frac{1}{2}kA^2",
    note: "Cơ năng tỉ lệ với A²",
    keywords: ["con lac lo xo", "con lac don", "chu ky", "co nang"],
  },
  {
    id: "f11_song",
    grade: 11,
    topic: "Sóng",
    name: "Bước sóng, Giao thoa sóng & Sóng dừng",
    latex: "\\lambda = vT = \\frac{v}{f},\\quad d_2 - d_1 = k\\lambda,\\quad l = k\\frac{\\lambda}{2}",
    note: "Một đầu cố định - một đầu tự do: l = (2k+1)λ/4",
    keywords: ["buoc song", "song dung", "giao thoa song", "cuc dai"],
  },
  {
    id: "f11_yang",
    grade: 11,
    topic: "Sóng ánh sáng",
    name: "Giao thoa Y-âng (Khoảng vân)",
    latex: "i = \\frac{\\lambda D}{a},\\quad x_s = k\\frac{\\lambda D}{a},\\quad x_t = (k + 0{,}5)\\frac{\\lambda D}{a}",
    note: "λ: μm, a: mm, D: m ⇒ i: mm",
    keywords: ["yang", "khoang van", "giao thoa anh sang", "van sang"],
  },
  {
    id: "f11_coulomb",
    grade: 11,
    topic: "Điện trường",
    name: "Định luật Cu-lông, Cường độ điện trường & Tụ điện",
    latex: "F = k\\frac{|q_1 q_2|}{\\varepsilon r^2},\\quad E = k\\frac{|Q|}{\\varepsilon r^2},\\quad Q = CU,\\quad W = \\frac{1}{2}CU^2",
    note: "k = 9.10⁹ N·m²/C²",
    keywords: ["cu long", "dien truong", "tu dien", "dien the"],
  },
  {
    id: "f11_ohm",
    grade: 11,
    topic: "Dòng điện không đổi",
    name: "Định luật Ôm toàn mạch & Công suất",
    latex: "I = \\frac{E}{R_N + r},\\quad U_N = E - Ir,\\quad P = UI = I^2 R,\\quad H = \\frac{R_N}{R_N + r}",
    note: "Công nguồn điện: A_ng = EIt",
    keywords: ["dinh luat om", "toan mach", "suat dien dong", "cong suat", "hieu suat"],
  },

  // --- LỚP 12 & QUANG ---
  {
    id: "f12_nhiet",
    grade: 12,
    topic: "Vật lý nhiệt",
    name: "Nhiệt lượng & Nguyên lý I Nhiệt động lực học",
    latex: "Q = mc\\Delta T,\\quad Q = \\lambda m,\\quad Q = Lm,\\quad \\Delta U = A + Q",
    note: "Q > 0 nhận nhiệt, A > 0 nhận công",
    keywords: ["nhiet luong", "nong chay", "hoa hoi", "noi nang", "nhiet dong"],
  },
  {
    id: "f12_khi",
    grade: 12,
    topic: "Khí lý tưởng",
    name: "Phương trình trạng thái Khí lý tưởng & Động học phân tử",
    latex: "pV = nRT,\\quad \\frac{p_1 V_1}{T_1} = \\frac{p_2 V_2}{T_2},\\quad p = \\frac{1}{3}\\mu m \\overline{v^2},\\quad \\overline{E}_\\text{đ} = \\frac{3}{2}k_B T",
    note: "R = 8,31 J/(mol·K) hoặc 0,082 atm·lít/(mol·K)",
    keywords: ["khi ly tuong", "clapeyron", "boyler", "dang nhiet", "ap suat"],
  },
  {
    id: "f12_tu",
    grade: 12,
    topic: "Từ trường & Cảm ứng điện từ",
    name: "Lực từ, Từ thông & Suất điện động cảm ứng",
    latex: "F = BIl\\sin\\alpha,\\quad \\Phi = NBS\\cos\\alpha,\\quad e_c = -\\frac{\\Delta\\Phi}{\\Delta t}",
    note: "Cộng hưởng từ / Lực Lo-ren-xơ: f = |q|vB sinα",
    keywords: ["luc tu", "tu thong", "faraday", "cam ung dien tu", "lorenzo"],
  },
  {
    id: "f12_rlc",
    grade: 12,
    topic: "Dòng xoay chiều",
    name: "Tổng trở mạch RLC & Hệ số công suất",
    latex: "Z = \\sqrt{R^2 + (Z_L - Z_C)^2},\\quad Z_L = \\omega L,\\quad Z_C = \\frac{1}{\\omega C},\\quad \\cos\\varphi = \\frac{R}{Z}",
    note: "Cộng hưởng: ω²LC = 1, P_max = U²/R",
    keywords: ["xoay chieu", "rlc", "tong tro", "cong huong", "he so cong suat"],
  },
  {
    id: "f12_hatnhan",
    grade: 12,
    topic: "Vật lý hạt nhân & Lượng tử",
    name: "Quang điện Einstein, Năng lượng liên kết & Phóng xạ",
    latex: "\\varepsilon = hf = \\frac{hc}{\\lambda},\\quad \\Delta E = \\Delta m\\cdot c^2,\\quad N(t) = N_0 2^{-t/T}",
    note: "1u = 931,5 MeV/c²; H(t) = λN(t)",
    keywords: ["quang dien", "hat nhan", "phong xa", "nang luong lien ket", "ban ra"],
  },
  {
    id: "fopt_thaukinh",
    grade: "optics",
    topic: "Quang hình học",
    name: "Công thức Thấu kính & Độ phóng đại",
    latex: "D = \\frac{1}{f},\\quad \\frac{1}{f} = \\frac{1}{d} + \\frac{1}{d'},\\quad k = -\\frac{d'}{d} = \\frac{\\overline{A'B'}}{\\overline{AB}}",
    note: "f > 0 hội tụ, f < 0 phân kỳ; d' > 0 ảnh thật",
    keywords: ["thau kinh", "tieu cu", "do phong dai", "quang hinh", "guong cau"],
  },
];

export const PHYSICS_CONSTANTS: ReadonlyArray<PhysicsConstantItem> = [
  { id: "c_g", name: "Gia tốc trọng trường", symbol: "g", valueText: "9,81 m/s²", latex: "g \\approx 9{,}81\\text{ m/s}^2", keywords: ["trong truong", "g"] },
  { id: "c_G", name: "Hằng số hấp dẫn", symbol: "G", valueText: "6,67 × 10⁻¹¹ N·m²/kg²", latex: "G = 6{,}67\\times 10^{-11}\\text{ N}\\cdot\\text{m}^2/\\text{kg}^2", keywords: ["hap dan", "G"] },
  { id: "c_k", name: "Hằng số Cu-lông", symbol: "k", valueText: "9 × 10⁹ N·m²/C²", latex: "k = 9\\times 10^9\\text{ N}\\cdot\\text{m}^2/\\text{C}^2", keywords: ["cu long", "dien", "k"] },
  { id: "c_e", name: "Điện tích nguyên tố", symbol: "e", valueText: "1,602 × 10⁻¹⁹ C", latex: "e = 1{,}602\\times 10^{-19}\\text{ C}", keywords: ["electron", "dien tich", "e"] },
  { id: "c_me", name: "Khối lượng electron", symbol: "mₑ", valueText: "9,11 × 10⁻³¹ kg", latex: "m_e = 9{,}11\\times 10^{-31}\\text{ kg}", keywords: ["electron", "khoi luong"] },
  { id: "c_c", name: "Tốc độ ánh sáng chân không", symbol: "c", valueText: "3 × 10⁸ m/s", latex: "c = 3\\times 10^8\\text{ m/s}", keywords: ["anh sang", "chan khong", "c"] },
  { id: "c_h", name: "Hằng số Planck", symbol: "h", valueText: "6,625 × 10⁻³⁴ J·s", latex: "h = 6{,}625\\times 10^{-34}\\text{ J}\\cdot\\text{s}", keywords: ["planck", "luong tu", "h"] },
  { id: "c_R", name: "Hằng số khí lý tưởng", symbol: "R", valueText: "8,31 J/(mol·K)", latex: "R = 8{,}31\\text{ J/(mol}\\cdot\\text{K)}", keywords: ["khi ly tuong", "R"] },
  { id: "c_NA", name: "Số Avogadro", symbol: "Nₐ", valueText: "6,022 × 10²³ mol⁻¹", latex: "N_A = 6{,}022\\times 10^{23}\\text{ mol}^{-1}", keywords: ["avogadro", "mol"] },
  { id: "c_kB", name: "Hằng số Boltzmann", symbol: "k_B", valueText: "1,38 × 10⁻²³ J/K", latex: "k_B = 1{,}38\\times 10^{-23}\\text{ J/K}", keywords: ["boltzmann", "nhiet"] },
  { id: "c_u", name: "Đơn vị khối lượng nguyên tử", symbol: "1u", valueText: "931,5 MeV/c²", latex: "1\\text{ u} = 1{,}66055\\times 10^{-27}\\text{ kg} = 931{,}5\\text{ MeV}/c^2", keywords: ["hat nhan", "u", "mev"] },
];

export interface UnitConversionSpec {
  id: string;
  label: string;
  fromUnit: string;
  toUnit: string;
  convert: (v: number) => number;
  reverse: (v: number) => number;
}

export const PHYSICS_UNIT_CONVERSIONS: ReadonlyArray<UnitConversionSpec> = [
  {
    id: "speed_kmh_ms",
    label: "Vận tốc",
    fromUnit: "km/h",
    toUnit: "m/s",
    convert: (v) => v / 3.6,
    reverse: (v) => v * 3.6,
  },
  {
    id: "temp_c_k",
    label: "Nhiệt độ",
    fromUnit: "°C",
    toUnit: "K",
    convert: (v) => v + 273.15,
    reverse: (v) => v - 273.15,
  },
  {
    id: "energy_ev_j",
    label: "Năng lượng",
    fromUnit: "eV",
    toUnit: "J",
    convert: (v) => v * 1.602e-19,
    reverse: (v) => v / 1.602e-19,
  },
  {
    id: "ang_rpm_rads",
    label: "Tốc độ góc",
    fromUnit: "vòng/phút",
    toUnit: "rad/s",
    convert: (v) => (v * 2 * Math.PI) / 60,
    reverse: (v) => (v * 60) / (2 * Math.PI),
  },
  {
    id: "mass_u_mev",
    label: "Năng lượng nghỉ",
    fromUnit: "u",
    toUnit: "MeV/c²",
    convert: (v) => v * 931.5,
    reverse: (v) => v / 931.5,
  },
  {
    id: "press_atm_pa",
    label: "Áp suất",
    fromUnit: "atm",
    toUnit: "Pa",
    convert: (v) => v * 1.01325e5,
    reverse: (v) => v / 1.01325e5,
  },
];

export function filterPhysicsFormulas(
  query: string,
  grade: PhysicsGrade | "all"
): PhysicsFormulaItem[] {
  const nq = normalizeVietnameseQuery(query);
  return PHYSICS_FORMULAS.filter((f) => {
    if (grade !== "all" && f.grade !== grade) return false;
    if (!nq) return true;
    const hay = normalizeVietnameseQuery(
      `${f.name} ${f.topic} ${f.note} ${f.keywords.join(" ")}`
    );
    return hay.includes(nq);
  });
}
