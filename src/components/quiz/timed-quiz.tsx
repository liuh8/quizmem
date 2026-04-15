"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BookOpenText, CheckCircle2, Clock3, RotateCcw, XCircle } from "lucide-react";

import { getQuestionBank, getQuestionsByIds } from "@/lib/questions";
import { insertUserLog, upsertWrongBookItem } from "@/lib/supabase/queries";
import { useAuthStore } from "@/store/useAuthStore";
import { usePlanStore } from "@/store/usePlanStore";
import { useWrongBookStore } from "@/store/useWrongBookStore";
import { normalizeFillBlankAnswer } from "@/utils/answer";
import type { Question, QuestionType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const QUIZ_SIZE = 18;
const QUESTION_SECONDS = 10;
const QUESTIONS_PER_TYPE = 6;

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  fill_blank: "填空题",
  single_choice: "单选题",
  judgment: "判断题",
};

interface QuizAnswerRecord {
  questionId: number;
  answer: string;
  isCorrect: boolean;
  wrongReason: "none" | "wrong" | "timeout" | "skipped";
}

function shuffleQuestions(questions: Question[]) {
  return [...questions].sort(() => Math.random() - 0.5);
}

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

function evaluateAnswer(question: Question, answer: string) {
  if (question.type === "fill_blank") {
    return normalizeFillBlankAnswer(answer) === normalizeFillBlankAnswer(question.answer);
  }

  return answer === getCorrectAnswerToken(question);
}

function selectQuestionsByType(
  type: QuestionType,
  reviewQuestions: Question[],
  questionBank: Question[],
  selectedIds: Set<number>,
) {
  const preferred = shuffleQuestions(
    reviewQuestions.filter((question) => question.type === type && !selectedIds.has(question.id)),
  );
  const fallback = shuffleQuestions(
    questionBank.filter((question) => question.type === type && !selectedIds.has(question.id)),
  );
  const selected = [...preferred, ...fallback].slice(0, QUESTIONS_PER_TYPE);

  selected.forEach((question) => selectedIds.add(question.id));
  return selected;
}

function buildTimedQuizQuestions(reviewQuestionIds: number[], roundSeed: number) {
  void roundSeed;

  const questionBank = getQuestionBank();
  const reviewQuestions = getQuestionsByIds(reviewQuestionIds);
  const selectedIds = new Set<number>();
  const selected = [
    ...selectQuestionsByType("fill_blank", reviewQuestions, questionBank, selectedIds),
    ...selectQuestionsByType("single_choice", reviewQuestions, questionBank, selectedIds),
    ...selectQuestionsByType("judgment", reviewQuestions, questionBank, selectedIds),
  ];

  if (selected.length >= QUIZ_SIZE) {
    return shuffleQuestions(selected).slice(0, QUIZ_SIZE);
  }

  const fallback = shuffleQuestions(
    questionBank.filter((question) => !selectedIds.has(question.id)),
  ).slice(0, QUIZ_SIZE - selected.length);

  return shuffleQuestions([...selected, ...fallback]);
}

function getScoreSummary(questions: Question[], answers: Record<number, QuizAnswerRecord>) {
  const records = Object.values(answers);
  const correctCount = records.filter((record) => record.isCorrect).length;

  return {
    answeredCount: records.length,
    correctCount,
    wrongCount: records.length - correctCount,
    accuracy: records.length === 0 ? 0 : Math.round((correctCount / records.length) * 100),
    totalCount: questions.length,
  };
}

