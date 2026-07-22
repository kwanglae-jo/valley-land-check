import type { Metadata } from "next";
import { Nanum_Myeongjo, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const display = Nanum_Myeongjo({
  weight: ["700", "800"],
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = Noto_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "계곡체크 — 사유지·공공용지 실시간 확인",
  description:
    "GPS와 연속지적도·토지임야정보로 계곡 방문 위치가 사유지인지 공공용지인지 바로 확인합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
