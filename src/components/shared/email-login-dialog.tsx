"use client";

import { useMemo, useState } from "react";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";

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

function getFriendlyLoginError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("user not found") ||
    normalized.includes("email not confirmed") ||
    normalized.includes("signup") ||
    normalized.includes("signups not allowed")
  ) {
    return "未找到这个邮箱对应的学习记录，请先注册。";
  }

  return message;
}

export function EmailLoginDialog() {
  const isOpen = useAuthStore((state) => state.isEmailLoginDialogOpen);
  const autoAnonymousEnabled = useAuthStore((state) => state.autoAnonymousEnabled);
  const status = useAuthStore((state) => state.status);
  const setAutoAnonymousEnabled = useAuthStore((state) => state.setAutoAnonymousEnabled);
  const setEmailLoginDialogOpen = useAuthStore((state) => state.setEmailLoginDialogOpen);
  const setBindEmailDialogOpen = useAuthStore((state) => state.setBindEmailDialogOpen);
  const setAuthFlowIntent = useAuthStore((state) => state.setAuthFlowIntent);
  const setCloudRestoreState = usePlanStore((state) => state.setCloudRestoreState);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  async function handleSendOtp() {
    if (!isValidEmail(normalizedEmail)) {
      setSubmitError("请输入有效的邮箱地址。");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
      },
    });

    setIsSubmitting(false);

    if (error) {
      setSubmitError(getFriendlyLoginError(error.message));
      return;
    }

    setStep("otp");
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) {
      setSubmitError("请输入邮箱收到的验证码。");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const supabase = getSupabaseBrowserClient();
    setAuthFlowIntent("login");
    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: otp.trim(),
      type: "email",
    });

    setIsSubmitting(false);

    if (error) {
      setAuthFlowIntent(null);
      setSubmitError(error.message);
      return;
    }

    setAutoAnonymousEnabled(true);
    setEmailLoginDialogOpen(false);
    setOtp("");
    setStep("email");
  }

  function handleOpenBindEmail() {
    setSubmitError(null);
    setEmailLoginDialogOpen(false);
    setBindEmailDialogOpen(true);
    setAuthFlowIntent("register");

    if (status !== "authenticated") {
      setCloudRestoreState(true);
      setAutoAnonymousEnabled(true);
    }
  }

  function handleContinueAnonymously() {
    setAuthFlowIntent("anonymous");
    setCloudRestoreState(true);
    setAutoAnonymousEnabled(true);
    setEmailLoginDialogOpen(false);
  }

  return (
    <Dialog open={isOpen}>
	      <DialogContent
	        showCloseButton={false}
	        className="max-w-xl overflow-hidden rounded-[28px] border-cyan-100 bg-white/98 p-0 shadow-2xl shadow-cyan-100/80"
	      >
	        <div className="grid gap-0 overflow-hidden rounded-[28px] sm:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5 bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-500 px-6 py-7 text-white sm:px-7 sm:py-8">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/16 px-3 py-1 text-xs font-medium tracking-[0.18em] uppercase">
              <Mail className="size-3.5" />
              邮箱登录
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold leading-tight">用邮箱验证码继续你的学习进度。</h2>
              <p className="text-sm leading-7 text-cyan-50/92">
                如果你之前已经绑定过邮箱，这里可以直接输入邮箱并填写验证码，重新拿回自己的计划、错题本和答题记录。
              </p>
            </div>
          </div>

          <div className="space-y-5 px-5 py-6 sm:px-6 sm:py-8">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-xl font-semibold text-slate-900">
                {step === "email" ? "输入邮箱" : "输入验证码"}
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-slate-600">
                {step === "email"
                  ? "我们会向这个邮箱发送一次性验证码。"
                  : `验证码已发送到 ${normalizedEmail}，请直接在这里输入。`}
              </DialogDescription>
            </DialogHeader>

            {step === "email" ? (
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span className="inline-flex items-center gap-2">
                  <Mail className="size-4 text-cyan-600" />
                  邮箱地址
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  className="h-12 w-full rounded-2xl border border-cyan-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                />
              </label>
            ) : (
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span className="inline-flex items-center gap-2">
                  <KeyRound className="size-4 text-cyan-600" />
                  邮箱验证码
                </span>
                <input
                  inputMode="numeric"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="输入 6 位或邮件中的验证码"
                  className="h-12 w-full rounded-2xl border border-cyan-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                />
              </label>
            )}

            {submitError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                {submitError}
              </div>
            ) : null}

	            <DialogFooter className="flex-col gap-3 sm:flex-col">
	              {step === "email" ? (
	                <>
	                  <Button
	                    className="h-12 rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 text-white"
	                    disabled={isSubmitting || !normalizedEmail}
	                    onClick={handleSendOtp}
	                  >
	                    {isSubmitting ? "发送中..." : "发送验证码"}
	                  </Button>
	                  <Button
	                    variant="outline"
	                    className="h-12 rounded-full border-cyan-200 bg-white text-slate-700 hover:bg-cyan-50"
	                    onClick={handleOpenBindEmail}
	                  >
	                    去注册并绑定邮箱
	                  </Button>
	                </>
	              ) : (
                <>
                  <Button
                    className="h-12 rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 text-white"
                    disabled={isSubmitting || !otp.trim()}
                    onClick={handleVerifyOtp}
                  >
                    {isSubmitting ? "验证中..." : "验证并登录"}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 rounded-full border-cyan-200 bg-white text-slate-700 hover:bg-cyan-50"
                    onClick={() => {
                      setStep("email");
                      setOtp("");
                      setSubmitError(null);
                    }}
                  >
                    返回修改邮箱
                  </Button>
                </>
              )}

              <Button
                variant="outline"
                className="h-12 rounded-full border-cyan-200 bg-white text-slate-700 hover:bg-cyan-50"
                onClick={handleContinueAnonymously}
              >
                <ShieldCheck className="size-4" />
                {autoAnonymousEnabled ? "关闭邮箱登录" : "继续匿名使用"}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
