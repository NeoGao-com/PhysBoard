/**
 * Grade 10–12 (GDPT 2018) Math LaTeX Formula Bank organized by topic.
 */

import { normalizeVietnameseQuery } from "./physics-formulas";

export type MathTopicCategory =
  | "algebra"
  | "trig"
  | "calculus"
  | "geometry2d"
  | "geometry3d"
  | "stats";

export interface MathTopicGroupMeta {
  id: MathTopicCategory;
  label: string;
}

export const MATH_TOPIC_GROUPS: ReadonlyArray<MathTopicGroupMeta> = [
  { id: "algebra", label: "Đại số & PT" },
  { id: "trig", label: "Lượng giác" },
  { id: "calculus", label: "Giải tích" },
  { id: "geometry2d", label: "Hình học 2D & Oxy" },
  { id: "geometry3d", label: "Không gian & Oxyz" },
  { id: "stats", label: "Tổ hợp & Xác suất" },
];

export interface MathFormulaItem {
  id: string;
  category: MathTopicCategory;
  topic: string;
  name: string;
  latex: string;
  note: string;
  keywords: string[];
}

export const MATH_FORMULAS: ReadonlyArray<MathFormulaItem> = [
  // --- ĐẠI SỐ & PHƯƠNG TRÌNH ---
  {
    id: "m_hdt",
    category: "algebra",
    topic: "Đại số & PT",
    name: "7 Hằng đẳng thức đáng nhớ",
    latex: "(a\\pm b)^2 = a^2 \\pm 2ab + b^2,\\quad a^2 - b^2 = (a-b)(a+b),\\quad (a\\pm b)^3 = a^3 \\pm 3a^2b + 3ab^2 \\pm b^3",
    note: "a³ ± b³ = (a ± b)(a² ∓ ab + b²)",
    keywords: ["hang dang thuc", "binh phuong", "lap phuong"],
  },
  {
    id: "m_viet",
    category: "algebra",
    topic: "Đại số & PT",
    name: "Phương trình bậc hai & Định lý Vi-ét",
    latex: "\\Delta = b^2 - 4ac,\\quad x_{1,2} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a},\\quad x_1 + x_2 = -\\frac{b}{a},\\quad x_1 x_2 = \\frac{c}{a}",
    note: "ax² + bx + c = 0 (a ≠ 0)",
    keywords: ["phuong trinh bac hai", "delta", "viet", "nghiem"],
  },
  {
    id: "m_bdt",
    category: "algebra",
    topic: "Đại số & PT",
    name: "Bất đẳng thức Cô-si (AM-GM) & Bunyakovsky",
    latex: "\\frac{a+b}{2} \\ge \\sqrt{ab}\\ (a,b \\ge 0),\\quad (ax+by)^2 \\le (a^2+b^2)(x^2+y^2)",
    note: "Dấu '=' xảy ra khi a = b (hoặc a/x = b/y)",
    keywords: ["bat dang thuc", "co si", "am gm", "bunyakovsky"],
  },
  {
    id: "m_log",
    category: "algebra",
    topic: "Đại số & PT",
    name: "Công thức Mũ & Logarit",
    latex: "\\log_a(xy) = \\log_a x + \\log_a y,\\quad \\log_a\\left(\\frac{x}{y}\\right) = \\log_a x - \\log_a y,\\quad \\log_a b = \\frac{\\log_c b}{\\log_c a}",
    note: "a > 0, a ≠ 1; x, y > 0; logₐ(xⁿ) = n logₐ x",
    keywords: ["logarit", "mu", "luy thua", "doi co so"],
  },

  // --- LƯỢNG GIÁC ---
  {
    id: "m_trig_base",
    category: "trig",
    topic: "Lượng giác",
    name: "Hệ thức lượng giác cơ bản",
    latex: "\\sin^2 x + \\cos^2 x = 1,\\quad 1 + \\tan^2 x = \\frac{1}{\\cos^2 x},\\quad 1 + \\cot^2 x = \\frac{1}{\\sin^2 x}",
    note: "tan x · cot x = 1",
    keywords: ["luong giac", "sin", "cos", "tan", "cot"],
  },
  {
    id: "m_trig_add",
    category: "trig",
    topic: "Lượng giác",
    name: "Công thức cộng lượng giác",
    latex: "\\sin(a\\pm b) = \\sin a\\cos b \\pm \\cos a\\sin b,\\quad \\cos(a\\pm b) = \\cos a\\cos b \\mp \\sin a\\sin b",
    note: "tan(a ± b) = (tan a ± tan b) / (1 ∓ tan a tan b)",
    keywords: ["cong thuc cong", "luong giac", "sin", "cos"],
  },
  {
    id: "m_trig_double",
    category: "trig",
    topic: "Lượng giác",
    name: "Công thức nhân đôi & hạ bậc",
    latex: "\\sin 2x = 2\\sin x\\cos x,\\quad \\cos 2x = \\cos^2 x - \\sin^2 x = 2\\cos^2 x - 1 = 1 - 2\\sin^2 x",
    note: "Hạ bậc: cos²x = (1 + cos 2x)/2, sin²x = (1 − cos 2x)/2",
    keywords: ["nhan doi", "ha bac", "sin 2x", "cos 2x"],
  },
  {
    id: "m_trig_sum",
    category: "trig",
    topic: "Lượng giác",
    name: "Biến đổi tổng ↔ tích",
    latex: "\\cos a + \\cos b = 2\\cos\\frac{a+b}{2}\\cos\\frac{a-b}{2},\\quad \\sin a + \\sin b = 2\\sin\\frac{a+b}{2}\\cos\\frac{a-b}{2}",
    note: "cos a − cos b = −2 sin((a+b)/2) sin((a−b)/2)",
    keywords: ["tong thanh tich", "tich thanh tong", "luong giac"],
  },

  // --- GIẢI TÍCH ---
  {
    id: "m_deriv",
    category: "calculus",
    topic: "Giải tích",
    name: "Bảng Đạo hàm cơ bản & Tiếp tuyến",
    latex: "(x^n)' = nx^{n-1},\\quad (\\sin x)' = \\cos x,\\quad (\\cos x)' = -\\sin x,\\quad (e^x)' = e^x,\\quad (\\ln x)' = \\frac{1}{x}",
    note: "Tiếp tuyến tại x₀: y = f'(x₀)(x − x₀) + f(x₀)",
    keywords: ["dao ham", "tiep tuyen", "vi phan", "cuc tri"],
  },
  {
    id: "m_integral",
    category: "calculus",
    topic: "Giải tích",
    name: "Bảng Nguyên hàm & Tích phân",
    latex: "\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C,\\quad \\int \\frac{1}{x}\\,dx = \\ln|x| + C,\\quad \\int_a^b f(x)\\,dx = F(b) - F(a)",
    note: "n ≠ −1; ∫eˣ dx = eˣ + C; ∫cos x dx = sin x + C",
    keywords: ["nguyen ham", "tich phan", "newton leibniz"],
  },
  {
    id: "m_area_vol",
    category: "calculus",
    topic: "Giải tích",
    name: "Ứng dụng Tích phân (Diện tích & Thể tích)",
    latex: "S = \\int_a^b |f(x) - g(x)|\\,dx,\\quad V = \\pi\\int_a^b [f(x)]^2\\,dx",
    note: "V: thể tích khối tròn xoay quanh Ox",
    keywords: ["dien tich", "the tich", "tron xoay", "tich phan"],
  },

  // --- HÌNH HỌC 2D & OXY ---
  {
    id: "m_tri_law",
    category: "geometry2d",
    topic: "Hình học 2D & Oxy",
    name: "Định lý Côsin, Sin & Công thức Heron",
    latex: "a^2 = b^2 + c^2 - 2bc\\cos A,\\quad \\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C} = 2R,\\quad S = \\sqrt{p(p-a)(p-b)(p-c)}",
    note: "p = (a + b + c)/2; S = ½ ab sin C = pr",
    keywords: ["cosin", "sin", "heron", "tam giac", "he thuc luong"],
  },
  {
    id: "m_oxy_dist",
    category: "geometry2d",
    topic: "Hình học 2D & Oxy",
    name: "Khoảng cách & Đường tròn trong Oxy",
    latex: "d(M, \\Delta) = \\frac{|ax_0 + by_0 + c|}{\\sqrt{a^2 + b^2}},\\quad (x-a)^2 + (y-b)^2 = R^2",
    note: "Δ: ax + by + c = 0; Tâm I(a; b), bán kính R",
    keywords: ["oxy", "khoang cach", "duong tron", "duong thang"],
  },

  // --- KHÔNG GIAN & OXYZ ---
  {
    id: "m_vol3d",
    category: "geometry3d",
    topic: "Không gian & Oxyz",
    name: "Thể tích Khối chóp, Lăng trụ, Nón, Trụ, Cầu",
    latex: "V_{\\text{chóp}} = \\frac{1}{3}Bh,\\quad V_{\\text{lăng trụ}} = Bh,\\quad V_{\\text{nón}} = \\frac{1}{3}\\pi r^2 h,\\quad V_{\\text{cầu}} = \\frac{4}{3}\\pi R^3",
    note: "Diện tích mặt cầu: S = 4πR²; Trụ: V = πr²h",
    keywords: ["the tich", "chop", "lang tru", "non", "tru", "cau"],
  },
  {
    id: "m_oxyz",
    category: "geometry3d",
    topic: "Không gian & Oxyz",
    name: "Mặt phẳng, Đường thẳng & Mặt cầu Oxyz",
    latex: "d(M, (P)) = \\frac{|ax_0+by_0+cz_0+d|}{\\sqrt{a^2+b^2+c^2}},\\quad \\cos(\\vec{u},\\vec{v}) = \\frac{|\\vec{u}\\cdot\\vec{v}|}{|\\vec{u}||\\vec{v}|}",
    note: "(P): ax + by + cz + d = 0 có VTPT n = (a; b; c)",
    keywords: ["oxyz", "mat phang", "vecto", "khoang cach", "goc"],
  },

  // --- TỔ HỢP & XÁC SUẤT ---
  {
    id: "m_comb",
    category: "stats",
    topic: "Tổ hợp & Xác suất",
    name: "Hoán vị, Chỉnh hợp, Tổ hợp & Nhị thức Newton",
    latex: "P_n = n!,\\quad A_n^k = \\frac{n!}{(n-k)!},\\quad C_n^k = \\frac{n!}{k!(n-k)!},\\quad (a+b)^n = \\sum_{k=0}^{n} C_n^k a^{n-k}b^k",
    note: "0! = 1; Cₙᵏ = Cₙⁿ⁻ᵏ",
    keywords: ["hoan vi", "chinh hop", "to hop", "newton"],
  },
  {
    id: "m_prob",
    category: "stats",
    topic: "Tổ hợp & Xác suất",
    name: "Xác suất cổ điển, Có điều kiện & Bayes",
    latex: "P(A|B) = \\frac{P(A\\cap B)}{P(B)},\\quad P(B) = P(A)P(B|A) + P(\\overline{A})P(B|\\overline{A})",
    note: "Công thức Bayes: P(A|B) = P(A)P(B|A) / P(B)",
    keywords: ["xac suat", "bayes", "dieu kien", "toan phan"],
  },
];

export function filterMathFormulas(
  query: string,
  category: MathTopicCategory | "all" = "all"
): MathFormulaItem[] {
  const nq = normalizeVietnameseQuery(query);
  return MATH_FORMULAS.filter((f) => {
    if (category !== "all" && f.category !== category) return false;
    if (!nq) return true;
    const hay = normalizeVietnameseQuery(
      `${f.name} ${f.topic} ${f.note} ${f.keywords.join(" ")}`
    );
    return hay.includes(nq);
  });
}
