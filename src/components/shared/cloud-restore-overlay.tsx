"use client";

import { useMemo } from "react";

import { useAuthStore, type AuthFlowIntent } from "@/store/useAuthStore";
import { usePlanStore } from "@/store/usePlanStore";

function getRestoreMessage(intent: AuthFlowIntent) {
  switch (intent) {
    case "login":
      return "正在读取您的学习进度...";
    case "register":
      return "正在为您准备学习空间并准备邮箱绑定...";
    case "anonymous":
      return "正在为你准备学习空间...";
    default:
      return null;
  }
}

export function CloudRestoreOverlay() {
  const authFlowIntent = useAuthStore((state) => state.authFlowIntent);
  const isRestoringFromCloud = usePlanStore((state) => state.isRestoringFromCloud);

  const message = useMemo(
    () => (isRestoringFromCloud ? getRestoreMessage(authFlowIntent) : null),
    [authFlowIntent, isRestoringFromCloud],
  );

  if (!message) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/86 px-6 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative size-12">
          <span className="absolute inset-0 rounded-full border-4 border-cyan-100" />
          <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-cyan-500 border-r-teal-400" />
        </div>
        <p className="text-base font-medium tracking-[0.01em] text-slate-700 sm:text-lg">
          {message}
        </p>
      </div>
    </div>
  );
}
