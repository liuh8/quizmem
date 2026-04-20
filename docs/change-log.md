# Change Log

Append-only project log. Each entry records:

- timestamp in `YYYY-MM-DD-HH-MM`
- what was completed
- why it was done
- decisions made
- files touched

---

## 2026-04-14-00-00

- Completed:
  - Created the project documentation baseline in the new `docs/` folder
  - Wrote the initial development plan
  - Started the append-only change log
- Why:
  - The repository was empty, so we needed a shared source of truth before implementation
  - The user explicitly requested both a recorded plan and a persistent change log
- Decisions:
  - `targetDate` is defined as the first-pass completion date, not the exam date
  - `mastered` is manual only
  - wrong-book items are added on incorrect answers and removed manually only
  - the change log is append-only and uses markdown
- Files touched:
  - `docs/project-plan.md`
  - `docs/change-log.md`

## 2026-04-14-00-05

- Completed:
  - Verified the local development toolchain required for project initialization
- Why:
  - The project scaffold depends on a working Node.js runtime and package manager before any code can be generated
- Decisions:
  - Use `pnpm` as the package manager for this repository
  - Current environment is sufficient for Next.js 14+ setup
- Files touched:
  - `docs/change-log.md`

## 2026-04-14-00-20

- Completed:
  - Generated the initial Next.js application scaffold
  - Verified that the local development server starts successfully
- Why:
  - We needed a working application baseline before adding business logic, UI components, or state management
- Decisions:
  - The app scaffold currently lives in a nested `quizmem/` directory
  - Next.js version `16.2.3` is acceptable because the project requirement was `14+`
  - The next step should normalize the repository layout before more files are added
- Files touched:
  - `docs/change-log.md`

## 2026-04-14-00-23

- Completed:
  - Moved the shared project documentation into the actual Next.js project root
- Why:
  - Keeping the docs and application code under the same root makes future development, logging, and deployment work less error-prone
- Decisions:
  - `/Users/hongyuliu/Projects/QuizMem/quizmem` is now the canonical project root
  - Future code and documentation changes should happen inside this directory
- Files touched:
  - `docs/change-log.md`

## 2026-04-14-00-37

- Completed:
  - Installed the core runtime dependencies for state, dates, Supabase, styling helpers, and icons
  - Added the first batch of `shadcn/ui` components needed for onboarding and dashboard development
- Why:
  - These libraries are the foundation for the project architecture and UI implementation planned for the MVP
- Decisions:
  - Use `zinc` as the `shadcn/ui` base color because the current CLI flow no longer exposed the older terminal prompt path we expected
  - Keep using `Radix`-based `shadcn/ui` components
- Files touched:
  - `docs/change-log.md`

## 2026-04-14-00-41

- Completed:
  - Created the initial application directory structure under `src/`
  - Added `src/lib/utils.ts` to support `shadcn/ui` utility imports
- Why:
  - The generated UI components depended on a shared `cn()` helper
  - The project needed a clean folder layout before page and feature development
- Decisions:
  - Keep feature areas separated by domain under `src/components/`
  - Reserve `src/lib/` for shared infrastructure and low-level helpers
- Files touched:
  - `docs/change-log.md`
  - `src/lib/utils.ts`

## 2026-04-14-00-44

- Completed:
  - Replaced the default Next.js starter page with a QuizMem landing shell
  - Updated app metadata and global styles to match the project direction
  - Removed the Google font dependency to avoid network-coupled builds
  - Verified the app builds successfully with `next build --webpack`
- Why:
  - The project needed its own visual and semantic baseline before feature development
  - The default template content and remote font dependency were unnecessary for the MVP
- Decisions:
  - Keep the first homepage intentionally simple and product-focused
  - Use system fonts for now instead of remote font fetching
  - Treat the Turbopack build failure in this environment as a tooling constraint, not an application bug
- Files touched:
  - `docs/change-log.md`
  - `src/app/layout.tsx`
  - `src/app/page.tsx`
  - `src/app/globals.css`

## 2026-04-14-00-52

- Completed:
  - Localized the app shell content to Chinese
  - Updated the document language and metadata description to Chinese
- Why:
  - The product UI should match the target Chinese-speaking audience from the start
- Decisions:
  - Chinese is the default UI language for the product
  - The root document language is set to `zh-CN`
- Files touched:
  - `docs/change-log.md`
  - `src/app/layout.tsx`
  - `src/app/page.tsx`

## 2026-04-14-00-55

- Completed:
  - Refreshed the landing page palette from neutral gray to a lighter teal-cyan visual direction
- Why:
  - The previous landing page felt too gray and the user requested a fresher overall color tone
- Decisions:
  - Keep the UI minimal, but shift the accent system toward teal, cyan, sky, and soft emerald
  - Preserve readability and avoid overly saturated educational-app styling
- Files touched:
  - `docs/change-log.md`
  - `src/app/page.tsx`
  - `src/app/globals.css`

## 2026-04-14-00-58

- Completed:
  - Added the first version of the core TypeScript model layer under `src/types/`
  - Verified the new types with `tsc --noEmit`
- Why:
  - Scheduler logic, Zustand state, practice flows, and Supabase integration all depend on stable shared models
  - Defining the data contracts early reduces refactoring pressure later
- Decisions:
  - Use ISO date strings instead of `Date` objects in shared app state and persisted data models
  - Treat `DailyPlan` as the main UI-facing planning structure
  - Keep question, planning, and practice models in separate files for clearer ownership
- Files touched:
  - `docs/change-log.md`
  - `src/types/question.ts`
  - `src/types/plan.ts`
  - `src/types/practice.ts`
  - `src/types/index.ts`

## 2026-04-14-01-25

- Completed:
  - Extended the question model to distinguish raw source-question shapes from normalized in-app question shapes
- Why:
  - The real JSON bank uses Chinese field names and different keys than the app-facing TypeScript model
  - A normalization boundary is needed before loading the question bank into planning and practice flows
