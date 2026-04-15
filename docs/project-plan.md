# QuizMem Development Plan

## Project Definition

- Product name: `QuizMem`
- Goal: build a smart spaced-repetition quiz app around a user-selected first-pass completion date
- Primary platforms: mobile web first, desktop compatible
- Deployment target: Vercel

## Confirmed Product Decisions

- `targetDate` means the date by which the user wants to finish the first full pass of all questions
- If the user does not set a date, the system defaults to a 30-day plan starting from today
- If the selected date is too close and daily workload becomes too heavy, the app shows a warning but does not block progress
- `mastered` means the user manually marks a question as already mastered
- Wrong-book behavior for V1:
  - Answering incorrectly adds the question to the wrong-book
  - Answering correctly does not auto-remove it
  - Removal is manual only
- Review intervals use the simplified Ebbinghaus sequence: `1, 2, 4, 7, 15` days
- The question bank starts from local JSON, while user data and logs live in Supabase

## Build Order

### 1. Project Initialization

- Create a Next.js 14+ app with App Router and TypeScript
- Add Tailwind CSS
- Initialize `shadcn/ui`
- Install core UI components:
  - `button`
  - `card`
  - `calendar`
  - `dialog`
  - `progress`
- Install runtime dependencies:
  - `zustand`
  - `date-fns`
  - `@supabase/supabase-js`
  - `clsx`
  - `tailwind-merge`
  - `class-variance-authority`

### 2. Project Structure

- Create the initial structure under `src/`
- Separate responsibilities into:
  - `app/`
  - `components/`
  - `store/`
  - `utils/`
  - `lib/`
  - `types/`
  - `data/`

### 3. Type System

- Define `QuestionType`, `Question`
- Define planning types such as `DailyPlan`, `ReviewTask`, `UserPlan`
- Define practice session and wrong-book related types

### 4. Scheduler Core

- Implement `src/utils/scheduler.ts`
- Inputs:
  - question count
  - start date
  - target date
- Outputs:
  - generated daily plans
  - overload warning
  - derived summary data
- Rules:
  - distribute new questions evenly from start date to `targetDate`
  - attach review appearances after `1, 2, 4, 7, 15` days
  - warn when the selected date is too aggressive

### 5. Zustand State

- `usePlanStore.ts`
  - onboarding state
  - target date
  - generated plans
  - helper actions
- `useSessionStore.ts`
  - current practice mode
  - current question index
  - countdown state

### 6. Data Layer

- Add local sample JSON question bank
- Configure Supabase client
- Prepare data access helpers for:
  - profiles
  - user logs
  - wrong-book
  - daily plans

### 7. Pages

- Onboarding
- Dashboard
- Practice
- Wrong-book
- Timed quiz

### 8. UI and PWA Polish

- Optimize for mobile tap targets and layout density
- Keep visual style minimal with slate/zinc palette
- Add installable PWA basics

### 9. Verification and Deployment

- Run type-check
- Run lint
- Run production build
- Deploy to Vercel
- verify Supabase env vars in production

## Immediate Next Focus

We are starting from step 1: project initialization.

The user should first verify the local toolchain:

- `node -v` should be version 20 or newer
- `pnpm -v` should be available

After that, the project scaffold can be created and dependencies installed.
