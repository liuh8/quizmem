import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isAfter,
  parseISO,
  startOfDay,
} from "date-fns";

import { getQuestionBank } from "@/lib/questions";
import {
  REVIEW_INTERVALS_DAYS,
  type DailyPlan,
  type ISODateString,
  type Question,
  type ReviewIntervalDay,
  type ReviewQueueItem,
  type UserPlan,
} from "@/types";
import type { PersistedDailyPlanSnapshot } from "@/lib/supabase/queries";

const DATE_FORMAT = "yyyy-MM-dd";
const DEFAULT_FIRST_PASS_DAYS = 30;
const OVERLOAD_NEW_QUESTION_THRESHOLD = 30;

export interface GeneratePlanOptions {
  startDate?: Date | ISODateString;
  targetDate?: Date | ISODateString | null;
  reviewIntervals?: readonly ReviewIntervalDay[];
  defaultFirstPassDays?: number;
}

function toStartOfDay(value: Date | ISODateString) {
  return startOfDay(typeof value === "string" ? parseISO(value) : value);
}

function toISODateString(value: Date) {
  return format(value, DATE_FORMAT);
}

function createTaskBucket(type: "new" | "review") {
  return {
    type,
    questionIds: [] as number[],
    targetQuestionIds: [] as number[],
    completedQuestionIds: [] as number[],
  };
}

function createDailyPlan(date: Date): DailyPlan {
  return {
    date: toISODateString(date),
    newQuestions: createTaskBucket("new"),
    reviewQuestions: createTaskBucket("review"),
    isCompleted: false,
  };
}

function uniqueQuestionIds(questionIds: number[]) {
  return [...new Set(questionIds)];
}

function ensureDailyPlan(planMap: Map<ISODateString, DailyPlan>, date: Date) {
  const key = toISODateString(date);
  const existing = planMap.get(key);

  if (existing) {
    return existing;
  }

  const created = createDailyPlan(date);
  planMap.set(key, created);
  return created;
}

function distributeQuestionIds(questionIds: number[], firstPassDays: number) {
  const baseLoad = Math.floor(questionIds.length / firstPassDays);
  const remainder = questionIds.length % firstPassDays;

  return Array.from({ length: firstPassDays }, (_, index) => {
    const extra = index < remainder ? 1 : 0;
    return baseLoad + extra;
  });
}

function buildOverloadWarning(totalQuestions: number, firstPassDays: number, maxNewPerDay: number) {
  if (firstPassDays <= 0) {
    return "你选择的首轮学完日期早于今天，系统已按今天开始重新生成计划，任务压力会非常高。";
  }

  if (maxNewPerDay > OVERLOAD_NEW_QUESTION_THRESHOLD) {
    return `按当前日期计算，你每天最多需要学习 ${maxNewPerDay} 道新题。任务较重，但系统仍会按你的目标继续排计划。`;
  }

  if (firstPassDays < 7 && totalQuestions >= 300) {
    return "距离首轮学完日期已经很近，系统会继续生成计划，但建议你预留更多天数以降低每日负担。";
  }

  return null;
}

