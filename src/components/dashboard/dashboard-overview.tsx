"use client";

import Link from "next/link";
import { useMemo } from "react";
import { differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import {
  ArrowRight,
  BookCheck,
  CircleAlert,
  Clock3,
  Mail,
  RotateCcw,
  ShieldCheck,
  LogOut,
} from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuthStore } from "@/store/useAuthStore";
import { usePlanStore } from "@/store/usePlanStore";
import { useWrongBookStore } from "@/store/useWrongBookStore";
import { getTodayPlan as getDerivedTodayPlan } from "@/utils/scheduler";

function calculateFirstPassProgress(plan: NonNullable<ReturnType<typeof usePlanStore.getState>["plan"]>) {
  const completedNewQuestionIds = new Set(
    plan.dailyPlans.flatMap((dailyPlan) => dailyPlan.newQuestions.completedQuestionIds),
  );
  const completedCount = completedNewQuestionIds.size;
  const totalQuestions = plan.summary.totalNewQuestionCount;

  return {
    completedCount,
    totalQuestions,
    remainingCount: Math.max(totalQuestions - completedCount, 0),
    progress:
      totalQuestions > 0
        ? Math.round((completedCount / totalQuestions) * 100)
        : 0,
  };
}

function getCarryoverNewQuestionCount(
  plan: NonNullable<ReturnType<typeof usePlanStore.getState>["plan"]>,
  todayQuestionIds: number[],
) {
  const todayKey = format(startOfDay(new Date()), "yyyy-MM-dd");
  const scheduledDateByQuestionId = new Map<number, string>();

  plan.dailyPlans.forEach((dailyPlan) => {
    dailyPlan.newQuestions.questionIds.forEach((questionId) => {
      if (!scheduledDateByQuestionId.has(questionId)) {
        scheduledDateByQuestionId.set(questionId, dailyPlan.date);
      }
    });
  });

  return todayQuestionIds.filter((questionId) => {
    const scheduledDate = scheduledDateByQuestionId.get(questionId);
    return scheduledDate ? scheduledDate < todayKey : false;
  }).length;
}

