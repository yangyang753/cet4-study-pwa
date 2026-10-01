# 多样化词汇复习实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一今日旧词与错题中心的随机严格词汇复习，并补齐本轮可执行的发布可靠性检查。

**Architecture:** 用纯函数生成/判分，用共享组件呈现一道词汇题；两个页面各自保存其领域状态。发布检查保持离线可用，同时明确阻断无法验证的云端配置。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Playwright, Dexie, Vite PWA

**Spec:** `docs/superpowers/specs/2026-10-01-varied-vocabulary-review-design.md`

## Global Constraints

- 正确答案不得创建新的错题记录。
- 拼写错误、漏译和误译必须进入相应错题复习。
- 不覆盖现有 IndexedDB 学习记录，不改变备份格式。
- 手机与电脑布局继续可用；发布仍支持 GitHub Pages。

## Review Focus

- 双重题型只错一个字段时，只创建对应类别的错题卡。
- 保存失败重试不得重复推进复习阶段。
- 旧版 `objective` 词义卡仍能迁移到随机主动回忆。
- 随机挖空必须至少隐藏一个字母，且不同随机值能改变位置或数量。
- 月份切换后发布测试不得因为真实日期变化而失败。

---

### Task 1: 共享词汇主动回忆组件

**Files:**
- Create: `src/features/vocabulary/VocabularyRecallExercise.tsx`
- Create: `src/features/vocabulary/VocabularyRecallExercise.test.tsx`
- Modify: `src/features/knowledge/wordReinforcement.ts`
- Test: `src/features/knowledge/wordReinforcement.test.ts`

**Interfaces:**
- Produces: `VocabularyRecallExercise({ exercise, disabled, onSubmit, onForgotten })`
- Consumes: `buildWordReinforcement`, `gradeWordReinforcement`

- [ ] 先写失败测试，覆盖四种题型、随机挖空和严格反馈。
- [ ] 运行定向测试并确认因组件不存在或行为缺失而失败。
- [ ] 实现最小共享组件和错误类型辅助函数。
- [ ] 运行定向测试并确认通过。
- [ ] 提交。

### Task 2: 今日旧词接入随机复习

**Files:**
- Modify: `src/features/vocabulary/DailyVocabularySession.tsx`
- Modify: `src/features/vocabulary/DailyVocabularySession.test.tsx`

**Interfaces:**
- Consumes: Task 1 的共享组件与错误类型。
- Produces: 正确只推进状态，错误按类型创建错题卡的今日旧词流程。

- [ ] 先写失败测试，覆盖正确不入错题、拼写错误入拼写卡、漏译入词义卡和题型随机变化。
- [ ] 确认失败原因是旧固定挖空流程。
- [ ] 替换旧词复习 UI 与提交逻辑，保存失败保留答案。
- [ ] 运行定向测试并确认通过。
- [ ] 提交。

### Task 3: 错题中心词汇卡统一随机复习

**Files:**
- Modify: `src/features/review/ReviewPage.tsx`
- Modify: `src/features/review/ReviewPage.test.tsx`

**Interfaces:**
- Consumes: Task 1 的共享组件与错误类型。
- Produces: 所有词汇复习卡进入随机主动回忆；正确不新增卡，错误更新对应卡。

- [ ] 先写失败测试，覆盖旧 `objective` 卡、正确无新增卡和双重题型错误分流。
- [ ] 确认测试因旧分支 UI 失败。
- [ ] 合并三个词汇详情分支并保留调度、作答记录与知识状态更新。
- [ ] 运行定向测试并确认通过。
- [ ] 提交。

### Task 4: 日期稳定与跨浏览器发布检查

**Files:**
- Modify: `src/features/vocabulary/StrictVocabularyCheckView.test.tsx`
- Modify: `playwright.config.ts`
- Create: `tests/compat.spec.ts`
- Create: `scripts/verify-deployed-site.mts`
- Modify: `package.json`
- Modify: `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Produces: 固定日期测试、Chrome 完整测试、Firefox/WebKit 冒烟和部署后资源验证。

- [ ] 先复现日期失败并新增兼容/部署验证测试。
- [ ] 固定测试时钟；增加浏览器项目和部署后检查脚本。
- [ ] 运行相关测试并确认通过。
- [ ] 提交。

### Task 5: 全量验证与发布

**Files:**
- Modify: `README.md`（仅记录外部配置边界，如有需要）

**Interfaces:**
- Consumes: Tasks 1–4 的完整结果。
- Produces: 可部署版本和验证证据。

- [ ] 运行单元、跨浏览器、类型、代码规范、构建、内容、音频、Pages、迁移与依赖安全检查。
- [ ] 自审整个差异，修复 Critical/Important 问题。
- [ ] 推送 `main` 并确认 GitHub Pages 部署及线上冒烟检查成功。
