# CET-4 Learning Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace static demo behavior with a real offline learning loop backed by the full v1 content inventory.

**Architecture:** A typed content catalog adapts the existing JSON files into one question lookup. Dexie v2 stores append-only attempts, review cards, task completion, and knowledge state; repository query methods feed listening, practice, review, and dashboard pages.

**Tech Stack:** React 19, TypeScript 6, Dexie 4, Zod 4, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-23-cet4-learning-loop-design.md`

## Global Constraints

- Keep the current visual style, public GitHub Pages URL, PWA behavior, and audio controls.
- Work at 360px mobile width without horizontal overflow.
- Save locally before any network operation and never discard an answer on network failure.
- Label content as original simulated practice based on CET-4 formats and high-frequency topics.
- Do not calculate or display a fabricated official 710-point score.
- Preserve existing Dexie v1 attempts and drafts through versioned migration.

## Review Focus

- A content file with an unknown referenced ID must be isolated with a useful error instead of crashing the whole route; Task 1 tests it.
- Repeated submission clicks must create one attempt, not duplicates; Task 3 tests it.
- A learner with fewer than five attempts must see “正在积累数据” instead of a misleading percentage; Task 6 tests it.
- An attempt saved at local midnight must count toward the learner's local calendar day; Task 6 tests it.
- A review answer submitted after the exam date must still schedule a valid nonnegative interval; Task 5 tests it.

---

### Task 1: Typed v1 content catalog

**Files:**
- Create: `src/content/catalog.ts`
- Create: `src/content/catalog.test.ts`
- Modify: `src/domain/content.ts`
- Modify: `src/content/contentAudit.ts`

**Interfaces:**
- Consumes: JSON arrays in `content/v1/*.json`.
- Produces: `contentCatalog`, `getQuestion(id: string): CatalogQuestion | null`, `getPracticeItems(kind: PracticeKind): CatalogQuestion[]`, and `validateCatalogReferences(): string[]`.

- [ ] **Step 1: Write failing catalog tests**

```ts
expect(contentCatalog.listening).toHaveLength(24);
expect(contentCatalog.reading).toHaveLength(30);
expect(getQuestion('listen-01:q1')?.correctAnswer).toBe('B');
expect(getPracticeItems('translation')).toHaveLength(12);
expect(validateCatalogReferences()).toEqual([]);
```

- [ ] **Step 2: Run the focused test**

Run: `pnpm test --run src/content/catalog.test.ts`
Expected: FAIL because `catalog.ts` does not exist.

- [ ] **Step 3: Implement adapters and lookup maps**

```ts
export type PracticeKind = 'vocabulary' | 'grammar' | 'listening' | 'reading' | 'translation' | 'writing';
export interface CatalogQuestion extends Question { groupId: string; passage?: string; audioSrc?: string }
export const contentCatalog = { vocabulary, collocations, grammar, listening, reading, translation, writing, mocks };
export function getQuestion(id: string) { return questionById.get(id) ?? null; }
export function getPracticeItems(kind: PracticeKind) { return questionsByKind[kind]; }
```

Convert zero-based JSON answer indexes to `A`–`D`, generate stable IDs such as `listen-01:q1`, and return reference errors without throwing during route rendering.

- [ ] **Step 4: Run catalog and content audits**

Run: `pnpm test --run src/content/catalog.test.ts src/content/contentAudit.test.ts && pnpm content:audit`
Expected: PASS with 24 listening, 30 reading, 12 translation, 12 writing, and 6 mock records.

- [ ] **Step 5: Commit**

```bash
git add src/content src/domain/content.ts
git commit -m "feat: add typed v1 content catalog"
```

### Task 2: Offline learning records and repository queries

**Files:**
- Modify: `src/domain/attempt.ts`
- Create: `src/domain/learning.ts`
- Modify: `src/data/localDb.ts`
- Modify: `src/data/repositories/LearningRepository.ts`
- Modify: `src/data/repositories/DexieLearningRepository.ts`
- Create: `src/data/repositories/DexieLearningRepository.test.ts`

**Interfaces:**
- Consumes: `CatalogQuestion.id` from Task 1.
- Produces: `ReviewCard`, `StudyTaskCompletion`, `KnowledgeState`, `UserSettings`, `saveAttemptOnce`, `listAttempts`, `upsertReviewCard`, `listDueReviews`, `completeTask`, `saveUserSettings`, and `getDashboardSnapshot`.

- [ ] **Step 1: Write failing repository tests**

```ts
await repo.saveAttemptOnce(attempt);
await repo.saveAttemptOnce(attempt);
expect(await repo.listAttempts()).toHaveLength(1);
await repo.upsertReviewCard(reviewCard);
expect(await repo.listDueReviews('2026-09-23T12:00:00.000Z')).toEqual([reviewCard]);
```

Also seed a Dexie v1 database, reopen it as v2, and assert the original attempt and draft remain readable.

- [ ] **Step 2: Run repository tests**

Run: `pnpm test --run src/data/repositories/DexieLearningRepository.test.ts`
Expected: FAIL because the v2 tables and query methods do not exist.

- [ ] **Step 3: Add models and Dexie v2 migration**

```ts
export interface ReviewCard { id: string; questionId: string; stage: number; nextReviewAt: string; lastCorrect: boolean; updatedAt: string }
export interface StudyTaskCompletion { id: string; date: string; taskId: string; kind: StudyKind; completedAt: string }
export interface KnowledgeState { id: string; itemId: string; status: 'learning' | 'review' | 'mastered'; favorite: boolean; updatedAt: string }
export interface UserSettings { id: 'current'; examDate: string; dailyMinutes: number; playbackRate: number; updatedAt: string }
```

Define Dexie v2 stores for `reviewCards`, `taskCompletions`, `knowledgeStates`, and `settings`; retain all v1 stores unchanged.

- [ ] **Step 4: Implement idempotent writes and queries**

Use `put` by UUID for append-only attempts, a transaction for attempt plus review update, and indexed due-date/date queries. Set `Attempt.contentVersion`, `kind`, `mode`, and `deviceId` while accepting legacy records with optional fields.

- [ ] **Step 5: Run repository and existing sync tests**

Run: `pnpm test --run src/data/repositories/DexieLearningRepository.test.ts src/data/sync/SyncEngine.test.ts`
Expected: PASS, including v1-to-v2 preservation.

- [ ] **Step 6: Commit**

```bash
git add src/domain src/data
git commit -m "feat: persist learning progress and review state"
```

### Task 3: Listening submission, grading, and persistence

**Files:**
- Modify: `src/features/listening/ListeningPage.tsx`
- Modify: `src/features/listening/listening.css`
- Modify: `src/features/listening/ListeningPage.test.tsx`

**Interfaces:**
- Consumes: `getQuestion`, `saveAttemptOnce`, and `upsertReviewCard` from Tasks 1–2.
- Produces: a complete listening flow with all questions, one saved attempt per submission, and retryable local-save status.

- [ ] **Step 1: Add failing interaction tests**

```ts
await user.click(screen.getByRole('button', { name: '提交答案' }));
expect(screen.getByText('请选择一个答案')).toBeVisible();
await user.click(screen.getByLabelText(/B\./));
await user.dblClick(screen.getByRole('button', { name: '提交答案' }));
expect(repository.saveAttemptOnce).toHaveBeenCalledTimes(1);
expect(screen.getByText('回答正确')).toBeVisible();
```

Add a test that “下一题” traverses every question in the selected listening set.

- [ ] **Step 2: Run the component test**

Run: `pnpm test --run src/features/listening/ListeningPage.test.tsx`
Expected: FAIL because submit has no handler and only the first question is rendered.

- [ ] **Step 3: Implement the submission state machine**

Track `questionIndex`, `selected`, `submissionState`, `result`, and `startedAt`. Disable submit while saving or after success; save duration and create/reset the review card on wrong answers. Keep media error recovery and selected answers intact.

- [ ] **Step 4: Run listening tests**

Run: `pnpm test --run src/features/listening/ListeningPage.test.tsx src/features/practice/gradeAnswer.test.ts`
Expected: PASS with blank-answer prevention and duplicate-click protection.

- [ ] **Step 5: Commit**

```bash
git add src/features/listening
git commit -m "feat: complete listening answer workflow"
```

### Task 4: Full practice hub and subjective exercises

**Files:**
- Create: `src/features/practice/PracticeHub.tsx`
- Create: `src/features/practice/PracticeHub.test.tsx`
- Modify: `src/features/practice/ExerciseRunner.tsx`
- Modify: `src/features/practice/ExerciseRunner.test.tsx`
- Modify: `src/features/composition/SubjectiveEditor.tsx`
- Modify: `src/app/router.tsx`

**Interfaces:**
- Consumes: `getPracticeItems(kind)` and repository methods from Tasks 1–2.
- Produces: `/practice`, `/practice/:kind`, and a completion summary containing `answered`, `correct`, `durationSeconds`, and `mistakeQuestionIds`.

- [ ] **Step 1: Write failing route and runner tests**

```ts
expect(screen.getByRole('link', { name: /阅读/ })).toHaveAttribute('href', expect.stringContaining('/practice/reading'));
expect(screen.getByText(/30 套/)).toBeVisible();
expect(screen.getByRole('textbox', { name: '写作答题区' })).toBeVisible();
expect(screen.queryByText('答案解析')).not.toBeInTheDocument();
```

The last assertion runs with `mode="exam"`; add a practice-mode assertion that feedback appears immediately.

- [ ] **Step 2: Run practice tests**

Run: `pnpm test --run src/features/practice/PracticeHub.test.tsx src/features/practice/ExerciseRunner.test.tsx src/features/composition/SubjectiveEditor.test.tsx`
Expected: FAIL because the hub and catalog-driven runner do not exist.

- [ ] **Step 3: Build category routes and catalog-driven runner**

Replace starter JSON lookup with `CatalogQuestion[]`, require a nonblank response, measure elapsed seconds, save each attempt, and render an end summary. Route writing and translation questions through `SubjectiveEditor`; save submitted self-check completion without assigning an automatic correctness score.

- [ ] **Step 4: Run practice tests**

Run: `pnpm test --run src/features/practice src/features/composition`
Expected: PASS for objective feedback, exam concealment, subjective drafts, and final summary.

- [ ] **Step 5: Commit**

```bash
git add src/features/practice src/features/composition src/app/router.tsx
git commit -m "feat: connect full practice catalog"
```

### Task 5: Real review queue

**Files:**
- Modify: `src/features/review/scheduleReview.ts`
- Modify: `src/features/review/scheduleReview.test.ts`
- Modify: `src/features/review/ReviewPage.tsx`
- Create: `src/features/review/ReviewPage.test.tsx`

**Interfaces:**
- Consumes: repository due-review queries and `getQuestion`.
- Produces: `scheduleReviewStage(stage: number, correct: boolean, now: string, examDate: string)` and an interactive due-review page.

- [ ] **Step 1: Write failing scheduler and page tests**

```ts
expect(scheduleReviewStage(0, true, '2026-09-23', '2026-12-12').intervalDays).toBe(1);
expect(scheduleReviewStage(3, false, '2026-09-23', '2026-12-12').stage).toBe(0);
expect(scheduleReviewStage(4, true, '2026-12-13', '2026-12-12').intervalDays).toBeGreaterThanOrEqual(0);
await user.click(screen.getByRole('button', { name: '重新练习' }));
expect(screen.getByText(question.prompt)).toBeVisible();
```

- [ ] **Step 2: Run review tests**

Run: `pnpm test --run src/features/review`
Expected: FAIL because ReviewPage uses static items.

- [ ] **Step 3: Implement intervals and real queue UI**

Use stages `[0, 1, 3, 7, 14]`, reset wrong answers to stage 0, cap dates at the exam while allowing a zero-day interval after it, and update cards after re-practice. Add filters for due, listening, reading, vocabulary, and mastered.

- [ ] **Step 4: Run review tests**

Run: `pnpm test --run src/features/review`
Expected: PASS with real question lookup and stage updates.

- [ ] **Step 5: Commit**

```bash
git add src/features/review
git commit -m "feat: connect spaced review queue"
```

### Task 6: Real dashboard, task completion, and navigation

**Files:**
- Create: `src/features/dashboard/deriveDashboard.ts`
- Create: `src/features/dashboard/deriveDashboard.test.ts`
- Modify: `src/features/dashboard/TodayPage.tsx`
- Modify: `src/features/dashboard/TodayPage.test.tsx`
- Modify: `src/features/dashboard/ProgressCards.tsx`
- Modify: `src/features/knowledge/KnowledgePage.tsx`
- Modify: `src/features/knowledge/KnowledgePage.test.tsx`
- Modify: `src/layout/AppShell.tsx`
- Modify: `src/layout/AppShell.test.tsx`

**Interfaces:**
- Consumes: attempts, due reviews, task completion, and `planDay`.
- Produces: `deriveDashboard(attempts, completions, localDate)` with streak, weak skills, sample sufficiency, and completion state.

- [ ] **Step 1: Write failing dashboard tests**

```ts
expect(deriveDashboard([], [], '2026-09-23').hasEnoughData).toBe(false);
expect(screen.getByText('正在积累数据')).toBeVisible();
expect(screen.getByRole('link', { name: /限时模拟/ })).toHaveAttribute('href', expect.stringContaining('/exam'));
expect(screen.getByRole('link', { name: /错题/ })).toHaveAttribute('href', expect.stringContaining('/review'));
await user.click(screen.getByRole('button', { name: '标记为已掌握' }));
expect(repository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({ status: 'mastered' }));
```

Add a timezone test with an attempt at `2026-09-22T16:30:00.000Z` and Asia/Shanghai local date `2026-09-23`.

- [ ] **Step 2: Run dashboard tests**

Run: `pnpm test --run src/features/dashboard src/layout/AppShell.test.tsx`
Expected: FAIL because metrics and task cards are static.

- [ ] **Step 3: Implement derived metrics and actionable tasks**

Load the repository snapshot, choose the weakest skill only after five attempts, link each task to its route, mark completed tasks, and expose exam/review/account in both desktop and mobile navigation. Connect vocabulary, collocation, and grammar cards to favorite/review/mastered repository state. Read the user-configurable exam date and daily minutes from `UserSettings`, defaulting to `2026-12-12` and `60`.

- [ ] **Step 4: Run plan-one verification**

Run: `pnpm test --run && pnpm typecheck && pnpm lint && pnpm build`
Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard src/features/knowledge src/layout
git commit -m "feat: show real daily learning progress"
```