- Decisions:
  - Keep the app-facing `Question` model in normalized English field names
  - Represent the original JSON schema separately as `RawQuestion`
  - Handle source-to-app field conversion in a future loader layer instead of leaking raw fields into UI logic
- Files touched:
  - `docs/change-log.md`
  - `src/types/question.ts`

## 2026-04-14-01-28

- Completed:
  - Added the question-bank normalization layer in `src/lib/questions.ts`
  - Added placeholder JSON entry files for the three raw question-bank sources
  - Verified the project with `next build --webpack` and `tsc --noEmit`
- Why:
  - The real question bank uses a source schema that differs from the app-facing quiz model
  - The app needs a single normalized `Question[]` before planning, practice, and persistence logic can stay simple
- Decisions:
  - Generate globally unique question ids by type bucket to avoid collisions across the three raw JSON files
  - Preserve original source ids as `sourceId`
  - Normalize raw Chinese field names into the internal `Question` shape in one dedicated loader module
- Files touched:
  - `docs/change-log.md`
  - `src/types/question.ts`
  - `src/lib/questions.ts`
  - `src/data/question_base_fill.json`
  - `src/data/question_base_sc.json`
  - `src/data/question_base_tf.json`

## 2026-04-14-01-38

- Completed:
  - Implemented the first scheduler in `src/utils/scheduler.ts`
  - Simplified the raw question loader back to a single English-key JSON schema after the user corrected the source file
  - Re-verified the project with `next build --webpack` and `tsc --noEmit`
- Why:
  - The app now needs a stable planning core that can distribute 300 questions across the first-pass period and inject review tasks automatically
  - Keeping the source-question schema simple matches the real dataset and avoids unnecessary compatibility code
- Decisions:
  - `targetDate` is treated as the last day of the first-pass learning window, inclusive
  - Review tasks are still generated beyond `targetDate`
  - Raw JSON loading assumes the shared schema `id/type/question/answer/explaination/optionX`
- Files touched:
  - `docs/change-log.md`
  - `src/types/plan.ts`
  - `src/types/question.ts`
  - `src/lib/questions.ts`
  - `src/utils/scheduler.ts`

## 2026-04-14-14-20

- Completed:
  - Added a minimal anonymous Supabase auth bootstrap to the app shell
  - Added a lightweight auth store for browser session state
  - Synced the anonymous user profile and first-pass target date into `profiles`
- Why:
  - The database schema and RLS are now active, so the app needs a real authenticated `user_id` before any cloud writes can succeed
  - A minimal anonymous flow lets us keep the current no-signup MVP while still validating Supabase integration
- Decisions:
  - Use anonymous Supabase auth as the first production-safe identity layer
  - Keep auth state separate from planning state in its own Zustand store
  - Show a small non-blocking banner if cloud sync fails so local study can continue
- Files touched:
  - `docs/change-log.md`
  - `src/app/layout.tsx`
  - `src/components/shared/supabase-auth-bootstrap.tsx`
  - `src/store/useAuthStore.ts`

## 2026-04-14-14-42

- Completed:
  - Synced generated daily plans to Supabase after auth is established
  - Synced wrong-book hydration and local/cloud merge on app startup
  - Wrote practice and wrong-book answers into `user_logs`
  - Synced wrong-book add/remove actions to `wrong_books`
- Why:
  - The app already had a stable local MVP, so the next step was to make real user progress durable across refreshes and devices
  - Keeping local-first interactions while mirroring to Supabase preserves responsiveness and gives us a safer migration path
- Decisions:
  - Sync `daily_plans` from the global auth bootstrap whenever the local plan changes
  - Keep wrong-book local store as the immediate UI source of truth, then hydrate and mirror it with Supabase
  - Record answer history from both daily practice and wrong-book redo flows in `user_logs`
- Files touched:
  - `docs/change-log.md`
  - `src/components/shared/supabase-auth-bootstrap.tsx`
  - `src/components/practice/daily-practice.tsx`
  - `src/components/practice/fill-blank-preview.tsx`
  - `src/components/wrong-book/wrong-book-list.tsx`
  - `src/store/useWrongBookStore.ts`

## 2026-04-15-00-18

- Completed:
  - Added cloud readback for `profiles` and `daily_plans`
  - Reconstructed local `UserPlan` state from Supabase snapshots on app startup
  - Kept wrong-book hydration local-first while making dashboard/practice recoverable from cloud plans
- Why:
  - The app could already write to Supabase, but key screens still depended mainly on local Zustand state
  - Reading cloud state on startup is the next step toward cross-refresh and future cross-device continuity
- Decisions:
  - Prefer restoring the full plan from Supabase when cloud plan data exists
  - Rebuild `targetQuestionIds` from the generated baseline plan while overlaying persisted daily progress
  - Keep the current database schema and restore plan shape in application code instead of migrating the table again immediately
- Files touched:
  - `docs/change-log.md`
  - `src/components/shared/supabase-auth-bootstrap.tsx`
  - `src/lib/supabase/queries.ts`
  - `src/store/usePlanStore.ts`
  - `src/utils/scheduler.ts`

## 2026-04-15-00-46

- Completed:
  - Fixed cloud plan restoration so daily target question ids align with restored daily question ids
  - Fixed daily practice re-entry to land on the first unfinished target question after cloud restore
  - Removed temporary dashboard and practice debug panels after verification
- Why:
  - Cloud restore was bringing back completed question ids correctly, but stale target-question slices were skewing homepage progress and practice positioning
  - The temporary debug panels were only meant to isolate the restore bug and should not remain in the production UI
- Decisions:
  - Rebuild restored `targetQuestionIds` from the persisted daily `newQuestionIds` prefix instead of trusting the generated baseline blindly
  - Keep practice entry positioning tied to the restored unfinished-target index
- Files touched:
  - `docs/change-log.md`
  - `src/components/dashboard/dashboard-overview.tsx`
  - `src/components/practice/daily-practice.tsx`
  - `src/utils/scheduler.ts`

