# 四级向前 · CET-4 Study Lab

面向英语基础薄弱学习者的响应式四级备考 PWA。当前目标考试为 **2026 年 12 月 12 日 CET-4 笔试**，每日计划固定为 60 分钟，可在电脑和手机浏览器使用。

## 已实现

- 60 分钟自适应每日计划与考试倒计时
- 800 个高频词、126 个重点搭配、15 个语法专题，可搜索筛选
- 24 组带真人感语音资源的听力训练，支持倍速、逐句与听写
- 客观题即时判分、中文解析、错因标记和间隔复习
- 写作与翻译编辑、自查清单、参考答案和本地草稿
- 6 套 125 分钟、57 题完整模拟卷，支持恢复、交卷、分项分析和明确标注的 710 分制备考估分
- 可配置 A4 每日/专项/模拟练习，题目与完整答案解析分离
- 本地优先存储、断网作答、JSON 备份恢复、PWA 安装和 Supabase 双向同步
- 桌面侧栏与手机底部导航

## 本地运行

要求 Node.js 20+ 与 pnpm。

```bash
pnpm install
pnpm dev
```

打开 `http://localhost:5173`。生产构建与预览：

```bash
pnpm build
pnpm preview:test
```

## 启用账户与跨设备同步

1. 创建 Supabase 项目。
2. 使用 Supabase CLI 按顺序应用 `supabase/migrations/001_initial.sql` 至 `005_owner_scoped_keys.sql`，按需执行 `supabase/seed.sql`。
3. 复制 `.env.example` 为 `.env.local`，填写项目 URL 和 `sb_publishable_...` Publishable Key。
4. 在 Supabase Authentication 中启用 Email 登录，然后重新启动开发服务器。

未配置 Supabase 时，应用自动进入离线体验模式；学习内容和答题记录仍优先保存到浏览器本机。

完整图文顺序见 [`docs/supabase-setup.md`](docs/supabase-setup.md)。

GitHub Pages 部署可在仓库 Settings → Secrets and variables → Actions 中同时添加 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`。两项都不设置时会安全构建为离线模式；只设置其中一项会中止部署，避免产生无法登录的半配置版本。网页端仅使用 `sb_publishable_...` 公钥，禁止配置 Secret Key 或 `service_role` 密钥。

## 内容维护

```bash
pnpm content:generate
pnpm content:audit
pnpm audio:generate
pnpm audio:audit
```

生成脚本需要仓库内忽略的 `tmp/cet-vocabulary` 与 `tmp/cet4-memory` 上游数据目录。已提交的 `content/v1` 和 `public/audio/v1` 可直接运行，无需重新生成。题目、篇章和听力文稿均为本项目原创，按四级题型组织，不复制历年真题原文。

词频与词义数据来源、许可见 `content/v1/LICENSE.md`。其中衍生学习内容采用 CC BY-NC-SA 4.0，仅限符合许可的非商业教育使用。

## 质量检查

```bash
pnpm content:audit
pnpm audio:audit
pnpm supabase:verify
pnpm vitest run
pnpm typecheck
pnpm build
pnpm e2e
pnpm release:verify
```

端到端测试覆盖桌面学习路径、360px 手机布局、无障碍扫描、PWA 清单、离线重开和 A4 PDF 渲染。Windows 本机使用已安装的 Chrome，CI 自动安装 Playwright Chromium。

## 部署

`pnpm build` 生成 `dist/` 静态站点，可部署到任意 HTTPS 静态托管服务。GitHub Actions 已配置 Pages 发布、仓库子路径、404 路由回退、可选云端密钥与发布前检查。其他托管平台需要将未知路径回退到 `index.html`。PWA 与服务工作线程在 HTTPS 或 localhost 下启用。

仓库已提供 `vercel.json`，可直接运行 `vercel --prod` 发布到 Vercel。

官方考试信息：[全国大学英语四、六级考试报名网](https://cet-kw.neea.edu.cn/)。
