# 中国文化每日翻译与学习可靠性实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 每日用当天高频词完成原创中国文化汉译英，并修复模考保存、听力、计时和诊断可靠性问题。

**Architecture:** 新增独立文化翻译题库、日期选择器和目标词检测器，由现有词汇调度与每日词汇会话消费；模考持久化和阶段模型分别封装，诊断恢复使用严格解析。所有数据继续通过现有 LearningRepository 与 Dexie 保存。

**Tech Stack:** TypeScript 6、React 19、Dexie、Vitest、Testing Library、Playwright、Vite PWA。

**Spec:** `docs/superpowers/specs/2026-09-26-culture-translation-reliability-design.md`

## Global Constraints

- 新增内容必须原创，不复制历年真题原文或参考答案。
- 默认每日总计划严格保持 60 分钟，文化翻译包含在词汇块内。
- 到期旧词优先；文化目标词不得重复占用新词、到期词和强化词列表。
- 漏用目标词自动降级并进入错题，覆盖词不能直接标记稳定掌握。
- 保存失败保留用户输入并提供幂等重试。
- 不把 Supabase 密钥或任何账户凭据提交到仓库。
- 保持旧记录、备份、离线 PWA、A4 打印和旧诊断兼容。

## Review Focus

- 今日文化题的全部目标词已经 mastered 且未到期时，仍应作为翻译强化词出现且不重复。
- 文化翻译保存一半失败时，全文和稳定 attempt ID 必须保留，重试不能产生重复记录。
- 模考 IndexedDB 拒绝写入时必须显示错误并阻止交卷、切题和切段。
- 听力同一题组切题后不得从头创建可回放播放器或丢失进度。
- 损坏诊断 answers 数组或过期档案不能导致 NaN 分数、白屏或无提示的陈旧计划。

---

### Task 1: 原创中国文化题库与每日目标词调度

**Files:**
- Create: `content/v1/cultureTranslations.json`
- Create: `src/features/translation/cultureTranslation.ts`
- Create: `src/features/translation/cultureTranslation.test.ts`
- Modify: `src/features/vocabulary/vocabularySchedule.ts`
- Modify: `src/features/vocabulary/vocabularySchedule.test.ts`
- Modify: `scripts/audit-content.mts`

**Interfaces:**
- Produces: `CultureTranslationPrompt`, `selectDailyCultureTranslation(prompts, date)`, `evaluateCultureTranslation(prompt, answer)`.
- Extends: `buildVocabularyWorkload(..., options?: { cultureWordIds?: string[] })` with `cultureWords` in its result.

- [ ] Write failing tests for stable date selection, target-word inflections, missing-word detection, content integrity, and non-duplicated target-word scheduling.
- [ ] Run focused tests and verify RED.
- [ ] Add at least 24 original Chinese-culture prompts and implement selection/evaluation/scheduling.
- [ ] Run focused tests, content audit, and typecheck; verify GREEN.
- [ ] Commit `feat: add daily Chinese culture translation content`.

### Task 2: 接入每日词汇学习与错词回流

**Files:**
- Create: `src/features/translation/DailyCultureTranslation.tsx`
- Create: `src/features/translation/DailyCultureTranslation.test.tsx`
- Modify: `src/features/vocabulary/DailyVocabularySession.tsx`
- Modify: `src/features/vocabulary/DailyVocabularySession.test.tsx`
- Modify: `src/features/dashboard/TodayPage.tsx`
- Modify: `src/features/dashboard/TodayPage.test.tsx`
- Modify: `src/features/practice/practice.css`

**Interfaces:**
- Consumes: Task 1 prompt selector, evaluator, and `cultureWords`.
- Produces: a persisted diagnostic-style translation attempt with stable ID and automatic review/knowledge updates.

- [ ] Write failing component tests for phase order, no-new-word fallback, missed-word demotion, retry idempotency, and Today topic copy.
- [ ] Run focused tests and verify RED.
- [ ] Implement the daily culture translation phase and dashboard summary without increasing total plan minutes.
- [ ] Run focused tests and typecheck; verify GREEN.
- [ ] Commit `feat: practice Chinese culture with daily vocabulary`.

