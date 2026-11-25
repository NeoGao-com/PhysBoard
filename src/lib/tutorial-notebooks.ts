import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import {
  type BoardFolder,
  type BoardItem,
  loadBoards,
  loadFolders,
  saveBoards,
  saveFolders,
} from "./board-manager";
import { writePageBoardConfig } from "./board-themes";
import { WhiteboardCommandDispatcher } from "./dispatcher";
import { sanitizeRoomId } from "./room";
import { buildVarTableFromExpr } from "./math-eval";
import { createOxyzElement, createSolid3DElement } from "./geometry3d";

export const TUTORIAL_FOLDER_ID = "folder_physboard_tutorials";
export const TUTORIAL_FOLDER_NAME = "📘 Sổ tay Hướng dẫn & Thực hành mẫu";
export const TUTORIAL_SEED_VERSION_KEY = "physboard_tutorial_seed_v1";

export interface TutorialNotebookDefinition {
  id: string;
  name: string;
  cover: BoardItem["cover"];
  populate: (doc: Y.Doc, dispatcher: WhiteboardCommandDispatcher) => void;
}

function addInstructionCard(
  dispatcher: WhiteboardCommandDispatcher,
  x: number,
  y: number,
  title: string,
  steps: string[],
  locked = false
) {
  const esc = (s: string) =>
    s
      .replace(/\\/g, "\\textbackslash{}")
      .replace(/([{}%$&#_])/g, "\\$1");

  dispatcher.dispatch({
    type: "object.create",
    params: {
      type: "MathText",
      transform: { x, y, scale: 0.72, rotation: 0, z: 0 },
      style: locked
        ? { stroke: "#1d4ed8", locked: true }
        : { stroke: "#1d4ed8" },
      props: {
        latex: `\\textbf{\\text{${esc(title)}}}`,
        locked,
      },
    },
  });

  steps.forEach((step, idx) => {
    dispatcher.dispatch({
      type: "object.create",
      params: {
        type: "MathText",
        transform: {
          x,
          y: Number((y - 0.52 * (idx + 1)).toFixed(2)),
          scale: 0.58,
          rotation: 0,
          z: 0,
        },
        style: locked
          ? { stroke: "#334155", locked: true }
          : { stroke: "#334155" },
        props: {
          latex: `\\text{${esc(step)}}`,
          locked,
        },
      },
    });
  });
}

export const TUTORIAL_NOTEBOOKS: TutorialNotebookDefinition[] = [
  {
    id: "tut_01_basics",
    name: "Bài 1 — Làm quen Bút viết, Nắn hình & Khoá khối",
    cover: {
      kind: "pattern",
      presetId: "grid",
      color: "#2563eb",
      layout: "header",
      sticker: "✒️",
    },
    populate: (_doc, dispatcher) => {
      addInstructionCard(
        dispatcher,
        -6.8,
        4.6,
        "📘 BÀI 1: LÀM QUEN BÚT VIẾT, TỰ NẮN HÌNH & KHOÁ KHỐI",
        [
          "① Bấm Bút (P) / Bút máy (B) → viết thử; giữ yên đầu bút 0,34s để Tự nắn hình.",
          "② Thử tẩy nét mực đỏ dưới đây (E) — dòng hướng dẫn đã Khoá (🔒) không bị xê dịch!",
        ],
        true
      );

      // Sample ink strokes to test erasing / selecting
      dispatcher.dispatch({
        type: "ink.stroke",
        params: {
          points: [-4.5, 1.4, -3.2, 2.2, -1.9, 1.3, -0.5, 2.1, 0.9, 1.4],
          pressures: [0.4, 0.75, 0.85, 0.6, 0.45],
          nib: "fountain",
          style: { stroke: "#dc2626", width: 3.4 },
        },
      });
      dispatcher.dispatch({
        type: "ink.stroke",
        params: {
          points: [-4.5, -0.5, 3.2, -0.5],
          nib: "highlighter",
          style: { stroke: "#facc15", width: 12, opacity: 0.45 },
        },
      });
      dispatcher.dispatch({
        type: "object.create",
        params: {
          type: "MathText",
          transform: { x: -4.3, y: -0.5, scale: 0.95, rotation: 0, z: 1 },
          style: { stroke: "#0f172a" },
          props: { latex: "\\text{Gạch nổi bật bằng Bút dạ quang (phím 3)}" },
        },
      });
    },
  },
  {
    id: "tut_02_plane_2d",
    name: "Bài 2 — Hình Phẳng 2D Động & Ký hiệu SGK",
    cover: {
      kind: "pattern",
      presetId: "dots",
      color: "#059669",
      layout: "split",
      sticker: "📐",
    },
    populate: (_doc, dispatcher) => {
      addInstructionCard(
        dispatcher,
        -6.8,
        4.6,
        "📐 BÀI 2: HÌNH HỌC PHẲNG 2D ĐỘNG & KÝ HIỆU SGK",
        [
          "① Chọn (V) → kéo thử đỉnh A: Đường cao AH và Trọng tâm G chạy theo tức thì!",
          "② Kéo vẽ Đoạn/Tròn để xem độ dài d / bán kính R; chọn điểm bấm A+ phóng cỡ nhãn.",
        ]
      );

      const polyId = "tut2_tri";
      const ptA = { id: `${polyId}_v0`, name: "A", x: -0.8, y: 2.8 };
      const ptB = { id: `${polyId}_v1`, name: "B", x: -3.2, y: -1.6 };
      const ptC = { id: `${polyId}_v2`, name: "C", x: 3.2, y: -1.6 };

      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: polyId,
          type: "GeomPolygon",
          style: { stroke: "#2563eb", fill: "rgba(37,99,235,0.06)", width: 2.2 },
          props: {
            vertices: [ptA.id, ptB.id, ptC.id],
            points: [ptA, ptB, ptC],
            marksEnabled: true,
          },
        },
      });

      // Altitude AH from A to BC
      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: "tut2_alt",
          type: "GeomConstruction",
          style: { stroke: "#dc2626", width: 2 },
          props: {
            kind: "altitude",
            from: ptA.id,
            sideA: ptB.id,
            sideB: ptC.id,
            fromPt: { x: ptA.x, y: ptA.y },
            toPt: { x: ptA.x, y: -1.6 },
            sideAPt: { x: ptB.x, y: ptB.y },
            sideBPt: { x: ptC.x, y: ptC.y },
            marksEnabled: true,
          },
        },
      });

      // Centroid G
      const gx = (ptA.x + ptB.x + ptC.x) / 3;
      const gy = (ptA.y + ptB.y + ptC.y) / 3;
      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: "tut2_centroid",
          type: "GeomPoint",
          transform: { x: gx, y: gy, scale: 1, rotation: 0, z: 1 },
          style: { stroke: "#16a34a", fill: "#16a34a" },
          props: {
            name: "G",
            constraint: { kind: "centroid", pts: [ptA.id, ptB.id, ptC.id] },
          },
        },
      });

      // Sample interactive Circle with radius
      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: "tut2_circ_o",
          type: "GeomPoint",
          transform: { x: 5.8, y: 0.4, scale: 1, rotation: 0, z: 1 },
          style: { stroke: "#0891b2", fill: "#0891b2" },
          props: { name: "O", constraint: { kind: "free" } },
        },
      });
      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: "tut2_circ",
          type: "GeomCircle",
          style: { stroke: "#0891b2", width: 2 },
          props: { center: "tut2_circ_o", radius: { kind: "value", v: 2.1 } },
        },
      });
    },
  },
  {
    id: "tut_03_space_3d",
    name: "Bài 3 — Hình Không gian 3D, Tách mặt thật & Trải phẳng",
    cover: {
      kind: "pattern",
      presetId: "geometry",
      color: "#7c3aed",
      layout: "header",
      sticker: "🧊",
    },
    populate: (_doc, dispatcher) => {
      addInstructionCard(
        dispatcher,
        -6.8,
        4.6,
        "🧊 BÀI 3: HÌNH KHÔNG GIAN 3D — TÁCH MẶT & TRẢI PHẲNG",
        [
          "① Bấm Chọn (V) → bấm khối S.ABCD để mở thanh 'Xoay hình 3D' bên phải.",
          "② Bấm vào MẶT BÊN (SAB) → '◫ Tách ra hình thật'; chọn Lập phương → '◫ Trải phẳng Net 2D'!",
        ]
      );

      const pyramid = createSolid3DElement("pyramid", { x: -2.2, y: 0 }, [], {
        id: "tut3_pyr",
        sides: 4,
      });
      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: pyramid.id,
          type: pyramid.type,
          transform: pyramid.transform,
          style: pyramid.style,
          props: pyramid.props,
        },
      });

      const cube = createSolid3DElement("cube", { x: 4.5, y: 0 }, [pyramid], {
        id: "tut3_cube",
      });
      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: cube.id,
          type: cube.type,
          transform: cube.transform,
          style: cube.style,
          props: cube.props,
        },
      });
    },
  },
  {
    id: "tut_04_section_3d",
    name: "Bài 4 — Thiết diện, Giao tuyến & Khoảng cách 3D",
    cover: {
      kind: "pattern",
      presetId: "waves",
      color: "#db2777",
      layout: "band",
      sticker: "▱",
    },
    populate: (_doc, dispatcher) => {
      addInstructionCard(
        dispatcher,
        -6.8,
        4.6,
        "▱ BÀI 4: DỰNG THIẾT DIỆN, GIAO TUYẾN & KHOẢNG CÁCH 3D",
        [
          "① Mở 'Không gian ▾' → chọn '▱ Thiết diện' → lần lượt bấm 3 điểm M, N, P trên các cạnh.",
          "② Thử '📏 Khoảng cách từ điểm đến mặt phẳng': bấm đỉnh S rồi bấm 3 đỉnh đáy A, B, C.",
        ]
      );

      const pyr = createSolid3DElement("pyramid", { x: 0, y: -0.2 }, [], {
        id: "tut4_pyr",
        sides: 4,
      });
      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: pyr.id,
          type: pyr.type,
          transform: pyr.transform,
          style: pyr.style,
          props: pyr.props,
        },
      });

      const pts = (pyr.props.points as Array<{ id: string; name: string; x: number; y: number }>) ?? [];
      const pS = pts[0];
      const pA = pts[1];
      const pB = pts[2];
      const pD = pts[4];
      if (pS && pA && pB && pD) {
        // Place midpoint-like reference points M on SA, N on SB, P on SD
        const mkPt = (id: string, name: string, p1: typeof pS, p2: typeof pS, t: number) => {
          dispatcher.dispatch({
            type: "object.create",
            params: {
              id,
              type: "GeomPoint",
              transform: {
                x: p1.x + (p2.x - p1.x) * t,
                y: p1.y + (p2.y - p1.y) * t,
                scale: 1,
                rotation: 0,
                z: 2,
              },
              style: { stroke: "#dc2626", fill: "#dc2626" },
              props: {
                name,
                constraint: { kind: "onEdge", a: p1.id, b: p2.id, t },
              },
            },
          });
        };
        mkPt("tut4_pt_m", "M", pS, pA, 0.5);
        mkPt("tut4_pt_n", "N", pS, pB, 0.45);
        mkPt("tut4_pt_p", "P", pS, pD, 0.65);
      }
    },
  },
  {
    id: "tut_05_oxyz",
    name: "Bài 5 — Hệ trục Toạ độ Không gian Oxyz (Toán 12)",
    cover: {
      kind: "illustration",
      presetId: "grid",
      color: "#0891b2",
      layout: "header",
      sticker: "🛰️",
    },
    populate: (_doc, dispatcher) => {
      addInstructionCard(
        dispatcher,
        -6.8,
        4.6,
        "🛰️ BÀI 5: HỆ TRỤC TOẠ ĐỘ KHÔNG GIAN OXYZ (TOÁN 12)",
        [
          "① Chọn (V) → bấm vào trục Oxyz để mở 5 nút: + Điểm, + Vectơ, ◩ Mặt phẳng, ⁄ Đường, ◯ Mặt cầu.",
          "② Kéo thanh 'Xoay hình 3D' bên phải để quay hệ trục sang góc chiếu trực quan nhất.",
        ]
      );

      const axes = createOxyzElement({ x: 0, y: -0.4 }, { id: "tut5_oxyz", size: 4.5 });
      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: axes.id,
          type: axes.type,
          transform: axes.transform,
          style: axes.style,
          props: axes.props,
        },
      });
      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: "tut5_plane",
          type: "SpaceFigure",
          transform: { ...axes.transform, z: -1 },
          style: { stroke: "#7c3aed", width: 2 },
          props: {
            axes: axes.id,
            def: { kind: "plane", a: 1, b: 1, c: 1, d: -2 },
            name: "(P): x + y + z - 2 = 0",
            color: "#7c3aed",
          },
        },
      });
    },
  },
  {
    id: "tut_06_calculus_oxy",
    name: "Bài 6 — Công thức, Giải PT, Đồ thị Oxy & Bảng biến thiên",
    cover: {
      kind: "pattern",
      presetId: "dots",
      color: "#4f46e5",
      layout: "split",
      sticker: "📈",
    },
    populate: (_doc, dispatcher) => {
      addInstructionCard(
        dispatcher,
        -6.8,
        4.6,
        "📈 BÀI 6: CÔNG THỨC, GIẢI PHƯƠNG TRÌNH, ĐỒ THỊ OXY & BẢNG BIẾN THIÊN",
        [
          "① Chọn (V) → nhấp đúp phương trình x² - 5x + 6 = 0 → bấm Giải PT / Hệ PT.",
          "② Kéo thanh trượt 'm' để xem đồ thị đổi hình; chọn trục Oxy để đổi vạch chia π.",
        ]
      );

      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: "tut6_eq",
          type: "MathText",
          transform: { x: -6.8, y: 2.3, scale: 1.05, rotation: 0, z: 1 },
          style: { stroke: "#1d4ed8" },
          props: { latex: "x^2 - 5x + 6 = 0" },
        },
      });

      const axesId = "tut6_oxy";
      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: axesId,
          type: "Axes2D",
          transform: { x: -1.4, y: -1.2, scale: 0.92, rotation: 0, z: 0 },
          style: { stroke: "#475569", width: 1.5 },
          props: { size: 4.5, grid: true, ticks: "int", legend: true },
        },
      });

      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: "tut6_plot",
          type: "Plot",
          transform: { x: -1.4, y: -1.2, scale: 0.92, rotation: 0, z: 1 },
          style: { stroke: "#2563eb", width: 2.4 },
          props: {
            exprLatex: "x^3 - 3*m*x + 1",
            params: [{ name: "m", min: -3, max: 3, step: 0.2, value: 1 }],
            axes: axesId,
            color: "#2563eb",
            marks: { roots: true, extrema: true, yIntercept: true },
          },
        },
      });

      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: "tut6_slider_m",
          type: "Slider",
          transform: { x: -8.2, y: 1.1, scale: 1, rotation: 0, z: 1 },
          props: { name: "m", min: -3, max: 3, step: 0.2, value: 1 },
        },
      });

      const varData = buildVarTableFromExpr("x^3 - 3x + 1");
      if (!("error" in varData)) {
        dispatcher.dispatch({
          type: "object.create",
          params: {
            id: "tut6_vartable",
            type: "VarTable",
            transform: { x: 3.3, y: 1.3, scale: 0.92, rotation: 0, z: 1 },
            props: { ...varData },
          },
        });
      }
    },
  },
  {
    id: "tut_07_stats_bayes",
    name: "Bài 7 — Thống kê, Cây xác suất Bayes, Venn & Đồ thị",
    cover: {
      kind: "pattern",
      presetId: "grid",
      color: "#059669",
      layout: "header",
      sticker: "📊",
    },
    populate: (_doc, dispatcher) => {
      addInstructionCard(
        dispatcher,
        -6.8,
        4.6,
        "📊 BÀI 7: THỐNG KÊ, CÂY XÁC SUẤT BAYES, BIỂU ĐỒ VENN & ĐỒ THỊ ĐỈNH–CẠNH",
        [
          "① Mở menu 'Thống kê ▾' để tạo Biểu đồ, Hoán vị/Chỉnh hợp/Tổ hợp hoặc Bayes.",
          "② Kéo hoặc bấm đúp các mô hình bên dưới để tuỳ biến số liệu và nhãn.",
        ]
      );

      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: "tut7_tree",
          type: "TreeDiagram",
          transform: { x: -7.8, y: 2.2, scale: 0.95, rotation: 0, z: 1 },
          props: {
            root: {
              label: "Ω",
              children: [
                {
                  label: "A",
                  p: "0,6",
                  children: [
                    { label: "B", p: "0,7" },
                    { label: "B̄", p: "0,3" },
                  ],
                },
                {
                  label: "Ā",
                  p: "0,4",
                  children: [
                    { label: "B", p: "0,2" },
                    { label: "B̄", p: "0,8" },
                  ],
                },
              ],
            },
          },
        },
      });

      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: "tut7_venn",
          type: "Venn",
          transform: { x: 0.2, y: 1.5, scale: 0.95, rotation: 0, z: 1 },
          props: { labels: ["A", "B"], universe: "Ω", shade: ["AB"] },
        },
      });

      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: "tut7_network",
          type: "Network",
          transform: { x: 5.5, y: 1.5, scale: 0.95, rotation: 0, z: 1 },
          props: {
            nodes: [
              { id: "1", label: "A", x: -1.4, y: 1.0 },
              { id: "2", label: "B", x: 1.4, y: 1.0 },
              { id: "3", label: "C", x: 1.4, y: -1.0 },
              { id: "4", label: "D", x: -1.4, y: -1.0 },
            ],
            edges: [
              { a: "1", b: "2" },
              { a: "2", b: "3" },
              { a: "3", b: "4" },
              { a: "4", b: "1" },
              { a: "1", b: "3" },
            ],
          },
        },
      });

      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: "tut7_numline",
          type: "NumberLine",
          transform: { x: -3.2, y: -2.8, scale: 0.95, rotation: 0, z: 1 },
          props: { set: "(-2; 3] \\cap [0; 5)" },
        },
      });
    },
  },
  {
    id: "tut_08_realworld_stem",
    name: "Bài 8 — Bài toán Thực tế & Công thức Toán · Lý · Hoá",
    cover: {
      kind: "pattern",
      presetId: "waves",
      color: "#ea580c",
      layout: "band",
      sticker: "🏞️",
    },
    populate: (_doc, dispatcher) => {
      addInstructionCard(
        dispatcher,
        -6.8,
        4.6,
        "🏞️ BÀI 8: BÀI TOÁN THỰC TẾ & NGĂN KÉO TOÁN · LÝ · HOÁ",
        [
          "① Mở Thực tế chèn Cây/Toà nhà/Thuyền; mở 3 ngăn kéo Toán, Lý, Hoá chèn công thức.",
          "② Bấm Máy tính ở góc trên phải để tính trực tiếp trên Casio fx-580VN.",
        ]
      );

      const pA = { id: "tut8_v0", name: "A", x: -1.5, y: 2.0 };
      const pB = { id: "tut8_v1", name: "B", x: -1.5, y: -1.8 };
      const pC = { id: "tut8_v2", name: "C", x: 3.4, y: -1.8 };
      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: "tut8_tri",
          type: "GeomPolygon",
          style: { stroke: "#0f766e", fill: "rgba(15,118,110,0.06)", width: 2.2 },
          props: { vertices: [pA.id, pB.id, pC.id], points: [pA, pB, pC], marksEnabled: true },
        },
      });

      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: "tut8_tree",
          type: "RealObject",
          transform: { x: -3.8, y: -0.2, scale: 1.2, rotation: 0, z: 1 },
          props: { icon: "tree", from: "", to: "", width: 1.2 },
        },
      });

      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: "tut8_formula_phys",
          type: "MathText",
          transform: { x: 4.5, y: 1.3, scale: 1.05, rotation: 0, z: 1 },
          style: { stroke: "#b45309" },
          props: { latex: "T = 2\\pi\\sqrt{\\frac{l}{g}},\\quad \\vec{F} = m\\vec{a}" },
        },
      });
    },
  },
  {
    id: "tut_09_exam_a4",
    name: "Bài 9 — Trình bày Khổ A4, Cắt đề PDF & Xuất PDF In ấn",
    cover: {
      kind: "pattern",
      presetId: "grid",
      color: "#0f172a",
      layout: "header",
      sticker: "✂️",
    },
    populate: (doc, dispatcher) => {
      writePageBoardConfig(doc, 1, {
        surface: "white",
        pattern: "ruled",
        gridSize: "md",
        format: "a4_portrait",
      });
      addInstructionCard(
        dispatcher,
        -6.6,
        -2.5,
        "✂️ BÀI 9: TRÌNH BÀY KHỔ A4, CẮT ĐỀ PDF & XUẤT PDF IN ẤN",
        [
          "① Trang này đang đặt Khổ A4 Dọc Nền kẻ ngang chuẩn in phát cho học sinh.",
          "② Bấm Cắt đề bên trái cắt đề PDF/Ảnh (Ctrl+V); cuộn giữ đáy trang 0,4s để tự thêm trang A4 mới.",
        ]
      );

      dispatcher.dispatch({
        type: "object.create",
        params: {
          id: "tut9_sample_q",
          type: "MathText",
          transform: { x: -6.4, y: -5.2, scale: 1.05, rotation: 0, z: 1 },
          style: { stroke: "#0f172a" },
          props: {
            latex: "\\text{Câu 1: Giải phương trình } \\sqrt{2x + 1} = x - 1",
          },
        },
      });
    },
  },
];

