export const QUESTION_TYPES = ["fill_blank", "single_choice", "judgment"] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export type QuestionOptionKey = "A" | "B" | "C" | "D";

export type QuestionOptions = Record<QuestionOptionKey, string>;

export const RAW_QUESTION_TYPES = ["填空题", "单选题", "判断题"] as const;

export type RawQuestionType = (typeof RAW_QUESTION_TYPES)[number];

export interface RawQuestionBase {
  id: number;
  type: RawQuestionType;
  question: string;
  answer: string;
  explaination: string;
}

export interface RawFillBlankQuestion extends RawQuestionBase {
  type: "填空题";
}

export interface RawSingleChoiceQuestion extends RawQuestionBase {
  type: "单选题";
  optionA: string | number;
  optionB: string | number;
  optionC: string | number;
  optionD: string | number;
}

export interface RawJudgmentQuestion extends RawQuestionBase {
  type: "判断题";
  optionA: string | number;
  optionB: string | number;
}

export type RawQuestion =
  | RawFillBlankQuestion
  | RawSingleChoiceQuestion
  | RawJudgmentQuestion;

export interface RawQuestionBank {
  fillBlankQuestions: RawFillBlankQuestion[];
  singleChoiceQuestions: RawSingleChoiceQuestion[];
  judgmentQuestions: RawJudgmentQuestion[];
}

export interface QuestionBase {
  id: number;
  sourceId: number;
  type: QuestionType;
  content: string;
  answer: string;
  analysis: string;
}

export interface FillBlankQuestion extends QuestionBase {
  type: "fill_blank";
}

export interface SingleChoiceQuestion extends QuestionBase {
  type: "single_choice";
  options: QuestionOptions;
}

export interface JudgmentQuestion extends QuestionBase {
  type: "judgment";
  options: Pick<QuestionOptions, "A" | "B">;
}

export type Question = FillBlankQuestion | SingleChoiceQuestion | JudgmentQuestion;
