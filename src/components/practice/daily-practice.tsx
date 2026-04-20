"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  PencilLine,
  Sparkles,
  XCircle,
} from "lucide-react";

import { getQuestionsByIds } from "@/lib/questions";
import { insertUserLog, upsertWrongBookItem } from "@/lib/supabase/queries";
import { useAuthStore } from "@/store/useAuthStore";
import { usePlanStore } from "@/store/usePlanStore";
import {
  createEmptyDailyPracticeSession,
  useSessionStore,
} from "@/store/useSessionStore";
import { useWrongBookStore } from "@/store/useWrongBookStore";
import { normalizeFillBlankAnswer } from "@/utils/answer";
import { getTodayPlan as getDerivedTodayPlan } from "@/utils/scheduler";
import type { Question } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const QUESTION_TYPE_LABELS: Record<Question["type"], string> = {
  fill_blank: "填空题",
  single_choice: "单选题",
  judgment: "判断题",
};

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

function getPreferredNewQuestionIndex(
  questionIds: number[],
  targetQuestionIds: number[],
  completedQuestionIds: number[],
) {
  const firstUnfinishedTargetQuestionId = targetQuestionIds.find(
    (questionId) => !completedQuestionIds.includes(questionId),
  );

  if (firstUnfinishedTargetQuestionId) {
    return questionIds.indexOf(firstUnfinishedTargetQuestionId);
  }

  const firstUnfinishedQuestionId = questionIds.find(
    (questionId) => !completedQuestionIds.includes(questionId),
  );

  if (firstUnfinishedQuestionId) {
    return questionIds.indexOf(firstUnfinishedQuestionId);
  }

  return questionIds.length;
}

