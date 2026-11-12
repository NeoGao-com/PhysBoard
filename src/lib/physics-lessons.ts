/**
 * 1-Click Ready-to-Teach Lesson Presets for Grade 10–12 Physics.
 * Each preset generates a clean layout of simulation/diagram + formulas + prompt on canvas.
 */

import type { PhysicsLessonPreset } from "@/types/physics";

export const PHYSICS_LESSON_PRESETS: ReadonlyArray<PhysicsLessonPreset> = [
  {
    id: "lesson_10_projectile",
    grade: 10,
    title: "Bài giảng: Chuyển động ném xiên",
    subtitle: "Thí nghiệm quỹ đạo parabol + Công thức L_max, H_max + Câu hỏi khám phá",
    simKind: "projectile",
    formulaLatexList: [
      "L = \\frac{v_0^2 \\sin(2\\alpha)}{g}",
      "H_{\\max} = \\frac{v_0^2 \\sin^2\\alpha}{2g}",
    ],
    questionPrompt:
      "Thử nghiệm thay đổi góc ném α từ 15° đến 75° với cùng v₀ = 18 m/s. Góc α nào cho tầm xa L lớn nhất? Nhận xét cặp góc bù nhau (30° & 60°).",
    keywords: ["nem xien", "parabol", "lop 10"],
  },
  {
    id: "lesson_10_incline",
    grade: 10,
    title: "Bài giảng: Định luật II Newton trên mặt phẳng nghiêng",
    subtitle: "Kết hợp mô phỏng trượt + Sơ đồ phân tích lực Ox/Oy",
    simKind: "incline_newton",
    diagramKind: "fbd",
    formulaLatexList: [
      "\\vec{P} + \\vec{N} + \\vec{F}_{ms} = m\\vec{a}",
      "a = g(\\sin\\alpha - \\mu\\cos\\alpha)",
    ],
    questionPrompt:
      "Tăng dần góc nghiêng α từ 5° lên 35° (μ = 0,15). Khi góc α vượt ngưỡng nào thì vật bắt đầu trượt xuống?",
    keywords: ["mat phang nghieng", "ma sat", "newton", "lop 10"],
  },
  {
    id: "lesson_11_spring",
    grade: 11,
    title: "Bài giảng: Con lắc lò xo & Bảo toàn cơ năng",
    subtitle: "Mô phỏng dao động + Công thức T, W + Bảng ghi số liệu thực nghiệm",
    simKind: "spring_pendulum",
    formulaLatexList: [
      "T = 2\\pi\\sqrt{\\frac{m}{k}}",
      "W = \\frac{1}{2}kA^2 = W_\\text{đ} + W_t",
    ],
    questionPrompt:
      "Thay đổi khối lượng m (0,2 kg → 0,8 kg) và ghi số liệu vào bảng để kiểm chứng đồ thị T² phụ thuộc bậc nhất theo m.",
    keywords: ["con lac lo xo", "co nang", "lop 11"],
  },
  {
    id: "lesson_11_young",
    grade: 11,
    title: "Bài giảng: Giao thoa ánh sáng Y-âng",
    subtitle: "Thí nghiệm khe Y-âng đổi bước sóng quang phổ + Công thức khoảng vân",
    simKind: "young_double_slit",
    formulaLatexList: ["i = \\frac{\\lambda D}{a}", "x_s = k\\cdot i"],
    questionPrompt:
      "So sánh khoảng vân i khi chiếu ánh sáng đỏ (λ = 700 nm) và ánh sáng tím (λ = 400 nm) trong cùng bố trí khe a, màn D.",
    keywords: ["giao thoa", "yang", "khoang van", "lop 11"],
  },
  {
    id: "lesson_11_ohm",
    grade: 11,
    title: "Bài giảng: Định luật Ôm đối với toàn mạch",
    subtitle: "Mạch điện tương tác (Khóa K, Biến trở, A, V) + Công thức I, U_N",
    diagramKind: "circuit",
    formulaLatexList: [
      "I = \\frac{E}{R_N + r}",
      "U_N = E - I\\cdot r",
    ],
    questionPrompt:
      "Kéo con chạy biến trở R_b để thay đổi R_ngoài, quan sát sự biến thiên ngược chiều giữa số chỉ Ampe kế (I) và Vôn kế (U_N).",
    keywords: ["dinh luat om", "mach dien", "toan mach", "lop 11"],
  },
  {
    id: "lesson_12_gas",
    grade: 12,
    title: "Bài giảng: Các đẳng quá trình Khí lý tưởng",
    subtitle: "Xi-lanh phân tử chuyển động nhiệt + Đường cong p–V",
    simKind: "ideal_gas",
    formulaLatexList: [
      "pV = nRT",
      "\\frac{p_1 V_1}{T_1} = \\frac{p_2 V_2}{T_2}",
    ],
    questionPrompt:
      "Giữ T = 300 K (Đẳng nhiệt), giảm thể tích từ 6 lít xuống 2 lít rồi ghi cặp (V, p) vào bảng để kiểm chứng p·V = const.",
    keywords: ["khi ly tuong", "dang nhiet", "boyler", "lop 12"],
  },
  {
    id: "lesson_12_rlc",
    grade: 12,
    title: "Bài giảng: Cộng hưởng mạch RLC xoay chiều",
    subtitle: "Dao động ký u(t)–i(t) & Giản đồ Fresnel + Điều kiện cộng hưởng",
    simKind: "rlc_ac_osc",
    formulaLatexList: [
      "Z = \\sqrt{R^2 + (Z_L - Z_C)^2}",
      "f_0 = \\frac{1}{2\\pi\\sqrt{LC}}",
    ],
    questionPrompt:
      "Điều chỉnh tần số f tiến về tần số cộng hưởng f₀. Khi xảy ra cộng hưởng thì độ lệch pha φ và cường độ I thay đổi như thế nào?",
    keywords: ["rlc", "cong huong", "xoay chieu", "lop 12"],
  },
  {
    id: "lesson_optics_lens",
    grade: 11,
    title: "Bài giảng: Dựng ảnh qua Thấu kính hội tụ",
    subtitle: "Sơ đồ 3 tia sáng kéo vật trực tiếp + Công thức thấu kính",
    diagramKind: "optics",
    formulaLatexList: [
      "\\frac{1}{f} = \\frac{1}{d} + \\frac{1}{d'}",
      "k = -\\frac{d'}{d}",
    ],
    questionPrompt:
      "Kéo vật sáng AB đi từ vùng d > 2f → d = 2f → f < d < 2f → d < f. Mô tả sự thay đổi thật/ảo và kích thước ảnh A'B'.",
    keywords: ["thau kinh", "quang hinh", "anh ao", "anh that"],
  },
];