### Task 3: 模考保存状态与真实听力流程

**Files:**
- Create: `src/features/exam/useExamPersistence.ts`
- Create: `src/features/exam/useExamPersistence.test.tsx`
- Modify: `src/features/exam/ExamSession.tsx`
- Modify: `src/features/exam/ExamSession.test.tsx`
- Modify: `src/features/exam/exam.css`

**Interfaces:**
- Produces: `useExamPersistence(repository, session)` with `state`, `flush`, and `retry`.
- Exam navigation consumes persistence state and blocks unsafe actions on error.

- [ ] Write failing tests for rejected save, retained answer, retry, blocked navigation/submission, debounce, and one continuous group player.
- [ ] Run tests and verify RED.
- [ ] Implement visible persistence state, flush boundaries, and grouped non-seekable listening playback with load/autoplay recovery.
- [ ] Run exam tests and typecheck; verify GREEN.
- [ ] Commit `fix: protect mock answers and listening integrity`.

### Task 4: 阅读翻译共享时间与估分兼容

**Files:**
- Modify: `src/domain/exam.ts`
- Modify: `src/features/exam/examBlueprint.ts`
- Modify: `src/features/exam/examSessionReducer.ts`
- Modify: `src/features/exam/examSessionReducer.test.ts`
- Modify: `src/features/exam/ExamSession.tsx`
- Modify: `src/features/exam/ExamSession.test.tsx`
- Modify: `src/features/exam/estimateCetScore.test.ts`

**Interfaces:**
- Produces: shared deadline group metadata while preserving four score sections.

- [ ] Write failing tests that reading and translation share one 70-minute deadline and remain mutually navigable while earlier sections stay locked.
- [ ] Run tests and verify RED.
- [ ] Implement grouped deadlines/navigation and migration of recoverable version-one sessions.
- [ ] Run exam suite and typecheck; verify GREEN.
- [ ] Commit `fix: share mock reading and translation time`.

### Task 5: 诊断恢复、复测提醒与主观评分防滥用

**Files:**
- Modify: `src/features/diagnostic/diagnosticSession.ts`
- Modify: `src/features/diagnostic/diagnosticSession.test.ts`
- Create: `src/features/diagnostic/diagnosticFreshness.ts`
- Create: `src/features/diagnostic/diagnosticFreshness.test.ts`
- Modify: `src/features/dashboard/TodayPage.tsx`
- Modify: `src/features/dashboard/TodayPage.test.tsx`
- Modify: `src/features/composition/evaluateSubjective.ts`
- Modify: `src/features/composition/evaluateSubjective.test.ts`

**Interfaces:**
- Produces: strict `restoreDiagnosticSession` validation and `diagnosticRetestReason(profile, attempts, now)`.

- [ ] Write failing tests for malformed answers, duplicate/mismatched IDs, 21-day and 30-attempt retest triggers, repeated filler, and spelling noise.
- [ ] Run focused tests and verify RED.
- [ ] Implement strict recovery, dated retest notice, and conservative subjective checks.
- [ ] Run focused tests and typecheck; verify GREEN.
- [ ] Commit `fix: harden diagnostic freshness and subjective checks`.

### Task 6: 生产兼容、移动端与发布验证

**Files:**
- Modify: `src/features/auth/AccountPage.tsx`
- Modify: `src/features/auth/AccountPage.test.tsx`
- Modify: `tests/app.spec.ts`
- Modify: `.github/workflows/deploy-pages.yml` only if a safe non-secret readiness check is required.

**Interfaces:**
- Consumes: Tasks 1–5 complete flows.
- Produces: verified local-only fallback and explicit external credential blocker for cloud sync.

- [ ] Add browser coverage for daily culture translation, save failure UI, combined exam stage, diagnostic retest, 360px layout, offline reopen, and backup round trip.
- [ ] Verify production without secrets clearly stays local-only; never claim cross-device sync.
- [ ] Run `pnpm release:verify` and complete a whole-branch review.
- [ ] Fix all Critical/Important findings with witnessed RED→GREEN tests.
- [ ] Fast-forward `main`, push GitHub, wait for Pages success, and verify deployed culture-translation copy.

