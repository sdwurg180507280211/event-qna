import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Event Q&A",
  description: "Moderated audience questions for live events",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
