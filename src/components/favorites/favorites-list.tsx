"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  BookOpenText,
  CheckCircle2,
  PencilLine,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getQuestionsByIds } from "@/lib/questions";
import { insertUserLog, upsertFavoriteItem, upsertWrongBookItem } from "@/lib/supabase/queries";
import { useAuthStore } from "@/store/useAuthStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { useWrongBookStore } from "@/store/useWrongBookStore";
import { normalizeFillBlankAnswer } from "@/utils/answer";
import type { Question } from "@/types";
import { FavoriteQuestionButton } from "@/components/shared/favorite-question-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const QUESTION_TYPE_LABELS: Record<Question["type"], string> = {
  fill_blank: "填空题",
  single_choice: "单选题",
  judgment: "判断题",
};

const SESSION_IDLE_MS = 10 * 60 * 1000;

function getCorrectAnswerToken(question: Question) {
  if (question.type === "single_choice") {
    return question.answer.trim();
  }

  if (question.type === "judgment") {
    const matched = Object.entries(question.options).find(
      ([, value]) => value.trim() === question.answer.trim(),
    );

    return matched?.[0] ?? question.answer.trim();
  }

  return question.answer.trim();
}

function FavoriteAnswerPanel({
  question,
  selectedAnswer,
  hasAnswered,
  onSelectAnswer,
  onSubmitFillBlank,
}: {
  question: Question;
  selectedAnswer?: string;
  hasAnswered: boolean;
  onSelectAnswer: (value: string) => void;
  onSubmitFillBlank: () => void;
}) {
  if (question.type === "fill_blank") {
    return (
      <div className="space-y-3">
        <div className="rounded-[24px] border border-cyan-200 bg-cyan-50/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-cyan-800">
            <PencilLine className="size-4" />
            请输入你的填空答案
          </div>
          <textarea
            value={selectedAnswer ?? ""}
            disabled={hasAnswered}
            onChange={(event) => onSelectAnswer(event.target.value)}
            placeholder="输入后点击“提交填空答案”"
            className="min-h-28 w-full rounded-2xl border border-cyan-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
          />
        </div>
        <Button
          className="h-11 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 text-white"
          onClick={onSubmitFillBlank}
          disabled={hasAnswered || !(selectedAnswer ?? "").trim()}
        >
          提交填空答案
        </Button>
      </div>
    );
  }

  const correctAnswerToken = getCorrectAnswerToken(question);

  return (
    <div className={question.type === "judgment" ? "grid grid-cols-2 gap-3" : "grid gap-3"}>
      {Object.entries(question.options).map(([key, value]) => (
        <button
          key={key}
          type="button"
          onClick={() => {
            if (!hasAnswered) {
              onSelectAnswer(key);
            }
          }}
          disabled={hasAnswered}
          className={[
            "rounded-2xl border px-4 py-3 text-left text-sm leading-6 transition-colors",
            question.type === "judgment" ? "min-h-14" : "",
            hasAnswered
              ? key === correctAnswerToken
                ? "border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm shadow-emerald-100"
                : selectedAnswer === key
                  ? "border-rose-300 bg-rose-50 text-rose-950 shadow-sm shadow-rose-100"
                  : "border-slate-200 bg-slate-50/70 text-slate-500"
              : selectedAnswer === key
                ? "border-cyan-400 bg-cyan-50 text-slate-900 shadow-sm shadow-cyan-100"
                : "border-slate-200 bg-slate-50/80 text-slate-700 hover:border-cyan-200 hover:bg-cyan-50/60",
          ].join(" ")}
        >
          <span className="mr-2 font-semibold text-slate-900">{key}.</span>
          {value}
        </button>
      ))}
    </div>
  );
}

