# CET-4 Exam and A4 Print Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver recoverable 125-minute mock exams and configurable A4 packets with complete answer explanations.

**Architecture:** A pure exam blueprint resolves catalog references into four timed sections. A persisted exam-session reducer drives the UI and locks feedback until submission; the same resolved content feeds a deterministic print paginator.

**Tech Stack:** React 19, TypeScript 6, Dexie 4, Vitest, Testing Library, Playwright, CSS print media.

**Spec:** `docs/superpowers/specs/2026-09-23-cet4-learning-loop-design.md`

## Global Constraints

- Use writing 30 minutes, listening 25 minutes, reading 40 minutes, and translation 30 minutes, totaling 125 minutes.
- Do not reveal answers or explanations before final submission.
- Autosave every 30 seconds and on section/question changes.
- Do not display a fabricated official 710-point score.
- Keep 360px mobile and A4 print layouts usable.
- Preserve existing drafts and attempts.

## Review Focus

- Refresh exactly when a section expires must not grant extra time; Task 2 tests persisted deadlines.
- A corrupt or old-version saved session must become read-only instead of crashing; Task 2 tests it.
- Double-clicking final submit must create one immutable result; Task 3 tests it.
- Long Chinese explanations must paginate without clipping; Task 5 tests block height limits.
- Printing a packet with no subjective question must not create a blank writing page; Task 5 tests it.

---

### Task 1: Resolve and audit mock exam blueprints

**Files:**
- Create: `src/features/exam/examBlueprint.ts`
- Create: `src/features/exam/examBlueprint.test.ts`
- Modify: `src/content/catalog.ts`
- Modify: `src/content/contentAudit.test.ts`

**Interfaces:**
- Consumes: `contentCatalog.mocks` and question lookup from learning-loop Task 1.
- Produces: `resolveExam(mockId: string): ResolvedExam` with ordered `writing`, `listening`, `reading`, and `translation` sections.

- [ ] **Step 1: Write failing blueprint tests**

```ts
const exam = resolveExam('mock-1');
expect(exam.totalMinutes).toBe(125);
expect(exam.sections.map(section => section.minutes)).toEqual([30, 25, 40, 30]);
expect(exam.sections.flatMap(section => section.questions)).toHaveLength(57);
expect(() => resolveExam('missing')).toThrow('Unknown mock exam: missing');
```

- [ ] **Step 2: Run the focused test**

Run: `pnpm test --run src/features/exam/examBlueprint.test.ts`
Expected: FAIL because the resolver does not exist; if current content lacks 57 questions, the audit must report exact missing counts.

- [ ] **Step 3: Implement resolver and content audit**

```ts
export interface ExamSection { kind: 'writing' | 'listening' | 'reading' | 'translation'; minutes: number; questions: CatalogQuestion[] }
export interface ResolvedExam { id: string; title: string; contentVersion: string; totalMinutes: 125; sections: ExamSection[] }
```

Resolve IDs in official order. Expand or regenerate original simulated items where an existing mock does not reach 57 questions, then make the content audit enforce section counts and valid references.

- [ ] **Step 4: Run blueprint and content verification**

Run: `pnpm test --run src/features/exam/examBlueprint.test.ts src/content/contentAudit.test.ts && pnpm content:audit`
Expected: PASS for all six 57-question, 125-minute mocks.

- [ ] **Step 5: Commit**

```bash
git add src/features/exam src/content content/v1
git commit -m "feat: define complete CET-4 mock blueprints"
```

### Task 2: Persisted exam session reducer

**Files:**
- Create: `src/domain/exam.ts`
- Create: `src/features/exam/examSessionReducer.ts`
- Create: `src/features/exam/examSessionReducer.test.ts`
- Modify: `src/data/localDb.ts`
- Modify: `src/data/repositories/LearningRepository.ts`
- Modify: `src/data/repositories/DexieLearningRepository.ts`

**Interfaces:**
- Consumes: `ResolvedExam` from Task 1.
- Produces: `ExamSessionRecord`, `createExamSession`, `reduceExamSession`, `remainingSeconds(now)`, `saveExamSession`, and `getActiveExamSession`.

- [ ] **Step 1: Write failing reducer tests**

```ts
const session = createExamSession(exam, '2026-09-23T00:00:00.000Z');
expect(remainingSeconds(session, '2026-09-23T00:00:30.000Z')).toBe(7490);
const answered = reduceExamSession(session, { type: 'answer', questionId: 'q1', response: 'B' });
expect(answered.answers.q1).toBe('B');
expect(reduceExamSession(answered, { type: 'submit' }).status).toBe('submitted');
```

Add tests for refresh at a section deadline and content-version mismatch returning `status: 'stale'`.

- [ ] **Step 2: Run reducer tests**

Run: `pnpm test --run src/features/exam/examSessionReducer.test.ts`
Expected: FAIL because session types and reducer do not exist.

- [ ] **Step 3: Implement deadline-based timing and Dexie v3**

Store absolute section deadlines rather than decrement-only counters. Add `examSessions: 'id,status,updatedAt'` in Dexie v3 without changing previous stores. Reject answer actions after submission and mark content-version mismatch stale.

- [ ] **Step 4: Run reducer and migration tests**

Run: `pnpm test --run src/features/exam/examSessionReducer.test.ts src/data/repositories/DexieLearningRepository.test.ts`
Expected: PASS with old data retained and exact deadline recovery.

