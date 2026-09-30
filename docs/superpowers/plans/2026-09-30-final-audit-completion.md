# Final Audit Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐词汇总巩固、复习约束、评分可信度、旧浏览器兼容、全量内容审计和云同步部署保护。

**Architecture:** 在既有 React/Dexie/PWA 架构上新增小型纯函数模块，并由现有页面消费；不修改数据库 schema。发布脚本负责内容和云模式契约，组件及 Playwright 测试验证用户可见行为。

**Tech Stack:** React 19、TypeScript、Vitest、Testing Library、Playwright、Vite、Supabase。

**Spec:** `docs/superpowers/specs/2026-09-30-final-audit-completion-design.md`

## Global Constraints

- 不清空或迁移现有学习记录。
- 不提交 Supabase URL、Publishable Key、Secret Key 或 service-role Key。
- 生产内容继续声明为原创仿真练习，不冒充官方真题或官方评分。
- 手机 360px 宽度和离线模式必须继续可用。

## Review Focus

- 一题队列、连续固定随机数和答题后状态变化时仍不得重复或跳题。
- 未到期卡片在时区边界上不得启动正式复习。
- `crypto.randomUUID` 缺失时生成的 ID 必须非空且连续调用不重复。
- 任意 v1 内容缺少题干、答案、引用或音频路径时发布审计必须失败。
- 强制云同步模式不得泄露密钥值，且缺少任一配置时必须失败。

---

### Task 1: 无重复总巩固轮次

**Files:**
- Create: `src/features/knowledge/aggregateReviewSession.ts`
- Create: `src/features/knowledge/aggregateReviewSession.test.ts`
- Modify: `src/features/knowledge/KnowledgePage.tsx`
- Modify: `src/features/knowledge/KnowledgePage.test.tsx`
- Modify: `src/features/knowledge/knowledge.css`

**Interfaces:**
- Produces: `createAggregateReviewSession(ids, random)`、`recordAggregateReviewResult(session, correct)`。

- [ ] 写失败测试：固定队列不重复，答完显示正确/遗忘/总数总结。
- [ ] 运行定向测试并确认因缺少会话实现而失败。
- [ ] 实现纯函数和页面会话 UI。
- [ ] 运行知识库测试和完整单元测试。
- [ ] 提交。

### Task 2: 到期约束与兼容 ID

**Files:**
- Create: `src/lib/createId.ts`
- Create: `src/lib/createId.test.ts`
- Modify: production call sites using `crypto.randomUUID()`
- Modify: `src/features/review/ReviewPage.tsx`
- Modify: `src/features/review/ReviewPage.test.tsx`

**Interfaces:**
- Produces: `createId(cryptoLike?, now?, random?)`。

- [ ] 写失败测试：缺少 `randomUUID` 仍生成不重复 ID；未来卡片不可启动。
- [ ] 运行并确认预期失败。
- [ ] 实现兼容 ID 并替换生产调用；锁定未来复习。
- [ ] 运行定向和完整单元测试。
- [ ] 提交。

### Task 3: 评分可信度与全量内容审计

**Files:**
- Modify: `src/features/diagnostic/DiagnosticPage.tsx`
- Modify: `src/features/dashboard/TodayPage.tsx`
- Modify: related tests
- Modify: `src/content/contentAudit.ts`
- Modify: `src/content/contentAudit.test.ts`
- Modify: `scripts/audit-content.mts`

**Interfaces:**
- Produces: `auditContentShapes(inventory)`。

- [ ] 写失败测试：显示题数和初步可信度；缺字段/越界答案/断裂引用会被审计发现。
- [ ] 运行并确认预期失败。
- [ ] 实现显示与全量结构审计。
- [ ] 运行内容审计、定向测试和完整单元测试。
- [ ] 提交。

### Task 4: 云同步部署保护

**Files:**
- Modify: `scripts/verify-runtime-config.mts`
- Modify: `scripts/verify-runtime-config.test.ts`
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `docs/supabase-setup.md`
- Modify: `package.json`

**Interfaces:**
- Produces: `runtime:verify:cloud` 严格验证命令和 `REQUIRE_CLOUD_SYNC` 部署开关。

- [ ] 写失败测试：严格模式在离线配置下失败、云配置下通过且不输出密钥。
- [ ] 运行并确认预期失败。
- [ ] 实现脚本、工作流保护和文档。
- [ ] 运行脚本测试与迁移验证。
- [ ] 提交。

### Task 5: 浏览器回归与发布验证

**Files:**
- Modify: `tests/app.spec.ts`
- Modify: `tests/offline-sync.spec.ts` as needed

**Interfaces:**
- Consumes: Tasks 1–4 的用户可见行为。

- [ ] 写浏览器回归，覆盖总巩固启动/推进、估分说明、账户同步状态及主要导航按钮。
- [ ] 运行测试并修正真实回归。
- [ ] 运行 `pnpm release:verify` 与 `pnpm audit --prod`。
- [ ] 提交并推送 `main`，检查部署结果。