function sortDailyPlans(planMap: Map<ISODateString, DailyPlan>) {
  return [...planMap.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function generatePlanFromQuestions(
  questions: Question[],
  options: GeneratePlanOptions = {},
): UserPlan {
  const reviewIntervals = options.reviewIntervals ?? REVIEW_INTERVALS_DAYS;
  const startDate = toStartOfDay(options.startDate ?? new Date());
  const requestedTargetDate = options.targetDate
    ? toStartOfDay(options.targetDate)
    : addDays(startDate, (options.defaultFirstPassDays ?? DEFAULT_FIRST_PASS_DAYS) - 1);

  const normalizedTargetDate = isAfter(startDate, requestedTargetDate)
    ? startDate
    : requestedTargetDate;

  const firstPassPlanDays =
    differenceInCalendarDays(normalizedTargetDate, startDate) + 1;

  const lastReviewDate = addDays(
    normalizedTargetDate,
    reviewIntervals[reviewIntervals.length - 1] ?? 0,
  );

  const planMap = new Map<ISODateString, DailyPlan>();

  eachDayOfInterval({ start: startDate, end: lastReviewDate }).forEach((date) => {
    planMap.set(toISODateString(date), createDailyPlan(date));
  });

  const questionIds = questions.map((question) => question.id);
  const newQuestionLoads = distributeQuestionIds(questionIds, firstPassPlanDays);
  const reviewQueue: ReviewQueueItem[] = [];

  let cursor = 0;

  newQuestionLoads.forEach((dailyLoad, dayIndex) => {
    const currentDate = addDays(startDate, dayIndex);
    const currentPlan = ensureDailyPlan(planMap, currentDate);
    const dayQuestionIds = questionIds.slice(cursor, cursor + dailyLoad);

    cursor += dailyLoad;
    currentPlan.newQuestions.questionIds.push(...dayQuestionIds);
    currentPlan.newQuestions.targetQuestionIds?.push(...dayQuestionIds);

    dayQuestionIds.forEach((questionId) => {
      reviewIntervals.forEach((intervalDay) => {
        const dueDate = addDays(currentDate, intervalDay);
        const duePlan = ensureDailyPlan(planMap, dueDate);

        if (!duePlan.reviewQuestions.questionIds.includes(questionId)) {
          duePlan.reviewQuestions.questionIds.push(questionId);
        }

        reviewQueue.push({
          questionId,
          sourceDate: currentPlan.date,
          dueDate: duePlan.date,
          intervalDay,
          status: "review",
        });
      });
    });
  });

  const dailyPlans = sortDailyPlans(planMap);
  const maxNewQuestionsPerDay = Math.max(...dailyPlans.map((plan) => plan.newQuestions.questionIds.length), 0);
  const overloadWarning = buildOverloadWarning(
    questions.length,
    differenceInCalendarDays(requestedTargetDate, startDate) + 1,
    maxNewQuestionsPerDay,
  );

  return {
    startDate: toISODateString(startDate),
    targetDate: toISODateString(normalizedTargetDate),
    reviewIntervals,
    reviewQueue,
    dailyPlans,
    summary: {
      totalQuestions: questions.length,
      firstPassPlanDays,
      generatedPlanDays: dailyPlans.length,
      totalNewQuestionCount: questions.length,
      totalReviewQuestionCount: reviewQueue.length,
      maxNewQuestionsPerDay,
      overloadWarning,
    },
  };
}

export function generatePlan(options: GeneratePlanOptions = {}) {
  return generatePlanFromQuestions(getQuestionBank(), options);
}

export function getDailyPlan(userPlan: UserPlan, date: Date | ISODateString) {
  const key = toISODateString(toStartOfDay(date));
  return userPlan.dailyPlans.find((plan) => plan.date === key) ?? null;
}

export function getTodayPlan(userPlan: UserPlan, today: Date | ISODateString = new Date()) {
  const todayDate = toStartOfDay(today);
  const todayKey = toISODateString(todayDate);
  const scheduledTodayPlan = getDailyPlan(userPlan, todayDate) ?? createDailyPlan(todayDate);
  const learnedQuestionIds = new Set(
    userPlan.dailyPlans.flatMap((dailyPlan) => dailyPlan.newQuestions.completedQuestionIds),
  );
  const orderedFirstPassQuestionIds = uniqueQuestionIds(
    userPlan.dailyPlans
      .filter((dailyPlan) => dailyPlan.date <= userPlan.targetDate)
      .flatMap((dailyPlan) => dailyPlan.newQuestions.questionIds),
  );
  const firstUnfinishedQuestionIndex = orderedFirstPassQuestionIds.findIndex(
    (questionId) => !learnedQuestionIds.has(questionId),
  );
  const remainingNewQuestionCount = orderedFirstPassQuestionIds.filter(
    (questionId) => !learnedQuestionIds.has(questionId),
  ).length;
  const remainingFirstPassDays = Math.max(
    differenceInCalendarDays(parseISO(userPlan.targetDate), todayDate) + 1,
    1,
  );
  const todayNewTargetCount =
    remainingNewQuestionCount === 0
      ? 0
      : Math.min(
          remainingNewQuestionCount,
          Math.ceil(remainingNewQuestionCount / remainingFirstPassDays),
        );
  const todayNewTargetQuestionIds =
    firstUnfinishedQuestionIndex === -1
      ? []
      : orderedFirstPassQuestionIds.slice(
          firstUnfinishedQuestionIndex,
          firstUnfinishedQuestionIndex + todayNewTargetCount,
        );
  const extraNewQuestionIds = scheduledTodayPlan.newQuestions.questionIds.filter(
    (questionId) => !todayNewTargetQuestionIds.includes(questionId),
  );
  const todayNewQuestionIds = uniqueQuestionIds([
    ...todayNewTargetQuestionIds,
    ...extraNewQuestionIds,
  ]);
  const todayCompletedNewQuestionIds = uniqueQuestionIds(
    scheduledTodayPlan.newQuestions.completedQuestionIds.filter((questionId) =>
      todayNewQuestionIds.includes(questionId),
    ),
  );

  const overdueReviewQuestionIds = uniqueQuestionIds(
    userPlan.dailyPlans
      .filter((dailyPlan) => dailyPlan.date < todayKey)
      .flatMap((dailyPlan) =>
        dailyPlan.reviewQuestions.questionIds.filter(
          (questionId) =>
            learnedQuestionIds.has(questionId) &&
            !dailyPlan.reviewQuestions.completedQuestionIds.includes(questionId),
        ),
      ),
  );

  const todayReviewQuestionIds = uniqueQuestionIds([
    ...overdueReviewQuestionIds,
    ...scheduledTodayPlan.reviewQuestions.questionIds.filter((questionId) =>
      learnedQuestionIds.has(questionId),
    ),
  ]);

  return {
    ...scheduledTodayPlan,
    newQuestions: {
      ...scheduledTodayPlan.newQuestions,
      questionIds: todayNewQuestionIds,
      targetQuestionIds: todayNewTargetQuestionIds,
      completedQuestionIds: todayCompletedNewQuestionIds,
    },
    reviewQuestions: {
      ...scheduledTodayPlan.reviewQuestions,
      questionIds: todayReviewQuestionIds,
    },
  };
}

function buildReviewQueueFromDailyPlans(
  dailyPlans: DailyPlan[],
  reviewIntervals: readonly ReviewIntervalDay[],
): ReviewQueueItem[] {
  const sourceDatesByQuestionId = new Map<number, ISODateString>();
  const reviewQuestionIdsByDate = new Map<ISODateString, Set<number>>();

  dailyPlans.forEach((dailyPlan) => {
    reviewQuestionIdsByDate.set(dailyPlan.date, new Set(dailyPlan.reviewQuestions.questionIds));

    dailyPlan.newQuestions.questionIds.forEach((questionId) => {
      if (!sourceDatesByQuestionId.has(questionId)) {
        sourceDatesByQuestionId.set(questionId, dailyPlan.date);
      }
    });
  });

  const reviewQueue: ReviewQueueItem[] = [];

  sourceDatesByQuestionId.forEach((sourceDate, questionId) => {
    reviewIntervals.forEach((intervalDay) => {
      const dueDate = toISODateString(addDays(parseISO(sourceDate), intervalDay));
      const dueQuestionIds = reviewQuestionIdsByDate.get(dueDate);

      if (!dueQuestionIds?.has(questionId)) {
        return;
      }

      reviewQueue.push({
        questionId,
        sourceDate,
        dueDate,
        intervalDay,
        status: "review",
      });
    });
  });

  return reviewQueue;
}

export function restorePlanFromSnapshots(params: {
  targetDate: ISODateString;
  dailyPlans: PersistedDailyPlanSnapshot[];
  startDate?: ISODateString;
  reviewIntervals?: readonly ReviewIntervalDay[];
}): UserPlan {
  const reviewIntervals = params.reviewIntervals ?? REVIEW_INTERVALS_DAYS;
  const startDate =
    params.startDate ??
    params.dailyPlans
      .filter((dailyPlan) => dailyPlan.newQuestionIds.length > 0)
      .map((dailyPlan) => dailyPlan.date)
      .sort((left, right) => left.localeCompare(right))[0] ??
    params.dailyPlans
      .map((dailyPlan) => dailyPlan.date)
      .sort((left, right) => left.localeCompare(right))[0] ??
    params.targetDate;

  const normalizedStartDate =
    startDate ??
    params.targetDate;

  const basePlan = generatePlan({
    startDate: normalizedStartDate,
    targetDate: params.targetDate,
    reviewIntervals,
  });

  const snapshotMap = new Map(params.dailyPlans.map((dailyPlan) => [dailyPlan.date, dailyPlan]));

  const restoredDailyPlans = basePlan.dailyPlans.map((dailyPlan) => {
    const snapshot = snapshotMap.get(dailyPlan.date);

    if (!snapshot) {
      return dailyPlan;
    }

    const restoredTargetCount =
      dailyPlan.newQuestions.targetQuestionIds?.length ?? snapshot.newQuestionIds.length;
    const restoredTargetQuestionIds = snapshot.newQuestionIds.slice(0, restoredTargetCount);

    return {
      ...dailyPlan,
      newQuestions: {
        ...dailyPlan.newQuestions,
        questionIds: snapshot.newQuestionIds,
        targetQuestionIds: restoredTargetQuestionIds,
        completedQuestionIds: snapshot.completedNewQuestionIds,
      },
      reviewQuestions: {
        ...dailyPlan.reviewQuestions,
        questionIds: snapshot.reviewQuestionIds,
        completedQuestionIds: snapshot.completedReviewQuestionIds,
      },
      isCompleted: snapshot.isCompleted,
    };
  });

  const reviewQueue = buildReviewQueueFromDailyPlans(restoredDailyPlans, reviewIntervals);
  const maxNewQuestionsPerDay = Math.max(
    ...restoredDailyPlans.map((dailyPlan) => dailyPlan.newQuestions.questionIds.length),
    0,
  );

  return {
    ...basePlan,
    reviewIntervals,
    dailyPlans: restoredDailyPlans,
    reviewQueue,
    summary: {
      ...basePlan.summary,
      generatedPlanDays: restoredDailyPlans.length,
      totalReviewQuestionCount: reviewQueue.length,
      maxNewQuestionsPerDay,
    },
  };
}

export function inferTargetDateFromSnapshots(
  dailyPlans: PersistedDailyPlanSnapshot[],
): ISODateString | null {
  const candidate = [...dailyPlans]
    .filter((dailyPlan) => dailyPlan.newQuestionIds.length > 0)
    .sort((left, right) => right.date.localeCompare(left.date))[0];

  return candidate?.date ?? null;
}
