import { addDays, format, parseISO } from "date-fns";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  generatePlan,
  getDailyPlan as getScheduledDailyPlan,
  getTodayPlan as getScheduledTodayPlan,
} from "@/utils/scheduler";
import type {
  DailyPlan,
  ISODateString,
  ReviewIntervalDay,
  ReviewQueueItem,
  UserPlan,
} from "@/types";

const DATE_FORMAT = "yyyy-MM-dd";

interface PlanStoreState {
  hasCompletedOnboarding: boolean;
  isRestoringFromCloud: boolean;
  targetDate: ISODateString | null;
  plan: UserPlan | null;
}

interface PlanStoreActions {
  completeOnboarding: () => void;
  setCloudRestoreState: (isRestoringFromCloud: boolean) => void;
  setTargetDate: (targetDate: ISODateString | null) => void;
  initializePlan: (targetDate?: ISODateString | null) => UserPlan;
  hydratePlan: (plan: UserPlan) => void;
  regeneratePlan: () => UserPlan | null;
  resetPlan: () => void;
  getPlanForDate: (date: Date | ISODateString) => DailyPlan | null;
  getTodayPlan: (today?: Date | ISODateString) => DailyPlan | null;
  completeQuestion: (date: ISODateString, questionId: number, taskType: "new" | "review") => void;
  moveNextNewQuestionToToday: (date: ISODateString) => number | null;
}

export type PlanStore = PlanStoreState & PlanStoreActions;

function markQuestionAsCompleted(plan: UserPlan, date: ISODateString, questionId: number, taskType: "new" | "review") {
  const nextDailyPlans = plan.dailyPlans.map((dailyPlan) => {
    if (dailyPlan.date !== date) {
      return dailyPlan;
    }

    const bucket =
      taskType === "new" ? dailyPlan.newQuestions : dailyPlan.reviewQuestions;

    if (
      !bucket.questionIds.includes(questionId) ||
      bucket.completedQuestionIds.includes(questionId)
    ) {
      return dailyPlan;
    }

    const nextBucket = {
      ...bucket,
      completedQuestionIds: [...bucket.completedQuestionIds, questionId],
    };

    const nextDailyPlan =
      taskType === "new"
        ? { ...dailyPlan, newQuestions: nextBucket }
        : { ...dailyPlan, reviewQuestions: nextBucket };

    return {
      ...nextDailyPlan,
      isCompleted:
        nextDailyPlan.newQuestions.completedQuestionIds.length ===
          nextDailyPlan.newQuestions.questionIds.length &&
        nextDailyPlan.reviewQuestions.completedQuestionIds.length ===
          nextDailyPlan.reviewQuestions.questionIds.length,
    };
  });

  return {
    ...plan,
    dailyPlans: nextDailyPlans,
  };
}

function toISODateString(date: Date) {
  return format(date, DATE_FORMAT);
}

function removeQuestionId(list: number[], questionId: number) {
  return list.filter((value) => value !== questionId);
}

function getTargetQuestionIds(questionIds: number[], targetQuestionIds?: number[]) {
  return targetQuestionIds ?? questionIds;
}

function createReviewQueueEntries(
  questionId: number,
  sourceDate: ISODateString,
  reviewIntervals: readonly ReviewIntervalDay[],
): ReviewQueueItem[] {
  return reviewIntervals.map((intervalDay) => ({
    questionId,
    sourceDate,
    dueDate: toISODateString(addDays(parseISO(sourceDate), intervalDay)),
    intervalDay,
    status: "review",
  }));
}