export function DashboardOverview() {
  const email = useAuthStore((state) => state.email);
  const isAnonymous = useAuthStore((state) => state.isAnonymous);
  const status = useAuthStore((state) => state.status);
  const setAutoAnonymousEnabled = useAuthStore((state) => state.setAutoAnonymousEnabled);
  const setEmailLoginDialogOpen = useAuthStore((state) => state.setEmailLoginDialogOpen);
  const setBindEmailPromptDismissed = useAuthStore((state) => state.setBindEmailPromptDismissed);
  const plan = usePlanStore((state) => state.plan);
  const regeneratePlan = usePlanStore((state) => state.regeneratePlan);
  const resetPlan = usePlanStore((state) => state.resetPlan);
  const setCloudRestoreState = usePlanStore((state) => state.setCloudRestoreState);
  const wrongBookItems = useWrongBookStore((state) => state.items);
  const todayPlan = useMemo(
    () => (plan ? getDerivedTodayPlan(plan) : null),
    [plan],
  );

  if (!plan || !todayPlan) {
    return null;
  }

  const progress = calculateFirstPassProgress(plan);
  const remainingFirstPassDays = Math.max(
    differenceInCalendarDays(parseISO(plan.targetDate), startOfDay(new Date())) + 1,
    0,
  );
  const targetNewQuestionIds =
    todayPlan.newQuestions.targetQuestionIds ?? todayPlan.newQuestions.questionIds;
  const carryoverNewQuestionCount = getCarryoverNewQuestionCount(plan, targetNewQuestionIds);
  const totalNewQuestions = targetNewQuestionIds.length;
  const completedTargetNewQuestions = targetNewQuestionIds.filter((questionId) =>
    todayPlan.newQuestions.completedQuestionIds.includes(questionId),
  ).length;
  const completedNewQuestions =
    completedTargetNewQuestions < totalNewQuestions
      ? completedTargetNewQuestions
      : todayPlan.newQuestions.completedQuestionIds.length;
  const remainingNewQuestions = Math.max(totalNewQuestions - completedTargetNewQuestions, 0);
  const totalReviewQuestions = todayPlan.reviewQuestions.questionIds.length;
  const completedReviewQuestions = todayPlan.reviewQuestions.completedQuestionIds.length;
  const remainingReviewQuestions = Math.max(totalReviewQuestions - completedReviewQuestions, 0);
  const wrongBookCount = Object.keys(wrongBookItems).length;

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    setAutoAnonymousEnabled(false);
    setEmailLoginDialogOpen(true);
    setCloudRestoreState(false);
    await supabase.auth.signOut();
    window.localStorage.removeItem("quizmem-plan-store");
    window.localStorage.removeItem("quizmem-session-store");
    window.localStorage.removeItem("quizmem-wrong-book-store");
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden rounded-[28px] border-cyan-100/80 bg-white/88 shadow-lg shadow-cyan-100/70">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <Badge className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-800">
                  今日任务
                </Badge>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                    今天先完成新题，再处理复习。
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                    首轮目标日期是 {format(parseISO(plan.targetDate), "yyyy 年 M 月 d 日")}，系统已经按固定复习间隔为你排好了后续复习任务。
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                className="h-11 rounded-full border-cyan-200 bg-cyan-50/70 px-5 text-sm font-semibold text-slate-700 hover:bg-cyan-100"
                onClick={() => regeneratePlan()}
              >
                重新生成计划
                <RotateCcw className="size-4" />
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="rounded-[22px] border-teal-100 bg-teal-50/70 shadow-none">
                <CardContent className="space-y-3 p-5">
                  <BookCheck className="size-5 text-teal-600" />
                  <div>
                    <p className="text-sm text-slate-600">今日需学新题</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                      {completedNewQuestions} / {totalNewQuestions}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      还剩 {remainingNewQuestions} 题
                    </p>
                    {carryoverNewQuestionCount > 0 ? (
                      <p className="mt-1 text-xs text-amber-700">
                        含前面顺延的 {carryoverNewQuestionCount} 道新题
                      </p>
                    ) : null}
                  </div>
                  <Button
                    asChild
                    className="h-11 w-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 text-white"
                  >
                    <Link href="/practice?tab=new" className="flex w-full items-center justify-center gap-2">
                      开始学习
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-[22px] border-sky-100 bg-sky-50/70 shadow-none">
                <CardContent className="space-y-3 p-5">
                  <RotateCcw className="size-5 text-sky-600" />
                  <div>
                    <p className="text-sm text-slate-600">今日需复习</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                      {completedReviewQuestions} / {totalReviewQuestions}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      还剩 {remainingReviewQuestions} 题
                    </p>
                  </div>
                  {totalReviewQuestions > 0 ? (
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 w-full rounded-full border-cyan-200 bg-white/80 text-slate-700 hover:bg-cyan-50"
                    >
                      <Link
                        href="/practice?tab=review"
                        className="flex w-full items-center justify-center gap-2"
                      >
                        开始复习
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      disabled
                      className="h-11 w-full rounded-full border-slate-200 bg-slate-100 text-slate-400"
                    >
                      今日暂无复习
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[22px] border-emerald-100 bg-emerald-50/70 shadow-none">
                <CardContent className="space-y-3 p-5">
                  <Clock3 className="size-5 text-emerald-600" />
                  <div>
                    <p className="text-sm text-slate-600">距离首轮学完</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                      {remainingFirstPassDays}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">天</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-sky-100/80 bg-white/88 shadow-lg shadow-sky-100/60">
          <CardContent className="space-y-5 p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500">首轮进度</p>
              <p className="text-4xl font-semibold tracking-tight text-slate-900">
                {progress.progress}%
              </p>
            </div>
            <Progress
              value={progress.progress}
              className="h-3 rounded-full bg-sky-100 [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-teal-500 [&_[data-slot=progress-indicator]]:to-sky-500"
            />
            <div className="space-y-2 text-sm leading-6 text-slate-600">
              <p>
                已完成
                <span className="font-semibold text-slate-900">
                  {` ${progress.completedCount} / ${progress.totalQuestions} `}
                </span>
                道首轮新题
              </p>
              <p>
                距离首轮学完还剩
                <span className="font-semibold text-slate-900">
                  {` ${progress.remainingCount} `}
                </span>
                道，目标日期为 {format(parseISO(plan.targetDate), "yyyy 年 M 月 d 日")}。
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {plan.summary.overloadWarning ? (
        <div className="flex gap-3 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 shadow-sm shadow-amber-100/60">
          <CircleAlert className="mt-0.5 size-5 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">任务压力提醒</p>
            <p className="text-sm leading-6">{plan.summary.overloadWarning}</p>
          </div>
        </div>
      ) : null}

	      <section className="grid gap-4 md:grid-cols-4">
	        <Card className="rounded-[24px] border-cyan-100/80 bg-white/88 shadow-sm shadow-cyan-100/70">
	          <CardContent className="space-y-3 p-6">
	            <CircleAlert className="size-5 text-cyan-600" />
	            <h2 className="text-lg font-semibold text-slate-900">错题本</h2>
	            <p className="text-sm leading-6 text-slate-600">
	              当前累计 {wrongBookCount} 道错题，适合集中回看薄弱点。
            </p>
            <Button
              asChild
              className="h-11 w-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 text-white"
            >
              <Link href="/wrong-book" className="flex w-full items-center justify-center gap-2">
                打开错题本
                <ArrowRight className="size-4" />
              </Link>
	            </Button>
	          </CardContent>
	        </Card>

	        <Card className="rounded-[24px] border-sky-100/80 bg-white/88 shadow-sm shadow-sky-100/70">
	          <CardContent className="space-y-3 p-6">
	            <Clock3 className="size-5 text-sky-600" />
	            <h2 className="text-lg font-semibold text-slate-900">限时测验</h2>
	            <p className="text-sm leading-6 text-slate-600">
	              每轮 18 题，每题 10 秒，优先抽今日复习题。
	            </p>
	            <Button
	              asChild
	              variant="outline"
	              className="h-11 w-full rounded-full border-cyan-200 bg-cyan-50/70 text-slate-700 hover:bg-cyan-100"
	            >
	              <Link href="/quiz" className="flex w-full items-center justify-center gap-2">
	                开始测验
	                <ArrowRight className="size-4" />
	              </Link>
	            </Button>
	          </CardContent>
	        </Card>

	        <Card className="rounded-[24px] border-rose-100/80 bg-white/88 shadow-sm shadow-rose-100/70">
	          <CardContent className="space-y-3 p-6">
            <CircleAlert className="size-5 text-rose-500" />
            <h2 className="text-lg font-semibold text-slate-900">重设计划</h2>
            <p className="text-sm leading-6 text-slate-600">
              如果你想重新选择首轮学完日期，可以清空本地计划并重新开始。
            </p>
            <Button
              variant="outline"
              className="h-11 w-full rounded-full border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100"
	              onClick={() => resetPlan()}
	            >
	              重新选择日期
	            </Button>
	          </CardContent>
	        </Card>

	        <Card className="rounded-[24px] border-violet-100/80 bg-white/88 shadow-sm shadow-violet-100/70">
	          <CardContent className="space-y-3 p-6">
	            {email ? (
	              <Mail className="size-5 text-violet-600" />
	            ) : (
	              <ShieldCheck className="size-5 text-violet-600" />
	            )}
	            <h2 className="text-lg font-semibold text-slate-900">账号状态</h2>
	            <p className="text-sm leading-6 text-slate-600">
	              {email
	                ? `已绑定邮箱：${email}`
	                : isAnonymous
	                  ? "当前为匿名学习模式，建议绑定邮箱以支持跨设备继续学习。"
	                  : "当前账号暂未显示邮箱信息。"}
	            </p>
	            <div className="flex flex-col gap-3">
	              {status === "authenticated" && isAnonymous ? (
	                <>
	                  <Button
	                    variant="outline"
	                    className="h-11 rounded-full border-cyan-200 bg-white text-slate-700 hover:bg-cyan-50"
	                    onClick={() => {
	                      setBindEmailPromptDismissed(false);
	                    }}
	                  >
	                    绑定邮箱
	                  </Button>
	                  <Button
	                    variant="outline"
	                    className="h-11 rounded-full border-cyan-200 bg-white text-slate-700 hover:bg-cyan-50"
	                    onClick={() => {
	                      setAutoAnonymousEnabled(false);
	                      setEmailLoginDialogOpen(true);
	                    }}
	                  >
	                    邮箱登录
	                  </Button>
	                </>
	              ) : null}
	              {email ? (
	                <>
	                  <Button
	                    variant="outline"
	                    className="h-11 rounded-full border-cyan-200 bg-white text-slate-700 hover:bg-cyan-50"
	                    onClick={() => {
	                      setAutoAnonymousEnabled(false);
	                      setEmailLoginDialogOpen(true);
	                    }}
	                  >
	                    切换邮箱登录
	                  </Button>
	                  <Button
	                    variant="outline"
	                    className="h-11 rounded-full border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100"
	                    onClick={handleSignOut}
	                  >
	                    <LogOut className="size-4" />
	                    退出登录
	                  </Button>
	                </>
	              ) : null}
	            </div>
	          </CardContent>
	        </Card>
	      </section>
    </div>
  );
}