export function TimedQuiz() {
  const userId = useAuthStore((state) => state.userId);
  const todayPlan = usePlanStore((state) => state.getTodayPlan());
  const [roundSeed, setRoundSeed] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState(() =>
    buildTimedQuizQuestions(todayPlan?.reviewQuestions.questionIds ?? [], roundSeed),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, QuizAnswerRecord>>({});
  const [draftFillBlankAnswers, setDraftFillBlankAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);

  const currentQuestion = quizQuestions[currentIndex] ?? null;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;
  const draftFillBlankAnswer = currentQuestion ? draftFillBlankAnswers[currentQuestion.id] ?? "" : "";
  const isFinished = currentIndex >= quizQuestions.length;
  const summary = getScoreSummary(quizQuestions, answers);
  const progressValue =
    quizQuestions.length === 0 ? 0 : Math.round((summary.answeredCount / quizQuestions.length) * 100);

  function resetRound() {
    const nextRoundSeed = roundSeed + 1;

    setRoundSeed(nextRoundSeed);
    setQuizQuestions(buildTimedQuizQuestions(todayPlan?.reviewQuestions.questionIds ?? [], nextRoundSeed));
    setCurrentIndex(0);
    setAnswers({});
    setDraftFillBlankAnswers({});
    setTimeLeft(QUESTION_SECONDS);
  }

  function submitAnswer(answer: string, wrongReason: QuizAnswerRecord["wrongReason"] = "none") {
    if (!currentQuestion || answers[currentQuestion.id]) {
      return;
    }

    const normalizedAnswer = currentQuestion.type === "fill_blank" ? answer.trim() : answer;
    const isCorrect = wrongReason === "none" && evaluateAnswer(currentQuestion, normalizedAnswer);
    const record: QuizAnswerRecord = {
      questionId: currentQuestion.id,
      answer: normalizedAnswer,
      isCorrect,
      wrongReason: isCorrect ? "none" : wrongReason === "none" ? "wrong" : wrongReason,
    };

    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: record,
    }));

    if (userId) {
      void insertUserLog({
        userId,
        question: currentQuestion,
        userAnswer: normalizedAnswer,
        isCorrect,
        answeredAt: new Date().toISOString(),
      });
    }

    if (!isCorrect) {
      const wrongItem = useWrongBookStore.getState().addWrongQuestion(currentQuestion.id, userId);

      if (userId) {
        void upsertWrongBookItem({
          userId,
          questionId: currentQuestion.id,
          wrongCount: wrongItem.wrongCount,
          addedAt: wrongItem.addedAt,
          lastWrongAt: wrongItem.lastWrongAt,
          isResolved: false,
        });
      }
    }

    window.setTimeout(() => {
      setCurrentIndex((value) => value + 1);
      setTimeLeft(QUESTION_SECONDS);
    }, isCorrect ? 650 : 1100);
  }

  useEffect(() => {
    if (!currentQuestion || currentAnswer || isFinished || timeLeft <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          window.setTimeout(() => submitAnswer("", "timeout"), 0);
          return 0;
        }

        return value - 1;
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  });

  if (quizQuestions.length === 0) {
    return (
      <Card className="rounded-[28px] border-amber-200 bg-amber-50/90 shadow-sm shadow-amber-100/80">
        <CardContent className="space-y-3 p-6">
          <p className="text-lg font-semibold text-amber-950">还没有可测验的题目。</p>
          <p className="text-sm leading-6 text-amber-900">
            请先确认题库数据已经加载，或返回首页生成学习计划后再试。
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isFinished) {
    return (
      <div className="space-y-5">
        <Card className="overflow-hidden rounded-[28px] border-cyan-100/80 bg-white/92 shadow-lg shadow-cyan-100/70">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <Badge className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-800">
              限时测验完成
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                本轮正确率 {summary.accuracy}%
              </h1>
              <p className="text-sm leading-7 text-slate-600">
                共 {summary.totalCount} 题，答对 {summary.correctCount} 题，答错 {summary.wrongCount} 题。
                做错的题已经自动加入错题本。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/80 p-5">
                <p className="text-sm text-slate-600">答对</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.correctCount}</p>
              </div>
              <div className="rounded-[22px] border border-rose-100 bg-rose-50/80 p-5">
                <p className="text-sm text-slate-600">答错</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.wrongCount}</p>
              </div>
              <div className="rounded-[22px] border border-sky-100 bg-sky-50/80 p-5">
                <p className="text-sm text-slate-600">用时规则</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{QUESTION_SECONDS}s</p>
              </div>
            </div>

            <Button
              className="h-12 w-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 text-white sm:w-auto sm:px-8"
              onClick={resetRound}
            >
              <RotateCcw className="size-4" />
              再来一轮
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="space-y-4 pb-28 lg:pb-32">
      <Card className="overflow-hidden rounded-[28px] border-cyan-100/80 bg-white/92 shadow-lg shadow-cyan-100/70">
        <CardContent className="space-y-6 p-5 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <Badge className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-800">
                限时测验
              </Badge>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  每题 {QUESTION_SECONDS} 秒，快速判断掌握程度。
                </h1>
                <p className="text-sm leading-7 text-slate-600">
                  本轮 18 题，优先抽取今日复习题，不足时从题库随机补齐。
                </p>
              </div>
            </div>
            <div className="rounded-[24px] border border-cyan-100 bg-cyan-50/80 px-5 py-4 text-center">
              <div className="flex items-center justify-center gap-2 text-cyan-700">
                <Clock3 className="size-4" />
                <span className="text-sm font-medium">剩余时间</span>
              </div>
              <p className="mt-2 text-4xl font-semibold text-slate-900">{timeLeft}</p>
            </div>
          </div>

          <Progress
            value={progressValue}
            className="h-3 rounded-full bg-sky-100 [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-teal-500 [&_[data-slot=progress-indicator]]:to-sky-500"
          />

          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-3 py-1 text-xs">
              第 {currentIndex + 1} / {quizQuestions.length} 题
            </Badge>
            <Badge variant="outline" className="rounded-full border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-800">
              {QUESTION_TYPE_LABELS[currentQuestion.type]}
            </Badge>
            <span className="text-sm text-slate-500">
              {QUESTION_TYPE_LABELS[currentQuestion.type]}题库编号 #{currentQuestion.sourceId}
            </span>
          </div>

          <h2 className="text-lg leading-8 font-semibold text-slate-900 sm:text-2xl">
            {currentQuestion.content}
          </h2>

          {currentQuestion.type === "fill_blank" ? (
	            <div className="space-y-3">
	              <textarea
	                value={currentAnswer?.answer ?? draftFillBlankAnswer}
	                disabled={Boolean(currentAnswer)}
	                onChange={(event) => {
	                  const nextValue = event.target.value;

	                  setDraftFillBlankAnswers((current) => ({
	                    ...current,
	                    [currentQuestion.id]: nextValue,
	                  }));
	                }}
	                placeholder="输入填空答案"
                className="min-h-28 w-full rounded-2xl border border-cyan-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              />
              <Button
                disabled={Boolean(currentAnswer) || !draftFillBlankAnswer.trim()}
                className="h-11 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 text-white"
                onClick={() => submitAnswer(draftFillBlankAnswer)}
              >
                提交答案
              </Button>
            </div>
          ) : (
            <div className={currentQuestion.type === "judgment" ? "grid grid-cols-2 gap-3" : "grid gap-3"}>
              {Object.entries(currentQuestion.options).map(([key, value]) => {
                const correctAnswerToken = getCorrectAnswerToken(currentQuestion);
                const selectedAnswer = currentAnswer?.answer;

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={Boolean(currentAnswer)}
                    onClick={() => submitAnswer(key)}
                    className={[
                      "rounded-2xl border px-4 py-3 text-left text-sm leading-6 transition-colors",
                      currentQuestion.type === "judgment" ? "min-h-14" : "",
                      currentAnswer
                        ? key === correctAnswerToken
                          ? "border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm shadow-emerald-100"
                          : selectedAnswer === key
                            ? "border-rose-300 bg-rose-50 text-rose-950 shadow-sm shadow-rose-100"
                            : "border-slate-200 bg-slate-50/70 text-slate-500"
                        : "border-slate-200 bg-slate-50/80 text-slate-700 hover:border-cyan-200 hover:bg-cyan-50/60",
                    ].join(" ")}
                  >
                    <span className="mr-2 font-semibold text-slate-900">{key}.</span>
                    {value}
                  </button>
                );
              })}
            </div>
          )}

          {currentAnswer ? (
            <div className="space-y-4">
              <div
                className={[
                  "rounded-[24px] border px-5 py-4 text-sm leading-6",
                  currentAnswer.isCorrect
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-rose-200 bg-rose-50 text-rose-900",
                ].join(" ")}
              >
                <div className="flex items-center gap-2 font-medium">
                  {currentAnswer.isCorrect ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                  {currentAnswer.isCorrect
                    ? "回答正确"
                    : currentAnswer.wrongReason === "timeout"
                      ? "时间到，本题按错误记录"
                      : currentAnswer.wrongReason === "skipped"
                        ? "已跳过，本题按错误记录"
                        : "回答错误"}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-5">
                  <div className="mb-3 flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="size-4" />
                    <p className="text-sm font-semibold">参考答案</p>
                  </div>
                  <p className="text-base leading-7 font-medium text-slate-900">
                    {currentQuestion.answer}
                  </p>
                </div>

                <div className="rounded-[24px] border border-sky-100 bg-sky-50/70 p-5">
                  <div className="mb-3 flex items-center gap-2 text-sky-700">
                    <BookOpenText className="size-4" />
                    <p className="text-sm font-semibold">解析</p>
                  </div>
                  <p className="text-sm leading-7 whitespace-pre-line text-slate-700">
                    {currentQuestion.analysis}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-cyan-100/80 bg-white/94 px-6 py-4 backdrop-blur lg:left-1/2 lg:w-full lg:max-w-6xl lg:-translate-x-1/2 lg:border lg:border-cyan-100/80 lg:rounded-t-3xl lg:px-4 lg:shadow-lg lg:shadow-cyan-100/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            className="h-12 flex-1 rounded-full border-cyan-200 bg-white/90 text-slate-700 hover:bg-cyan-50"
            onClick={resetRound}
          >
            <RotateCcw className="size-4" />
            重开本轮
          </Button>
          <Button
            className="h-12 flex-1 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 text-white"
            onClick={() => submitAnswer("", "skipped")}
            disabled={Boolean(currentAnswer)}
          >
            跳过本题
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
