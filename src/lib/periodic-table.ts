export type ElementCategory =
  | "alkali"
  | "alkaline_earth"
  | "transition"
  | "post_transition"
  | "metalloid"
  | "nonmetal"
  | "halogen"
  | "noble_gas"
  | "lanthanide"
  | "actinide";

export interface PeriodicElement {
  z: number;
  symbol: string;
  name: string;
  viName?: string;
  mass: string;
  category: ElementCategory;
  period: number;
  /** 1..18 in standard 18-column layout (La/Ac sit at col 3 in rows 9/10) */
  col: number;
  /** Visual grid row 1..7 for main table, 9 for Lanthanides, 10 for Actinides */
  row: number;
  config: string;
  en?: string;
  ox?: string;
}

export const ELEMENT_CATEGORY_META: Record<
  ElementCategory,
  { label: string; bg: string; border: string; text: string }
> = {
  alkali: { label: "Kim loại kiềm", bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" },
  alkaline_earth: { label: "Kiềm thổ", bg: "#ffedd5", border: "#fdba74", text: "#9a3412" },
  transition: { label: "Kim loại chuyển tiếp", bg: "#fef9c3", border: "#fde047", text: "#854d0e" },
  post_transition: { label: "Kim loại sau CT", bg: "#dcfce7", border: "#86efac", text: "#166534" },
  metalloid: { label: "Á kim", bg: "#ccfbf1", border: "#5eead4", text: "#115e59" },
  nonmetal: { label: "Phi kim", bg: "#dbeafe", border: "#93c5fd", text: "#1e40af" },
  halogen: { label: "Halogen", bg: "#e0e7ff", border: "#a5b4fc", text: "#3730a3" },
  noble_gas: { label: "Khí hiếm", bg: "#f3e8ff", border: "#d8b4fe", text: "#6b21a8" },
  lanthanide: { label: "Họ Lanthanide", bg: "#fce7f3", border: "#f9a8d4", text: "#9d174d" },
  actinide: { label: "Họ Actinide", bg: "#ffe4e6", border: "#fda4af", text: "#9f1239" },
};

type RawTuple = [
  z: number,
  symbol: string,
  name: string,
  mass: string,
  category: ElementCategory,
  period: number,
  col: number,
  row: number,
  config: string,
  en?: string,
  ox?: string,
  viName?: string
];

const RAW_ELEMENTS: RawTuple[] = [
  [1,"H","Hydrogen","1.008","nonmetal",1,1,1,"1s^1","2.20","-1, +1","Hiđro"],
  [2,"He","Helium","4.0026","noble_gas",1,18,1,"1s^2","—","0","Heli"],

  [3,"Li","Lithium","6.94","alkali",2,1,2,"[He] 2s^1","0.98","+1","Liti"],
  [4,"Be","Beryllium","9.0122","alkaline_earth",2,2,2,"[He] 2s^2","1.57","+2","Beri"],
  [5,"B","Boron","10.81","metalloid",2,13,2,"[He] 2s^2 2p^1","2.04","+3","Bo"],
  [6,"C","Carbon","12.011","nonmetal",2,14,2,"[He] 2s^2 2p^2","2.55","-4..+4","Cacbon"],
  [7,"N","Nitrogen","14.007","nonmetal",2,15,2,"[He] 2s^2 2p^3","3.04","-3..+5","Nitơ"],
  [8,"O","Oxygen","15.999","nonmetal",2,16,2,"[He] 2s^2 2p^4","3.44","-2","Oxi"],
  [9,"F","Fluorine","18.998","halogen",2,17,2,"[He] 2s^2 2p^5","3.98","-1","Flo"],
  [10,"Ne","Neon","20.180","noble_gas",2,18,2,"[He] 2s^2 2p^6","—","0","Neon"],

  [11,"Na","Sodium","22.990","alkali",3,1,3,"[Ne] 3s^1","0.93","+1","Natri"],
  [12,"Mg","Magnesium","24.305","alkaline_earth",3,2,3,"[Ne] 3s^2","1.31","+2","Magie"],
  [13,"Al","Aluminium","26.982","post_transition",3,13,3,"[Ne] 3s^2 3p^1","1.61","+3","Nhôm"],
  [14,"Si","Silicon","28.085","metalloid",3,14,3,"[Ne] 3s^2 3p^2","1.90","-4, +4","Silic"],
  [15,"P","Phosphorus","30.974","nonmetal",3,15,3,"[Ne] 3s^2 3p^3","2.19","-3, +3, +5","Photpho"],
  [16,"S","Sulfur","32.06","nonmetal",3,16,3,"[Ne] 3s^2 3p^4","2.58","-2, +4, +6","Lưu huỳnh"],
  [17,"Cl","Chlorine","35.45","halogen",3,17,3,"[Ne] 3s^2 3p^5","3.16","-1, +1..+7","Clo"],
  [18,"Ar","Argon","39.948","noble_gas",3,18,3,"[Ne] 3s^2 3p^6","—","0","Argon"],

  [19,"K","Potassium","39.098","alkali",4,1,4,"[Ar] 4s^1","0.82","+1","Kali"],
  [20,"Ca","Calcium","40.078","alkaline_earth",4,2,4,"[Ar] 4s^2","1.00","+2","Canxi"],
  [21,"Sc","Scandium","44.956","transition",4,3,4,"[Ar] 3d^1 4s^2","1.36","+3"],
  [22,"Ti","Titanium","47.867","transition",4,4,4,"[Ar] 3d^2 4s^2","1.54","+2, +3, +4","Titan"],
  [23,"V","Vanadium","50.942","transition",4,5,4,"[Ar] 3d^3 4s^2","1.63","+2..+5"],
  [24,"Cr","Chromium","51.996","transition",4,6,4,"[Ar] 3d^5 4s^1","1.66","+2, +3, +6","Crom"],
  [25,"Mn","Manganese","54.938","transition",4,7,4,"[Ar] 3d^5 4s^2","1.55","+2, +4, +7","Mangan"],
  [26,"Fe","Iron","55.845","transition",4,8,4,"[Ar] 3d^6 4s^2","1.83","+2, +3","Sắt"],
  [27,"Co","Cobalt","58.933","transition",4,9,4,"[Ar] 3d^7 4s^2","1.88","+2, +3","Coban"],
  [28,"Ni","Nickel","58.693","transition",4,10,4,"[Ar] 3d^8 4s^2","1.91","+2","Niken"],
  [29,"Cu","Copper","63.546","transition",4,11,4,"[Ar] 3d^{10} 4s^1","1.90","+1, +2","Đồng"],
  [30,"Zn","Zinc","65.38","transition",4,12,4,"[Ar] 3d^{10} 4s^2","1.65","+2","Kẽm"],
  [31,"Ga","Gallium","69.723","post_transition",4,13,4,"[Ar] 3d^{10} 4s^2 4p^1","1.81","+3"],
  [32,"Ge","Germanium","72.630","metalloid",4,14,4,"[Ar] 3d^{10} 4s^2 4p^2","2.01","+2, +4"],
  [33,"As","Arsenic","74.922","metalloid",4,15,4,"[Ar] 3d^{10} 4s^2 4p^3","2.18","-3, +3, +5","Asen"],
  [34,"Se","Selenium","78.971","nonmetal",4,16,4,"[Ar] 3d^{10} 4s^2 4p^4","2.55","-2, +4, +6"],
  [35,"Br","Bromine","79.904","halogen",4,17,4,"[Ar] 3d^{10} 4s^2 4p^5","2.96","-1, +1, +5","Brom"],
  [36,"Kr","Krypton","83.798","noble_gas",4,18,4,"[Ar] 3d^{10} 4s^2 4p^6","3.00","0, +2"],

  [37,"Rb","Rubidium","85.468","alkali",5,1,5,"[Kr] 5s^1","0.82","+1"],
  [38,"Sr","Strontium","87.62","alkaline_earth",5,2,5,"[Kr] 5s^2","0.95","+2"],
  [39,"Y","Yttrium","88.906","transition",5,3,5,"[Kr] 4d^1 5s^2","1.22","+3"],
  [40,"Zr","Zirconium","91.224","transition",5,4,5,"[Kr] 4d^2 5s^2","1.33","+4"],
  [41,"Nb","Niobium","92.906","transition",5,5,5,"[Kr] 4d^4 5s^1","1.60","+5"],
  [42,"Mo","Molybdenum","95.95","transition",5,6,5,"[Kr] 4d^5 5s^1","2.16","+4, +6"],
  [43,"Tc","Technetium","(98)","transition",5,7,5,"[Kr] 4d^5 5s^2","1.90","+4, +7"],
  [44,"Ru","Ruthenium","101.07","transition",5,8,5,"[Kr] 4d^7 5s^1","2.20","+3, +4"],
  [45,"Rh","Rhodium","102.91","transition",5,9,5,"[Kr] 4d^8 5s^1","2.28","+3"],
  [46,"Pd","Palladium","106.42","transition",5,10,5,"[Kr] 4d^{10}","2.20","+2, +4"],
  [47,"Ag","Silver","107.87","transition",5,11,5,"[Kr] 4d^{10} 5s^1","1.93","+1","Bạc"],
  [48,"Cd","Cadmium","112.41","transition",5,12,5,"[Kr] 4d^{10} 5s^2","1.69","+2","Cađimi"],
  [49,"In","Indium","114.82","post_transition",5,13,5,"[Kr] 4d^{10} 5s^2 5p^1","1.78","+3"],
  [50,"Sn","Tin","118.71","post_transition",5,14,5,"[Kr] 4d^{10} 5s^2 5p^2","1.96","+2, +4","Thiếc"],
  [51,"Sb","Antimony","121.76","metalloid",5,15,5,"[Kr] 4d^{10} 5s^2 5p^3","2.05","-3, +3, +5"],
  [52,"Te","Tellurium","127.60","metalloid",5,16,5,"[Kr] 4d^{10} 5s^2 5p^4","2.10","-2, +4, +6"],
  [53,"I","Iodine","126.90","halogen",5,17,5,"[Kr] 4d^{10} 5s^2 5p^5","2.66","-1, +1, +5, +7","Iot"],
  [54,"Xe","Xenon","131.29","noble_gas",5,18,5,"[Kr] 4d^{10} 5s^2 5p^6","2.60","0..+6"],

  [55,"Cs","Cesium","132.91","alkali",6,1,6,"[Xe] 6s^1","0.79","+1"],
  [56,"Ba","Barium","137.33","alkaline_earth",6,2,6,"[Xe] 6s^2","0.89","+2","Bari"],
  [57,"La","Lanthanum","138.91","lanthanide",6,4,9,"[Xe] 5d^1 6s^2","1.10","+3"],
  [58,"Ce","Cerium","140.12","lanthanide",6,5,9,"[Xe] 4f^1 5d^1 6s^2","1.12","+3, +4"],
  [59,"Pr","Praseodymium","140.91","lanthanide",6,6,9,"[Xe] 4f^3 6s^2","1.13","+3"],
  [60,"Nd","Neodymium","144.24","lanthanide",6,7,9,"[Xe] 4f^4 6s^2","1.14","+3"],
  [61,"Pm","Promethium","(145)","lanthanide",6,8,9,"[Xe] 4f^5 6s^2","1.13","+3"],
  [62,"Sm","Samarium","150.36","lanthanide",6,9,9,"[Xe] 4f^6 6s^2","1.17","+2, +3"],
  [63,"Eu","Europium","151.96","lanthanide",6,10,9,"[Xe] 4f^7 6s^2","1.20","+2, +3"],
  [64,"Gd","Gadolinium","157.25","lanthanide",6,11,9,"[Xe] 4f^7 5d^1 6s^2","1.20","+3"],
  [65,"Tb","Terbium","158.93","lanthanide",6,12,9,"[Xe] 4f^9 6s^2","1.20","+3"],
  [66,"Dy","Dysprosium","162.50","lanthanide",6,13,9,"[Xe] 4f^{10} 6s^2","1.22","+3"],
  [67,"Ho","Holmium","164.93","lanthanide",6,14,9,"[Xe] 4f^{11} 6s^2","1.23","+3"],
  [68,"Er","Erbium","167.26","lanthanide",6,15,9,"[Xe] 4f^{12} 6s^2","1.24","+3"],
  [69,"Tm","Thulium","168.93","lanthanide",6,16,9,"[Xe] 4f^{13} 6s^2","1.25","+3"],
  [70,"Yb","Ytterbium","173.05","lanthanide",6,17,9,"[Xe] 4f^{14} 6s^2","1.10","+2, +3"],
  [71,"Lu","Lutetium","174.97","lanthanide",6,18,9,"[Xe] 4f^{14} 5d^1 6s^2","1.27","+3"],
  [72,"Hf","Hafnium","178.49","transition",6,4,6,"[Xe] 4f^{14} 5d^2 6s^2","1.30","+4"],
  [73,"Ta","Tantalum","180.95","transition",6,5,6,"[Xe] 4f^{14} 5d^3 6s^2","1.50","+5"],
  [74,"W","Tungsten","183.84","transition",6,6,6,"[Xe] 4f^{14} 5d^4 6s^2","2.36","+4, +6","Vonfram"],
  [75,"Re","Rhenium","186.21","transition",6,7,6,"[Xe] 4f^{14} 5d^5 6s^2","1.90","+4, +7"],
  [76,"Os","Osmium","190.23","transition",6,8,6,"[Xe] 4f^{14} 5d^6 6s^2","2.20","+4, +8"],
  [77,"Ir","Iridium","192.22","transition",6,9,6,"[Xe] 4f^{14} 5d^7 6s^2","2.20","+3, +4"],
  [78,"Pt","Platinum","195.08","transition",6,10,6,"[Xe] 4f^{14} 5d^9 6s^1","2.28","+2, +4","Platin"],
  [79,"Au","Gold","196.97","transition",6,11,6,"[Xe] 4f^{14} 5d^{10} 6s^1","2.54","+1, +3","Vàng"],
  [80,"Hg","Mercury","200.59","transition",6,12,6,"[Xe] 4f^{14} 5d^{10} 6s^2","2.00","+1, +2","Thuỷ ngân"],
  [81,"Tl","Thallium","204.38","post_transition",6,13,6,"[Xe] 4f^{14} 5d^{10} 6s^2 6p^1","1.62","+1, +3"],
  [82,"Pb","Lead","207.2","post_transition",6,14,6,"[Xe] 4f^{14} 5d^{10} 6s^2 6p^2","2.33","+2, +4","Chì"],
  [83,"Bi","Bismuth","208.98","post_transition",6,15,6,"[Xe] 4f^{14} 5d^{10} 6s^2 6p^3","2.02","+3"],
  [84,"Po","Polonium","(209)","post_transition",6,16,6,"[Xe] 4f^{14} 5d^{10} 6s^2 6p^4","2.00","+2, +4"],
  [85,"At","Astatine","(210)","halogen",6,17,6,"[Xe] 4f^{14} 5d^{10} 6s^2 6p^5","2.20","-1, +1"],
  [86,"Rn","Radon","(222)","noble_gas",6,18,6,"[Xe] 4f^{14} 5d^{10} 6s^2 6p^6","2.20","0"],

  [87,"Fr","Francium","(223)","alkali",7,1,7,"[Rn] 7s^1","0.70","+1"],
  [88,"Ra","Radium","(226)","alkaline_earth",7,2,7,"[Rn] 7s^2","0.90","+2"],
  [89,"Ac","Actinium","(227)","actinide",7,4,10,"[Rn] 6d^1 7s^2","1.10","+3"],
  [90,"Th","Thorium","232.04","actinide",7,5,10,"[Rn] 6d^2 7s^2","1.30","+4"],
  [91,"Pa","Protactinium","231.04","actinide",7,6,10,"[Rn] 5f^2 6d^1 7s^2","1.50","+5"],
  [92,"U","Uranium","238.03","actinide",7,7,10,"[Rn] 5f^3 6d^1 7s^2","1.38","+4, +6"],
  [93,"Np","Neptunium","(237)","actinide",7,8,10,"[Rn] 5f^4 6d^1 7s^2","1.36","+5"],
  [94,"Pu","Plutonium","(244)","actinide",7,9,10,"[Rn] 5f^6 7s^2","1.28","+4"],
  [95,"Am","Americium","(243)","actinide",7,10,10,"[Rn] 5f^7 7s^2","1.13","+3"],
  [96,"Cm","Curium","(247)","actinide",7,11,10,"[Rn] 5f^7 6d^1 7s^2","1.28","+3"],
  [97,"Bk","Berkelium","(247)","actinide",7,12,10,"[Rn] 5f^9 7s^2","1.30","+3"],
  [98,"Cf","Californium","(251)","actinide",7,13,10,"[Rn] 5f^{10} 7s^2","1.30","+3"],
  [99,"Es","Einsteinium","(252)","actinide",7,14,10,"[Rn] 5f^{11} 7s^2","1.30","+3"],
  [100,"Fm","Fermium","(257)","actinide",7,15,10,"[Rn] 5f^{12} 7s^2","1.30","+3"],
  [101,"Md","Mendelevium","(258)","actinide",7,16,10,"[Rn] 5f^{13} 7s^2","1.30","+3"],
  [102,"No","Nobelium","(259)","actinide",7,17,10,"[Rn] 5f^{14} 7s^2","1.30","+2"],
  [103,"Lr","Lawrencium","(266)","actinide",7,18,10,"[Rn] 5f^{14} 7s^2 7p^1","1.30","+3"],
  [104,"Rf","Rutherfordium","(267)","transition",7,4,7,"[Rn] 5f^{14} 6d^2 7s^2","—","+4"],
  [105,"Db","Dubnium","(268)","transition",7,5,7,"[Rn] 5f^{14} 6d^3 7s^2","—","+5"],
  [106,"Sg","Seaborgium","(269)","transition",7,6,7,"[Rn] 5f^{14} 6d^4 7s^2","—","+6"],
  [107,"Bh","Bohrium","(270)","transition",7,7,7,"[Rn] 5f^{14} 6d^5 7s^2","—","+7"],
  [108,"Hs","Hassium","(277)","transition",7,8,7,"[Rn] 5f^{14} 6d^6 7s^2","—","+8"],
  [109,"Mt","Meitnerium","(278)","transition",7,9,7,"[Rn] 5f^{14} 6d^7 7s^2","—"],
  [110,"Ds","Darmstadtium","(281)","transition",7,10,7,"[Rn] 5f^{14} 6d^8 7s^2","—"],
  [111,"Rg","Roentgenium","(282)","transition",7,11,7,"[Rn] 5f^{14} 6d^9 7s^2","—"],
  [112,"Cn","Copernicium","(285)","transition",7,12,7,"[Rn] 5f^{14} 6d^{10} 7s^2","—","+2"],
  [113,"Nh","Nihonium","(286)","post_transition",7,13,7,"[Rn] 5f^{14} 6d^{10} 7s^2 7p^1","—"],
  [114,"Fl","Flerovium","(289)","post_transition",7,14,7,"[Rn] 5f^{14} 6d^{10} 7s^2 7p^2","—"],
  [115,"Mc","Moscovium","(290)","post_transition",7,15,7,"[Rn] 5f^{14} 6d^{10} 7s^2 7p^3","—"],
  [116,"Lv","Livermorium","(293)","post_transition",7,16,7,"[Rn] 5f^{14} 6d^{10} 7s^2 7p^4","—"],
  [117,"Ts","Tennessine","(294)","halogen",7,17,7,"[Rn] 5f^{14} 6d^{10} 7s^2 7p^5","—"],
  [118,"Og","Oganesson","(294)","noble_gas",7,18,7,"[Rn] 5f^{14} 6d^{10} 7s^2 7p^6","—"],
];

export const PERIODIC_ELEMENTS: ReadonlyArray<PeriodicElement> = RAW_ELEMENTS.map(
  ([z, symbol, name, mass, category, period, col, row, config, en, ox, viName]) => ({
    z,
    symbol,
    name,
    mass,
    category,
    period,
    col,
    row,
    config,
    en,
    ox,
    viName,
  })
);
