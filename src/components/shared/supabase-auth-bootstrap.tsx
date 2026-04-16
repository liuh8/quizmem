"use client";

import { useEffect, useRef } from "react";

import {
  fetchDailyPlans,
  fetchProfile,
  fetchUserLogs,
  fetchWrongBookItems,
  mapDailyPlanRowsToSnapshots,
  mapProfileRow,
  mapUserLogRowsToSnapshots,
  mapWrongBookRowsToItems,
  type PersistedUserLogSnapshot,
  upsertDailyPlans,
  upsertProfile,
} from "@/lib/supabase/queries";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { usePlanStore } from "@/store/usePlanStore";
import {
  createEmptyDailyPracticeSession,
  type DailyPracticeSession,
  useSessionStore,
} from "@/store/useSessionStore";
import { useWrongBookStore } from "@/store/useWrongBookStore";
import { inferTargetDateFromSnapshots, restorePlanFromSnapshots } from "@/utils/scheduler";
import type { UserPlan } from "@/types";

function getProfileUsername(userId: string) {
  return `匿名学员-${userId.slice(0, 8)}`;
}

function buildDailyPracticeSessionsFromLogs(
  dailyPlans: UserPlan["dailyPlans"],
  userLogs: PersistedUserLogSnapshot[],
) {
  const latestLogByQuestionId = new Map<number, PersistedUserLogSnapshot>();

  userLogs.forEach((log) => {
    latestLogByQuestionId.set(log.questionId, log);
  });

  return dailyPlans.reduce<Record<string, DailyPracticeSession>>((sessions, dailyPlan) => {
    const session = createEmptyDailyPracticeSession();

    dailyPlan.newQuestions.completedQuestionIds.forEach((questionId) => {
      const log = latestLogByQuestionId.get(questionId);

      if (!log?.userAnswer) {
        return;
      }

      session.answers.new[questionId] = log.userAnswer;
      session.submitted.new[questionId] = true;
    });

    dailyPlan.reviewQuestions.completedQuestionIds.forEach((questionId) => {
      const log = latestLogByQuestionId.get(questionId);

      if (!log?.userAnswer) {
        return;
      }

      session.answers.review[questionId] = log.userAnswer;
      session.submitted.review[questionId] = true;
    });

    if (
      Object.keys(session.submitted.new).length > 0 ||
      Object.keys(session.submitted.review).length > 0
    ) {
      sessions[dailyPlan.date] = session;
    }

    return sessions;
  }, {});
}

