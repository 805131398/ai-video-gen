import type { Metadata } from "next";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { Toaster } from "@/components/ui/sonner";
import { initializeApp } from "@/lib/init";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Video Gen",
  description: "AI 视频生成工具",
};

// 在模块加载时初始化应用
initializeApp().catch((error) => {
  console.error("[RootLayout] Failed to initialize app:", error);
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <SessionProvider>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
