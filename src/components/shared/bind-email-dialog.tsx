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
  const hasDismissedBindEmailPrompt = useAuthStore(
    (state) => state.hasDismissedBindEmailPrompt,
  );
  const setBindEmailPromptDismissed = useAuthStore(
    (state) => state.setBindEmailPromptDismissed,
  );
  const hasCompletedOnboarding = usePlanStore((state) => state.hasCompletedOnboarding);
  const isRestoringFromCloud = usePlanStore((state) => state.isRestoringFromCloud);

  const [pendingEmail, setPendingEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasSentLink, setHasSentLink] = useState(false);

  const shouldOpen = useMemo(
    () =>
      !isRestoringFromCloud &&
      hasCompletedOnboarding &&
      status === "authenticated" &&
      isAnonymous &&
      !email &&
      !hasDismissedBindEmailPrompt,
    [
      email,
      hasCompletedOnboarding,
      hasDismissedBindEmailPrompt,
      isAnonymous,
      isRestoringFromCloud,
      status,
    ],
  );

  async function handleBindEmail() {
    const normalizedEmail = pendingEmail.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setSubmitError("请输入一个有效的邮箱地址。");
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

    setHasSentLink(true);
  }

  return (
    <Dialog open={shouldOpen}>
      <DialogContent
        showCloseButton={false}
        className="max-w-xl rounded-[28px] border-cyan-100 bg-white/98 p-0 shadow-2xl shadow-cyan-100/80"
      >
        <div className="grid gap-0 sm:grid-cols-[1.05fr_0.95fr]">
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
                我们会发送一封验证邮件或验证码到你的邮箱，完成后这个账号就可以跨设备继续使用。
              </DialogDescription>
            </DialogHeader>

            {hasSentLink ? (
              <div className="space-y-4 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="size-4" />
                  验证信息已发送
                </div>
                <p className="text-sm leading-6">
                  请去邮箱完成验证。验证成功后，你下次回到应用时就会以已绑定邮箱的身份继续学习。
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

                {submitError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                    {submitError}
                  </div>
                ) : null}
              </div>
            )}

            <DialogFooter className="flex-col gap-3 sm:flex-col">
              {!hasSentLink ? (
                <Button
                  className="h-12 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 text-white"
                  disabled={isSubmitting || !pendingEmail.trim()}
                  onClick={handleBindEmail}
                >
                  {isSubmitting ? "发送中..." : "发送验证邮件"}
                </Button>
              ) : null}
              <Button
                variant="outline"
                className="h-12 rounded-full border-cyan-200 bg-white text-slate-700 hover:bg-cyan-50"
                onClick={() => setBindEmailPromptDismissed(true)}
              >
                {hasSentLink ? "我知道了" : "暂时跳过"}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
