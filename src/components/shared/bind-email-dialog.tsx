"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Mail, ShieldCheck } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function BindEmailDialog() {
  const status = useAuthStore((state) => state.status);
  const email = useAuthStore((state) => state.email);
  const isAnonymous = useAuthStore((state) => state.isAnonymous);
  const isBindEmailDialogOpen = useAuthStore((state) => state.isBindEmailDialogOpen);
  const hasDismissedBindEmailPrompt = useAuthStore(
    (state) => state.hasDismissedBindEmailPrompt,
  );
  const setBindEmailPromptDismissed = useAuthStore(
    (state) => state.setBindEmailPromptDismissed,
  );
  const setBindEmailDialogOpen = useAuthStore((state) => state.setBindEmailDialogOpen);
  const clearAuthFlowIntent = useAuthStore((state) => state.clearAuthFlowIntent);
  const hasCompletedOnboarding = usePlanStore((state) => state.hasCompletedOnboarding);
  const isRestoringFromCloud = usePlanStore((state) => state.isRestoringFromCloud);

  const [pendingEmail, setPendingEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasBoundEmail, setHasBoundEmail] = useState(false);

  const shouldOpen = useMemo(
    () =>
      !isRestoringFromCloud &&
      status === "authenticated" &&
      isAnonymous &&
      !email &&
      (isBindEmailDialogOpen ||
        (hasCompletedOnboarding && !hasDismissedBindEmailPrompt)),
    [
      email,
      hasCompletedOnboarding,
      hasDismissedBindEmailPrompt,
      isBindEmailDialogOpen,
      isAnonymous,
      isRestoringFromCloud,
      status,
    ],
  );

  async function handleBindEmail() {
    const normalizedEmail = pendingEmail.trim().toLowerCase();
    const normalizedConfirmEmail = confirmEmail.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setSubmitError("请输入一个有效的邮箱地址。");
      return;
    }

    if (!isValidEmail(normalizedConfirmEmail)) {
      setSubmitError("请再次输入一个有效的邮箱地址。");
      return;
    }

    if (normalizedEmail !== normalizedConfirmEmail) {
      setSubmitError("两次输入的邮箱地址不一致，请重新确认。");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({
      email: normalizedEmail,
    });

    setIsSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setHasBoundEmail(true);
    setBindEmailDialogOpen(false);
    clearAuthFlowIntent();
  }

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
              保存进度
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold leading-tight">绑定邮箱，支持跨设备继续学习。</h2>
              <p className="text-sm leading-7 text-cyan-50/92">
                现在你是匿名学习模式，当前设备内可以继续使用，但如果清浏览器数据或换设备，进度就找不回来了。
              </p>
            </div>
            <div className="rounded-[24px] border border-white/20 bg-white/10 p-4 text-sm leading-6 text-cyan-50/95 backdrop-blur">
              绑定后你仍然可以保持现在的学习进度，我们只是给这份进度加一个可找回的邮箱身份。
            </div>
          </div>

          <div className="space-y-5 px-5 py-6 sm:px-6 sm:py-8">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-xl font-semibold text-slate-900">
                绑定邮箱
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-slate-600">
                绑定成功后，这个邮箱就会和当前学习进度关联，下次可以直接用邮箱登录继续学习。
              </DialogDescription>
            </DialogHeader>

            {hasBoundEmail ? (
              <div className="space-y-4 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="size-4" />
                  绑定成功
                </div>
                <p className="text-sm leading-6">
                  这个邮箱已经和当前学习进度绑定，下次可以直接用邮箱登录继续学习。
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span className="inline-flex items-center gap-2">
                    <Mail className="size-4 text-cyan-600" />
                    邮箱地址
                  </span>
                  <input
                    type="email"
                    value={pendingEmail}
                    onChange={(event) => setPendingEmail(event.target.value)}
                    placeholder="name@example.com"
                    className="h-12 w-full rounded-2xl border border-cyan-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                  />
                </label>

                <label className="mt-4 space-y-2 text-sm font-medium text-slate-700">
                  <span className="inline-flex items-center gap-2">
                    <Mail className="size-4 text-cyan-600" />
                    再次输入邮箱地址
                  </span>
                  <input
                    type="email"
                    value={confirmEmail}
                    onChange={(event) => setConfirmEmail(event.target.value)}
                    placeholder="再次输入邮箱地址"
                    className="h-12 w-full rounded-2xl border border-cyan-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                  />
                </label>

                {submitError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                    {submitError}
                  </div>
                ) : null}
              </div>
            )}

            <DialogFooter className="flex-col gap-3 sm:flex-col">
              {!hasBoundEmail ? (
                <Button
                  className="h-12 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 text-white"
                  disabled={isSubmitting || !pendingEmail.trim() || !confirmEmail.trim()}
                  onClick={handleBindEmail}
                >
                  {isSubmitting ? "绑定中..." : "确认绑定"}
                </Button>
              ) : null}
              <Button
                variant="outline"
                className="h-12 rounded-full border-cyan-200 bg-white text-slate-700 hover:bg-cyan-50"
                onClick={() => {
                  setBindEmailPromptDismissed(true);
                  setBindEmailDialogOpen(false);
                  clearAuthFlowIntent();
                }}
              >
                {hasBoundEmail ? "我知道了" : "暂时跳过"}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