## 2026-04-15-01-08

- Completed:
  - Added an optional bind-email dialog after onboarding for anonymous users
  - Wired the dialog to Supabase anonymous-user email linking via `updateUser({ email })`
  - Kept the dialog skippable so anonymous quick-start remains the default
- Why:
  - Anonymous auth is great for instant entry, but it does not provide natural cross-device continuity until a real identity is linked
  - The user explicitly chose the product direction of “anonymous first, then optional email binding”
- Decisions:
  - Show the bind-email prompt only after onboarding is completed and cloud restore is finished
  - Use passwordless email binding instead of introducing passwords now
  - Keep the prompt dismissible so it supports the study flow instead of blocking it
- Files touched:
  - `docs/change-log.md`
  - `src/app/page.tsx`
  - `src/components/shared/bind-email-dialog.tsx`
  - `src/store/useAuthStore.ts`

## 2026-04-15-01-22

- Completed:
  - Added an in-app email OTP login dialog for returning users
  - Added logout and login entry points to the dashboard account-status card
  - Prevented automatic anonymous re-login after an explicit logout so users can switch to email login
- Why:
  - Bound-email users need a real way to come back and recover their data without relying on the anonymous bootstrap
  - The user explicitly preferred entering OTP directly inside the app rather than relying on magic-link clicks
- Decisions:
  - Use `signInWithOtp()` plus `verifyOtp()` for returning-email login
  - Open the email-login dialog from the account card and after explicit logout
  - Keep anonymous auto-entry as the default, but disable it when the user intentionally signs out
- Files touched:
  - `docs/change-log.md`
  - `src/app/page.tsx`
  - `src/components/dashboard/dashboard-overview.tsx`
  - `src/components/shared/email-login-dialog.tsx`
  - `src/components/shared/supabase-auth-bootstrap.tsx`
  - `src/store/useAuthStore.ts`

## 2026-04-15-01-34

- Completed:
  - Added a pre-onboarding auth-entry dialog with “邮箱登录” and “继续匿名使用”
  - Moved anonymous auto-entry behind an explicit user choice instead of enabling it by default
  - Updated onboarding to only appear after the user is authenticated and has chosen to continue into the study flow
- Why:
  - Returning users on a new device should see login choices first, not be pushed into creating a new learning plan
  - The user explicitly asked to move the login decision ahead of plan selection while still allowing anonymous usage
- Decisions:
  - Default to no automatic anonymous session on a truly fresh device
  - Keep anonymous entry one tap away, but require an explicit choice
  - Do not add account switching / rebind complexity in this round
- Files touched:
  - `docs/change-log.md`
  - `src/app/page.tsx`
  - `src/components/onboarding/onboarding-dialog.tsx`
  - `src/components/shared/auth-entry-dialog.tsx`
  - `src/store/useAuthStore.ts`

## 2026-04-15-01-48

- Completed:
  - Cleaned up account/onboarding/practice state code after the auth flow was validated
  - Removed synchronous setState-in-effect patterns flagged by ESLint
  - Stabilized daily practice derived arrays used by hook dependencies
  - Verified the project with ESLint and production build
- Why:
  - The login-first flow now works, so the code needed a stability pass before continuing feature work
  - React Compiler lint rules flagged a few state sync patterns that could cause cascading renders
- Decisions:
  - Prefer derived values and keyed component remounts over effect-driven local state syncing
  - Keep the current product flow unchanged while improving maintainability
- Files touched:
  - `docs/change-log.md`
  - `src/components/onboarding/onboarding-dialog.tsx`
  - `src/components/practice/daily-practice.tsx`
  - `src/components/practice/fill-blank-preview.tsx`
  - `src/components/shared/bind-email-dialog.tsx`

## 2026-04-20-11-10

- Completed:
  - Fixed the account-switch restore path so a newly logged-in `userId` now hydrates plan/session data before any profile or daily-plan sync can run
  - Added local store resets for daily practice sessions and wrong-book state when the authenticated user changes
  - Added a Supabase RPC helper and schema function to clean business-table data for a replaced anonymous user after login
  - Re-verified the project with `pnpm exec eslint .` and `pnpm build --webpack`
- Why:
  - Users could anonymously enter the app, then log into an existing account and still see the anonymous user's today's plan
  - The root cause was a race between “sync current local plan” and “hydrate the new user's cloud plan”
  - Repeated anonymous-then-login flows could leave behind stale anonymous rows in `profiles`, `daily_plans`, `user_logs`, and `wrong_books`
- Decisions:
  - Account switching now trusts the new `userId` cloud state first and blocks plan/profile syncing until that hydration completes
  - Anonymous cleanup is scoped to business tables only for now; `auth.users` rows are intentionally left untouched
  - The cleanup path uses a dedicated SQL function so the app can remove old anonymous business data after the session has switched to the real user
- Files touched:
  - `docs/change-log.md`
  - `supabase/schema.sql`
  - `src/components/shared/supabase-auth-bootstrap.tsx`
  - `src/lib/supabase/queries.ts`
  - `src/store/useSessionStore.ts`
  - `src/store/useWrongBookStore.ts`
  - `src/types/supabase.ts`

## 2026-04-16-11-20

- Completed:
  - Added intent-aware full-screen loading feedback for login restore, anonymous entry, and register-before-onboarding flows
  - Added a direct `去注册并绑定邮箱` entry to the initial account-choice dialog
  - Updated the bind-email dialog with clearer spacing between the first and second email inputs
  - Made onboarding and account-entry dialogs avoid competing with the bind-email dialog
  - Re-verified the project with `pnpm exec eslint .` and `pnpm build --webpack`
- Why:
  - The auth flow previously had silent transition moments where the page looked stuck during anonymous session creation or cloud restore
  - The registration path needed to be reachable before onboarding so returning users on new devices are not forced into plan selection first
  - The second email field in the bind flow needed stronger visual separation to reduce input mistakes
