# 四级诊断估分与弱项补强实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立可恢复的六项能力诊断，输出保守 CET-4 估分区间，并用两个弱项自动调整每日固定时长计划。

**Architecture:** 保留 React + Dexie 本地优先架构，新增纯函数估分器、诊断会话选择/恢复器和自适应优先级计算器。诊断 UI 只负责逐题交互和持久化，首页与计划器消费版本化诊断档案，不在组件中重复评分逻辑。

**Tech Stack:** TypeScript 6、React 19、Dexie、Vitest、Testing Library、Playwright、Vite PWA。

**Spec:** `docs/superpowers/specs/2026-09-26-adaptive-diagnostic-score-design.md`

## Global Constraints

- 标准诊断固定为词汇 3、语法 3、听力 6、阅读 6、写作 1、翻译 1。
- 初次估分区间固定为点估分上下各 55 分，并限制在 0～710。
- 估分必须明确标注“参考区间，不是官方成绩”。
- 今日计划总时长必须严格等于用户设置，默认 60 分钟；任何任务不得少于 5 分钟。
- 每个能力至少 3 次近期有效作答才覆盖该能力的诊断值。
- 必须保留旧 `diagnosticCompletedAt`、`diagnosticLevels`、备份、同步与离线兼容性。
- 不新增运行时依赖。

## Review Focus

- 本地会话包含已删除题目时应安全废弃并重新生成，不得白屏。
- 最后一题保存失败时必须保留答案并允许重试，不得显示虚假结果。
- 全对、全错或主观题规则分极端时，估分范围仍满足 `0 <= low <= point <= high <= 710`。
- 近期尝试全部来自同一能力时，只覆盖该能力，不得抹掉其他诊断弱项。
- 20 分钟计划即使存在两个弱项也不得出现负分钟、零分钟或总时长膨胀。

---

### Task 1: 版本化诊断档案与保守估分引擎

**Files:**
- Modify: `src/domain/attempt.ts`
- Modify: `src/domain/learning.ts`
- Modify: `src/features/diagnostic/diagnostic.ts`
- Modify: `src/features/diagnostic/DiagnosticPage.test.tsx`
- Test: `src/features/diagnostic/diagnosticScore.test.ts`

**Interfaces:**
- Produces: `DiagnosticProfileV2`, `DiagnosticScoreRange`, `DiagnosticSectionScores` in `domain/learning.ts`.
- Produces: `scoreDiagnostic(responses, completedAt, sessionId): DiagnosticProfileV2`.
- Produces: `rankDiagnosticWeakSkills(levels): CoreStudyKind[]`.
- Extends: `Attempt.mode` with `'diagnostic'`.

- [ ] **Step 1: Write failing score and boundary tests**

Assert 20 mixed responses produce weighted section scores, a bounded ±55 range, all six levels, and at most two ordered weak skills. Assert 6/6 listening and reading use `(correct + 1) / (count + 2)`, and zero/perfect inputs remain inside 0～710.

- [ ] **Step 2: Run tests to verify RED**

Run: `pnpm vitest run src/features/diagnostic/diagnosticScore.test.ts src/features/diagnostic/DiagnosticPage.test.tsx`
Expected: FAIL because V2 profile and section estimates do not exist.

- [ ] **Step 3: Implement profile types and pure scoring**

Accept response scores from 0～1 while preserving legacy `correct` input. Compute raw six-skill levels, smoothed listening/reading section ratios, weighted score, bounded range, and stable two-item weakness ranking.

- [ ] **Step 4: Run diagnostic tests and typecheck**

Run: `pnpm vitest run src/features/diagnostic/diagnosticScore.test.ts src/features/diagnostic/DiagnosticPage.test.tsx && pnpm typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/domain src/features/diagnostic
git commit -m "feat: add conservative diagnostic score profile"
```

### Task 2: 稳定抽题、逐题持久化与断点续测

**Files:**
- Create: `src/features/diagnostic/diagnosticSession.ts`
- Create: `src/features/diagnostic/diagnosticSession.test.ts`
- Modify: `src/features/diagnostic/DiagnosticPage.tsx`
- Modify: `src/features/diagnostic/DiagnosticPage.test.tsx`
- Modify: `src/features/composition/SubjectiveEditor.tsx`

**Interfaces:**
- Consumes: Task 1 `DiagnosticProfileV2` and `scoreDiagnostic`.
- Produces: `DiagnosticSessionV2`, `createDiagnosticSession(...)`, `restoreDiagnosticSession(...)`, `DIAGNOSTIC_SESSION_KEY`.
- Persists: one stable `Attempt` per answer with `mode: 'diagnostic'`.

- [ ] **Step 1: Write failing session selection and recovery tests**

Assert exact 3/3/6/6/1/1 composition, stable question order for one session, changed order for a new session, valid recovery, and rejection of malformed or missing-question sessions.

- [ ] **Step 2: Write failing page tests**

Assert resume/restart choices appear, saving disables forward navigation, save failure retains the answer, objective and subjective answers persist once, subjective minimums block submission, and final settings contain V2 plus legacy fields.

- [ ] **Step 3: Run tests to verify RED**

Run: `pnpm vitest run src/features/diagnostic/diagnosticSession.test.ts src/features/diagnostic/DiagnosticPage.test.tsx`
Expected: FAIL on missing session helpers and UI behavior.

- [ ] **Step 4: Implement session helpers and diagnostic UI state machine**

Use localStorage only for the unfinished session. Generate UUIDs once and retain them in serialized answers. Add a `revealFeedback?: boolean` prop to `SubjectiveEditor`, default true; diagnostic uses false so references remain hidden until completion.

