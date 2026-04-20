import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { WrongBookItem } from "@/types";

interface WrongBookState {
  items: Record<number, WrongBookItem>;
  queueOrder: number[];
}

interface WrongBookActions {
  addWrongQuestion: (questionId: number, userId?: string | null) => WrongBookItem;
  removeWrongQuestion: (questionId: number) => void;
  hydrateWrongQuestions: (items: WrongBookItem[]) => void;
  resetWrongQuestions: () => void;
  setQueueOrder: (questionIds: number[]) => void;
  getWrongQuestions: () => WrongBookItem[];
}

export type WrongBookStore = WrongBookState & WrongBookActions;

export const useWrongBookStore = create<WrongBookStore>()(
  persist(
    (set, get) => ({
      items: {},
      queueOrder: [],

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
          queueOrder: state.queueOrder.includes(questionId)
            ? state.queueOrder
            : [...state.queueOrder, questionId],
        }));

        return nextItem;
      },

      removeWrongQuestion: (questionId) => {
        set((state) => {
          const nextItems = { ...state.items };
          delete nextItems[questionId];

          return {
            items: nextItems,
            queueOrder: state.queueOrder.filter((id) => id !== questionId),
          };
        });
      },

      hydrateWrongQuestions: (items) => {
        set((state) => {
          const nextItems = { ...state.items };
          const nextQueueOrder = [...state.queueOrder];

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

          items
            .sort(
              (left, right) =>
                new Date(right.lastWrongAt).getTime() - new Date(left.lastWrongAt).getTime(),
            )
            .forEach((item) => {
              if (!nextQueueOrder.includes(item.questionId)) {
                nextQueueOrder.push(item.questionId);
              }
            });

          return {
            items: nextItems,
            queueOrder: nextQueueOrder.filter((questionId) => questionId in nextItems),
          };
        });
      },

      resetWrongQuestions: () => {
        set({
          items: {},
          queueOrder: [],
        });
      },

      setQueueOrder: (questionIds) => {
        const itemIds = new Set(Object.keys(get().items).map(Number));
        const normalizedQueue = questionIds.filter((questionId) => itemIds.has(questionId));
        const remainingIds = [...itemIds].filter((questionId) => !normalizedQueue.includes(questionId));

        set({
          queueOrder: [...normalizedQueue, ...remainingIds],
        });
      },

      getWrongQuestions: () => Object.values(get().items),
    }),
    {
      name: "quizmem-wrong-book-store",
    },
  ),
);
