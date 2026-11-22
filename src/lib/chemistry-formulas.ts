/**
 * Grade 10–12 (GDPT 2018) Chemistry LaTeX Formula Bank organized by topic.
 */

import { normalizeVietnameseQuery } from "./physics-formulas";

export type ChemistryTopicCategory =
  | "mol_solution"
  | "atomic_thermochem"
  | "equilibrium_ph"
  | "electrochem"
  | "organic"
  | "conservation";

export interface ChemistryTopicGroupMeta {
  id: ChemistryTopicCategory;
  label: string;
}

export const CHEMISTRY_TOPIC_GROUPS: ReadonlyArray<ChemistryTopicGroupMeta> = [
  { id: "mol_solution", label: "Mol & Dung dịch" },
  { id: "atomic_thermochem", label: "Nguyên tử & Nhiệt hoá" },
  { id: "equilibrium_ph", label: "Cân bằng & pH" },
  { id: "electrochem", label: "Điện hoá & OXH-K" },
  { id: "organic", label: "Hoá hữu cơ" },
  { id: "conservation", label: "Bảo toàn & Giải nhanh" },
];

export interface ChemistryFormulaItem {
  id: string;
  category: ChemistryTopicCategory;
  topic: string;
  name: string;
  latex: string;
  note: string;
  keywords: string[];
}