- Decisions:
  - Loading feedback now appears only during real restore/setup phases, not immediately when the user merely opens the email-login form
  - The restore overlay is rendered as a full-screen centered layer instead of another card dialog
  - Restore copy varies by intent: login, anonymous entry, and register/bind each use different wording
- Files touched:
  - `docs/change-log.md`
  - `src/app/layout.tsx`
  - `src/components/onboarding/onboarding-dialog.tsx`
  - `src/components/shared/auth-entry-dialog.tsx`
  - `src/components/shared/bind-email-dialog.tsx`
  - `src/components/shared/cloud-restore-overlay.tsx`
  - `src/components/shared/email-login-dialog.tsx`
  - `src/components/shared/supabase-auth-bootstrap.tsx`
  - `src/store/useAuthStore.ts`

## 2026-04-16-11-36

- Completed:
  - Fixed the anonymous-entry loading state so it no longer flashes to a blank screen before the overlay appears
  - Moved the register/bind flow onto the same early loading path so the bind intent is preserved while the anonymous session is being prepared
  - Re-verified the project with `pnpm exec eslint .` and `pnpm build --webpack`
- Why:
  - The previous implementation still had a race where the global restore state was being cleared while `userId` was temporarily null
  - That race made anonymous entry feel broken and made the register path look like it was following the wrong sequence
- Decisions:
  - Anonymous and register entry points now set the restore state immediately on click
  - The auth bootstrap only clears restore intent when the app is genuinely back in an idle, non-anonymous state
- Files touched:
  - `docs/change-log.md`
  - `src/components/shared/auth-entry-dialog.tsx`
  - `src/components/shared/email-login-dialog.tsx`
  - `src/components/shared/supabase-auth-bootstrap.tsx`

## 2026-04-16-22-34

- Completed:
  - Fixed onboarding calendar month-navigation arrow placement
  - Fixed rounded clipping for auth/login/bind-email dialog gradient panels, including mobile layouts
  - Moved the wrong-book back-home button to match the practice page position
  - Allowed manual switching between new-question and review tabs after entering the practice page
  - Re-verified the project with ESLint and a production build
- Why:
  - The user found several UI polish issues after deployment and wanted the practice page entry tab to stay as a default rather than a lock
- Decisions:
  - Practice entry links still choose the initial tab, but the in-page tabs are now user-controlled after that initial application
- Files touched:
  - `docs/change-log.md`
  - `src/components/onboarding/onboarding-dialog.tsx`
  - `src/components/shared/auth-entry-dialog.tsx`
  - `src/components/shared/email-login-dialog.tsx`
  - `src/components/shared/bind-email-dialog.tsx`
  - `src/app/wrong-book/page.tsx`
  - `src/components/wrong-book/wrong-book-list.tsx`
  - `src/components/practice/daily-practice.tsx`

## 2026-04-16-00-13

- Completed:
  - Reordered the dashboard second-row cards to: wrong book, timed quiz, reset plan, account status
  - Re-verified the project with ESLint and a production build
- Why:
  - The user wanted the most frequently used learning tools to appear first in the second row
- Decisions:
  - Kept each card's existing behavior and only changed visual/order placement
- Files touched:
  - `docs/change-log.md`
  - `src/components/dashboard/dashboard-overview.tsx`

## 2026-04-16-00-06

- Completed:
  - Split timed-quiz wrong feedback into normal wrong, timeout, and skipped states
  - Re-verified the project with ESLint and a production build
- Why:
  - Skipped questions were correctly recorded as wrong, but the UI reused the timeout message and said "time is up"
- Decisions:
  - Keep skip-as-wrong behavior, but show "已跳过，本题按错误记录" for manual skips
- Files touched:
  - `docs/change-log.md`
  - `src/components/quiz/timed-quiz.tsx`

## 2026-04-15-23-59

- Completed:
  - Added the `/quiz` timed-quiz page
  - Added a dashboard entry for timed quiz
  - Implemented each round as 18 questions: 6 fill-blank, 6 single-choice, 6 judgment
  - Prioritized today's review questions when building a timed-quiz round, then filled shortages from the full local question bank
  - Added 10-second per-question countdown, timeout/skip-as-wrong behavior, answer feedback, score summary, user log writes, and wrong-book writes
  - Re-verified the project with ESLint and a production build
- Why:
  - Timed quiz is one of the remaining core flows from the original product plan and reuses the existing question bank, answer checking, logging, and wrong-book model
- Decisions:
  - Timed quiz writes answer logs and wrong-book entries, but does not mark daily plan tasks as completed
  - Skipping a timed-quiz question is treated as wrong so quiz stats and wrong-book behavior remain honest
- Files touched:
  - `docs/change-log.md`
  - `src/app/quiz/page.tsx`
  - `src/components/quiz/timed-quiz.tsx`
  - `src/components/dashboard/dashboard-overview.tsx`

## 2026-04-15-23-47

- Completed:
  - Restored previous daily-practice answer state from Supabase `user_logs` during account login/cloud hydration
  - Added a session-store hydration action that merges cloud answers with any current local session state
  - Re-verified the project with ESLint and a production build
- Why:
  - The dashboard progress could restore from `daily_plans`, but the practice page needs `answers/submitted` session state to show right/wrong feedback on previously answered questions
- Decisions:
  - Keep `daily_plans` as the source of completion progress
  - Use the latest stored answer per question from `user_logs` to restore the UI's submitted state for completed new/review tasks
- Files touched:
  - `docs/change-log.md`
  - `src/lib/supabase/queries.ts`
  - `src/store/useSessionStore.ts`
  - `src/components/shared/supabase-auth-bootstrap.tsx`

## 2026-04-15-23-34

- Completed:
  - Fixed daily-practice re-entry when today's new-question progress is already beyond the original target count
  - Re-verified the project with ESLint and a production build
- Why:
  - When the dashboard showed progress like `18 / 16`, all original target questions were completed, so the previous target-only locator returned no preferred index and the practice page fell back to question 1
