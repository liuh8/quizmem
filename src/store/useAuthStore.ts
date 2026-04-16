"use client";

import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthStatus = "idle" | "loading" | "authenticated" | "error";
export type AuthFlowIntent = "login" | "register" | "anonymous" | null;

interface AuthStoreState {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  isAnonymous: boolean;
  session: Session | null;
  errorMessage: string | null;
  hasDismissedBindEmailPrompt: boolean;
  autoAnonymousEnabled: boolean;
  isEmailLoginDialogOpen: boolean;
  isBindEmailDialogOpen: boolean;
  authFlowIntent: AuthFlowIntent;
}

interface AuthStoreActions {
  setLoading: () => void;
  setSession: (session: Session | null) => void;
  setError: (message: string) => void;
  setBindEmailPromptDismissed: (dismissed: boolean) => void;
  setAutoAnonymousEnabled: (enabled: boolean) => void;
  setEmailLoginDialogOpen: (open: boolean) => void;
  setBindEmailDialogOpen: (open: boolean) => void;
  setAuthFlowIntent: (intent: AuthFlowIntent) => void;
  clearAuthFlowIntent: () => void;
  reset: () => void;
}

export type AuthStore = AuthStoreState & AuthStoreActions;

const initialState: AuthStoreState = {
  status: "idle",
  userId: null,
  email: null,
  isAnonymous: false,
  session: null,
  errorMessage: null,
  hasDismissedBindEmailPrompt: false,
  autoAnonymousEnabled: false,
  isEmailLoginDialogOpen: false,
  isBindEmailDialogOpen: false,
  authFlowIntent: null,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,

      setLoading: () => {
        set({
          status: "loading",
          errorMessage: null,
        });
      },

      setSession: (session) => {
        const anonymousFlag = Boolean(
          (session?.user as Session["user"] & { is_anonymous?: boolean } | undefined)
            ?.is_anonymous,
        );

        set((state) => ({
          status: session ? "authenticated" : "idle",
          userId: session?.user.id ?? null,
          email: session?.user.email ?? null,
          isAnonymous: anonymousFlag,
          session,
          errorMessage: null,
          hasDismissedBindEmailPrompt: session?.user.email
            ? true
            : state.hasDismissedBindEmailPrompt,
          autoAnonymousEnabled: session ? true : state.autoAnonymousEnabled,
          isBindEmailDialogOpen: session?.user.email ? false : state.isBindEmailDialogOpen,
        }));
      },

      setError: (message) => {
        set({
          status: "error",
          errorMessage: message,
        });
      },

      setBindEmailPromptDismissed: (dismissed) => {
        set({
          hasDismissedBindEmailPrompt: dismissed,
        });
      },

      setAutoAnonymousEnabled: (enabled) => {
        set({
          autoAnonymousEnabled: enabled,
        });
      },

      setEmailLoginDialogOpen: (open) => {
        set({
          isEmailLoginDialogOpen: open,
        });
      },

      setBindEmailDialogOpen: (open) => {
        set({
          isBindEmailDialogOpen: open,
        });
      },

      setAuthFlowIntent: (intent) => {
        set({
          authFlowIntent: intent,
        });
      },

      clearAuthFlowIntent: () => {
        set({
          authFlowIntent: null,
        });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: "quizmem-auth-store",
      partialize: (state) => ({
        autoAnonymousEnabled: state.autoAnonymousEnabled,
        isEmailLoginDialogOpen: state.isEmailLoginDialogOpen,
        isBindEmailDialogOpen: state.isBindEmailDialogOpen,
        hasDismissedBindEmailPrompt: state.hasDismissedBindEmailPrompt,
      }),
    },
  ),
);
