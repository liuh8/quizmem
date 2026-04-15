export type ISODateString = string;

export const REVIEW_INTERVALS_DAYS = [1, 2, 4, 7, 15] as const;

export type ReviewIntervalDay = (typeof REVIEW_INTERVALS_DAYS)[number];

export const PLAN_TASK_TYPES = ["new", "review"] as const;

export type PlanTaskType = (typeof PLAN_TASK_TYPES)[number];

export const QUESTION_PROGRESS_STATUSES = ["new", "review", "mastered"] as const;

export type QuestionProgressStatus = (typeof QUESTION_PROGRESS_STATUSES)[number];

export interface ReviewQueueItem {
  questionId: number;
  sourceDate: ISODateString;
  dueDate: ISODateString;
  intervalDay: ReviewIntervalDay;
  status: QuestionProgressStatus;
}

export interface DailyTaskBucket {
  type: PlanTaskType;
  questionIds: number[];
  targetQuestionIds?: number[];
  completedQuestionIds: number[];
}

export interface DailyPlan {
  date: ISODateString;
  newQuestions: DailyTaskBucket;
  reviewQuestions: DailyTaskBucket;
  isCompleted: boolean;
}

export interface UserPlanSummary {
  totalQuestions: number;
  firstPassPlanDays: number;
  generatedPlanDays: number;
  totalNewQuestionCount: number;
  totalReviewQuestionCount: number;
  maxNewQuestionsPerDay: number;
  overloadWarning: string | null;
}

export interface UserPlan {
  startDate: ISODateString;
  targetDate: ISODateString;
  reviewIntervals: readonly ReviewIntervalDay[];
  reviewQueue: ReviewQueueItem[];
  dailyPlans: DailyPlan[];
  summary: UserPlanSummary;
}