- Decisions:
  - Re-entry now first targets unfinished original planned questions, then unfinished extra-learning questions, then the completed state when all current new questions are done
- Files touched:
  - `docs/change-log.md`
  - `src/components/practice/daily-practice.tsx`

## 2026-04-15-23-20

- Completed:
  - Adjusted daily-practice re-entry so today's new-question tab returns to the first unfinished original target question
  - Preserved immediate answer feedback after submitting an answer, instead of jumping away before the user sees right/wrong state
  - Verified the project with ESLint and a production build
- Why:
  - Re-entering practice should continue from the next unfinished planned question, not from the last browsed question
  - The previous positioning fix made answer feedback feel delayed because completion state could move the rendered question too quickly
- Decisions:
  - Use a one-submit guard to skip auto-focus only for the render immediately following a submitted answer
  - Keep the re-entry auto-focus keyed by completed new-question progress so refreshed/restored sessions still land on the right next task
- Files touched:
  - `docs/change-log.md`
  - `src/components/practice/daily-practice.tsx`

## 2026-04-15-23-20

- Completed:
  - Adjusted daily-practice re-entry so today's new-question tab returns to the first unfinished original target question
  - Preserved immediate answer feedback after submitting an answer, instead of jumping away before the user sees right/wrong state
  - Verified the project with ESLint and a production build
- Why:
  - Re-entering practice should continue from the next unfinished planned question, not from the last browsed question
  - The previous positioning fix made answer feedback feel delayed because completion state could move the rendered question too quickly
- Decisions:
  - Use a one-submit guard to skip auto-focus only for the render immediately following a submitted answer
  - Keep the re-entry auto-focus keyed by completed new-question progress so refreshed/restored sessions still land on the right next task
- Files touched:
  - `docs/change-log.md`
  - `src/components/practice/daily-practice.tsx`

## 2026-04-15-02-02

- Completed:
  - Fixed slow or missing answer feedback in daily practice
  - Removed the display-layer `effectiveNewIndex` override that jumped to the next unfinished question immediately after marking the current answer complete
  - Re-verified the project with ESLint and production build
- Why:
  - Cloud-restore positioning should happen when entering the page, not every time completed question ids change after an answer
  - The old display fallback could switch questions before the current answer feedback had a chance to render
- Decisions:
  - Keep the existing entry-time autofocus effect for restored progress
  - Let explicit navigation and the 220ms correct-answer timeout handle question transitions during active practice
- Files touched:
  - `docs/change-log.md`
  - `src/components/practice/daily-practice.tsx`

## 2026-04-14-01-40

- Completed:
  - Added the first persisted Zustand plan store in `src/store/usePlanStore.ts`
  - Verified the new store with `next build --webpack` and `tsc --noEmit`
- Why:
  - The app now needs a single place to hold onboarding state, target date, generated plans, and today-task access
  - Wiring the scheduler into shared state is the foundation for the onboarding flow and dashboard
- Decisions:
  - Persist plan state locally with Zustand `persist`
  - Store the full generated `UserPlan` in the plan store instead of re-deriving it on every page render
  - Keep the first store focused on planning concerns only; practice-session state can remain separate later
- Files touched:
  - `docs/change-log.md`
  - `src/store/usePlanStore.ts`

## 2026-04-14-01-52

- Completed:
  - Built the first onboarding dialog for selecting the first-pass completion date
  - Connected the home page to the plan store
  - Replaced the static landing shell with a plan-aware dashboard overview
  - Verified the flow with `next build --webpack` and `tsc --noEmit`
- Why:
  - The project needed a real UI entry flow before meaningful product testing could begin
  - The user wanted to know when UI testing could start
- Decisions:
  - The first UI testable loop is onboarding -> generate plan -> dashboard summary
  - The onboarding dialog is non-dismissable before a plan exists
  - Dashboard action cards can be placeholders for now as long as the planning flow is real
- Files touched:
  - `docs/change-log.md`
  - `src/app/page.tsx`
  - `src/components/onboarding/onboarding-dialog.tsx`
  - `src/components/dashboard/dashboard-overview.tsx`

## 2026-04-14-02-02

- Completed:
  - Fixed the runtime crash caused by numeric option values in the single-choice question bank
  - Relaxed the overload warning threshold from 15 new questions per day to 30
  - Improved the onboarding dialog layout for mobile screens
  - Re-verified the app with `next build --webpack` and `tsc --noEmit`
- Why:
  - The user hit a real crash while generating the plan, which blocked access to the dashboard entirely
  - The first mobile onboarding layout was not yet comfortable enough for phone testing
  - The user clarified that fewer than 30 new questions per day should not be treated as heavy workload
- Decisions:
  - Normalize raw option values with `String(...)` so numeric source data can still be displayed safely
  - Treat `> 30` new questions per day as the overload threshold for the current product version
  - Make the onboarding dialog effectively full-screen on mobile before later UI refinement
- Files touched:
  - `docs/change-log.md`
  - `src/types/question.ts`
  - `src/lib/questions.ts`
  - `src/utils/scheduler.ts`
  - `src/components/onboarding/onboarding-dialog.tsx`

## 2026-04-14-02-11

- Completed:
  - Added the first `/practice` route
  - Built a daily-practice skeleton that loads today&apos;s new and review questions from the generated plan
  - Connected the dashboard CTA to the practice page
  - Verified the new route with `next build --webpack` and `tsc --noEmit`
- Why:
  - The project needed a second end-to-end UI flow after onboarding and dashboard: dashboard -> practice -> question navigation
  - A stable reading and navigation skeleton is the right base before adding answer submission, wrong-book logging, and mastery state
- Decisions:
  - The first practice version focuses on rendering questions, options, answers, and analysis
  - New questions and review questions are separated by tabs
  - Question navigation stays local in component state for now