async function populateSingleTutorialRoom(def: TutorialNotebookDefinition): Promise<void> {
  const safeId = sanitizeRoomId(def.id);
  const ydoc = new Y.Doc();
  const persistence = new IndexeddbPersistence(`whiteboard-v2-${safeId}`, ydoc);
  try {
    await persistence.whenSynced;
    // Clear previous state if restoring
    const objectsArray = ydoc.getArray<Y.Map<unknown>>("objects");
    if (objectsArray.length > 0) {
      ydoc.transact(() => {
        objectsArray.delete(0, objectsArray.length);
      });
    }
    const pagesMap = ydoc.getMap<number>("pages");
    ydoc.transact(() => {
      pagesMap.set("count", 1);
      pagesMap.set("cur", 1);
    });
    const dispatcher = new WhiteboardCommandDispatcher({
      doc: ydoc,
      actor: { id: "physboard-guide", name: "PhysBoard Mẫu" },
    });
    def.populate(ydoc, dispatcher);
    await new Promise((r) => setTimeout(r, 70));
  } finally {
    await persistence.destroy().catch(() => {});
    ydoc.destroy();
  }
}

function upsertTutorialCatalogEntries(onlyBoardId?: string): BoardItem[] {
  const now = Date.now();
  const folders = loadFolders();
  if (!folders.some((f) => f.id === TUTORIAL_FOLDER_ID)) {
    const tutorialFolder: BoardFolder = {
      id: TUTORIAL_FOLDER_ID,
      name: TUTORIAL_FOLDER_NAME,
      createdAt: now,
      parentId: null,
      color: "#2563eb",
    };
    saveFolders([...folders, tutorialFolder]);
  }

  const existingBoards = loadBoards();
  const boardMap = new Map(existingBoards.map((b) => [b.id, b]));
  const targets = onlyBoardId
    ? TUTORIAL_NOTEBOOKS.filter((t) => t.id === onlyBoardId)
    : TUTORIAL_NOTEBOOKS;

  for (let idx = 0; idx < targets.length; idx++) {
    const def = targets[idx];
    const prev = boardMap.get(def.id);
    boardMap.set(def.id, {
      id: def.id,
      name: def.name,
      createdAt: prev?.createdAt ?? now - (targets.length - idx) * 1000,
      updatedAt: now - (targets.length - idx) * 1000,
      folderId: TUTORIAL_FOLDER_ID,
      trashed: false,
      favorite: idx < 2 ? true : prev?.favorite ?? false,
      cover: def.cover,
    });
  }

  const nextBoards = Array.from(boardMap.values());
  saveBoards(nextBoards);
  return nextBoards;
}

