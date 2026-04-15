import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { WrongBookItem } from "@/types";

interface WrongBookState {
  items: Record<number, WrongBookItem>;
}

interface WrongBookActions {
  addWrongQuestion: (questionId: number, userId?: string | null) => WrongBookItem;
  removeWrongQuestion: (questionId: number) => void;
  hydrateWrongQuestions: (items: WrongBookItem[]) => void;
  getWrongQuestions: () => WrongBookItem[];
}

export type WrongBookStore = WrongBookState & WrongBookActions;

export const useWrongBookStore = create<WrongBookStore>()(
  persist(
    (set, get) => ({
      items: {},

      addWrongQuestion: (questionId, userId) => {
        const existing = get().items[questionId];
        const now = new Date().toISOString();
        const nextItem: WrongBookItem = existing
          ? {
              ...existing,
              userId: userId ?? existing.userId,
              lastWrongAt: now,
              wrongCount: existing.wrongCount + 1,
              isResolved: false,
            }
          : {
              userId: userId ?? undefined,
              questionId,
              addedAt: now,
              lastWrongAt: now,
              wrongCount: 1,
              isResolved: false,
            };

        set((state) => ({
          items: {
            ...state.items,
            [questionId]: nextItem,
          },
        }));

        return nextItem;
      },

      removeWrongQuestion: (questionId) => {
        set((state) => {
          const nextItems = { ...state.items };
          delete nextItems[questionId];

          return {
            items: nextItems,
          };
        });
      },

      hydrateWrongQuestions: (items) => {
        set((state) => {
          const nextItems = { ...state.items };

          for (const item of items) {
            const existing = nextItems[item.questionId];

            if (!existing) {
              nextItems[item.questionId] = item;
              continue;
            }

            nextItems[item.questionId] =
              new Date(existing.lastWrongAt).getTime() >=
              new Date(item.lastWrongAt).getTime()
                ? {
                    ...existing,
                    userId: existing.userId ?? item.userId,
                    wrongCount: Math.max(existing.wrongCount, item.wrongCount),
                  }
                : {
                    ...item,
                    wrongCount: Math.max(existing.wrongCount, item.wrongCount),
                  };
          }

          return {
            items: nextItems,
          };
        });
      },

      getWrongQuestions: () => Object.values(get().items),
    }),
    {
      name: "quizmem-wrong-book-store",
    },
  ),
);
