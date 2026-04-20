import type {
  DailyPlan,
  FavoriteItem,
  ISODateString,
  Question,
  WrongBookItem,
} from "@/types";
import type { Database } from "@/types/supabase";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type DailyPlanRow = Database["public"]["Tables"]["daily_plans"]["Row"];
type DailyPlanInsert = Database["public"]["Tables"]["daily_plans"]["Insert"];
type UserLogRow = Database["public"]["Tables"]["user_logs"]["Row"];
type UserLogInsert = Database["public"]["Tables"]["user_logs"]["Insert"];
type WrongBookInsert = Database["public"]["Tables"]["wrong_books"]["Insert"];
type FavoriteInsert = Database["public"]["Tables"]["favorites"]["Insert"];

function toJsonNumberArray(values: number[]) {
  return values;
}

function fromJsonNumberArray(values: Database["public"]["Tables"]["daily_plans"]["Row"]["new_question_ids"]) {
  if (typeof values === "string") {
    try {
      const parsed = JSON.parse(values) as unknown;
      return fromJsonNumberArray(parsed as Database["public"]["Tables"]["daily_plans"]["Row"]["new_question_ids"]);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => {
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      }

      return null;
    })
    .filter((value): value is number => value !== null);
}

export async function upsertProfile(profile: ProfileInsert) {
  const supabase = getSupabaseBrowserClient();

  return supabase.from("profiles").upsert(profile, {
    onConflict: "id",
  });
}

export async function fetchProfile(userId: string) {
  const supabase = getSupabaseBrowserClient();

  return supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
}

export async function cleanupReplacedAnonymousUser(oldUserId: string) {
  const supabase = getSupabaseBrowserClient();

  return supabase.rpc("cleanup_replaced_anonymous_user", {
    old_user_id: oldUserId,
  });
}

export async function upsertDailyPlans(userId: string, dailyPlans: DailyPlan[]) {
  const supabase = getSupabaseBrowserClient();

  const payload: DailyPlanInsert[] = dailyPlans.map((dailyPlan) => ({
    user_id: userId,
    date: dailyPlan.date,
    new_question_ids: toJsonNumberArray(dailyPlan.newQuestions.questionIds),
    review_question_ids: toJsonNumberArray(dailyPlan.reviewQuestions.questionIds),
    completed_new_question_ids: toJsonNumberArray(dailyPlan.newQuestions.completedQuestionIds),
    completed_review_question_ids: toJsonNumberArray(dailyPlan.reviewQuestions.completedQuestionIds),
    is_completed: dailyPlan.isCompleted,
  }));

  return supabase.from("daily_plans").upsert(payload, {
    onConflict: "user_id,date",
  });
}

export async function fetchDailyPlans(userId: string) {
  const supabase = getSupabaseBrowserClient();

  return supabase
    .from("daily_plans")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });
}

export async function insertUserLog(params: {
  userId: string;
  question: Question;
  userAnswer: string | null;
  isCorrect: boolean;
  answeredAt?: ISODateString;
}) {
  const supabase = getSupabaseBrowserClient();
  const payload: UserLogInsert = {
    user_id: params.userId,
    question_id: params.question.id,
    question_type: params.question.type,
    user_answer: params.userAnswer,
    is_correct: params.isCorrect,
    answered_at: params.answeredAt,
  };

  return supabase.from("user_logs").insert(payload);
}

export async function fetchUserLogs(userId: string) {
  const supabase = getSupabaseBrowserClient();

  return supabase
    .from("user_logs")
    .select("*")
    .eq("user_id", userId)
    .order("answered_at", { ascending: true })
    .limit(5000);
}

