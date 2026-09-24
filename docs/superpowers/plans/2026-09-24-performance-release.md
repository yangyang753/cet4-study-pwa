# Performance and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the mobile startup payload and make every GitHub Pages release verifiable, accessible, and safely updateable.

**Architecture:** Lazy-load all non-dashboard routes and split stable vendor/content chunks, then enforce a bundle budget in CI. Expand browser tests for 360px layout, keyboard use, offline fallback, and PWA update behavior before deployment.

**Tech Stack:** Vite 8, React 19, vite-plugin-pwa, Playwright, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-09-24-cet4-cloud-adaptive-completion-design.md`

## Global Constraints

- GitHub Pages remains the production host and `/cet4-study-pwa/` remains the base path.
- Failed verification must prevent deployment and leave the current published version intact.
- The application remains usable offline after one successful load.
- A new service worker must ask before reloading an active study session.

## Review Focus

- Deep links must load after route lazy-loading on GitHub Pages.
- A rejected dynamic import must show the router error path instead of a blank screen.
- The 360px layout must not horizontally scroll on core pages.
- Keyboard-only users must reach and activate primary actions with visible focus.
- Updating the service worker must not discard unsaved writing, translation, or exam state.

---

### Task 1: Lazy-load route modules and split production chunks

**Files:**
- Modify: `src/app/router.tsx`
- Modify: `vite.config.ts`
- Test: `src/app/router.test.tsx`

**Interfaces:**
- Keeps: existing route URLs and component exports
- Produces: separate route chunks for listening, practice, review, exam, mastery, account, diagnostic, knowledge and print

- [ ] **Step 1: Add failing route smoke tests**

For each route, render a memory router equivalent, await its unique heading, and assert the loading fallback is removed. Add one rejected-import boundary test that expects “页面暂时无法显示”.

- [ ] **Step 2: Run and establish baseline**

Run: `pnpm test --run src/app/router.test.tsx`

Expected: FAIL because the route test and full lazy-loading do not exist.

- [ ] **Step 3: Convert routes to lazy modules**

Keep only `AppShell` and `TodayPage` eager. Wrap each lazy route in a shared `RouteLoading` component with a meaningful status message. Do not change route paths.

- [ ] **Step 4: Add stable chunk grouping**

Configure Rollup `manualChunks` to isolate `react`/`react-router-dom`, `dexie`, and `@supabase/supabase-js`; allow route modules to remain dynamic chunks. Avoid one catch-all vendor chunk that exceeds the budget.

- [ ] **Step 5: Build and commit**

Run: `pnpm test --run src/app/router.test.tsx && pnpm build`

Expected: PASS and no single initial application chunk exceeds 500 KB minified.

```bash
git add src/app/router.tsx src/app/router.test.tsx vite.config.ts
git commit -m "perf: split routes and startup dependencies"
```

### Task 2: Enforce a repeatable bundle budget

**Files:**
- Create: `scripts/check-bundle-budget.mts`
- Create: `scripts/check-bundle-budget.test.ts`
- Modify: `package.json`
- Modify: `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Produces: `checkBundleBudget(files, { initialLimitBytes: 512000, assetLimitBytes: 800000 })`
- Script: `pnpm bundle:check`

- [ ] **Step 1: Write failing budget tests**

Assert a 512001-byte initial JS file fails, a 512000-byte initial file passes, a lazy 800001-byte JS asset fails, and source maps are ignored. Error output names only asset paths and sizes.

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm test --run scripts/check-bundle-budget.test.ts`

Expected: FAIL because the checker is absent.

- [ ] **Step 3: Implement manifest-based checking**

Enable Vite build manifest, find entry and dynamic JS assets, read sizes from `dist`, and exit non-zero on budget violations. Add `bundle:check` after `build` in `release:verify` and the deploy workflow.

- [ ] **Step 4: Run and commit**

Run: `pnpm build && pnpm bundle:check`

Expected: PASS with the split build.

```bash
git add scripts/check-bundle-budget.mts scripts/check-bundle-budget.test.ts package.json .github/workflows/deploy-pages.yml vite.config.ts
git commit -m "ci: enforce mobile bundle budgets"
```

### Task 3: Cover mobile accessibility and safe PWA updates

**Files:**
- Modify: `src/components/PwaUpdateNotice.tsx`
- Create: `src/components/PwaUpdateNotice.test.tsx`
- Modify: `tests/app.spec.ts`
- Modify: `tests/offline-sync.spec.ts`
- Modify: `src/styles/global.css`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: update notice actions `立即更新` and `稍后`
- Consumes: persisted drafts/exam sessions before reload

- [ ] **Step 1: Write failing update-notice tests**

Mock `registerSW`, trigger `onNeedRefresh`, assert no automatic reload, assert “稍后” dismisses, and assert “立即更新” calls the returned updater with `true` exactly once.

- [ ] **Step 2: Add mobile and keyboard browser assertions**

At viewport `360x800`, visit `/today`, `/listen`, `/practice`, `/review`, `/exam`, `/account`, and assert `document.documentElement.scrollWidth <= window.innerWidth`. Tab to the primary action on each page and assert visible focus and Enter activation.

Install `@axe-core/playwright` as a development dependency and run an Axe scan on `/today`, `/listen`, `/practice`, and `/account`; fail on serious or critical violations and print affected selectors.

- [ ] **Step 3: Add unsaved-state update coverage**

Create a writing draft and an active exam session, trigger the update notice, reload through the mocked updater, and assert both states restore from IndexedDB.

- [ ] **Step 4: Run and fix focused failures**

Run: `pnpm test --run src/components/PwaUpdateNotice.test.tsx && pnpm e2e tests/app.spec.ts tests/offline-sync.spec.ts`

Expected: PASS after adding any required focus styles and preserving the current explicit-update behavior.

- [ ] **Step 5: Commit**

```bash
git add src/components/PwaUpdateNotice.tsx src/components/PwaUpdateNotice.test.tsx src/styles/global.css tests/app.spec.ts tests/offline-sync.spec.ts
git commit -m "test: protect mobile access and safe updates"
```

### Task 4: Strengthen the release gate and verify production

**Files:**
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Release gate: content validation, content audit, audio audit, unit tests, browser tests, typecheck, lint, build, bundle budget, Pages verification, runtime verification

- [ ] **Step 1: Make CI run the complete release command**

Replace the shortened deploy test command with `pnpm release:verify`, and ensure cloud environment variables are available to runtime verification and build without being printed.

- [ ] **Step 2: Verify locally before push**

Run: `pnpm release:verify`

Expected: every command exits 0; the runtime check reports `offline` locally unless safe local variables are supplied.

- [ ] **Step 3: Push and watch the deployment**

Push the reviewed branch to `main`, monitor the GitHub Pages workflow to completion, and do not claim success while the workflow is pending or failed.

- [ ] **Step 4: Verify the deployed site**

Open `https://yangyang753.github.io/cet4-study-pwa/` with a cache-busting query. Check `/today`, `/listen`, `/account`, one deep link, service-worker update behavior, audio playback, and cloud status on both desktop and a phone-sized browser.

- [ ] **Step 5: Record the release and commit**

Update README with the verified deployment URL, Supabase setup link, data/privacy notes, and the exact release verification command.

```bash
git add .github/workflows/deploy-pages.yml package.json README.md
git commit -m "ci: gate GitHub Pages production releases"
```
