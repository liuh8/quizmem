"use client";

import { useMemo } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, PencilLine, XCircle } from "lucide-react";

import { getQuestionBank } from "@/lib/questions";
import { insertUserLog, upsertWrongBookItem } from "@/lib/supabase/queries";
import { useAuthStore } from "@/store/useAuthStore";
import {
  createEmptyFillBlankPreviewSession,
  useSessionStore,
} from "@/store/useSessionStore";
import { useWrongBookStore } from "@/store/useWrongBookStore";
import { normalizeFillBlankAnswer } from "@/utils/answer";
import type { Question } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function FillBlankPreview() {
  const fillBlankQuestions = useMemo(
    () => getQuestionBank().filter((question): question is Extract<Question, { type: "fill_blank" }> => question.type === "fill_blank"),
    [],
  );
  const storedSession = useSessionStore((state) => state.fillBlankPreview);
  const patchSession = useSessionStore((state) => state.patchFillBlankPreviewSession);
  const userId = useAuthStore((state) => state.userId);
  const session = storedSession ?? createEmptyFillBlankPreviewSession();

  const question = fillBlankQuestions[session.index];
  const selectedAnswer = session.answers[question.id] ?? "";
  const hasAnswered = Boolean(session.submitted[question.id]);
  const isCorrect =
    normalizeFillBlankAnswer(selectedAnswer) === normalizeFillBlankAnswer(question.answer);

  function submitAnswer(answer: string) {
    const normalizedAnswer = answer.trim();
    const nextIsCorrect =
      normalizeFillBlankAnswer(normalizedAnswer) === normalizeFillBlankAnswer(question.answer);

    patchSession((current) => ({
      answers: { ...current.answers, [question.id]: normalizedAnswer },
      submitted: { ...current.submitted, [question.id]: true },
    }));

    if (userId) {
      void insertUserLog({
        userId,
        question,
        userAnswer: normalizedAnswer,
        isCorrect: nextIsCorrect,
        answeredAt: new Date().toISOString(),
      });
    }

    if (!nextIsCorrect) {
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
    <div className="space-y-4 pb-28 lg:pb-32">
      <Card className="rounded-[28px] border-cyan-100/80 bg-white/92 shadow-lg shadow-cyan-100/70">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Badge className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-800">
                填空题测试页
              </Badge>
              <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                第 {session.index + 1} / {fillBlankQuestions.length} 题
              </Badge>
            </div>
            <div className="text-sm text-slate-500">填空题题库编号 #{question.sourceId}</div>
          </div>

          <h1 className="text-lg leading-8 font-semibold text-slate-900 sm:text-2xl">
            {question.content}
          </h1>

          <div className="rounded-[24px] border border-cyan-200 bg-cyan-50/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-cyan-800">
              <PencilLine className="size-4" />
              输入你的填空答案
            </div>
            <textarea
              value={selectedAnswer}
              disabled={hasAnswered}
              onChange={(event) => {
                const nextValue = event.target.value;
                patchSession((current) => ({
                  answers: { ...current.answers, [question.id]: nextValue },
                }));
              }}
              placeholder="输入后点击“提交填空答案”"
              className="min-h-32 w-full rounded-2xl border border-cyan-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            />
          </div>

          <Button
            className="h-11 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 text-white"
            onClick={() => submitAnswer(selectedAnswer)}
            disabled={hasAnswered || !selectedAnswer.trim()}
          >
            提交填空答案
          </Button>

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
                  <p className="mb-3 text-sm font-semibold text-emerald-700">参考答案</p>
                  <p className="text-base leading-7 font-medium text-slate-900">{question.answer}</p>
                </div>
                <div className="rounded-[24px] border border-sky-100 bg-sky-50/70 p-5">
                  <p className="mb-3 text-sm font-semibold text-sky-700">解析</p>
                  <p className="text-sm leading-7 whitespace-pre-line text-slate-700">{question.analysis}</p>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-cyan-100/80 bg-white/94 px-6 py-4 backdrop-blur lg:left-1/2 lg:w-full lg:max-w-5xl lg:-translate-x-1/2 lg:border lg:border-cyan-100/80 lg:rounded-t-3xl lg:px-4 lg:shadow-lg lg:shadow-cyan-100/70">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            className="h-12 flex-1 rounded-full border-cyan-200 bg-white/90 text-slate-700 hover:bg-cyan-50"
            disabled={session.index === 0}
            onClick={() =>
              patchSession({
                index: Math.max(session.index - 1, 0),
              })
            }
          >
            <ArrowLeft className="size-4" />
            上一题
          </Button>
          <Button
            className="h-12 flex-1 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 text-white"
            disabled={session.index >= fillBlankQuestions.length - 1}
            onClick={() =>
              patchSession({
                index: Math.min(session.index + 1, fillBlankQuestions.length - 1),
              })
            }
          >
            下一题
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
