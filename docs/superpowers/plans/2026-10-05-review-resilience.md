# 复习界面与本机数据韧性实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完善旧词复习页，并让备份、恢复、清空、草稿和提醒在长期使用中保持一致。

**Architecture:** 复习界面只调整 DailyVocabularySession 与 VocabularyRecallExercise 的语义结构和样式；数据生命周期集中到 learningBackup 的浏览器状态白名单；草稿从仓库回填；提醒通过已保存的当日计划计算完成度。

**Tech Stack:** React 19、TypeScript、Dexie、Vitest、Testing Library、Playwright、Vite PWA

**Spec:** `docs/superpowers/specs/2026-10-05-review-resilience-design.md`

## Global Constraints

- 不显示目标英文答案或增加选择题提示。
- 旧版 schemaVersion 1 备份必须保持可导入。
- 不备份或清空设备 ID 与账户所有者。
- 不伪造云同步、后台推送、真人音频或官方评分能力。
- 所有行为修改必须先观察失败测试。

## Review Focus

- localStorage 被禁用时，数据库操作仍成功。
- 旧备份没有 browserState 时仍可导入。
- 本地已有草稿时，同步草稿不能覆盖。
- 今日计划为空或不可读取时，提醒不得误判完成。
- 360px 手机宽度下不出现横向溢出。

---

### Task 1: 旧词复习界面

**Files:**
- Modify: `src/features/vocabulary/DailyVocabularySession.tsx`
- Modify: `src/features/vocabulary/VocabularyRecallExercise.tsx`
- Modify: `src/features/practice/practice.css`
- Test: `src/features/vocabulary/DailyVocabularySession.test.tsx`
- Test: `tests/app.spec.ts`

**Interfaces:**
- Consumes: `reviewIndex`, `reviewWords`, `WordReinforcement`
- Produces: 可访问的复习进度区、单题卡与策略侧栏

- [ ] 写失败测试：显示 progressbar、已完成/剩余数和“加入错题复习”说明。
- [ ] 运行目标测试并确认因界面缺失失败。
- [ ] 实现语义结构和响应式样式，不改变判分。
- [ ] 运行组件与手机浏览器测试并确认通过。
- [ ] 提交。

### Task 2: 完整备份与清空

**Files:**
- Modify: `src/data/backup/learningBackup.ts`
- Modify: `src/data/backup/learningBackup.test.ts`
- Modify: `src/features/auth/DataManagement.tsx`
- Modify: `src/features/auth/DataManagement.test.tsx`

**Interfaces:**
- Produces: `browserState?: Record<string,string>`、白名单读取/恢复/清空行为
- Consumes: localStorage 学习键与现有 LearningBackupV1

- [ ] 写失败测试：导出/导入白名单状态、旧备份兼容、完整清空、存储不可用容错。
- [ ] 运行目标测试并确认失败原因正确。
- [ ] 实现白名单浏览器状态生命周期和清空错误提示。
- [ ] 运行目标测试并确认通过。
- [ ] 提交。

### Task 3: 导入及同步草稿回填

**Files:**
- Modify: `src/features/composition/SubjectiveEditor.tsx`
- Modify: `src/features/composition/SubjectiveEditor.test.tsx`

**Interfaces:**
- Consumes: `LearningRepository.getDrafts()`
- Produces: 仅在本地输入为空时回填同题最新草稿

- [ ] 写失败测试：仓库草稿可恢复、本地草稿优先、恢复前不空写覆盖。
- [ ] 运行测试确认失败。
- [ ] 实现异步回填与 hydration 后自动保存。
- [ ] 运行测试确认通过。
- [ ] 提交。

### Task 4: 完整计划提醒

**Files:**
- Modify: `src/components/StudyReminder.tsx`
- Modify: `src/components/StudyReminder.test.tsx`

**Interfaces:**
- Consumes: `LearningRepository.getPlan(date)` 与任务完成记录
- Produces: 全部完成才静默、部分完成显示剩余数

- [ ] 写失败测试：1/5 完成仍提醒，5/5 完成静默，无计划不误判完成。
- [ ] 运行测试确认失败。
- [ ] 实现按当日计划任务 ID 判断完成。
- [ ] 运行测试确认通过。
- [ ] 提交。

### Task 5: 集成验证与发布

**Files:**
- Modify: `tests/app.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–4 的可见行为
- Produces: 发布验证、线上版本

- [ ] 运行相关测试、typecheck、lint 与 diff check。
- [ ] 运行完整 `pnpm release:verify`。
- [ ] 自查完整差异并修复重要发现。
- [ ] 合并到 main、推送并等待 GitHub Pages 成功。
- [ ] 验证线上页面包含新版复习界面。
