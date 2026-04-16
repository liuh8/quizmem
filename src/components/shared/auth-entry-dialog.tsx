"use client";

import { Mail, ShieldCheck } from "lucide-react";

import { useAuthStore } from "@/store/useAuthStore";
import { usePlanStore } from "@/store/usePlanStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AuthEntryDialog() {
  const status = useAuthStore((state) => state.status);
  const autoAnonymousEnabled = useAuthStore((state) => state.autoAnonymousEnabled);
  const isEmailLoginDialogOpen = useAuthStore((state) => state.isEmailLoginDialogOpen);
  const isBindEmailDialogOpen = useAuthStore((state) => state.isBindEmailDialogOpen);
  const setAutoAnonymousEnabled = useAuthStore((state) => state.setAutoAnonymousEnabled);
  const setEmailLoginDialogOpen = useAuthStore((state) => state.setEmailLoginDialogOpen);
  const setBindEmailDialogOpen = useAuthStore((state) => state.setBindEmailDialogOpen);
  const setAuthFlowIntent = useAuthStore((state) => state.setAuthFlowIntent);
  const hasCompletedOnboarding = usePlanStore((state) => state.hasCompletedOnboarding);
  const isRestoringFromCloud = usePlanStore((state) => state.isRestoringFromCloud);
  const setCloudRestoreState = usePlanStore((state) => state.setCloudRestoreState);

  const shouldOpen =
    !isRestoringFromCloud &&
    status === "idle" &&
    !autoAnonymousEnabled &&
    !isEmailLoginDialogOpen &&
    !isBindEmailDialogOpen &&
    !hasCompletedOnboarding;

  return (
    <Dialog open={shouldOpen}>
	      <DialogContent
	        showCloseButton={false}
	        className="max-w-xl overflow-hidden rounded-[28px] border-cyan-100 bg-white/98 p-0 shadow-2xl shadow-cyan-100/80"
	      >
	        <div className="grid gap-0 overflow-hidden rounded-[28px] sm:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5 bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-500 px-6 py-7 text-white sm:px-7 sm:py-8">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/16 px-3 py-1 text-xs font-medium tracking-[0.18em] uppercase">
              <ShieldCheck className="size-3.5" />
              QuizMem
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold leading-tight">先选择一种进入方式。</h2>
              <p className="text-sm leading-7 text-cyan-50/92">
                如果你已经绑定过邮箱，建议先邮箱登录找回原来的学习进度；如果只是想立刻开始，也可以继续匿名使用。
              </p>
            </div>
            <div className="rounded-[24px] border border-white/20 bg-white/10 p-4 text-sm leading-6 text-cyan-50/95 backdrop-blur">
              建议使用真实邮箱保存学习记录，这样换设备后也能继续做题。
            </div>
          </div>

          <div className="space-y-5 px-5 py-6 sm:px-6 sm:py-8">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-xl font-semibold text-slate-900">
                选择进入方式
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-slate-600">
                老用户先登录，新用户也可以先匿名进入，后面随时再绑定邮箱。
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex-col gap-3 sm:flex-col">
              <Button
                className="h-12 rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 text-white"
                onClick={() => {
                  setEmailLoginDialogOpen(true);
                }}
              >
                <Mail className="size-4" />
                邮箱登录
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-full border-cyan-200 bg-white text-slate-700 hover:bg-cyan-50"
                onClick={() => {
                  setAuthFlowIntent("register");
                  setBindEmailDialogOpen(true);
                  setCloudRestoreState(true);
                  setAutoAnonymousEnabled(true);
                }}
              >
                <Mail className="size-4" />
                去注册并绑定邮箱
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-full border-cyan-200 bg-white text-slate-700 hover:bg-cyan-50"
                onClick={() => {
                  setAuthFlowIntent("anonymous");
                  setCloudRestoreState(true);
                  setAutoAnonymousEnabled(true);
                }}
              >
                <ShieldCheck className="size-4" />
                继续匿名使用
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