- Files touched:
  - `docs/change-log.md`
  - `src/lib/questions.ts`
  - `src/app/practice/page.tsx`
  - `src/components/practice/daily-practice.tsx`
  - `src/components/dashboard/dashboard-overview.tsx`

## 2026-04-14-02-15

- Completed:
  - Updated the practice flow so answers and analysis appear only after the user makes a choice
  - Adjusted judgment-question options to render side by side
  - Re-verified the app with `next build --webpack` and `tsc --noEmit`
- Why:
  - The previous practice skeleton revealed answers too early and did not fit the expected interaction pattern
  - Judgment questions have short answers and use space more naturally in a single row
- Decisions:
  - Keep answer reveal state local to the practice component for now
  - Treat fill-blank questions as self-answer first, then manual reveal
- Files touched:
  - `docs/change-log.md`
  - `src/components/practice/daily-practice.tsx`

## 2026-04-14-02-23

- Completed:
  - Reduced the visual weight of the practice page header area
  - Changed the question identifier label to include the question type
  - Added fill-blank answer input and exact-match checking that ignores punctuation
  - Added stronger right/wrong visual feedback after answering
  - Added a sticky bottom navigation bar for mobile practice
  - Re-verified the app with `next build --webpack` and `tsc --noEmit`
- Why:
  - The user wanted the practice page to feel more focused on studying and less like a marketing or status page
  - Fill-blank questions needed a real input-based answering interaction
  - Mobile navigation needed to stay reachable while answering questions
- Decisions:
  - Ignore punctuation when checking fill-blank answers
  - Keep answer state local to the practice component for this stage
  - Use immediate color feedback on option buttons after an answer is chosen
- Files touched:
  - `docs/change-log.md`
  - `src/components/practice/daily-practice.tsx`

## 2026-04-14-02-34

- Completed:
  - Fixed judgment-question correctness by mapping the raw answer text to its actual option key
  - Removed the distracting explanatory header block from the main practice flow
  - Added a continue-learning path that can pull the next future new question into today and reschedule its reviews
  - Added a dedicated fill-blank preview route for focused input testing
  - Re-verified the app with `next build --webpack` and `tsc --noEmit`
- Why:
  - The judgment-answer comparison was using the wrong basis for correctness
  - The user wanted the practice page to stay focused on studying rather than explanation-heavy framing
  - The user wanted to keep learning after the daily goal without breaking later review scheduling
  - The user needed a way to test fill-blank interactions immediately
- Decisions:
  - For judgment questions, the correct answer is derived from the option text, not assumed to already be an option key
  - Continuing beyond today&apos;s new-question target rewrites that question&apos;s future review dates around the new learning day
  - Fill-blank preview is exposed as a separate route instead of waiting for the daily queue to reach those questions naturally
- Files touched:
  - `docs/change-log.md`
  - `src/store/usePlanStore.ts`
  - `src/components/practice/daily-practice.tsx`
  - `src/components/practice/fill-blank-preview.tsx`
  - `src/app/practice/fill-blank-preview/page.tsx`

## 2026-04-14-02-44

- Completed:
  - Added a persisted session store for daily practice and fill-blank preview progress
  - Improved fill-blank normalization to treat common Chinese numerals and Arabic numerals as equivalent
  - Changed the post-goal continue-learning flow into an explicit interstitial prompt
  - Re-verified the app with `next build --webpack` and `tsc --noEmit`
- Why:
  - Refreshing the page should not reset the user back to the first question or forget previous answers
  - The user wanted `二十` and `20` style answers to be recognized as the same when appropriate
  - The continue-learning action needed to be more visible and intentional after the daily goal is completed
- Decisions:
  - Practice-session state is persisted separately from the main plan store
  - Fill-blank comparison now normalizes punctuation, whitespace, and common Chinese numeral sequences
  - Continue-learning uses a dedicated confirmation state before pulling future new questions into today
- Files touched:
  - `docs/change-log.md`
  - `src/store/useSessionStore.ts`
  - `src/utils/answer.ts`
  - `src/components/practice/daily-practice.tsx`
  - `src/components/practice/fill-blank-preview.tsx`

## 2026-04-14-02-52

- Completed:
  - Fixed the practice-page session selector loop that caused the `getServerSnapshot` runtime error
  - Re-verified the app with `next build --webpack` and `tsc --noEmit`
- Why:
  - The previous selector called a getter that produced a fresh object when no session existed, which triggered React snapshot instability
- Decisions:
  - Subscribe practice components to raw persisted store slices and create fallback session objects inside the component instead of inside the selector
- Files touched:
  - `docs/change-log.md`
  - `src/store/useSessionStore.ts`
  - `src/components/practice/daily-practice.tsx`
  - `src/components/practice/fill-blank-preview.tsx`

## 2026-04-14-02-58

- Completed:
  - Locked fill-blank inputs after submission so the judged result cannot silently change afterward
  - Made the previous/next practice toolbox stay visible on larger screens as well
  - Re-verified the app with `next build --webpack` and `tsc --noEmit`
- Why:
  - Submitted answers should be stable and not be re-graded by simply editing the textarea afterward
  - Desktop practice also benefits from a consistently visible navigation toolbox
- Decisions:
  - Submitted fill-blank textareas become read-only via disabled state
  - The sticky navigation toolbox now applies on desktop, not only on mobile
- Files touched:
  - `docs/change-log.md`
  - `src/components/practice/daily-practice.tsx`
  - `src/components/practice/fill-blank-preview.tsx`

## 2026-04-14-03-02

- Completed:
  - Changed the practice navigation toolbox from sticky-in-flow to fixed-at-viewport-bottom
  - Added extra bottom padding so the fixed toolbox does not cover the last content block
  - Re-verified the app with `next build --webpack` and `tsc --noEmit`
- Why:
  - The user wanted the desktop toolbox to stay anchored at the page bottom instead of drifting with content height
- Decisions:
  - Both the daily practice page and the fill-blank preview page now use fixed bottom toolboxes