- [ ] **Step 5: Run diagnostic UI tests and typecheck**

Run: `pnpm vitest run src/features/diagnostic src/features/composition/SubjectiveEditor.test.tsx && pnpm typecheck`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/diagnostic src/features/composition/SubjectiveEditor.tsx
git commit -m "feat: add resumable comprehensive diagnostic"
```

### Task 3: 双弱项证据融合与固定时长计划

**Files:**
- Create: `src/features/diagnostic/adaptivePriorities.ts`
- Create: `src/features/diagnostic/adaptivePriorities.test.ts`
- Modify: `src/features/planner/planDay.ts`
- Modify: `src/features/planner/planDay.test.ts`
- Modify: `src/features/dashboard/deriveDashboard.ts`
- Modify: `src/features/dashboard/deriveDashboard.test.ts`

**Interfaces:**
- Consumes: Task 1 `DiagnosticProfileV2` and recent normalized evidence.
- Produces: `deriveAdaptivePriorities(profile, attempts, now): LearningPriority[]` where each item has `kind`, `level`, `source`, and `attempts`.
- Extends: `PlannerInput` with `priorities?: LearningPriority[]` while keeping legacy fields operational.

- [ ] **Step 1: Write failing evidence-fusion tests**

Assert two recent answers do not replace a diagnostic skill, three do, evidence for one skill leaves all other profile levels intact, and the returned list keeps the weakest two in stable order.

- [ ] **Step 2: Write failing planner tests**

Assert vocabulary weakness increases vocabulary minutes, listening weakness increases listening minutes, writing weakness creates a writing task, two non-core weaknesses rotate by date, weak priorities are not permanently displaced by carryover, and 20/30/60-minute totals remain exact and positive.

- [ ] **Step 3: Run tests to verify RED**

Run: `pnpm vitest run src/features/diagnostic/adaptivePriorities.test.ts src/features/planner/planDay.test.ts src/features/dashboard/deriveDashboard.test.ts`
Expected: FAIL on missing priority fusion and planner input.

- [ ] **Step 4: Implement priority fusion and allocation**

Keep diagnostic values as per-skill priors; replace only skills with at least three recent weighted attempts. Add 5-minute boosts to weak fixed blocks where the budget permits and select non-core targeted work deterministically without exceeding the budget.

- [ ] **Step 5: Run planner and dashboard tests**

Run: `pnpm vitest run src/features/diagnostic/adaptivePriorities.test.ts src/features/planner/planDay.test.ts src/features/dashboard && pnpm typecheck`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/diagnostic src/features/planner src/features/dashboard
git commit -m "feat: adapt daily plan to measured weaknesses"
```

### Task 4: 估分结果、补强原因、兼容性与浏览器验收

**Files:**
- Modify: `src/features/dashboard/TodayPage.tsx`
- Modify: `src/features/dashboard/TodayPage.test.tsx`
- Modify: `src/features/dashboard/ProgressCards.tsx`
- Modify: `src/features/diagnostic/DiagnosticPage.tsx`
- Modify: `src/data/backup/learningBackup.ts`
- Modify: `src/data/backup/learningBackup.test.ts`
- Modify: `tests/app.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–3 profile, score range, and `LearningPriority[]`.
- Produces: visible score summary, gap-to-425, two weak skills, retest link, and per-task adaptation reason.

- [ ] **Step 1: Write failing result and dashboard tests**

Assert completion page and Today show point estimate, range, disclaimer, gap to 425, two weak skills, adaptation source, and retest link. Assert malformed imported profile is rejected while valid V2 survives backup round trip.

- [ ] **Step 2: Add failing browser journey coverage**

Seed a completed V2 profile in IndexedDB, open Today at desktop and 360px, and assert the estimate and diagnostic-targeted task remain visible without horizontal overflow. Cover offline reopen after visiting the page.

- [ ] **Step 3: Run tests to verify RED**

Run: `pnpm vitest run src/features/diagnostic src/features/dashboard src/data/backup/learningBackup.test.ts`
Expected: FAIL on missing V2 rendering and backup validation.

- [ ] **Step 4: Implement result/dashboard UI and compatibility validation**

Keep legacy result rendering when no V2 profile exists. Add concise Chinese copy and reuse existing responsive card styles; do not add a chart.

- [ ] **Step 5: Run focused tests, E2E, and build**

Run: `pnpm vitest run src/features/diagnostic src/features/dashboard src/features/planner src/data/backup/learningBackup.test.ts && pnpm e2e && pnpm typecheck && pnpm lint && pnpm build`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "feat: surface diagnostic score and targeted study plan"
```

### Task 5: 完整发布验证与部署

**Files:**
- Modify only for verified Critical/Important review findings.

**Interfaces:**
- Consumes: completed Tasks 1–4.
- Produces: release-ready branch with no unaddressed Critical/Important findings.

- [ ] **Step 1: Run complete release verification**

Run: `pnpm release:verify`
Expected: content, audio, unit, E2E, typecheck, lint, build, bundle, Pages, Supabase, and runtime checks all pass.

- [ ] **Step 2: Review the entire branch against the spec and Review Focus**

Use the requesting-code-review template if a reviewer tool is available; otherwise perform and ledger a self-review. Fix each Critical/Important finding with a witnessed RED→GREEN test and rerun the full suite.

- [ ] **Step 3: Commit verified fixes, if any**

```bash
git add src tests docs
git commit -m "fix: address diagnostic release review"
```

- [ ] **Step 4: Integrate and deploy using the user’s standing instruction**

Fast-forward `main`, push `origin/main`, wait for GitHub Pages success, and verify the deployed asset contains the V2 diagnostic result copy.
