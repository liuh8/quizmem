import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { FavoriteItem } from "@/types";

interface FavoritesState {
  items: Record<number, FavoriteItem>;
  queueOrder: number[];
}

interface FavoritesActions {
  addFavoriteQuestion: (questionId: number, userId?: string | null) => FavoriteItem;
  removeFavoriteQuestion: (questionId: number) => void;
  touchFavoriteReview: (questionId: number, reviewedAt?: string) => void;
  hydrateFavorites: (items: FavoriteItem[]) => void;
  resetFavorites: () => void;
  setQueueOrder: (questionIds: number[]) => void;
  getFavoriteQuestions: () => FavoriteItem[];
}

export type FavoritesStore = FavoritesState & FavoritesActions;

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      items: {},
      queueOrder: [],

      addFavoriteQuestion: (questionId, userId) => {
        const existing = get().items[questionId];
        const now = new Date().toISOString();
        const nextItem: FavoriteItem = existing
          ? {
              ...existing,
              userId: userId ?? existing.userId,
            }
          : {
              userId: userId ?? undefined,
              questionId,
              addedAt: now,
              lastReviewedAt: null,
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

      removeFavoriteQuestion: (questionId) => {
        set((state) => {
          const nextItems = { ...state.items };
          delete nextItems[questionId];

          return {
            items: nextItems,
            queueOrder: state.queueOrder.filter((id) => id !== questionId),
          };
        });
      },

      touchFavoriteReview: (questionId, reviewedAt) => {
        const existing = get().items[questionId];

        if (!existing) {
          return;
        }

        set((state) => ({
          items: {
            ...state.items,
            [questionId]: {
              ...existing,
              lastReviewedAt: reviewedAt ?? new Date().toISOString(),
            },
          },
        }));
      },

      hydrateFavorites: (items) => {
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
              new Date(existing.addedAt).getTime() >= new Date(item.addedAt).getTime()
                ? {
                    ...existing,
                    userId: existing.userId ?? item.userId,
                    lastReviewedAt: existing.lastReviewedAt ?? item.lastReviewedAt,
                  }
                : {
                    ...item,
                    lastReviewedAt: item.lastReviewedAt ?? existing.lastReviewedAt,
                  };
          }

          items
            .sort(
              (left, right) =>
                new Date(right.addedAt).getTime() - new Date(left.addedAt).getTime(),
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

      resetFavorites: () => {
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

      getFavoriteQuestions: () => Object.values(get().items),
    }),
    {
      name: "quizmem-favorites-store",
    },
  ),
);
