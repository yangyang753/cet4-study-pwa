# Adaptive Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make task completion automatic, mastery checks contextual, and daily plans depend on recent normalized learning evidence.

**Architecture:** Add a pure normalization/statistics layer between raw attempts and the dashboard, then pass source question IDs through every completion path. Keep task completion and mastery state in the existing repository so the UI remains derived from persisted events.

**Tech Stack:** React 19, TypeScript 6, Vitest, Testing Library, Dexie

**Spec:** `docs/superpowers/specs/2026-09-24-cet4-cloud-adaptive-completion-design.md`

## Global Constraints

- Daily study duration remains 60 minutes by default.
- Mastery requires at least 80% correct across 3–5 contextual questions.
- Supported learning categories are exactly `vocabulary`, `grammar`, `listening`, `reading`, `writing`, and `translation`.
- Subjective feedback must not claim official CET-4 scoring or human-equivalent grading.
- Full copyrighted past papers and audio must not be copied into the repository.

## Review Focus

- Unknown raw question kinds must map safely or be ignored; the Today page must never index `taskCopy` with an unsupported key.
- Old attempts outside the recent window must not dominate the weak-skill result.
- Mastery started from listening, review, exam, or a copied URL must select valid questions and never show an empty quiz.
- Repeated completion events must remain idempotent for the same task ID.
- Fewer than five valid attempts must display “正在积累数据” instead of a misleading weakness percentage.

---

### Task 1: Normalize learning evidence and calculate recent weakness

**Files:**
- Create: `src/features/dashboard/learningEvidence.ts`
- Modify: `src/features/dashboard/deriveDashboard.ts`
- Modify: `src/features/dashboard/TodayPage.tsx`
- Test: `src/features/dashboard/learningEvidence.test.ts`
- Test: `src/features/dashboard/deriveDashboard.test.ts`

**Interfaces:**
- Produces: `normalizeStudyKind(raw: string | undefined): CoreStudyKind | null`
- Produces: `selectRecentEvidence(attempts: Attempt[], now: string, limit?: number, days?: number): NormalizedEvidence[]`
- Produces: `deriveDashboard(...).weakSkill.kind` constrained to `CoreStudyKind`

- [ ] **Step 1: Write failing normalization tests**

```ts
expect(normalizeStudyKind('conversation')).toBe('listening');
expect(normalizeStudyKind('news')).toBe('listening');
expect(normalizeStudyKind('cloze')).toBe('reading');
expect(normalizeStudyKind('unknown-kind')).toBeNull();
```

- [ ] **Step 2: Write failing recency and minimum-sample tests**

```ts
expect(selectRecentEvidence(attempts, '2026-09-24T12:00:00.000Z', 30, 14)).toHaveLength(30);
expect(deriveDashboard(fourValidAttempts, [], '2026-09-24').weakSkill).toBeNull();
expect(deriveDashboard(recentListeningFailuresWithOldGrammarFailures, [], '2026-09-24').weakSkill?.kind).toBe('listening');
```

- [ ] **Step 3: Run focused tests and confirm failure**

Run: `pnpm test --run src/features/dashboard/learningEvidence.test.ts src/features/dashboard/deriveDashboard.test.ts`

Expected: FAIL because `learningEvidence.ts` and recent-window behavior do not exist.

- [ ] **Step 4: Implement the pure evidence layer**

```ts
export type CoreStudyKind = 'vocabulary' | 'grammar' | 'listening' | 'reading' | 'writing' | 'translation';
const kindMap: Record<string, CoreStudyKind> = {
  vocabulary: 'vocabulary', grammar: 'grammar', listening: 'listening',
  conversation: 'listening', news: 'listening', lecture: 'listening',
  reading: 'reading', cloze: 'reading', matching: 'reading',
  writing: 'writing', translation: 'translation',
};
export const normalizeStudyKind = (raw?: string) => raw ? kindMap[raw] ?? null : null;
```

Filter to scored attempts, normalize kinds, keep attempts within 14 days, sort newest first, and cap at 30. Weight ordinary practice as `1`, exam as `1`, review as `0.75`, and mastery as `0.5`; require five normalized attempts overall before reporting a weakness.

- [ ] **Step 5: Remove unsafe casts from TodayPage**

Use the constrained `weakSkill.kind` directly and fall back to `listening` only when no weakness exists. Add a regression assertion that rendering with raw `conversation` attempts shows “听力” and does not throw.