let seedInFlight: Promise<boolean> | null = null;

/**
 * Seeds the folder "📘 Sổ tay Hướng dẫn & Thực hành mẫu" and 9 interactive sample notebooks once.
 * Never modifies the default active board ("default").
 */
export async function ensureTutorialNotebooksSeeded(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(TUTORIAL_SEED_VERSION_KEY) === "1") {
      // Ensure folder & catalog entries exist if localStorage was partially cleared
      const boards = loadBoards();
      if (boards.some((b) => b.folderId === TUTORIAL_FOLDER_ID)) {
        return false;
      }
    }
  } catch {
    return false;
  }

  if (seedInFlight) return seedInFlight;

  seedInFlight = (async () => {
    try {
      upsertTutorialCatalogEntries();
      for (const def of TUTORIAL_NOTEBOOKS) {
        await populateSingleTutorialRoom(def);
      }
      try {
        window.localStorage.setItem(TUTORIAL_SEED_VERSION_KEY, "1");
      } catch {
        // Ignore storage error
      }
      return true;
    } catch {
      return false;
    } finally {
      seedInFlight = null;
    }
  })();

  return seedInFlight;
}

/**
 * Restores all 9 tutorial notebooks (or a single targetBoardId) to their clean initial state.
 */
export async function restoreTutorialNotebooks(targetBoardId?: string): Promise<void> {
  if (typeof window === "undefined") return;
  upsertTutorialCatalogEntries(targetBoardId);
  const targets = targetBoardId
    ? TUTORIAL_NOTEBOOKS.filter((t) => t.id === targetBoardId)
    : TUTORIAL_NOTEBOOKS;
  for (const def of targets) {
    await populateSingleTutorialRoom(def);
  }
  try {
    window.localStorage.setItem(TUTORIAL_SEED_VERSION_KEY, "1");
  } catch {
    // Ignore storage error
  }
}