- Files touched:
  - `docs/change-log.md`
  - `src/components/practice/daily-practice.tsx`
  - `src/components/practice/fill-blank-preview.tsx`

## 2026-04-14-03-05

- Completed:
  - Locked fill-blank textareas after submission in both daily practice and preview flows
  - Kept the fixed practice toolbox anchored to the viewport bottom across desktop and mobile layouts
- Why:
  - Submitted fill-blank results should remain stable
  - The user explicitly wanted the toolbox fixed to the page bottom, not moving with content height
- Decisions:
  - The fixed bottom toolbox remains visible on desktop as well as mobile
- Files touched:
  - `docs/change-log.md`
  - `src/components/practice/daily-practice.tsx`
  - `src/components/practice/fill-blank-preview.tsx`

## 2026-04-14-03-10

- Completed:
  - Added a persisted local wrong-book store
  - Connected practice answer submission to daily task completion state
  - Added auto-advance on correct answers
  - Added automatic wrong-book insertion on incorrect answers
  - Re-verified the app with `next build --webpack` and `tsc --noEmit`
- Why:
  - The practice flow needed to start affecting real study state instead of being UI-only
  - The user explicitly requested auto-next on correct answers, wrong-book integration, and daily task write-back
- Decisions:
  - A question is marked complete for today when the user submits an answer, regardless of correctness
  - Incorrect answers are added to the local wrong-book immediately
  - Correct answers trigger a short delayed auto-advance to the next question
- Files touched:
  - `docs/change-log.md`
  - `src/store/useWrongBookStore.ts`
  - `src/components/practice/daily-practice.tsx`

## 2026-04-14-03-16

- Completed:
  - Updated the dashboard so today's cards show remaining new/review workload instead of raw totals
  - Added secondary progress text showing completed count versus today's total target
  - Re-verified the app with `pnpm build --webpack` and `pnpm exec tsc --noEmit`
- Why:
  - The user needed the home page to answer “how much is left today” instead of only “how much exists today”
  - Once extra study pushes past the original target, the remaining count should stay at 0 instead of feeling inflated
- Decisions:
  - Dashboard primary numbers now clamp at 0 for remaining counts
  - Dashboard secondary text keeps the full “已完成 X / Y” context visible for both new and review tasks
- Files touched:
  - `docs/change-log.md`
  - `src/components/dashboard/dashboard-overview.tsx`

## 2026-04-14-03-24

- Completed:
  - Updated the dashboard cards so today's new/review workload now shows completed count over the original target
  - Added direct action buttons inside the new-question and review cards
  - Replaced the old “开始今日任务” dashboard card with a wrong-book entry card
  - Added a dedicated `/wrong-book` page with a local wrong-question list and manual removal
  - Made `/practice` support `tab=new` and `tab=review` entry states from the dashboard
  - Re-verified the app with `pnpm build --webpack` and `pnpm exec tsc --noEmit`
- Why:
  - The user wanted today's workload to reflect the original target even after extra practice, such as `32 / 16`
  - The dashboard actions should lead directly to the intended flow instead of routing through a generic task card
  - Wrong-book data was already being accumulated and needed a usable UI entry point
- Decisions:
  - Dashboard primary numbers now show `已完成 / 原定目标`, while the helper text shows how many remain
  - The review card shows a disabled state when there is nothing to review today
  - The first wrong-book version is a pure list view with answer, analysis, wrong count, and manual removal
- Files touched:
  - `docs/change-log.md`
  - `src/components/dashboard/dashboard-overview.tsx`
  - `src/app/practice/page.tsx`
  - `src/components/practice/daily-practice.tsx`
  - `src/components/wrong-book/wrong-book-list.tsx`
  - `src/app/wrong-book/page.tsx`

## 2026-04-14-03-33

- Completed:
  - Preserved each day's original new-question target separately from later extra-practice additions
  - Updated the dashboard so extra practice no longer inflates today's baseline target before the original target is finished
  - Made the wrong-book page directly answerable instead of read-only
  - Re-verified the app with `pnpm build --webpack` and `pnpm exec tsc --noEmit`
- Why:
  - The user wanted today's target to stay anchored to the original plan, even if they jump ahead and study extra questions
  - Wrong-book review needed to become an actual practice surface, not only a reference list
- Decisions:
  - New-question buckets now keep `targetQuestionIds` so the dashboard can distinguish original target from extra additions
  - Before the original target is finished, dashboard progress only counts completed original-target questions
  - After the original target is finished, extra completed new questions can still show as progress beyond target such as `32 / 16`
  - Wrong-book keeps manual removal and now supports inline answering for choice, judgment, and fill-blank questions
- Files touched:
  - `docs/change-log.md`
  - `src/types/plan.ts`
  - `src/utils/scheduler.ts`
  - `src/store/usePlanStore.ts`
  - `src/components/dashboard/dashboard-overview.tsx`
  - `src/components/wrong-book/wrong-book-list.tsx`

## 2026-04-14-03-40

- Completed:
  - Tightened the extra-practice banner so it only appears when the current new-question index is already beyond today's original target
  - Normalized fill-blank submitted text before persistence and wrong-answer evaluation in daily practice
  - Re-verified the app with `pnpm build --webpack` and `pnpm exec tsc --noEmit`
- Why:
  - The extra-practice message should describe the current question state, not remain visible too early or too broadly
  - Fill-blank wrong-answer handling needed a clearer single submission path to avoid inconsistent wrong-book behavior
- Decisions:
  - The “加练题” banner is now gated by both `extraLearningState === "active"` and whether the current new-question index exceeds the original target count
  - Fill-blank answers are trimmed before answer evaluation, session persistence, and wrong-book insertion decisions
- Files touched:
  - `docs/change-log.md`
  - `src/components/practice/daily-practice.tsx`

## 2026-04-14-03-45

- Completed:
  - Fixed the `/practice?tab=new` tab count to stay on today's original new-question target instead of expanding with extra-practice questions
  - Changed fill-blank submission to pass the current textarea value directly into the submission handler
  - Re-verified the app with `pnpm build --webpack` and `pnpm exec tsc --noEmit`
