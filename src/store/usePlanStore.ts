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

function toISODateString(date: Date) {
  return format(date, DATE_FORMAT);
}

function createTaskBucket(type: "new" | "review") {
  return {
    type,
    questionIds: [] as number[],
    targetQuestionIds: [] as number[],
    completedQuestionIds: [] as number[],
  };
}

function createDailyPlan(date: ISODateString): DailyPlan {
  return {
    date,
    newQuestions: createTaskBucket("new"),
    reviewQuestions: createTaskBucket("review"),
    isCompleted: false,
  };
}

function uniqueQuestionIds(questionIds: number[]) {
  return [...new Set(questionIds)];
}

function removeQuestionId(list: number[], questionId: number) {
  return list.filter((value) => value !== questionId);
}

function getTargetQuestionIds(questionIds: number[], targetQuestionIds?: number[]) {
  return targetQuestionIds ?? questionIds;
}

function syncDailyPlanCompletion(dailyPlan: DailyPlan) {
  return {
    ...dailyPlan,
    isCompleted:
      dailyPlan.newQuestions.completedQuestionIds.length ===
        dailyPlan.newQuestions.questionIds.length &&
      dailyPlan.reviewQuestions.completedQuestionIds.length ===
        dailyPlan.reviewQuestions.questionIds.length,
  };
}

function syncPlanSummary(plan: UserPlan) {
  return {
    ...plan,
    summary: {
      ...plan.summary,
      generatedPlanDays: plan.dailyPlans.length,
      totalReviewQuestionCount: plan.reviewQueue.length,
      maxNewQuestionsPerDay: Math.max(
        ...plan.dailyPlans.map((dailyPlan) => dailyPlan.newQuestions.questionIds.length),
        0,
      ),
    },
  };
}

function ensureDailyPlansExist(
  dailyPlans: DailyPlan[],
  dates: ISODateString[],
) {
  const existingDates = new Set(dailyPlans.map((dailyPlan) => dailyPlan.date));
  const nextDailyPlans = [...dailyPlans];

  dates.forEach((date) => {
    if (!existingDates.has(date)) {
      existingDates.add(date);
      nextDailyPlans.push(createDailyPlan(date));
    }
  });

  return nextDailyPlans.sort((left, right) => left.date.localeCompare(right.date));
}

function findQuestionPlanDate(
  plan: UserPlan,
  questionId: number,
  taskType: "new" | "review",
  preferredDate?: ISODateString,
) {
  const matchedPreferred = preferredDate
    ? plan.dailyPlans.find((dailyPlan) => {
        const bucket = taskType === "new" ? dailyPlan.newQuestions : dailyPlan.reviewQuestions;
        return dailyPlan.date === preferredDate && bucket.questionIds.includes(questionId);
      })
    : null;

  if (matchedPreferred) {
    return matchedPreferred.date;
  }

  return (
    plan.dailyPlans.find((dailyPlan) => {
      const bucket = taskType === "new" ? dailyPlan.newQuestions : dailyPlan.reviewQuestions;
      return (
        bucket.questionIds.includes(questionId) &&
        !bucket.completedQuestionIds.includes(questionId)
      );
    })?.date ?? null
  );
}