- [ ] **Step 6: Run tests and commit**

Run: `pnpm test --run src/features/dashboard/learningEvidence.test.ts src/features/dashboard/deriveDashboard.test.ts src/features/dashboard/TodayPage.test.tsx`

Expected: PASS.

```bash
git add src/features/dashboard
git commit -m "fix: normalize recent learning evidence"
```

### Task 2: Preserve mastery context across every learning route

**Files:**
- Create: `src/features/mastery/masteryContext.ts`
- Modify: `src/features/mastery/MasteryCheck.tsx`
- Modify: `src/features/listening/ListeningPage.tsx`
- Modify: `src/features/review/ReviewPage.tsx`
- Modify: `src/features/exam/ExamSession.tsx`
- Modify: `src/app/router.tsx`
- Test: `src/features/mastery/MasteryCheck.test.tsx`
- Test: `src/features/listening/ListeningPage.test.tsx`
- Test: `src/features/review/ReviewPage.test.tsx`
- Test: `src/features/exam/ExamSession.test.tsx`

**Interfaces:**
- Produces: `encodeMasteryContext({ taskId, kind, sourceQuestionIds }): string`
- Produces: `decodeMasteryContext(search: URLSearchParams): MasteryContext`
- Consumes: existing `MasteryCheck` prop `sourceQuestionIds: string[]`

- [ ] **Step 1: Write failing context round-trip tests**

```ts
const query = encodeMasteryContext({ taskId: '2026-09-24:listening', kind: 'listening', sourceQuestionIds: ['l1-q1', 'l1-q2'] });
expect(decodeMasteryContext(new URLSearchParams(query))).toEqual({ taskId: '2026-09-24:listening', kind: 'listening', sourceQuestionIds: ['l1-q1', 'l1-q2'] });
```

- [ ] **Step 2: Run test and confirm failure**

Run: `pnpm test --run src/features/mastery/MasteryCheck.test.tsx`

Expected: FAIL because mastery route context encoding is absent.

- [ ] **Step 3: Implement validated context parsing**

Accept only valid `StudyKind` values, de-duplicate source IDs, cap them at 60, and fall back to the current date task ID. Invalid URL values must not throw.

- [ ] **Step 4: Pass source IDs from all completion paths**

Listening passes every submitted question ID in the set; review passes the active source question ID; exam passes objective question IDs from the submitted session. `MasteryRoute` reads the validated query context instead of rendering a generic kind-only check.

- [ ] **Step 5: Pin contextual selection behavior**

```ts
expect(selectMasteryQuestions('listening', ['listen-1-q2']).map((q) => q.id)).toContain('listen-1-q2');
expect(screen.getByText(/本次练习内容/)).toBeInTheDocument();
```

When fewer than three direct source questions exist, fill to three from matching knowledge-point questions; never return more than five.

- [ ] **Step 6: Run focused tests and commit**

Run: `pnpm test --run src/features/mastery src/features/listening/ListeningPage.test.tsx src/features/review/ReviewPage.test.tsx src/features/exam/ExamSession.test.tsx`

Expected: PASS.

```bash
git add src/features/mastery src/features/listening src/features/review src/features/exam src/app/router.tsx
git commit -m "feat: carry exercise context into mastery checks"
```

### Task 3: Make completion and remediation state explicit

**Files:**
- Modify: `src/features/mastery/MasteryCheck.tsx`
- Modify: `src/features/mastery/taskProgress.ts`
- Modify: `src/domain/learning.ts`
- Modify: `src/features/dashboard/TodayPage.tsx`
- Test: `src/features/mastery/MasteryCheck.test.tsx`
- Test: `src/features/mastery/taskProgress.test.ts`
- Test: `src/features/dashboard/TodayPage.test.tsx`

**Interfaces:**
- Produces: `MasteryOutcome = 'mastered' | 'remediation'`
- Produces: `recordMasteryOutcome(repository, taskId, correct, total, now): Promise<MasteryOutcome>`

- [ ] **Step 1: Write failing threshold and idempotency tests**