function QuestionOptions({
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
  onSubmitFillBlank: (value: string) => void;
}) {
  const [draftFillBlankAnswer, setDraftFillBlankAnswer] = useState(selectedAnswer ?? "");

  if (question.type === "fill_blank") {
    return (
      <div className="space-y-3">
        <div className="rounded-[24px] border border-cyan-200 bg-cyan-50/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-cyan-800">
            <PencilLine className="size-4" />
            请输入你的填空答案
          </div>
          <textarea
            value={draftFillBlankAnswer}
            disabled={hasAnswered}
            onChange={(event) => {
              const nextValue = event.target.value;
              setDraftFillBlankAnswer(nextValue);
              onSelectAnswer(nextValue);
            }}
            placeholder="输入后点击“提交填空答案”"
            className="min-h-28 w-full rounded-2xl border border-cyan-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
          />
        </div>
        <Button
          className="h-11 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 text-white"
          onClick={() => onSubmitFillBlank(draftFillBlankAnswer)}
          disabled={hasAnswered || !draftFillBlankAnswer.trim()}
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

function QuestionCard({
  question,
  currentIndex,
  totalCount,
  selectedAnswer,
  hasAnswered,
  onSelectAnswer,
  onSubmitFillBlank,
}: {
  question: Question;
  currentIndex: number;
  totalCount: number;
  selectedAnswer?: string;
  hasAnswered: boolean;
  onSelectAnswer: (value: string) => void;
  onSubmitFillBlank: (value: string) => void;
}) {
  const isCorrect =
    question.type === "fill_blank"
      ? normalizeFillBlankAnswer(selectedAnswer ?? "") ===
        normalizeFillBlankAnswer(question.answer)
      : selectedAnswer === getCorrectAnswerToken(question);

  return (
    <Card className="rounded-[28px] border-cyan-100/80 bg-white/92 shadow-lg shadow-cyan-100/70">
      <CardContent className="space-y-6 p-5 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Badge className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-800">
              {QUESTION_TYPE_LABELS[question.type]}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"
            >
              第 {currentIndex + 1} / {totalCount} 题
            </Badge>
          </div>

          <div className="text-sm text-slate-500">
            {QUESTION_TYPE_LABELS[question.type]}题库编号 #{question.sourceId}
          </div>
        </div>

        <h1 className="text-lg leading-8 font-semibold text-slate-900 sm:text-2xl">
          {question.content}
        </h1>

        <QuestionOptions
          key={question.id}
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

export function DailyPractice({
  initialTab = "new",
}: {
  initialTab?: "new" | "review";
}) {
  const plan = usePlanStore((state) => state.plan);
  const todayPlan = useMemo(
    () => (plan ? getDerivedTodayPlan(plan) : null),
    [plan],
  );
  const moveNextNewQuestionToToday = usePlanStore((state) => state.moveNextNewQuestionToToday);
  const completeQuestion = usePlanStore((state) => state.completeQuestion);
  const userId = useAuthStore((state) => state.userId);

  const newQuestions = useMemo(
    () => getQuestionsByIds(todayPlan?.newQuestions.questionIds ?? []),
    [todayPlan],
  );
  const reviewQuestions = useMemo(
    () => getQuestionsByIds(todayPlan?.reviewQuestions.questionIds ?? []),
    [todayPlan],
  );

  const storedSession = useSessionStore((state) =>
    todayPlan ? state.dailyPracticeByDate[todayPlan.date] : null,
  );
  const patchSession = useSessionStore((state) => state.patchDailyPracticeSession);
  const session = storedSession ?? createEmptyDailyPracticeSession();
  const planDate = todayPlan?.date;
  const targetNewQuestionIds = useMemo(
    () => todayPlan?.newQuestions.targetQuestionIds ?? todayPlan?.newQuestions.questionIds ?? [],
    [todayPlan],
  );
  const newQuestionIds = useMemo(
    () => todayPlan?.newQuestions.questionIds ?? [],
    [todayPlan],
  );
	  const completedNewQuestionIds = useMemo(
	    () => todayPlan?.newQuestions.completedQuestionIds ?? [],
	    [todayPlan],
	  );
	  const initialTabKeyRef = useRef<string | null>(null);
	  const autoFocusKeyRef = useRef<string | null>(null);
	  const lastAnsweredQuestionRef = useRef<number | null>(null);

	  useEffect(() => {
	    if (!planDate) {
	      return;
	    }

	    const initialTabKey = `${planDate}:${initialTab}`;

	    if (initialTabKeyRef.current === initialTabKey) {
	      return;
	    }

	    initialTabKeyRef.current = initialTabKey;

	    if (session.activeTab !== initialTab) {
	      patchSession(planDate, { activeTab: initialTab });
	    }
	  }, [initialTab, patchSession, planDate, session.activeTab]);

  useEffect(() => {
    if (!planDate || session.activeTab !== "new") {
      return;
    }

    const autoFocusKey = `${planDate}:${session.activeTab}:${completedNewQuestionIds.join(",")}`;

    if (autoFocusKeyRef.current === autoFocusKey) {
      return;
    }

    const preferredNewIndex = getPreferredNewQuestionIndex(
      newQuestionIds,
      targetNewQuestionIds,
      completedNewQuestionIds,
    );

    autoFocusKeyRef.current = autoFocusKey;

    if (
      lastAnsweredQuestionRef.current !== null &&
      completedNewQuestionIds.includes(lastAnsweredQuestionRef.current)
    ) {
      lastAnsweredQuestionRef.current = null;
      return;
    }

    if (preferredNewIndex === null || session.indices.new === preferredNewIndex) {
      return;
    }

    patchSession(planDate, (current) => ({
      indices: {
        ...current.indices,
        new: preferredNewIndex,
      },
    }));
  }, [
    planDate,
    patchSession,
    session.activeTab,
    completedNewQuestionIds,
    newQuestionIds,
    session.indices.new,
    targetNewQuestionIds,
  ]);

  if (!plan || !todayPlan) {
    return (
      <Card className="rounded-[28px] border-amber-200 bg-amber-50/90 shadow-sm shadow-amber-100/80">
        <CardContent className="space-y-3 p-6">
          <p className="text-lg font-semibold text-amber-950">还没有可练习的计划。</p>
          <p className="text-sm leading-6 text-amber-900">
            请先返回首页生成首轮学习计划，再进入今日任务。
          </p>
        </CardContent>
      </Card>
    );
  }

  const activePlanDate = todayPlan.date;
  const originalNewTargetCount =
    todayPlan.newQuestions.targetQuestionIds?.length ?? todayPlan.newQuestions.questionIds.length;
  const currentQuestions = session.activeTab === "new" ? newQuestions : reviewQuestions;
  const currentIndex = session.indices[session.activeTab];
  const currentQuestion = currentQuestions[currentIndex] ?? null;
  const currentNewQuestion = newQuestions[session.indices.new] ?? null;
  const currentReviewQuestion = reviewQuestions[session.indices.review] ?? null;
  const isViewingExtraNewQuestion =
    session.activeTab === "new" && session.indices.new >= originalNewTargetCount;

  function moveToNextQuestion(taskType: "new" | "review") {
    const questions = taskType === "new" ? newQuestions : reviewQuestions;
    const currentTaskIndex = session.indices[taskType];

    if (currentTaskIndex < questions.length - 1) {
      patchSession(activePlanDate, (current) => ({
        indices: {
          ...current.indices,
          [taskType]: current.indices[taskType] + 1,
        },
      }));
      return;
    }

    if (taskType === "new") {
      patchSession(activePlanDate, { extraLearningState: "prompt" });
    }
  }

  function evaluateAnswer(question: Question, selectedAnswer: string) {
    if (question.type === "fill_blank") {
      return (
        normalizeFillBlankAnswer(selectedAnswer) ===
        normalizeFillBlankAnswer(question.answer)
      );
    }

    return selectedAnswer === getCorrectAnswerToken(question);
  }

  function submitAnswer(question: Question, selectedAnswer: string, taskType: "new" | "review") {
    const alreadyAnswered =
      taskType === "new"
        ? Boolean(session.submitted.new[question.id])
        : Boolean(session.submitted.review[question.id]);

    if (alreadyAnswered) {
      return;
    }

    const normalizedSelectedAnswer =
      question.type === "fill_blank" ? selectedAnswer.trim() : selectedAnswer;
    const isCorrect = evaluateAnswer(question, normalizedSelectedAnswer);
    lastAnsweredQuestionRef.current = question.id;

    patchSession(activePlanDate, (current) => ({
      answers: {
        ...current.answers,
        [taskType]: {
          ...current.answers[taskType],
          [question.id]: normalizedSelectedAnswer,
        },
      },
      submitted: {
        ...current.submitted,
        [taskType]: {
          ...current.submitted[taskType],
          [question.id]: true,
        },
      },
    }));

    completeQuestion(activePlanDate, question.id, taskType);

    if (userId) {
      void insertUserLog({
        userId,
        question,
        userAnswer: normalizedSelectedAnswer,
        isCorrect,
        answeredAt: new Date().toISOString(),
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
      return;
    }

    window.setTimeout(() => {
      moveToNextQuestion(taskType);
    }, 220);
  }

  return (
    <div className="space-y-4 pb-28 lg:pb-32">
      <div className="flex items-center justify-between gap-3">
        <Tabs
          value={session.activeTab}
          onValueChange={(value) =>
            patchSession(activePlanDate, { activeTab: value as "new" | "review" })
          }
          className="w-full gap-4"
        >
          <TabsList className="h-auto rounded-full bg-cyan-50 p-1">
            <TabsTrigger value="new" className="rounded-full px-4 py-2">
              今日新题 {originalNewTargetCount}
            </TabsTrigger>
            <TabsTrigger value="review" className="rounded-full px-4 py-2">
              今日复习 {reviewQuestions.length}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4">
            {currentNewQuestion ? (
              <QuestionCard
                question={currentNewQuestion}
                currentIndex={session.indices.new}
                totalCount={newQuestions.length}
                selectedAnswer={session.answers.new[currentNewQuestion.id]}
                hasAnswered={Boolean(session.submitted.new[currentNewQuestion.id])}
                onSelectAnswer={(value) =>
                  currentNewQuestion.type === "fill_blank"
                    ? patchSession(activePlanDate, (current) => ({
                        answers: {
                          ...current.answers,
                          new: { ...current.answers.new, [currentNewQuestion.id]: value },
                        },
                      }))
                    : submitAnswer(currentNewQuestion, value, "new")
                }
                onSubmitFillBlank={(value) => submitAnswer(currentNewQuestion, value, "new")}
              />
            ) : (
              <Card className="rounded-[24px] border-emerald-100 bg-emerald-50/80 shadow-none">
                <CardContent className="space-y-4 p-6 text-sm leading-6 text-emerald-900">
                  <p>今天的新题已经全部完成。</p>
                  <Button
                    variant="outline"
                    className="h-11 rounded-full border-cyan-200 bg-white text-slate-700 hover:bg-cyan-50"
                    onClick={() => patchSession(activePlanDate, { extraLearningState: "prompt" })}
                  >
                    查看后续加练
                  </Button>
                </CardContent>
              </Card>
            )}

            {session.extraLearningState === "prompt" ? (
              <Card className="rounded-[24px] border-cyan-200 bg-cyan-50/80 shadow-none">
                <CardContent className="space-y-4 p-6 text-sm leading-6 text-cyan-900">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 size-4 shrink-0" />
                    <p>今天目标内容已经完成，下面是你继续往下学习的加练题，这些题也会按新的学习日期进入后续复习。要继续吗？</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      className="h-11 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 text-white"
                      onClick={() => {
                        const movedQuestionId = moveNextNewQuestionToToday(activePlanDate);

                        if (movedQuestionId) {
                          patchSession(activePlanDate, {
                            extraLearningState: "active",
                            indices: {
                              ...session.indices,
                              new: newQuestions.length,
                            },
                          });
                        }
                      }}
                    >
                      继续往下学
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 rounded-full border-cyan-200 bg-white text-slate-700 hover:bg-cyan-50"
                      onClick={() => patchSession(activePlanDate, { extraLearningState: "idle" })}
                    >
                      先不继续
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {session.extraLearningState === "active" && isViewingExtraNewQuestion ? (
              <div className="flex items-start gap-3 rounded-[22px] border border-cyan-200 bg-cyan-50/80 px-4 py-3 text-sm leading-6 text-cyan-900">
                <Sparkles className="mt-0.5 size-4 shrink-0" />
                <p>下面是你继续往下学习的加练题，这些题也会按新的学习日期进入后续复习。</p>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="review" className="space-y-4">
            {currentReviewQuestion ? (
              <QuestionCard
                question={currentReviewQuestion}
                currentIndex={session.indices.review}
                totalCount={reviewQuestions.length}
                selectedAnswer={session.answers.review[currentReviewQuestion.id]}
                hasAnswered={Boolean(session.submitted.review[currentReviewQuestion.id])}
                onSelectAnswer={(value) =>
                  currentReviewQuestion.type === "fill_blank"
                    ? patchSession(activePlanDate, (current) => ({
                        answers: {
                          ...current.answers,
                          review: {
                            ...current.answers.review,
                            [currentReviewQuestion.id]: value,
                          },
                        },
                      }))
                    : submitAnswer(currentReviewQuestion, value, "review")
                }
                onSubmitFillBlank={(value) => submitAnswer(currentReviewQuestion, value, "review")}
              />
            ) : (
              <Card className="rounded-[24px] border-sky-100 bg-sky-50/80 shadow-none">
                <CardContent className="p-6 text-sm leading-6 text-sky-900">
                  今天暂时没有复习题，可以先完成新题任务。
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

      </div>

      {currentQuestion ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-cyan-100/80 bg-white/94 px-6 py-4 backdrop-blur lg:left-1/2 lg:w-full lg:max-w-6xl lg:-translate-x-1/2 lg:border lg:border-cyan-100/80 lg:rounded-t-3xl lg:px-4 lg:shadow-lg lg:shadow-cyan-100/70">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              className="h-12 flex-1 rounded-full border-cyan-200 bg-white/90 text-slate-700 hover:bg-cyan-50"
              disabled={currentIndex === 0}
                onClick={() =>
                patchSession(activePlanDate, (current) => ({
                  indices: {
                    ...current.indices,
                    [current.activeTab]: Math.max(current.indices[current.activeTab] - 1, 0),
                  },
                }))
              }
            >
              <ArrowLeft className="size-4" />
              上一题
            </Button>

            <Button
              className="h-12 flex-1 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 text-white"
              onClick={() => {
                if (currentIndex < currentQuestions.length - 1) {
                  patchSession(activePlanDate, (current) => ({
                    indices: {
                      ...current.indices,
                      [current.activeTab]: current.indices[current.activeTab] + 1,
                    },
                  }));
                  return;
                }

                if (session.activeTab === "new") {
                  const movedQuestionId = moveNextNewQuestionToToday(activePlanDate);

                  if (movedQuestionId) {
                    patchSession(activePlanDate, {
                      extraLearningState: "active",
                      indices: {
                        ...session.indices,
                        new: currentQuestions.length,
                      },
                    });
                  }
                }
              }}
              disabled={session.activeTab === "review" && currentIndex >= currentQuestions.length - 1}
            >
              {session.activeTab === "new" && currentIndex >= currentQuestions.length - 1
                ? "继续往下学"
                : "下一题"}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
