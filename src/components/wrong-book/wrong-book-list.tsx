"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  BookOpenText,
  CheckCircle2,
  PencilLine,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

import { getQuestionsByIds } from "@/lib/questions";
import { insertUserLog, removeWrongBookItem } from "@/lib/supabase/queries";
import { useAuthStore } from "@/store/useAuthStore";
import { useWrongBookStore } from "@/store/useWrongBookStore";
import { normalizeFillBlankAnswer } from "@/utils/answer";
import type { Question } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

function WrongBookAnswerPanel({
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

function WrongBookQuestionCard({
  question,
  wrongCount,
  addedAt,
  lastWrongAt,
  selectedAnswer,
  hasAnswered,
  onSelectAnswer,
  onSubmitFillBlank,
  onRemove,
}: {
  question: Question;
  wrongCount: number;
  addedAt: string;
  lastWrongAt: string;
  selectedAnswer?: string;
  hasAnswered: boolean;
  onSelectAnswer: (value: string) => void;
  onSubmitFillBlank: () => void;
  onRemove: () => void;
}) {
  const isCorrect =
    question.type === "fill_blank"
      ? normalizeFillBlankAnswer(selectedAnswer ?? "") ===
        normalizeFillBlankAnswer(question.answer)
      : selectedAnswer === getCorrectAnswerToken(question);

  return (
    <Card className="rounded-[26px] border-rose-100/80 bg-white/92 shadow-sm shadow-rose-100/70">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-800">
              {QUESTION_TYPE_LABELS[question.type]}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"
            >
              {QUESTION_TYPE_LABELS[question.type]}题库编号 #{question.sourceId}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800"
            >
              错误 {wrongCount} 次
            </Badge>
          </div>

          <Button
            variant="outline"
            className="h-10 rounded-full border-rose-200 bg-rose-50/80 text-rose-700 hover:bg-rose-100"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
            移出错题本
          </Button>
        </div>

        <div className="space-y-1 text-xs leading-6 text-slate-500">
          <p>加入时间：{format(parseISO(addedAt), "yyyy 年 M 月 d 日 HH:mm")}</p>
          <p>最近答错：{format(parseISO(lastWrongAt), "yyyy 年 M 月 d 日 HH:mm")}</p>
        </div>

        <h2 className="text-lg leading-8 font-semibold text-slate-900 sm:text-xl">
          {question.content}
        </h2>

        <WrongBookAnswerPanel
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

export function WrongBookList() {
  const userId = useAuthStore((state) => state.userId);
  const wrongBookItems = useWrongBookStore((state) => state.items);
  const removeWrongQuestion = useWrongBookStore((state) => state.removeWrongQuestion);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});

  const wrongBookEntries = useMemo(
    () =>
      Object.values(wrongBookItems).sort(
        (left, right) =>
          new Date(right.lastWrongAt).getTime() - new Date(left.lastWrongAt).getTime(),
      ),
    [wrongBookItems],
  );

  const questions = useMemo(
    () => getQuestionsByIds(wrongBookEntries.map((item) => item.questionId)),
    [wrongBookEntries],
  );

  const questionMap = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  );

  function submitAnswer(question: Question, answer: string) {
    const normalizedAnswer = question.type === "fill_blank" ? answer.trim() : answer;

    setSubmitted((current) => ({
      ...current,
      [question.id]: true,
    }));
    setAnswers((current) => ({
      ...current,
      [question.id]: normalizedAnswer,
    }));

    if (!userId) {
      return;
    }

    const isCorrect =
      question.type === "fill_blank"
        ? normalizeFillBlankAnswer(normalizedAnswer) === normalizeFillBlankAnswer(question.answer)
        : normalizedAnswer === getCorrectAnswerToken(question);

    void insertUserLog({
      userId,
      question,
      userAnswer: normalizedAnswer,
      isCorrect,
      answeredAt: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            错题本
          </h1>
          <p className="text-sm leading-6 text-slate-600">
            当前累计 {wrongBookEntries.length} 道错题，你可以直接在这里重做并手动移出。
          </p>
        </div>

      </div>

      {wrongBookEntries.length === 0 ? (
        <Card className="rounded-[28px] border-cyan-100/80 bg-white/92 shadow-sm shadow-cyan-100/70">
          <CardContent className="space-y-4 p-8 text-center">
            <p className="text-lg font-semibold text-slate-900">还没有错题</p>
            <p className="text-sm leading-6 text-slate-600">
              继续去做今日任务吧，答错的题会自动进到这里。
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
          {wrongBookEntries.map((item) => {
            const question = questionMap.get(item.questionId);

            if (!question) {
              return null;
            }

            return (
              <WrongBookQuestionCard
                key={item.questionId}
                question={question}
                wrongCount={item.wrongCount}
                addedAt={item.addedAt}
                lastWrongAt={item.lastWrongAt}
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

                  submitAnswer(question, value);
                }}
                onSubmitFillBlank={() => submitAnswer(question, answers[item.questionId] ?? "")}
                onRemove={() => {
                  removeWrongQuestion(item.questionId);

                  if (userId) {
                    void removeWrongBookItem(userId, item.questionId);
                  }
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
