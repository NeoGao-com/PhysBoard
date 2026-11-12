import type { Metadata } from "next";
import {
  Anton,
  Be_Vietnam_Pro,
  Bitter,
  Dancing_Script,
  Inter,
  Lexend,
  Lora,
  Manrope,
  Merriweather,
  Montserrat,
  Mulish,
  Nunito,
  Open_Sans,
  Oswald,
  Patrick_Hand,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Quicksand,
  Roboto,
  Source_Code_Pro,
} from "next/font/google";
import "katex/dist/katex.min.css";
import "mathlive/static.css";
import "mathlive/fonts.css";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["vietnamese"], variable: "--font-anton", display: "swap" });
const beVietnamPro = Be_Vietnam_Pro({ weight: ["400", "700"], subsets: ["vietnamese"], variable: "--font-be-vietnam-pro", display: "swap" });
const bitter = Bitter({ weight: ["400", "700"], subsets: ["vietnamese"], variable: "--font-bitter", display: "swap" });
const dancingScript = Dancing_Script({ weight: ["400", "700"], subsets: ["vietnamese"], variable: "--font-dancing-script", display: "swap" });
const inter = Inter({ weight: ["400", "700"], subsets: ["vietnamese"], variable: "--font-inter", display: "swap" });
const lexend = Lexend({ weight: ["400", "700"], subsets: ["vietnamese"], variable: "--font-lexend", display: "swap" });
const lora = Lora({ weight: ["400", "700"], subsets: ["vietnamese"], variable: "--font-lora", display: "swap" });
const manrope = Manrope({ weight: ["400", "700"], subsets: ["vietnamese"], variable: "--font-manrope", display: "swap" });
const merriweather = Merriweather({ weight: ["400", "700"], subsets: ["vietnamese"], variable: "--font-merriweather", display: "swap" });
const montserrat = Montserrat({ weight: ["400", "700"], subsets: ["vietnamese"], variable: "--font-montserrat", display: "swap" });
const mulish = Mulish({ weight: ["400", "700"], subsets: ["vietnamese"], variable: "--font-mulish", display: "swap" });
const nunito = Nunito({ weight: ["400", "700"], subsets: ["vietnamese"], variable: "--font-nunito", display: "swap" });
const openSans = Open_Sans({ weight: ["400", "700"], subsets: ["vietnamese"], variable: "--font-open-sans", display: "swap" });
const oswald = Oswald({ weight: ["400", "700"], subsets: ["vietnamese"], variable: "--font-oswald", display: "swap" });
const patrickHand = Patrick_Hand({ weight: "400", subsets: ["vietnamese"], variable: "--font-patrick-hand", display: "swap" });
const playfairDisplay = Playfair_Display({ weight: ["400", "700"], subsets: ["vietnamese"], variable: "--font-playfair-display", display: "swap" });
const plusJakartaSans = Plus_Jakarta_Sans({ weight: ["400", "700"], subsets: ["vietnamese"], variable: "--font-plus-jakarta-sans", display: "swap" });
const quicksand = Quicksand({ weight: ["400", "700"], subsets: ["vietnamese"], variable: "--font-quicksand", display: "swap" });
const roboto = Roboto({ weight: ["400", "700"], subsets: ["vietnamese"], variable: "--font-roboto", display: "swap" });
const sourceCodePro = Source_Code_Pro({ weight: ["400", "700"], subsets: ["vietnamese"], variable: "--font-source-code-pro", display: "swap" });

const FONT_VARIABLES = [
  anton.variable,
  beVietnamPro.variable,
  bitter.variable,
  dancingScript.variable,
  inter.variable,
  lexend.variable,
  lora.variable,
  manrope.variable,
  merriweather.variable,
  montserrat.variable,
  mulish.variable,
  nunito.variable,
  openSans.variable,
  oswald.variable,
  patrickHand.variable,
  playfairDisplay.variable,
  plusJakartaSans.variable,
  quicksand.variable,
  roboto.variable,
  sourceCodePro.variable,
].join(" ");

export const metadata: Metadata = {
  title: "PhysBoard",
  description: "PhysBoard — Bảng trắng tương tác dạy Toán & Vật lý Offline",
  icons: {
    icon: [{ url: "./logo.png", type: "image/png" }],
    apple: [{ url: "./logo.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${FONT_VARIABLES} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#FBFBFD] text-slate-900">
        {children}
      </body>
    </html>
  );
}