export async function upsertWrongBookItem(params: {
  userId: string;
  questionId: number;
  wrongCount?: number;
  addedAt?: string;
  lastWrongAt?: string;
  isResolved?: boolean;
}) {
  const supabase = getSupabaseBrowserClient();
  const payload: WrongBookInsert = {
    user_id: params.userId,
    question_id: params.questionId,
    wrong_count: params.wrongCount,
    added_at: params.addedAt,
    last_wrong_at: params.lastWrongAt,
    is_resolved: params.isResolved,
  };

  return supabase.from("wrong_books").upsert(payload, {
    onConflict: "user_id,question_id",
  });
}

export async function removeWrongBookItem(userId: string, questionId: number) {
  const supabase = getSupabaseBrowserClient();

  return supabase
    .from("wrong_books")
    .delete()
    .eq("user_id", userId)
    .eq("question_id", questionId);
}

export async function fetchWrongBookItems(userId: string) {
  const supabase = getSupabaseBrowserClient();

  const result = await supabase
    .from("wrong_books")
    .select("*")
    .eq("user_id", userId)
    .order("last_wrong_at", { ascending: false });

  return result;
}

export async function upsertFavoriteItem(params: {
  userId: string;
  questionId: number;
  addedAt?: string;
  lastReviewedAt?: string | null;
}) {
  const supabase = getSupabaseBrowserClient();
  const payload: FavoriteInsert = {
    user_id: params.userId,
    question_id: params.questionId,
    added_at: params.addedAt,
    last_reviewed_at: params.lastReviewedAt,
  };

  return supabase.from("favorites").upsert(payload, {
    onConflict: "user_id,question_id",
  });
}

export async function removeFavoriteItem(userId: string, questionId: number) {
  const supabase = getSupabaseBrowserClient();

  return supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("question_id", questionId);
}

export async function fetchFavoriteItems(userId: string) {
  const supabase = getSupabaseBrowserClient();

  return supabase
    .from("favorites")
    .select("*")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });
}

export function mapWrongBookRowsToItems(
  rows: Database["public"]["Tables"]["wrong_books"]["Row"][],
): WrongBookItem[] {
  return rows.map((row) => ({
    userId: row.user_id,
    questionId: row.question_id,
    addedAt: row.added_at,
    lastWrongAt: row.last_wrong_at,
    wrongCount: row.wrong_count,
    isResolved: row.is_resolved,
  }));
}

export function mapFavoriteRowsToItems(
  rows: Database["public"]["Tables"]["favorites"]["Row"][],
): FavoriteItem[] {
  return rows.map((row) => ({
    userId: row.user_id,
    questionId: row.question_id,
    addedAt: row.added_at,
    lastReviewedAt: row.last_reviewed_at,
  }));
}

export interface PersistedDailyPlanSnapshot {
  date: string;
  newQuestionIds: number[];
  reviewQuestionIds: number[];
  completedNewQuestionIds: number[];
  completedReviewQuestionIds: number[];
  isCompleted: boolean;
}

export interface PersistedUserLogSnapshot {
  questionId: number;
  userAnswer: string | null;
  isCorrect: boolean;
  answeredAt: string;
}

export function mapUserLogRowsToSnapshots(rows: UserLogRow[]): PersistedUserLogSnapshot[] {
  return rows.map((row) => ({
    questionId: row.question_id,
    userAnswer: row.user_answer,
    isCorrect: row.is_correct,
    answeredAt: row.answered_at,
  }));
}

export function mapDailyPlanRowsToSnapshots(rows: DailyPlanRow[]): PersistedDailyPlanSnapshot[] {
  return rows.map((row) => ({
    date: row.date,
    newQuestionIds: fromJsonNumberArray(row.new_question_ids),
    reviewQuestionIds: fromJsonNumberArray(row.review_question_ids),
    completedNewQuestionIds: fromJsonNumberArray(row.completed_new_question_ids),
    completedReviewQuestionIds: fromJsonNumberArray(row.completed_review_question_ids),
    isCompleted: row.is_completed,
  }));
}

export function mapProfileRow(profile: ProfileRow | null) {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    username: profile.username,
    targetDate: profile.target_date,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}
