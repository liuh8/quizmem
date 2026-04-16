import type { Metadata } from "next";
import "./globals.css";

import { CloudRestoreOverlay } from "@/components/shared/cloud-restore-overlay";
import { SupabaseAuthBootstrap } from "@/components/shared/supabase-auth-bootstrap";

export const metadata: Metadata = {
  title: "QuizMem",
  description: "基于记忆曲线的智能刷题与首轮学习规划应用。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SupabaseAuthBootstrap />
        <CloudRestoreOverlay />
        {children}
      </body>
    </html>
  );
}