- Why:
  - The user should still see today's planned target count even after manually jumping ahead into extra questions
  - Fill-blank wrong-book insertion needed a more direct current-value submission path to avoid stale-state behavior
- Decisions:
  - The tab label now reflects the original target count, not the full expanded new-question list
  - Fill-blank submit buttons now pass the live controlled input value into `submitAnswer`
- Files touched:
  - `docs/change-log.md`
  - `src/components/practice/daily-practice.tsx`

## 2026-04-14-03-49

- Completed:
  - Made daily-practice fill-blank questions submit from a local draft input state instead of relying only on the persisted session snapshot
  - Switched wrong-book insertion on incorrect daily-practice answers to call `useWrongBookStore.getState()` directly
  - Re-verified the app with `pnpm build --webpack` and `pnpm exec tsc --noEmit`
- Why:
  - Fill-blank wrong answers were still not appearing in the wrong-book, so the submission path needed to be hardened against state timing issues
- Decisions:
  - Fill-blank textareas now keep a local draft value synchronized with the stored answer
  - Wrong-book insertion on wrong answers no longer depends on the hook action closure
- Files touched:
  - `docs/change-log.md`
  - `src/components/practice/daily-practice.tsx`

## 2026-04-14-03-56

- Completed:
  - Connected the standalone fill-blank preview page to the wrong-book store
  - Updated the preview page to submit from a local draft input value before persisting and grading
  - Re-verified the app with `pnpm build --webpack` and `pnpm exec tsc --noEmit`
- Why:
  - The user had been testing fill-blank questions on `/practice/fill-blank-preview`, which previously did not write wrong answers into the wrong-book
- Decisions:
  - The preview page now behaves consistently with the main practice flow for incorrect fill-blank submissions
- Files touched:
  - `docs/change-log.md`
  - `src/components/practice/fill-blank-preview.tsx`

## 2026-04-14-04-00

- Completed:
  - Removed the temporary fill-blank debug panel from daily practice after the wrong-book behavior was verified
  - Re-verified the app with `pnpm build --webpack` and `pnpm exec tsc --noEmit`
- Why:
  - The user confirmed the fill-blank wrong-book behavior was fixed and wanted the temporary debugging traces cleaned up
- Decisions:
  - Kept the hardened fill-blank submission path in place, but removed the temporary on-screen debug output
- Files touched:
  - `docs/change-log.md`
  - `src/components/practice/daily-practice.tsx`

## 2026-04-14-04-07

- Completed:
  - Removed the remaining fill-blank test-entry buttons from the main `/practice` page
  - Re-verified the app with `pnpm build --webpack` and `pnpm exec tsc --noEmit`
- Why:
  - The user wanted the formal practice flow cleaned up so it no longer exposed temporary testing shortcuts
- Decisions:
  - The standalone fill-blank preview route still exists for direct access, but it is no longer linked from the main daily-practice screen
- Files touched:
  - `docs/change-log.md`
  - `src/components/practice/daily-practice.tsx`

## 2026-04-14-04-15

- Completed:
  - Fixed the daily-practice hook-order regression introduced during cleanup
  - Added a preferred re-entry rule for today's new questions so the view returns to the first unfinished original-target question instead of a later extra-practice question
  - Re-verified the app with `pnpm build --webpack` and `pnpm exec tsc --noEmit`
- Why:
  - Re-entering today's new questions should help the user continue the planned target, not strand them on a later exploratory question
  - The previous cleanup introduced a hook-order bug that needed immediate correction
- Decisions:
  - If today's original target is not finished, re-entering the new-question tab now snaps to the first unfinished target question
  - Extra-practice positioning is only preserved after the original target has been fully completed
- Files touched:
  - `docs/change-log.md`
  - `src/components/practice/daily-practice.tsx`

## 2026-04-14-04-27

- Completed:
  - Added Supabase environment helpers plus browser/server client factories
  - Added typed query helpers for profiles, daily plans, answer logs, and wrong-book operations
  - Added a first-pass `supabase/schema.sql` covering profiles, user logs, wrong books, daily plans, triggers, and RLS policies
  - Added `.env.example` so local setup has an explicit template
  - Re-verified the app with `pnpm build --webpack`
- Why:
  - The project had reached the point where local state alone was no longer enough; we needed a stable data-layer foundation before wiring real persistence
- Decisions:
  - `daily_plans` stores both planned and completed question-id arrays so the current local plan structure can sync without a major refactor
  - The first schema uses `auth.users` ownership plus row-level security policies scoped to `auth.uid()`
  - The current server helper uses the public anon key and is intended for authenticated app reads/writes, not privileged admin actions
- Files touched:
  - `docs/change-log.md`
  - `.env.example`
  - `supabase/schema.sql`
  - `src/types/supabase.ts`
  - `src/lib/supabase/env.ts`
  - `src/lib/supabase/client.ts`
  - `src/lib/supabase/server.ts`
  - `src/lib/supabase/queries.ts`

## 2026-04-15-01-48

- Completed:
  - Cleaned up account/onboarding/practice state code after the auth flow was validated
  - Removed synchronous setState-in-effect patterns flagged by ESLint
  - Stabilized daily practice derived arrays used by hook dependencies
  - Verified the project with ESLint and production build
- Why:
  - The login-first flow now works, so the code needed a stability pass before continuing feature work
  - React Compiler lint rules flagged a few state sync patterns that could cause cascading renders
- Decisions:
  - Prefer derived values and keyed component remounts over effect-driven local state syncing
  - Keep the current product flow unchanged while improving maintainability
- Files touched:
  - `docs/change-log.md`
  - `src/components/onboarding/onboarding-dialog.tsx`
  - `src/components/practice/daily-practice.tsx`
  - `src/components/practice/fill-blank-preview.tsx`
  - `src/components/shared/bind-email-dialog.tsx`
