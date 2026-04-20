import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PracticeTab = "new" | "review";
type AnswerState = Record<number, string>;
type SubmissionState = Record<number, boolean>;
type ExtraLearningState = "idle" | "prompt" | "active";

export interface DailyPracticeSession {
  activeTab: PracticeTab;
  indices: Record<PracticeTab, number>;
  answers: Record<PracticeTab, AnswerState>;
  submitted: Record<PracticeTab, SubmissionState>;
  extraLearningState: ExtraLearningState;
}

interface FillBlankPreviewSession {
  index: number;
  answers: Record<number, string>;
  submitted: Record<number, boolean>;
}

interface SessionStoreState {
  dailyPracticeByDate: Record<string, DailyPracticeSession>;
  fillBlankPreview: FillBlankPreviewSession;
}

interface SessionStoreActions {
  getDailyPracticeSession: (date: string) => DailyPracticeSession;
  patchDailyPracticeSession: (
    date: string,
    patch:
      | Partial<DailyPracticeSession>
      | ((current: DailyPracticeSession) => Partial<DailyPracticeSession>),
  ) => void;
  resetDailyPracticeSession: (date: string) => void;
  resetAllDailyPracticeSessions: () => void;
  hydrateDailyPracticeSessions: (sessions: Record<string, DailyPracticeSession>) => void;
  getFillBlankPreviewSession: () => FillBlankPreviewSession;
  patchFillBlankPreviewSession: (
    patch:
      | Partial<FillBlankPreviewSession>
      | ((current: FillBlankPreviewSession) => Partial<FillBlankPreviewSession>),
  ) => void;
}

export type SessionStore = SessionStoreState & SessionStoreActions;

export function createEmptyDailyPracticeSession(): DailyPracticeSession {
  return {
    activeTab: "new",
    indices: { new: 0, review: 0 },
    answers: { new: {}, review: {} },
    submitted: { new: {}, review: {} },
    extraLearningState: "idle",
  };
}

export function createEmptyFillBlankPreviewSession(): FillBlankPreviewSession {
  return {
    index: 0,
    answers: {},
    submitted: {},
  };
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      dailyPracticeByDate: {},
      fillBlankPreview: createEmptyFillBlankPreviewSession(),

      getDailyPracticeSession: (date) =>
        get().dailyPracticeByDate[date] ?? createEmptyDailyPracticeSession(),

      patchDailyPracticeSession: (date, patch) => {
        const current = get().dailyPracticeByDate[date] ?? createEmptyDailyPracticeSession();
        const nextPatch = typeof patch === "function" ? patch(current) : patch;

        set((state) => ({
          dailyPracticeByDate: {
            ...state.dailyPracticeByDate,
            [date]: {
              ...current,
              ...nextPatch,
            },
          },
        }));
      },

      resetDailyPracticeSession: (date) => {
        set((state) => ({
          dailyPracticeByDate: {
            ...state.dailyPracticeByDate,
            [date]: createEmptyDailyPracticeSession(),
          },
        }));
      },

      resetAllDailyPracticeSessions: () => {
        set({
          dailyPracticeByDate: {},
        });
      },

      hydrateDailyPracticeSessions: (sessions) => {
        set((state) => {
          const nextDailyPracticeByDate = { ...state.dailyPracticeByDate };

          Object.entries(sessions).forEach(([date, cloudSession]) => {
            const current = nextDailyPracticeByDate[date] ?? createEmptyDailyPracticeSession();

            nextDailyPracticeByDate[date] = {
              ...cloudSession,
              activeTab: current.activeTab,
              indices: current.indices,
              answers: {
                new: { ...cloudSession.answers.new, ...current.answers.new },
                review: { ...cloudSession.answers.review, ...current.answers.review },
              },
              submitted: {
                new: { ...cloudSession.submitted.new, ...current.submitted.new },
                review: { ...cloudSession.submitted.review, ...current.submitted.review },
              },
              extraLearningState: current.extraLearningState,
            };
          });

          return { dailyPracticeByDate: nextDailyPracticeByDate };
        });
      },

      getFillBlankPreviewSession: () => get().fillBlankPreview,

      patchFillBlankPreviewSession: (patch) => {
        const current = get().fillBlankPreview;
        const nextPatch = typeof patch === "function" ? patch(current) : patch;

        set({
          fillBlankPreview: {
            ...current,
            ...nextPatch,
          },
        });
      },
    }),
    {
      name: "quizmem-session-store",
    },
  ),
);