function moveNextQuestionToDate(plan: UserPlan, date: ISODateString) {
  const targetIndex = plan.dailyPlans.findIndex((dailyPlan) => dailyPlan.date === date);

  if (targetIndex === -1) {
    return null;
  }

  const sourceIndex = plan.dailyPlans.findIndex(
    (dailyPlan, index) => index > targetIndex && dailyPlan.newQuestions.questionIds.length > 0,
  );

  if (sourceIndex === -1) {
    return null;
  }

  const sourcePlan = plan.dailyPlans[sourceIndex];
  const targetPlan = plan.dailyPlans[targetIndex];
  const questionId = sourcePlan.newQuestions.questionIds[0];

  if (!questionId) {
    return null;
  }

  const nextDailyPlans = plan.dailyPlans.map((dailyPlan) => {
    if (dailyPlan.date === sourcePlan.date) {
      return {
        ...dailyPlan,
        newQuestions: {
          ...dailyPlan.newQuestions,
          questionIds: dailyPlan.newQuestions.questionIds.slice(1),
          targetQuestionIds: removeQuestionId(
            getTargetQuestionIds(
              dailyPlan.newQuestions.questionIds,
              dailyPlan.newQuestions.targetQuestionIds,
            ),
            questionId,
          ),
          completedQuestionIds: removeQuestionId(
            dailyPlan.newQuestions.completedQuestionIds,
            questionId,
          ),
        },
      };
    }

    if (dailyPlan.date === targetPlan.date) {
      return {
        ...dailyPlan,
        newQuestions: {
          ...dailyPlan.newQuestions,
          questionIds: [...dailyPlan.newQuestions.questionIds, questionId],
          targetQuestionIds: getTargetQuestionIds(
            dailyPlan.newQuestions.questionIds,
            dailyPlan.newQuestions.targetQuestionIds,
          ),
        },
      };
    }

    return dailyPlan;
  }).map((dailyPlan) => {
    const reviewDatesToRemove = plan.reviewIntervals.map((intervalDay) =>
      toISODateString(addDays(parseISO(sourcePlan.date), intervalDay)),
    );
    const reviewDatesToAdd = plan.reviewIntervals.map((intervalDay) =>
      toISODateString(addDays(parseISO(targetPlan.date), intervalDay)),
    );

    if (reviewDatesToRemove.includes(dailyPlan.date)) {
      return {
        ...dailyPlan,
        reviewQuestions: {
          ...dailyPlan.reviewQuestions,
          questionIds: removeQuestionId(dailyPlan.reviewQuestions.questionIds, questionId),
          completedQuestionIds: removeQuestionId(
            dailyPlan.reviewQuestions.completedQuestionIds,
            questionId,
          ),
        },
      };
    }

    if (reviewDatesToAdd.includes(dailyPlan.date)) {
      return {
        ...dailyPlan,
        reviewQuestions: {
          ...dailyPlan.reviewQuestions,
          questionIds: dailyPlan.reviewQuestions.questionIds.includes(questionId)
            ? dailyPlan.reviewQuestions.questionIds
            : [...dailyPlan.reviewQuestions.questionIds, questionId],
          completedQuestionIds: removeQuestionId(
            dailyPlan.reviewQuestions.completedQuestionIds,
            questionId,
          ),
        },
      };
    }

    return dailyPlan;
  }).map((dailyPlan) => ({
    ...dailyPlan,
    isCompleted:
      dailyPlan.newQuestions.questionIds.length > 0 &&
      dailyPlan.newQuestions.completedQuestionIds.length ===
        dailyPlan.newQuestions.questionIds.length &&
      dailyPlan.reviewQuestions.completedQuestionIds.length ===
        dailyPlan.reviewQuestions.questionIds.length,
  }));

  const nextReviewQueue = [
    ...plan.reviewQueue.filter((item) => item.questionId !== questionId),
    ...createReviewQueueEntries(questionId, targetPlan.date, plan.reviewIntervals),
  ];

  return {
    questionId,
    plan: {
      ...plan,
      dailyPlans: nextDailyPlans,
      reviewQueue: nextReviewQueue,
    },
  };
}

export const usePlanStore = create<PlanStore>()(
  persist(
    (set, get) => ({
      hasCompletedOnboarding: false,
      isRestoringFromCloud: true,
      targetDate: null,
      plan: null,

      completeOnboarding: () => {
        set({ hasCompletedOnboarding: true });
      },

      setCloudRestoreState: (isRestoringFromCloud) => {
        set({ isRestoringFromCloud });
      },

      setTargetDate: (targetDate) => {
        set({ targetDate });
      },

      initializePlan: (targetDate) => {
        const nextTargetDate = targetDate ?? get().targetDate;
        const nextPlan = generatePlan({ targetDate: nextTargetDate });

        set({
          hasCompletedOnboarding: true,
          isRestoringFromCloud: false,
          targetDate: nextPlan.targetDate,
          plan: nextPlan,
        });

        return nextPlan;
      },

      hydratePlan: (plan) => {
        set({
          hasCompletedOnboarding: true,
          isRestoringFromCloud: false,
          targetDate: plan.targetDate,
          plan,
        });
      },

      regeneratePlan: () => {
        const currentTargetDate = get().targetDate;

        if (!currentTargetDate) {
          return null;
        }

        return get().initializePlan(currentTargetDate);
      },

      resetPlan: () => {
        set({
          hasCompletedOnboarding: false,
          isRestoringFromCloud: false,
          targetDate: null,
          plan: null,
        });
      },

      getPlanForDate: (date) => {
        const { plan } = get();
        return plan ? getScheduledDailyPlan(plan, date) : null;
      },

      getTodayPlan: (today) => {
        const { plan } = get();
        return plan ? getScheduledTodayPlan(plan, today) : null;
      },

      completeQuestion: (date, questionId, taskType) => {
        const { plan } = get();

        if (!plan) {
          return;
        }

        set({
          plan: markQuestionAsCompleted(plan, date, questionId, taskType),
        });
      },

      moveNextNewQuestionToToday: (date) => {
        const { plan } = get();

        if (!plan) {
          return null;
        }

        const moved = moveNextQuestionToDate(plan, date);

        if (!moved) {
          return null;
        }

        set({ plan: moved.plan });
        return moved.questionId;
      },
    }),
    {
      name: "quizmem-plan-store",
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        isRestoringFromCloud: state.isRestoringFromCloud,
        targetDate: state.targetDate,
        plan: state.plan,
      }),
    },
  ),
);
