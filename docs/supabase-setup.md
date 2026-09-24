# Supabase 免费项目配置

1. 使用自己的邮箱或 GitHub 账号登录 Supabase，并创建免费项目。项目密码只用于控制台和 CLI，不要发给任何人。
2. 在项目 Settings → API 复制 Project URL 与以 `sb_publishable_` 开头的 Publishable Key。不要复制 Secret Key 或 `service_role` Key。
3. 在本机运行 `pnpm dlx supabase@latest login`，再运行 `pnpm dlx supabase@latest link` 并从提示中选择刚创建的项目。
4. 先运行 `pnpm supabase:verify` 检查迁移契约，再运行 `pnpm dlx supabase@latest db push`，确认迁移 `001`、`002`、`003`、`004`、`005` 全部应用。
5. 在 Authentication → URL Configuration 中，把线上地址 `https://yangyang753.github.io/cet4-study-pwa/` 设为 Site URL，并加入 `https://yangyang753.github.io/cet4-study-pwa/recover` 作为 Redirect URL。
6. 在 GitHub 仓库 Settings → Secrets and variables → Actions 添加 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`。
7. 重新运行 Deploy GitHub Pages 工作流。账户页应从“仅保存在本机”变为可注册登录状态。

本地开发时复制 `.env.example` 为 `.env.local` 并填写相同两项。`.env.local` 已被 Git 忽略，不要提交。