- [ ] **Step 5: Commit**

```bash
git add src/domain/exam.ts src/features/exam/examSessionReducer* src/data
git commit -m "feat: persist recoverable mock sessions"
```

### Task 3: Complete exam user interface

**Files:**
- Modify: `src/features/exam/ExamSession.tsx`
- Create: `src/features/exam/ExamSession.test.tsx`
- Create: `src/features/exam/ExamPicker.tsx`
- Create: `src/features/exam/exam.css`
- Modify: `src/app/router.tsx`

**Interfaces:**
- Consumes: exam blueprint and persisted session interfaces from Tasks 1–2.
- Produces: `/exam`, `/exam/:mockId`, autosave every 30 seconds, section locking, recovery prompt, and idempotent final submission.

- [ ] **Step 1: Write failing UI tests**

```ts
expect(screen.getByText('写作 · 30 分钟')).toBeVisible();
expect(screen.queryByText('答案解析')).not.toBeInTheDocument();
await user.dblClick(screen.getByRole('button', { name: '交卷' }));
expect(repository.saveExamSession).toHaveBeenCalledTimes(1);
expect(screen.getByRole('dialog', { name: '继续上次模考' })).toBeVisible();
```

- [ ] **Step 2: Run exam UI tests**

Run: `pnpm test --run src/features/exam/ExamSession.test.tsx`
Expected: FAIL because the current UI is a 25-minute starter runner.

- [ ] **Step 3: Implement picker, section shell, autosave, and recovery**

Use one interval for display and a 30-second persistence interval; save on every navigation action. Require confirmation for early submit, automatically submit at the final deadline, and lock completed sections in official order.

- [ ] **Step 4: Run exam UI tests**

Run: `pnpm test --run src/features/exam`
Expected: PASS with concealed feedback and one final write.

- [ ] **Step 5: Commit**

```bash
git add src/features/exam src/app/router.tsx
git commit -m "feat: add full timed mock exam flow"
```

### Task 4: Exam result analysis

**Files:**
- Modify: `src/features/exam/summarizeExam.ts`
- Modify: `src/features/exam/summarizeExam.test.ts`
- Create: `src/features/exam/ExamResult.tsx`
- Create: `src/features/exam/ExamResult.test.tsx`

**Interfaces:**
- Consumes: submitted `ExamSessionRecord` and catalog questions.
- Produces: section completion, objective accuracy, elapsed time, weak knowledge points, and subjective self-check; no official score.

- [ ] **Step 1: Write failing result tests**

```ts
expect(summary.sections.listening.accuracy).toBe(0.5);
expect(summary.weakKnowledgePoints[0]).toBe('转折定位');
expect(summary).not.toHaveProperty('officialScore');
expect(screen.getByText('主观题自查')).toBeVisible();
```

- [ ] **Step 2: Run result tests**

Run: `pnpm test --run src/features/exam/summarizeExam.test.ts src/features/exam/ExamResult.test.tsx`
Expected: FAIL because session-based section analysis is absent.

- [ ] **Step 3: Implement pure summary and result page**

Grade only objective questions, list uncompleted items, aggregate knowledge-point misses, and render rubrics for writing and translation. Save generated review cards for objective mistakes once.

- [ ] **Step 4: Run result tests and commit**

Run: `pnpm test --run src/features/exam`
Expected: PASS without an official score property.

```bash
git add src/features/exam
git commit -m "feat: explain mock exam results"
```

### Task 5: Configurable A4 packets and exact pagination

**Files:**
- Modify: `src/features/print/buildPrintPacket.ts`
- Modify: `src/features/print/buildPrintPacket.test.ts`
- Modify: `src/features/print/PrintPage.tsx`
- Modify: `src/features/print/print.css`
- Modify: `tests/print.spec.ts`

**Interfaces:**
- Consumes: catalog questions and resolved mock exams.
- Produces: `buildPrintPacket({ kind, sourceId, includeKnowledge, pageCapacity })`, numbered question pages, and separate answer pages with explanations.

- [ ] **Step 1: Write failing paginator tests**

```ts
const packet = buildPrintPacket({ kind: 'practice', questions, pageCapacity: 8 });
expect(packet.pages.every((page, index) => page.pageNumber === index + 1)).toBe(true);
expect(packet.pages.every(page => page.totalPages === packet.pages.length)).toBe(true);
expect(packet.answerPages[0].blocks[0].explanation).toBe(questions[0].explanationZh);
```

Add cases for long explanations and a packet with no subjective questions.

- [ ] **Step 2: Run print tests**

Run: `pnpm test --run src/features/print tests/print.spec.ts`
Expected: FAIL because page counts and explanations are currently hard-coded.

- [ ] **Step 3: Implement selectors, pagination, answers, and print CSS**

Offer daily, category, and mock sources. Paginate block weights deterministically, include writing space only for subjective items, and render `@page { size: A4; margin: 12mm; }` with page-break boundaries.

- [ ] **Step 4: Run plan-two verification**

Run: `pnpm test --run && pnpm e2e && pnpm typecheck && pnpm lint && pnpm build`
Expected: all commands exit 0 and the print e2e confirms answer text and calculated page numbers.

- [ ] **Step 5: Commit**

```bash
git add src/features/print tests/print.spec.ts
git commit -m "feat: generate complete A4 study packets"
```
