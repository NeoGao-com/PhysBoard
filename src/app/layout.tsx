import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "mathlive/static.css";
import "mathlive/fonts.css";
import "./globals.css";

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
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#FBFBFD] text-slate-900">
        {children}
      </body>
    </html>
  );
}