export const CHEMISTRY_FORMULAS: ReadonlyArray<ChemistryFormulaItem> = [
  // --- MOL & DUNG DỊCH ---
  {
    id: "c_mol",
    category: "mol_solution",
    topic: "Mol & Dung dịch",
    name: "Công thức tính số mol (n)",
    latex: "n = \\frac{m}{M} = \\frac{V_{\\text{đkc}}}{24.79} = \\frac{N}{N_A}",
    note: "ĐKC (25°C, 1 bar): 24,79 L/mol; ĐKTC (0°C, 1 atm): 22,4 L/mol; Nₐ = 6,022×10²³",
    keywords: ["so mol", "khoi luong", "the tich", "dkc", "avogadro"],
  },
  {
    id: "c_tikhoi",
    category: "mol_solution",
    topic: "Mol & Dung dịch",
    name: "Tỉ khối của chất khí",
    latex: "d_{A/B} = \\frac{M_A}{M_B},\\quad d_{A/\\text{kk}} = \\frac{M_A}{29}",
    note: "M_kk ≈ 29 g/mol (hỗn hợp ~78% N₂, 21% O₂)",
    keywords: ["ti khoi", "chat khi", "khong khi", "phan tu khoi"],
  },
  {
    id: "c_nongdo",
    category: "mol_solution",
    topic: "Mol & Dung dịch",
    name: "Nồng độ phần trăm (C%) & Nồng độ mol (C_M)",
    latex: "C\\% = \\frac{m_{ct}}{m_{dd}} \\cdot 100\\%,\\quad C_M = \\frac{n}{V_{dd}}",
    note: "m_dd = m_ct + m_dm = D · V_dd (V_dd tính bằng lít cho C_M)",
    keywords: ["nong do", "phan tram", "mol", "dung dich"],
  },
  {
    id: "c_lienhe_c",
    category: "mol_solution",
    topic: "Mol & Dung dịch",
    name: "Liên hệ giữa C_M, C% và khối lượng riêng D",
    latex: "C_M = \\frac{10 \\cdot D \\cdot C\\%}{M},\\quad C\\% = \\frac{C_M \\cdot M}{10 \\cdot D}",
    note: "D tính theo g/mL (hoặc g/cm³), M là khối lượng mol (g/mol)",
    keywords: ["lien he", "nong do", "khoi luong rieng", "doi nong do"],
  },
  {
    id: "c_dotan",
    category: "mol_solution",
    topic: "Mol & Dung dịch",
    name: "Độ tan (S) & Nồng độ dung dịch bão hoà",
    latex: "S = \\frac{m_{ct}}{m_{H_2O}} \\cdot 100,\\quad C\\%_{\\text{bh}} = \\frac{S}{100 + S} \\cdot 100\\%",
    note: "S (g/100g nước) phụ thuộc nhiệt độ",
    keywords: ["do tan", "bao hoa", "ket tinh", "dung dich"],
  },
  {
    id: "c_hieusuat",
    category: "mol_solution",
    topic: "Mol & Dung dịch",
    name: "Hiệu suất phản ứng (H%)",
    latex: "H\\% = \\frac{n_{\\text{thực tế}}}{n_{\\text{lý thuyết}}} \\cdot 100\\% = \\frac{m_{\\text{thực tế}}}{m_{\\text{lý thuyết}}} \\cdot 100\\%",
    note: "Tính theo chất phản ứng hết; thuận: nhân H%, nghịch: chia H%",
    keywords: ["hieu suat", "phan ung", "thuc te", "ly thuyet"],
  },

  // --- NGUYÊN TỬ & NHIỆT HOÁ HỌC ---
  {
    id: "c_ntk_tb",
    category: "atomic_thermochem",
    topic: "Nguyên tử & Nhiệt hoá",
    name: "Số khối & Nguyên tử khối trung bình",
    latex: "A = Z + N,\\quad \\overline{A} = \\frac{a_1 A_1 + a_2 A_2 + \\dots + a_n A_n}{100}",
    note: "aᵢ là % số nguyên tử đồng vị thứ i (∑aᵢ = 100%)",
    keywords: ["dong vi", "so khoi", "nguyen tu khoi", "trung binh"],
  },
  {
    id: "c_enthalpy_f",
    category: "atomic_thermochem",
    topic: "Nguyên tử & Nhiệt hoá",
    name: "Biến thiên Enthalpy theo nhiệt tạo thành chuẩn",
    latex: "\\Delta_r H^\\circ_{298} = \\sum \\Delta_f H^\\circ_{298}(\\text{sp}) - \\sum \\Delta_f H^\\circ_{298}(\\text{cđ})",
    note: "ΔrH° < 0: toả nhiệt; ΔrH° > 0: thu nhiệt; đơn chất bền có ΔfH° = 0",
    keywords: ["enthalpy", "nhiet tao thanh", "toa nhiet", "thu nhiet"],
  },
  {
    id: "c_enthalpy_eb",
    category: "atomic_thermochem",
    topic: "Nguyên tử & Nhiệt hoá",
    name: "Biến thiên Enthalpy theo năng lượng liên kết (E_b)",
    latex: "\\Delta_r H^\\circ_{298} = \\sum E_b(\\text{cđ}) - \\sum E_b(\\text{sp})",
    note: "Áp dụng cho phản ứng các chất ở thể khí (chất đầu trừ sản phẩm)",
    keywords: ["enthalpy", "nang luong lien ket", "eb"],
  },
  {
    id: "c_tocdo",
    category: "atomic_thermochem",
    topic: "Nguyên tử & Nhiệt hoá",
    name: "Tốc độ phản ứng & Định luật tác dụng khối lượng",
    latex: "\\bar{v} = -\\frac{1}{a}\\frac{\\Delta C_A}{\\Delta t} = \\frac{1}{m}\\frac{\\Delta C_M}{\\Delta t},\\quad v = k \\cdot C_A^a C_B^b",
    note: "Cho phản ứng đơn giản aA + bB → mM + nN",
    keywords: ["toc do phan ung", "hang so toc do", "tac dung khoi luong"],
  },
  {
    id: "c_vanthoff",
    category: "atomic_thermochem",
    topic: "Nguyên tử & Nhiệt hoá",
    name: "Quy tắc nhiệt độ Van 't Hoff",
    latex: "\\frac{v_{T_2}}{v_{T_1}} = \\gamma^{\\frac{T_2 - T_1}{10}}",
    note: "γ là hệ số nhiệt độ Van 't Hoff (thường 2 ≤ γ ≤ 4)",
    keywords: ["van t hoff", "he so nhiet do", "toc do phan ung"],
  },

  // --- CÂN BẰNG & pH ---
  {
    id: "c_kc",
    category: "equilibrium_ph",
    topic: "Cân bằng & pH",
    name: "Hằng số cân bằng K_C",
    latex: "K_C = \\frac{[C]^c [D]^d}{[A]^a [B]^b}",
    note: "aA + bB ⇌ cC + dD (không đưa nồng độ chất rắn vào biểu thức K_C)",
    keywords: ["hang so can bang", "kc", "thuan nghich"],
  },
  {
    id: "c_ph",
    category: "equilibrium_ph",
    topic: "Cân bằng & pH",
    name: "Tích số ion của nước & Công thức pH",
    latex: "[H^+][OH^-] = 10^{-14},\\quad \\text{pH} = -\\lg[H^+],\\quad \\text{pH} + \\text{pOH} = 14",
    note: "25°C: pH < 7 (axit), pH = 7 (trung tính), pH > 7 (bazơ)",
    keywords: ["ph", "poh", "tich so ion", "axit", "bazo"],
  },
  {
    id: "c_dienli",
    category: "equilibrium_ph",
    topic: "Cân bằng & pH",
    name: "Độ điện li (α) & Hằng số axit yếu (K_a)",
    latex: "\\alpha = \\frac{n_{\\text{pl}}}{n_0},\\quad K_a = \\frac{\\alpha^2 C}{1 - \\alpha}",
    note: "Chất điện li mạnh: α = 1; chất điện li yếu: 0 < α < 1",
    keywords: ["do dien li", "hang so axit", "ostwald", "dien li yeu"],
  },
  {
    id: "c_khilytuong",
    category: "equilibrium_ph",
    topic: "Cân bằng & pH",
    name: "Phương trình trạng thái khí lý tưởng",
    latex: "P \\cdot V = n \\cdot R \\cdot T",
    note: "R = 0,082 (atm·L)/(mol·K) hoặc 8,314 J/(mol·K); T(K) = t(°C) + 273",
    keywords: ["khi ly tuong", "ap suat", "pv nrt"],
  },

  // --- ĐIỆN HOÁ & OXI HOÁ - KHỬ ---
  {
    id: "c_bte",
    category: "electrochem",
    topic: "Điện hoá & OXH-K",
    name: "Định luật Bảo toàn electron",
    latex: "\\sum n_{e\\text{ nhường}} = \\sum n_{e\\text{ nhận}}",
    note: "Tổng số mol e chất khử nhường bằng tổng số mol e chất oxi hoá nhận",
    keywords: ["bao toan electron", "oxi hoa khu", "nhuong nhan"],
  },
  {
    id: "c_pin",
    category: "electrochem",
    topic: "Điện hoá & OXH-K",
    name: "Suất điện động chuẩn của Pin điện hoá (Galvani)",
    latex: "E^\\circ_{\\text{pin}} = E^\\circ_{\\text{cathode}} - E^\\circ_{\\text{anode}} = E^\\circ_{(+)} - E^\\circ_{(-)}",
    note: "Anode (-): xảy ra sự oxi hoá; Cathode (+): xảy ra sự khử",
    keywords: ["pin dien hoa", "galvani", "suat dien dong", "the dien cuc"],
  },
  {
    id: "c_faraday",
    category: "electrochem",
    topic: "Điện hoá & OXH-K",
    name: "Định luật Faraday về điện phân",
    latex: "m = \\frac{A \\cdot I \\cdot t}{n \\cdot F},\\quad n_e = \\frac{I \\cdot t}{F}",
    note: "F = 96500 C/mol; I (A), t (s), n là số electron trao đổi",
    keywords: ["dien phan", "faraday", "cuong do dong dien", "so mol e"],
  },

  // --- HOÁ HỮU CƠ ---
  {
    id: "c_k_unstat",
    category: "organic",
    topic: "Hoá hữu cơ",
    name: "Độ bất bão hoà (k) của hợp chất hữu cơ",
    latex: "k = \\frac{2C + 2 - H + N - X}{2} = \\pi + v",
    note: "C_xH_yO_zN_tX_u: k bằng tổng số liên kết π và số vòng (v)",
    keywords: ["do bat bao hoa", "lien ket pi", "vong", "huu co"],
  },
  {
    id: "c_hc_dotchay",
    category: "organic",
    topic: "Hoá hữu cơ",
    name: "Quan hệ đốt cháy hợp chất hữu cơ",
    latex: "n_{CO_2} - n_{H_2O} = (k - 1) \\cdot n_X",
    note: "Ankan (k=0): n_X = n_H₂O - n_CO₂; Anken (k=1): n_CO₂ = n_H₂O",
    keywords: ["dot chay", "hidrocacbon", "ankan", "anken", "ankin"],
  },
  {
    id: "c_este",
    category: "organic",
    topic: "Hoá hữu cơ",
    name: "Phản ứng xà phòng hoá Este & Chất béo",
    latex: "m_{\\text{este}} + m_{\\text{kiềm}} = m_{\\text{muối}} + m_{\\text{ancol}},\\quad n_{C_3H_5(OH)_3} = \\frac{1}{3}n_{NaOH}",
    note: "Este đơn chức (không phải phenol): n_NaOH = n_este = n_ancol",
    keywords: ["este", "chat beo", "xa phong hoa", "glixerol"],
  },
  {
    id: "c_peptit",
    category: "organic",
    topic: "Hoá hữu cơ",
    name: "Thuỷ phân Peptit trong môi trường kiềm / axit",
    latex: "\\text{Peptit } X_n + nNaOH \\rightarrow \\text{Muối} + H_2O,\\quad \\text{Peptit } X_n + (n-1)H_2O + nHCl \\rightarrow \\text{Muối}",
    note: "Áp dụng cho n-peptit mạch hở tạo từ α-amino acid có 1 NH₂ và 1 COOH",
    keywords: ["peptit", "amino acid", "thuy phan", "protein"],
  },

  // --- BẢO TOÀN & GIẢI NHANH ---
  {
    id: "c_btkl",
    category: "conservation",
    topic: "Bảo toàn & Giải nhanh",
    name: "Định luật Bảo toàn khối lượng",
    latex: "\\sum m_{\\text{chất tham gia}} = \\sum m_{\\text{sản phẩm}}",
    note: "m_dd sau = m_trước - m_kết tủa - m_khí thoát ra",
    keywords: ["bao toan khoi luong", "btkl", "ket tua", "khi"],
  },
  {
    id: "c_btdt",
    category: "conservation",
    topic: "Bảo toàn & Giải nhanh",
    name: "Định luật Bảo toàn điện tích (dung dịch ion)",
    latex: "\\sum (n_{\\text{cation}} \\cdot z^+) = \\sum (n_{\\text{anion}} \\cdot z^-)",
    note: "Dung dịch luôn trung hoà về điện; m_muối = ∑m_cation + ∑m_anion",
    keywords: ["bao toan dien tich", "btdt", "ion", "dung dich"],
  },
  {
    id: "c_muoi_axit",
    category: "conservation",
    topic: "Bảo toàn & Giải nhanh",
    name: "Tính nhanh khối lượng muối (Kim loại + HCl / H₂SO₄ loãng)",
    latex: "m_{\\text{muối Cl}} = m_{KL} + 71\\,n_{H_2},\\quad m_{\\text{muối }SO_4} = m_{KL} + 96\\,n_{H_2}",
    note: "Từ n_HCl = 2n_H₂ ⇒ m_Cl⁻ = 35,5×2n_H₂ = 71n_H₂; n_SO₄²⁻ = n_H₂",
    keywords: ["tinh nhanh", "muoi", "kim loai", "hcl", "h2so4"],
  },
];

export function filterChemistryFormulas(
  query: string,
  category: ChemistryTopicCategory | "all"
): ChemistryFormulaItem[] {
  const q = normalizeVietnameseQuery(query);
  return CHEMISTRY_FORMULAS.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    if (!q) return true;
    const hay = normalizeVietnameseQuery(
      `${item.name} ${item.topic} ${item.note} ${item.keywords.join(" ")}`
    );
    return hay.includes(q);
  });
}
