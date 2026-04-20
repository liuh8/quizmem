"use client";

import { Star } from "lucide-react";

import { removeFavoriteItem, upsertFavoriteItem } from "@/lib/supabase/queries";
import { useAuthStore } from "@/store/useAuthStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { Button } from "@/components/ui/button";

export function FavoriteQuestionButton({
  questionId,
  className,
}: {
  questionId: number;
  className?: string;
}) {
  const userId = useAuthStore((state) => state.userId);
  const favoriteItem = useFavoritesStore((state) => state.items[questionId]);
  const addFavoriteQuestion = useFavoritesStore((state) => state.addFavoriteQuestion);
  const removeFavoriteQuestion = useFavoritesStore((state) => state.removeFavoriteQuestion);

  const isFavorited = Boolean(favoriteItem);

  function toggleFavorite() {
    if (isFavorited) {
      removeFavoriteQuestion(questionId);

      if (userId) {
        void removeFavoriteItem(userId, questionId);
      }

      return;
    }

    const nextItem = addFavoriteQuestion(questionId, userId);

    if (userId) {
      void upsertFavoriteItem({
        userId,
        questionId,
        addedAt: nextItem.addedAt,
        lastReviewedAt: nextItem.lastReviewedAt,
      });
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={[
        "size-10 rounded-full border-cyan-200 bg-white/90 p-0 text-slate-700 hover:bg-cyan-50",
        isFavorited ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" : "",
        className ?? "",
      ].join(" ")}
      onClick={toggleFavorite}
      aria-label={isFavorited ? "取消收藏" : "收藏"}
      title={isFavorited ? "取消收藏" : "收藏"}
    >
      <Star className={["size-4", isFavorited ? "fill-current" : ""].join(" ")} />
    </Button>
  );
}
