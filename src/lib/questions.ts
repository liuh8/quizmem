import rawFillBlankQuestions from "@/data/question_base_fill.json";
import rawSingleChoiceQuestions from "@/data/question_base_sc.json";
import rawJudgmentQuestions from "@/data/question_base_tf.json";
import type {
  FillBlankQuestion,
  JudgmentQuestion,
  Question,
  QuestionOptions,
  QuestionType,
  RawFillBlankQuestion,
  RawJudgmentQuestion,
  RawQuestion,
  RawQuestionBank,
  RawSingleChoiceQuestion,
  SingleChoiceQuestion,
} from "@/types";

const QUESTION_ID_BASES: Record<QuestionType, number> = {
  judgment: 100000,
  single_choice: 200000,
  fill_blank: 300000,
};

function sanitizeText(value: string | number) {
  return String(value).replace(/\r\n/g, "\n").trim();
}

function buildUniqueQuestionId(type: QuestionType, sourceId: number) {
  return QUESTION_ID_BASES[type] + sourceId;
}

function buildSingleChoiceOptions(question: RawSingleChoiceQuestion): QuestionOptions {
  return {
    A: sanitizeText(question.optionA),
    B: sanitizeText(question.optionB),
    C: sanitizeText(question.optionC),
    D: sanitizeText(question.optionD),
  };
}

function buildJudgmentOptions(question: RawJudgmentQuestion): Pick<QuestionOptions, "A" | "B"> {
  return {
    A: sanitizeText(question.optionA),
    B: sanitizeText(question.optionB),
  };
}

function normalizeFillBlankQuestion(question: RawFillBlankQuestion): FillBlankQuestion {
  return {
    id: buildUniqueQuestionId("fill_blank", question.id),
    sourceId: question.id,
    type: "fill_blank",
    content: sanitizeText(question.question),
    answer: sanitizeText(question.answer),
    analysis: sanitizeText(question.explaination),
  };
}

function normalizeSingleChoiceQuestion(question: RawSingleChoiceQuestion): SingleChoiceQuestion {
  return {
    id: buildUniqueQuestionId("single_choice", question.id),
    sourceId: question.id,
    type: "single_choice",
    content: sanitizeText(question.question),
    answer: sanitizeText(question.answer),
    analysis: sanitizeText(question.explaination),
    options: buildSingleChoiceOptions(question),
  };
}

function normalizeJudgmentQuestion(question: RawJudgmentQuestion): JudgmentQuestion {
  return {
    id: buildUniqueQuestionId("judgment", question.id),
    sourceId: question.id,
    type: "judgment",
    content: sanitizeText(question.question),
    answer: sanitizeText(question.answer),
    analysis: sanitizeText(question.explaination),
    options: buildJudgmentOptions(question),
  };
}

export function normalizeQuestion(question: RawQuestion): Question {
  switch (question.type) {
    case "填空题":
      return normalizeFillBlankQuestion(question);
    case "单选题":
      return normalizeSingleChoiceQuestion(question);
    case "判断题":
      return normalizeJudgmentQuestion(question);
    default: {
      const exhaustiveCheck: never = question;
      throw new Error(`Unsupported question type: ${String(exhaustiveCheck)}`);
    }
  }
}

export function createQuestionBank(rawBank: RawQuestionBank): Question[] {
  return [
    ...rawBank.judgmentQuestions.map(normalizeQuestion),
    ...rawBank.singleChoiceQuestions.map(normalizeQuestion),
    ...rawBank.fillBlankQuestions.map(normalizeQuestion),
  ];
}

export function getRawQuestionBank(): RawQuestionBank {
  return {
    fillBlankQuestions: rawFillBlankQuestions as RawFillBlankQuestion[],
    singleChoiceQuestions: rawSingleChoiceQuestions as RawSingleChoiceQuestion[],
    judgmentQuestions: rawJudgmentQuestions as RawJudgmentQuestion[],
  };
}

export function getQuestionBank(): Question[] {
  return createQuestionBank(getRawQuestionBank());
}

export function getQuestionBankMap() {
  return new Map(getQuestionBank().map((question) => [question.id, question]));
}

export function getQuestionsByIds(questionIds: number[]) {
  const questionMap = getQuestionBankMap();

  return questionIds
    .map((questionId) => questionMap.get(questionId))
    .filter((question): question is Question => Boolean(question));
}

export function getQuestionCountSummary() {
  const rawBank = getRawQuestionBank();

  return {
    fillBlankCount: rawBank.fillBlankQuestions.length,
    singleChoiceCount: rawBank.singleChoiceQuestions.length,
    judgmentCount: rawBank.judgmentQuestions.length,
    totalCount:
      rawBank.fillBlankQuestions.length +
      rawBank.singleChoiceQuestions.length +
      rawBank.judgmentQuestions.length,
  };
}
