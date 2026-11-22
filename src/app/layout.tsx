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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#FBFBFD] text-slate-900">
        {children}
      </body>
    </html>
  );
}