function FavoriteQuestionCard({
  question,
  addedAt,
  lastReviewedAt,
  selectedAnswer,
  hasAnswered,
  onSelectAnswer,
  onSubmitFillBlank,
}: {
  question: Question;
  addedAt: string;
  lastReviewedAt: string | null;
  selectedAnswer?: string;
  hasAnswered: boolean;
  onSelectAnswer: (value: string) => void;
  onSubmitFillBlank: () => void;
}) {
  const isCorrect =
    question.type === "fill_blank"
      ? normalizeFillBlankAnswer(selectedAnswer ?? "") ===
        normalizeFillBlankAnswer(question.answer)
      : selectedAnswer === getCorrectAnswerToken(question);

  return (
    <Card className="rounded-[26px] border-amber-100/80 bg-white/92 shadow-sm shadow-amber-100/70">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              {QUESTION_TYPE_LABELS[question.type]}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"
            >
              {QUESTION_TYPE_LABELS[question.type]}题库编号 #{question.sourceId}
            </Badge>
          </div>

          <FavoriteQuestionButton questionId={question.id} className="border-amber-200 bg-amber-50/80 text-amber-800 hover:bg-amber-100" />
        </div>

        <div className="space-y-1 text-xs leading-6 text-slate-500">
          <p>收藏时间：{format(parseISO(addedAt), "yyyy 年 M 月 d 日 HH:mm")}</p>
          <p>
            最近复习：
            {lastReviewedAt ? format(parseISO(lastReviewedAt), "yyyy 年 M 月 d 日 HH:mm") : "还没有在收藏夹里做过"}
          </p>
        </div>

        <h2 className="text-lg leading-8 font-semibold text-slate-900 sm:text-xl">
          {question.content}
        </h2>

        <FavoriteAnswerPanel
          question={question}
          selectedAnswer={selectedAnswer}
          hasAnswered={hasAnswered}
          onSelectAnswer={onSelectAnswer}
          onSubmitFillBlank={onSubmitFillBlank}
        />

        {hasAnswered ? (
          <div className="space-y-4">
            <div
              className={[
                "rounded-[24px] border px-5 py-4 text-sm leading-6",
                isCorrect
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-rose-200 bg-rose-50 text-rose-900",
              ].join(" ")}
            >
              <div className="flex items-center gap-2 font-medium">
                {isCorrect ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                {isCorrect ? "回答正确" : "回答错误"}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-5">
                <div className="mb-3 flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="size-4" />
                  <p className="text-sm font-semibold">参考答案</p>
                </div>
                <p className="text-base leading-7 font-medium text-slate-900">{question.answer}</p>
              </div>

              <div className="rounded-[24px] border border-sky-100 bg-sky-50/70 p-5">
                <div className="mb-3 flex items-center gap-2 text-sky-700">
                  <BookOpenText className="size-4" />
                  <p className="text-sm font-semibold">解析</p>
                </div>
                <p className="text-sm leading-7 whitespace-pre-line text-slate-700">
                  {question.analysis}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function FavoritesList() {
  const pathname = usePathname();
  const userId = useAuthStore((state) => state.userId);
  const favoriteItems = useFavoritesStore((state) => state.items);
  const queueOrder = useFavoritesStore((state) => state.queueOrder);
  const setQueueOrder = useFavoritesStore((state) => state.setQueueOrder);
  const touchFavoriteReview = useFavoritesStore((state) => state.touchFavoriteReview);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});
  const [sessionQueue, setSessionQueue] = useState<number[]>([]);
  const [reviewedInSession, setReviewedInSession] = useState<number[]>([]);
  const [lastActivityAt, setLastActivityAt] = useState<number | null>(null);
  const finalizedRef = useRef(false);
  const sessionQueueRef = useRef<number[]>([]);
  const reviewedInSessionRef = useRef<number[]>([]);

  const sortedFallbackQueue = useMemo(
    () =>
      Object.values(favoriteItems)
        .sort(
          (left, right) =>
            new Date(right.addedAt).getTime() - new Date(left.addedAt).getTime(),
        )
        .map((item) => item.questionId),
    [favoriteItems],
  );

  const orderedQueue = useMemo(() => {
    const knownIds = new Set(Object.keys(favoriteItems).map(Number));

    return [
      ...queueOrder.filter((questionId) => knownIds.has(questionId)),
      ...sortedFallbackQueue.filter((questionId) => !queueOrder.includes(questionId)),
    ];
  }, [favoriteItems, queueOrder, sortedFallbackQueue]);

  const effectiveSessionQueue = sessionQueue.length > 0 ? sessionQueue : orderedQueue;

  useEffect(() => {
    sessionQueueRef.current = effectiveSessionQueue;
  }, [effectiveSessionQueue]);

  useEffect(() => {
    reviewedInSessionRef.current = reviewedInSession;
  }, [reviewedInSession]);

  const finalizeSessionQueue = useCallback((startNextSession = false) => {
    if (finalizedRef.current || reviewedInSessionRef.current.length === 0) {
      return;
    }

    finalizedRef.current = true;

    const reviewedSet = new Set(reviewedInSessionRef.current);
    const nextQueue = [
      ...sessionQueueRef.current.filter((questionId) => !reviewedSet.has(questionId)),
      ...sessionQueueRef.current.filter((questionId) => reviewedSet.has(questionId)),
    ];

    setQueueOrder(nextQueue);
    if (startNextSession) {
      setSessionQueue(nextQueue);
      setReviewedInSession([]);
      setLastActivityAt(null);
      finalizedRef.current = false;
    }
  }, [setQueueOrder]);

  useEffect(() => {
    finalizedRef.current = false;
  }, [pathname, reviewedInSession.length, sessionQueue]);

  useEffect(() => {
    return () => {
      finalizeSessionQueue();
    };
  }, [finalizeSessionQueue]);

  useEffect(() => {
    if (!lastActivityAt || reviewedInSession.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      finalizeSessionQueue(true);
    }, SESSION_IDLE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [finalizeSessionQueue, lastActivityAt, reviewedInSession, sessionQueue]);

  const favoriteEntries = useMemo(() => {
    const itemMap = new Map(
      Object.values(favoriteItems).map((item) => [item.questionId, item]),
    );

    return effectiveSessionQueue
      .map((questionId) => itemMap.get(questionId))
      .filter((item): item is (typeof favoriteItems)[number] => Boolean(item));
  }, [effectiveSessionQueue, favoriteItems]);

  const questions = useMemo(
    () => getQuestionsByIds(favoriteEntries.map((item) => item.questionId)),
    [favoriteEntries],
  );

  const questionMap = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  );

  function submitAnswer(question: Question, answer: string, activityTimestamp: number) {
    const normalizedAnswer = question.type === "fill_blank" ? answer.trim() : answer;
    const reviewedAt = new Date().toISOString();

    if (sessionQueue.length === 0) {
      setSessionQueue(effectiveSessionQueue);
    }

    setSubmitted((current) => ({
      ...current,
      [question.id]: true,
    }));
    setAnswers((current) => ({
      ...current,
      [question.id]: normalizedAnswer,
    }));
    setReviewedInSession((current) =>
      current.includes(question.id) ? current : [...current, question.id],
    );
    setLastActivityAt(activityTimestamp);
    touchFavoriteReview(question.id, reviewedAt);

    const isCorrect =
      question.type === "fill_blank"
        ? normalizeFillBlankAnswer(normalizedAnswer) === normalizeFillBlankAnswer(question.answer)
        : normalizedAnswer === getCorrectAnswerToken(question);

    if (userId) {
      void insertUserLog({
        userId,
        question,
        userAnswer: normalizedAnswer,
        isCorrect,
        answeredAt: reviewedAt,
      });

      const favoriteItem = useFavoritesStore.getState().items[question.id];
      void upsertFavoriteItem({
        userId,
        questionId: question.id,
        addedAt: favoriteItem?.addedAt,
        lastReviewedAt: reviewedAt,
      });
    }

    if (!isCorrect) {
      const wrongItem = useWrongBookStore.getState().addWrongQuestion(question.id, userId);

      if (userId) {
        void upsertWrongBookItem({
          userId,
          questionId: question.id,
          wrongCount: wrongItem.wrongCount,
          addedAt: wrongItem.addedAt,
          lastWrongAt: wrongItem.lastWrongAt,
          isResolved: false,
        });
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          收藏夹
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          当前累计 {favoriteEntries.length} 道收藏题，你可以把重要但还不放心的题放在这里反复看。
        </p>
        <p className="text-xs leading-5 text-slate-500">
          本次进入后顺序会保持稳定；离开页面或 10 分钟没有继续作答后，刚做过的题会自动轮到后面。
        </p>
      </div>

      {favoriteEntries.length === 0 ? (
        <Card className="rounded-[28px] border-cyan-100/80 bg-white/92 shadow-sm shadow-cyan-100/70">
          <CardContent className="space-y-4 p-8 text-center">
            <p className="text-lg font-semibold text-slate-900">还没有收藏题目</p>
            <p className="text-sm leading-6 text-slate-600">
              做题时右上角点一下“收藏”，之后这里就会出现。
            </p>
            <Button
              asChild
              className="h-11 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 text-white"
            >
              <Link href="/practice?tab=new">去做今日任务</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {favoriteEntries.map((item) => {
            const question = questionMap.get(item.questionId);

            if (!question) {
              return null;
            }

            return (
              <FavoriteQuestionCard
                key={item.questionId}
                question={question}
                addedAt={item.addedAt}
                lastReviewedAt={item.lastReviewedAt}
                selectedAnswer={answers[item.questionId]}
                hasAnswered={Boolean(submitted[item.questionId])}
                onSelectAnswer={(value) => {
                  if (question.type === "fill_blank") {
                    setAnswers((current) => ({
                      ...current,
                      [item.questionId]: value,
                    }));
                    return;
                  }

                  submitAnswer(question, value, Date.now());
                }}
                onSubmitFillBlank={() =>
                  submitAnswer(question, answers[item.questionId] ?? "", Date.now())
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
