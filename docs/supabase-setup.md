# Supabase 免费项目配置

1. 使用自己的邮箱或 GitHub 账号登录 Supabase，并创建免费项目。项目密码只用于控制台和 CLI，不要发给任何人。
2. 在项目 Settings → API 复制 Project URL 与以 `sb_publishable_` 开头的 Publishable Key。不要复制 Secret Key 或 `service_role` Key。
3. 在本机运行 `pnpm dlx supabase@latest login`，再运行 `pnpm dlx supabase@latest link` 并从提示中选择刚创建的项目。
4. 先运行 `pnpm supabase:verify` 检查迁移契约，再运行 `pnpm dlx supabase@latest db push`，确认迁移 `001`、`002`、`003`、`004`、`005` 全部应用。
5. 在 Authentication → URL Configuration 中，把线上地址 `https://yangyang753.github.io/cet4-study-pwa/` 设为 Site URL，并加入 `https://yangyang753.github.io/cet4-study-pwa/recover` 作为 Redirect URL。
6. 在 GitHub 仓库 Settings → Secrets and variables → Actions 添加 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`。
7. 重新运行 Deploy GitHub Pages 工作流。账户页应从“仅保存在本机”变为可注册登录状态。

本地开发时复制 `.env.example` 为 `.env.local` 并填写相同两项。`.env.local` 已被 Git 忽略，不要提交。

## 发布模式说明

- 两项 GitHub Actions Secret 都未配置时，构建仍会成功，并以离线模式发布。练习、错题、设置和打印功能可用，但学习记录只保存在当前浏览器。
- 两项 Secret 同时配置且 Publishable Key 格式正确时，构建以云同步模式发布。
- 只配置一项、或误用 `service_role` / Secret Key 时，发布校验会失败，避免生成无法正常同步或泄露高权限凭据的版本。
- Deploy GitHub Pages 工作流会在摘要中显示 `offline mode` 或 `cloud mode`，只报告状态和变量名称，不输出 URL 或 Key 的值。

## 数据库升级检查

已有 Supabase 项目升级时，不要删除旧表或清空用户数据：

1. 在仓库根目录运行 `pnpm supabase:verify`，确认本地迁移 `001` 到 `005` 顺序完整。
2. 运行 `pnpm dlx supabase@latest db push`；只应用尚未执行的迁移。
3. 在 Supabase 的 SQL Editor 或 Table Editor 中确认学习记录、草稿、错题、每日完成状态、知识掌握状态和用户设置表仍有原数据。
4. 再触发一次 Deploy GitHub Pages，并确认工作流摘要显示 `cloud mode`。

## 手机与电脑同步验收

1. 在手机和电脑分别打开 `https://yangyang753.github.io/cet4-study-pwa/`，使用同一邮箱账号登录。
2. 手机完成一道练习；恢复联网后等待账户页显示同步完成。
3. 电脑刷新页面，确认该答题记录、今日任务状态和错题安排已经出现。
4. 电脑修改考试日期、每日分钟数或听力倍速；手机重新打开账户页和听力页，确认设置一致。
5. 手机把一个高频词标记为“已掌握”，再在电脑刷新知识库，确认状态仍为“已掌握”。

若任一步骤失败，先看账户页同步状态和 GitHub 工作流的部署模式；不要把任何密钥复制到问题截图、聊天或日志中。