function shiftQuestionReviewSchedule(
  plan: UserPlan,
  questionId: number,
  sourceDate: ISODateString,
  actualDate: ISODateString,
) {
  if (sourceDate === actualDate) {
    return plan;
  }

  const allReviewDates = [
    ...plan.reviewIntervals.map((intervalDay) =>
      toISODateString(addDays(parseISO(sourceDate), intervalDay)),
    ),
    ...plan.reviewIntervals.map((intervalDay) =>
      toISODateString(addDays(parseISO(actualDate), intervalDay)),
    ),
  ];

  const normalizedDailyPlans = ensureDailyPlansExist(plan.dailyPlans, allReviewDates);

  const nextDailyPlans = normalizedDailyPlans.map((dailyPlan) => {
    const oldDueDates = plan.reviewIntervals.map((intervalDay) =>
      toISODateString(addDays(parseISO(sourceDate), intervalDay)),
    );
    const newDueDates = plan.reviewIntervals.map((intervalDay) =>
      toISODateString(addDays(parseISO(actualDate), intervalDay)),
    );

    let reviewQuestions = dailyPlan.reviewQuestions;

    if (oldDueDates.includes(dailyPlan.date)) {
      reviewQuestions = {
        ...reviewQuestions,
        questionIds: removeQuestionId(reviewQuestions.questionIds, questionId),
        completedQuestionIds: removeQuestionId(reviewQuestions.completedQuestionIds, questionId),
      };
    }

    if (newDueDates.includes(dailyPlan.date)) {
      reviewQuestions = {
        ...reviewQuestions,
        questionIds: uniqueQuestionIds([...reviewQuestions.questionIds, questionId]),
        completedQuestionIds: removeQuestionId(reviewQuestions.completedQuestionIds, questionId),
      };
    }

    return syncDailyPlanCompletion({
      ...dailyPlan,
      reviewQuestions,
    });
  });

  const nextReviewQueue = [
    ...plan.reviewQueue.filter((item) => item.questionId !== questionId),
    ...createReviewQueueEntries(questionId, actualDate, plan.reviewIntervals),
  ];

  return syncPlanSummary({
    ...plan,
    dailyPlans: nextDailyPlans,
    reviewQueue: nextReviewQueue,
  });
}

function markQuestionAsCompleted(
  plan: UserPlan,
  actualDate: ISODateString,
  questionId: number,
  taskType: "new" | "review",
) {
  if (taskType === "new") {
    const sourceDate = findQuestionPlanDate(plan, questionId, "new");

    if (!sourceDate) {
      return plan;
    }

    const alignedPlan = shiftQuestionReviewSchedule(plan, questionId, sourceDate, actualDate);
    const completionDate = findQuestionPlanDate(
      alignedPlan,
      questionId,
      "new",
      sourceDate,
    );

    if (!completionDate) {
      return alignedPlan;
    }

    const nextDailyPlans = alignedPlan.dailyPlans.map((dailyPlan) => {
      if (dailyPlan.date !== completionDate) {
        return dailyPlan;
      }

      if (
        !dailyPlan.newQuestions.questionIds.includes(questionId) ||
        dailyPlan.newQuestions.completedQuestionIds.includes(questionId)
      ) {
        return dailyPlan;
      }

      return syncDailyPlanCompletion({
        ...dailyPlan,
        newQuestions: {
          ...dailyPlan.newQuestions,
          completedQuestionIds: uniqueQuestionIds([
            ...dailyPlan.newQuestions.completedQuestionIds,
            questionId,
          ]),
        },
      });
    });

    return syncPlanSummary({
      ...alignedPlan,
      dailyPlans: nextDailyPlans,
    });
  }

  const reviewDate = findQuestionPlanDate(plan, questionId, "review", actualDate);

  if (!reviewDate) {
    return plan;
  }

  const nextDailyPlans = plan.dailyPlans.map((dailyPlan) => {
    if (dailyPlan.date !== reviewDate) {
      return dailyPlan;
    }

    if (
      !dailyPlan.reviewQuestions.questionIds.includes(questionId) ||
      dailyPlan.reviewQuestions.completedQuestionIds.includes(questionId)
    ) {
      return dailyPlan;
    }

    return syncDailyPlanCompletion({
      ...dailyPlan,
      reviewQuestions: {
        ...dailyPlan.reviewQuestions,
        completedQuestionIds: uniqueQuestionIds([
          ...dailyPlan.reviewQuestions.completedQuestionIds,
          questionId,
        ]),
      },
    });
  });

  return syncPlanSummary({
    ...plan,
    dailyPlans: nextDailyPlans,
  });
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
  }).map((dailyPlan) => syncDailyPlanCompletion(dailyPlan));

  const nextReviewQueue = [
    ...plan.reviewQueue.filter((item) => item.questionId !== questionId),
    ...createReviewQueueEntries(questionId, targetPlan.date, plan.reviewIntervals),
  ];

  return {
    questionId,
    plan: syncPlanSummary({
      ...plan,
      dailyPlans: nextDailyPlans,
      reviewQueue: nextReviewQueue,
    }),
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
