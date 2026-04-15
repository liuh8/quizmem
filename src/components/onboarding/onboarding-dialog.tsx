"use client";

import { useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import { CalendarDays, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/useAuthStore";
import { usePlanStore } from "@/store/usePlanStore";

const DATE_FORMAT = "yyyy-MM-dd";
const DEFAULT_FIRST_PASS_DAYS = 30;
const OVERLOAD_WARNING_THRESHOLD = 30;

function toDateInputValue(date: Date) {
  return format(date, DATE_FORMAT);
}

export function OnboardingDialog() {
  const status = useAuthStore((state) => state.status);
  const autoAnonymousEnabled = useAuthStore((state) => state.autoAnonymousEnabled);
  const isEmailLoginDialogOpen = useAuthStore((state) => state.isEmailLoginDialogOpen);
  const hasCompletedOnboarding = usePlanStore((state) => state.hasCompletedOnboarding);
  const isRestoringFromCloud = usePlanStore((state) => state.isRestoringFromCloud);
  const storedTargetDate = usePlanStore((state) => state.targetDate);
  const initializePlan = usePlanStore((state) => state.initializePlan);
  const setTargetDate = usePlanStore((state) => state.setTargetDate);

  const today = useMemo(() => startOfDay(new Date()), []);
  const defaultTargetDate = useMemo(() => addDays(today, DEFAULT_FIRST_PASS_DAYS - 1), [today]);
  const initialDate = storedTargetDate ? parseISO(storedTargetDate) : defaultTargetDate;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);

  const pendingTargetDate = selectedDate ?? defaultTargetDate;
  const firstPassDays = differenceInCalendarDays(pendingTargetDate, today) + 1;
  const estimatedDailyNewQuestions = Math.ceil(300 / Math.max(firstPassDays, 1));
  const warning =
    estimatedDailyNewQuestions > OVERLOAD_WARNING_THRESHOLD
      ? `按当前日期估算，你每天大约需要学习 ${estimatedDailyNewQuestions} 道新题，任务会比较重。`
      : null;

  const shouldOpenOnboarding =
    !isRestoringFromCloud &&
    !hasCompletedOnboarding &&
    status === "authenticated" &&
    autoAnonymousEnabled &&
    !isEmailLoginDialogOpen;

  return (
    <Dialog open={shouldOpenOnboarding}>
      <DialogContent
        showCloseButton={false}
        className="h-[100dvh] max-h-[100dvh] max-w-full overflow-y-auto rounded-none border-0 bg-white/98 p-0 shadow-none sm:h-auto sm:max-h-[92vh] sm:max-w-4xl sm:rounded-[28px] sm:border sm:border-cyan-100 sm:shadow-2xl sm:shadow-cyan-100/80"
      >
        <div className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6 bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-500 px-5 py-6 text-white sm:px-8 sm:py-10">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/16 px-3 py-1 text-xs font-medium tracking-[0.18em] uppercase">
              <CalendarDays className="size-3.5" />
              QuizMem
            </div>

            <DialogHeader className="space-y-4 text-left">
              <DialogTitle className="text-3xl leading-tight font-semibold sm:text-4xl">
                先设定一个首轮学完日期。
              </DialogTitle>
              <DialogDescription className="max-w-md text-sm leading-7 text-cyan-50/92 sm:text-base">
                系统会从今天开始，把 300 道题平均拆分成每日新题，并自动插入第 1、2、4、7、15 天的复习任务。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 rounded-[24px] border border-white/20 bg-white/10 p-5 backdrop-blur">
              <div className="space-y-1">
                <p className="text-xs tracking-[0.18em] text-cyan-100 uppercase">当前估算</p>
                <p className="text-2xl font-semibold">{Math.max(firstPassDays, 1)} 天完成首轮</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/12 p-4">
                  <p className="text-xs text-cyan-100">预计每日新题</p>
                  <p className="mt-2 text-2xl font-semibold">{estimatedDailyNewQuestions} 道</p>
                </div>
                <div className="rounded-2xl bg-white/12 p-4">
                  <p className="text-xs text-cyan-100">目标日期</p>
                  <p className="mt-2 text-lg font-semibold">
                    {format(pendingTargetDate, "yyyy 年 M 月 d 日")}
                  </p>
                </div>
              </div>
              <p className="text-sm leading-6 text-cyan-50/90">
                这一步只影响首轮学习分配，不会阻止你继续复习到目标日期之后。
              </p>
            </div>
          </div>

          <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-8">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">你计划哪天背完第一遍？</h2>
              <p className="text-sm leading-6 text-slate-600">
                如果你暂时不改，系统会默认从今天起按 30 天生成首轮计划。
              </p>
            </div>

            <div className="rounded-[22px] border border-cyan-100 bg-cyan-50/60 p-2 sm:rounded-[24px] sm:p-3">
              <Calendar
                mode="single"
                selected={pendingTargetDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(startOfDay(date));
                  }
                }}
                disabled={(date) => date < today}
                className="w-full rounded-2xl bg-transparent p-0"
                classNames={{
                  root: "w-full",
                  month: "w-full",
                  months: "w-full",
                  table: "w-full",
                  month_caption: "flex h-10 w-full items-center justify-center px-10",
                  weekday: "flex-1 rounded-md text-[0.75rem] font-normal text-muted-foreground select-none sm:text-[0.8rem]",
                }}
              />
            </div>

            {warning ? (
              <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <div className="space-y-1 text-sm leading-6">
                  <p className="font-medium">任务偏重提醒</p>
                  <p>{warning}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
                当前节奏比较平稳，适合作为第一版首轮计划。
              </div>
            )}

            <DialogFooter className="sticky bottom-0 flex-col gap-3 border-t border-cyan-100/80 bg-white/96 pt-4 sm:static sm:border-0 sm:bg-transparent sm:pt-0">
              <Button
                size="lg"
                className="h-12 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 text-sm font-semibold text-white shadow-lg shadow-cyan-100/80 hover:from-teal-600 hover:via-cyan-600 hover:to-sky-600"
                onClick={() => {
                  const nextTargetDate = toDateInputValue(pendingTargetDate);
                  setTargetDate(nextTargetDate);
                  initializePlan(nextTargetDate);
                }}
              >
                生成我的学习计划
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-cyan-200 bg-white text-sm font-semibold text-slate-700 hover:bg-cyan-50"
                onClick={() => {
                  const fallbackDate = toDateInputValue(defaultTargetDate);
                  setSelectedDate(defaultTargetDate);
                  setTargetDate(fallbackDate);
                  initializePlan(fallbackDate);
                }}
              >
                使用默认 30 天计划
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
