import type { QuestionType } from "@/types/question";
import type { ISODateString } from "@/types/plan";

export const PRACTICE_MODES = ["daily", "free", "timed", "wrong_book"] as const;

export type PracticeMode = (typeof PRACTICE_MODES)[number];

export interface AnswerRecord {
  questionId: number;
  questionType: QuestionType;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  answeredAt: ISODateString;
}

export interface PracticeSessionQuestion {
  questionId: number;
  source: "daily_new" | "daily_review" | "random" | "wrong_book";
}

export interface PracticeSession {
  mode: PracticeMode;
  questionIds: number[];
  currentQuestionIndex: number;
  answers: AnswerRecord[];
  startedAt: ISODateString | null;
  finishedAt: ISODateString | null;
  timeLimitSeconds?: number;
}

export interface WrongBookItem {
  userId?: string;
  questionId: number;
  addedAt: ISODateString;
  lastWrongAt: ISODateString;
  wrongCount: number;
  isResolved: boolean;
}

export interface FavoriteItem {
  userId?: string;
  questionId: number;
  addedAt: ISODateString;
  lastReviewedAt: ISODateString | null;
}