```ts
expect(await recordMasteryOutcome(repository, taskId, 4, 5, now)).toBe('mastered');
expect(await recordMasteryOutcome(repository, taskId, 3, 5, now)).toBe('remediation');
expect((await repository.getDashboardSnapshot(now)).completions.filter((x) => x.taskId === taskId)).toHaveLength(1);
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `pnpm test --run src/features/mastery src/features/dashboard/TodayPage.test.tsx`

Expected: FAIL because remediation is not a first-class outcome.

- [ ] **Step 3: Implement outcome persistence**

Persist `KnowledgeState.status = 'mastered'` for scores `>= 0.8`, otherwise `status = 'review'`. Reuse stable IDs `knowledge:${taskId}` and `completion:${taskId}` so repeated submissions update rather than duplicate.

- [ ] **Step 4: Render dashboard states and follow-up actions**

Show `未完成`, `待检测`, `需要补练`, and `已掌握`. A remediation card links back to a practice route carrying the failed source IDs; completion remains automatic and no manual completion button is rendered.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test --run src/features/mastery src/features/dashboard/TodayPage.test.tsx`

Expected: PASS.

```bash
git add src/features/mastery src/features/dashboard src/domain/learning.ts
git commit -m "feat: automate mastery and remediation states"
```

### Task 4: Add a short first-use diagnostic

**Files:**
- Create: `src/features/diagnostic/DiagnosticPage.tsx`
- Create: `src/features/diagnostic/diagnostic.ts`
- Create: `src/features/diagnostic/DiagnosticPage.test.tsx`
- Modify: `src/domain/learning.ts`
- Modify: `src/app/router.tsx`
- Modify: `src/features/dashboard/TodayPage.tsx`

**Interfaces:**
- Produces: `DiagnosticResult { completedAt: string; levels: Record<CoreStudyKind, number> }`
- Produces: `scoreDiagnostic(responses: DiagnosticResponse[]): DiagnosticResult`

- [ ] **Step 1: Write failing scoring tests**

Use a deterministic 12-question set: three each for vocabulary, grammar, listening, and reading. Assert unanswered items score zero, category values remain within `0..1`, and completion does not create an official CET score.

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm test --run src/features/diagnostic/DiagnosticPage.test.tsx`

Expected: FAIL because the feature does not exist.

- [ ] **Step 3: Implement scoring and UI**

Render one question at a time, show progress, allow “稍后进行”, and persist the result in settings as `diagnosticCompletedAt` and `diagnosticLevels`. The dashboard shows a non-blocking diagnostic card until complete.

- [ ] **Step 4: Verify keyboard and mobile behavior**

Assert radio choices are labelled, focus moves to the next heading after submit, and the page has no horizontal overflow at 360px in `tests/app.spec.ts`.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test --run src/features/diagnostic src/features/dashboard/TodayPage.test.tsx && pnpm typecheck`

Expected: PASS.

```bash
git add src/features/diagnostic src/domain/learning.ts src/app/router.tsx src/features/dashboard/TodayPage.tsx tests/app.spec.ts
git commit -m "feat: add first-use foundation diagnostic"
```

### Task 5: Add honest rubric feedback for writing and translation

**Files:**
- Create: `src/features/composition/evaluateSubjective.ts`
- Create: `src/features/composition/evaluateSubjective.test.ts`
- Modify: `src/features/composition/SubjectiveEditor.tsx`
- Modify: `src/features/composition/SubjectiveEditor.test.tsx`

**Interfaces:**
- Produces: `evaluateSubjective(kind: 'writing' | 'translation', body: string, keywords: string[]): SubjectiveFeedback`
- Produces: `SubjectiveFeedback { checks: Array<{ label: string; passed: boolean; suggestion: string }>; disclaimer: string }`

- [ ] **Step 1: Write failing rule tests**

Assert writing detects paragraph count, linking words, task length, repeated vocabulary, and basic sentence endings. Assert translation detects keyword coverage, sentence completeness, tense markers, and common fixed phrases. Empty text must return actionable failed checks without throwing.

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm test --run src/features/composition/evaluateSubjective.test.ts`

Expected: FAIL because the evaluator is absent.

- [ ] **Step 3: Implement deterministic feedback**

Return check labels, examples, and revision suggestions. Always include `这是规则化自查建议，不等同于官方阅卷或人工评分。`; do not calculate a 710-scale score.

- [ ] **Step 4: Integrate after submission and test**

Render feedback only after the learner submits, keep the draft editable, and retain reference-answer and self-check controls.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test --run src/features/composition && pnpm typecheck`

Expected: PASS.

```bash
git add src/features/composition
git commit -m "feat: add rubric-based subjective feedback"
```

