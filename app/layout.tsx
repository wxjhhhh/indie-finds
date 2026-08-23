import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "独立发现",
  description: "3D 游戏与 Shader 视觉收藏",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