export function SupabaseAuthBootstrap() {
  const status = useAuthStore((state) => state.status);
  const userId = useAuthStore((state) => state.userId);
  const autoAnonymousEnabled = useAuthStore((state) => state.autoAnonymousEnabled);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setSession = useAuthStore((state) => state.setSession);
  const setError = useAuthStore((state) => state.setError);
  const clearAuthFlowIntent = useAuthStore((state) => state.clearAuthFlowIntent);
  const targetDate = usePlanStore((state) => state.targetDate);
  const hasCompletedOnboarding = usePlanStore((state) => state.hasCompletedOnboarding);
  const isRestoringFromCloud = usePlanStore((state) => state.isRestoringFromCloud);
  const plan = usePlanStore((state) => state.plan);
  const hydratePlan = usePlanStore((state) => state.hydratePlan);
  const setCloudRestoreState = usePlanStore((state) => state.setCloudRestoreState);
  const hydrateDailyPracticeSessions = useSessionStore(
    (state) => state.hydrateDailyPracticeSessions,
  );
  const hydrateWrongQuestions = useWrongBookStore((state) => state.hydrateWrongQuestions);
  const syncedProfileKeyRef = useRef<string | null>(null);
  const syncedPlansKeyRef = useRef<string | null>(null);
  const hydratedWrongBookUserRef = useRef<string | null>(null);
  const hydratedPlanUserRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let isCancelled = false;

    async function ensureSession() {
      setLoading();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (isCancelled) {
        return;
      }

      if (sessionError) {
        setCloudRestoreState(false);
        setError(sessionError.message);
        return;
      }

      if (session) {
        setSession(session);
        return;
      }

      if (!autoAnonymousEnabled) {
        setSession(null);
        return;
      }

      setCloudRestoreState(true);
      const { data, error } = await supabase.auth.signInAnonymously();

      if (isCancelled) {
        return;
      }

      if (error) {
        setCloudRestoreState(false);
        setError(error.message);
        return;
      }

      setSession(data.session ?? null);
    }

    ensureSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isCancelled) {
        return;
      }

      setSession(session);
    });

    return () => {
      isCancelled = true;
      subscription.unsubscribe();
    };
  }, [autoAnonymousEnabled, setCloudRestoreState, setError, setLoading, setSession]);

  useEffect(() => {
    if (!userId) {
      syncedProfileKeyRef.current = null;
      syncedPlansKeyRef.current = null;
      hydratedWrongBookUserRef.current = null;
      hydratedPlanUserRef.current = null;

      if (!autoAnonymousEnabled && status !== "loading") {
        setCloudRestoreState(false);
        clearAuthFlowIntent();
      }

      return;
    }

    if (isRestoringFromCloud) {
      return;
    }

    const currentUserId = userId;
    const profileKey = `${userId}:${targetDate ?? "unset"}:${hasCompletedOnboarding}`;

    if (syncedProfileKeyRef.current === profileKey) {
      return;
    }

    let isCancelled = false;

    async function syncProfile() {
      const profilePayload = {
        id: currentUserId,
        username: getProfileUsername(currentUserId),
        ...(hasCompletedOnboarding && targetDate
          ? { target_date: targetDate }
          : {}),
      };

      const { error } = await upsertProfile(profilePayload);

      if (isCancelled) {
        return;
      }

      if (error) {
        setError(error.message);
        return;
      }

      syncedProfileKeyRef.current = profileKey;
    }

    syncProfile();

    return () => {
      isCancelled = true;
    };
  }, [
    autoAnonymousEnabled,
    clearAuthFlowIntent,
    hasCompletedOnboarding,
    isRestoringFromCloud,
    setCloudRestoreState,
    setError,
    status,
    targetDate,
    userId,
  ]);

  useEffect(() => {
    if (!userId || hydratedPlanUserRef.current === userId) {
      return;
    }

    const currentUserId = userId;
    let isCancelled = false;

    async function hydrateCloudPlan() {
      setCloudRestoreState(true);

      const [
        { data: profileData, error: profileError },
        { data: dailyPlanData, error: dailyPlanError },
        { data: userLogData, error: userLogError },
      ] = await Promise.all([
        fetchProfile(currentUserId),
        fetchDailyPlans(currentUserId),
        fetchUserLogs(currentUserId),
      ]);

      if (isCancelled) {
        return;
      }

      if (profileError) {
        setCloudRestoreState(false);
        clearAuthFlowIntent();
        setError(profileError.message);
        return;
      }

      if (dailyPlanError) {
        setCloudRestoreState(false);
        clearAuthFlowIntent();
        setError(dailyPlanError.message);
        return;
      }

      if (userLogError) {
        setCloudRestoreState(false);
        clearAuthFlowIntent();
        setError(userLogError.message);
        return;
      }

      const profile = mapProfileRow(profileData);
      const dailyPlanSnapshots = mapDailyPlanRowsToSnapshots(dailyPlanData ?? []);
      const restoredTargetDate =
        profile?.targetDate ?? inferTargetDateFromSnapshots(dailyPlanSnapshots);

      if (!restoredTargetDate || dailyPlanSnapshots.length === 0) {
        hydratedPlanUserRef.current = currentUserId;
        setCloudRestoreState(false);
        clearAuthFlowIntent();
        return;
      }

      const restoredPlan = restorePlanFromSnapshots({
        targetDate: restoredTargetDate,
        dailyPlans: dailyPlanSnapshots,
      });
      const restoredSessions = buildDailyPracticeSessionsFromLogs(
        restoredPlan.dailyPlans,
        mapUserLogRowsToSnapshots(userLogData ?? []),
      );

      hydratePlan(restoredPlan);
      hydrateDailyPracticeSessions(restoredSessions);
      hydratedPlanUserRef.current = currentUserId;
      setCloudRestoreState(false);
      clearAuthFlowIntent();
    }

    hydrateCloudPlan();

    return () => {
      isCancelled = true;
    };
  }, [
    clearAuthFlowIntent,
    hydrateDailyPracticeSessions,
    hydratePlan,
    setCloudRestoreState,
    setError,
    userId,
  ]);

  useEffect(() => {
    if (!userId || !plan || isRestoringFromCloud) {
      syncedPlansKeyRef.current = null;
      return;
    }

    const currentUserId = userId;
    const currentPlan = plan;
    const plansKey = JSON.stringify({
      userId: currentUserId,
      dates: currentPlan.dailyPlans.map((dailyPlan) => ({
        date: dailyPlan.date,
        newQuestionIds: dailyPlan.newQuestions.questionIds,
        completedNewQuestionIds: dailyPlan.newQuestions.completedQuestionIds,
        reviewQuestionIds: dailyPlan.reviewQuestions.questionIds,
        completedReviewQuestionIds: dailyPlan.reviewQuestions.completedQuestionIds,
        isCompleted: dailyPlan.isCompleted,
      })),
    });

    if (syncedPlansKeyRef.current === plansKey) {
      return;
    }

    let isCancelled = false;

    async function syncDailyPlans() {
      const { error } = await upsertDailyPlans(currentUserId, currentPlan.dailyPlans);

      if (isCancelled) {
        return;
      }

      if (error) {
        setError(error.message);
        return;
      }

      syncedPlansKeyRef.current = plansKey;
    }

    syncDailyPlans();

    return () => {
      isCancelled = true;
    };
  }, [isRestoringFromCloud, plan, setError, userId]);

  useEffect(() => {
    if (!userId || hydratedWrongBookUserRef.current === userId) {
      return;
    }

    const currentUserId = userId;
    let isCancelled = false;

    async function hydrateWrongBook() {
      const { data, error } = await fetchWrongBookItems(currentUserId);

      if (isCancelled) {
        return;
      }

      if (error) {
        setError(error.message);
        return;
      }

      hydrateWrongQuestions(mapWrongBookRowsToItems(data ?? []));
      hydratedWrongBookUserRef.current = currentUserId;
    }

    hydrateWrongBook();

    return () => {
      isCancelled = true;
    };
  }, [hydrateWrongQuestions, setError, userId]);

  if (status === "error") {
    return (
      <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
        云端同步暂时未连接成功，当前仍可继续本地学习。稍后刷新页面可重试。
      </div>
    );
  }

  return null;
}
