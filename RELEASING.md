# Tracelet 发布手册

本文用于发布 `tracelet-browser`。常规发布通过 GitHub Release、GitHub Actions 和 npm Trusted Publishing 完成，不需要把长期 npm Token 保存到仓库。

## 1. 准备版本

1. 确认工作区位于 `main`，并已经同步远端更新。
2. 更新 `package.json` 中的 `version`，同时更新 `CHANGELOG.md` 的版本和发布日期。
3. 确认源码中的版本常量由构建脚本生成，不要手工修改生成文件。
4. 执行完整本地检查：

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm smoke:ecosystem
pnpm test:browser
pnpm pack:check
```

`pnpm check` 包含版本一致性、SDK 与示例类型检查、单元测试、网站构建，以及发布 tarball 的安装冒烟测试。
`pnpm smoke:ecosystem` 会额外安装当前 tarball，并执行 React、Vue、Next.js、Webpack 与 Rollup 的生产构建；首次运行需要下载固定版本的测试依赖。

## 2. 合并并检查 CI

把版本准备提交合并到 `main`，等待以下检查全部通过：

- Node.js 20 和 24：类型检查、单元测试、tarball 冒烟测试、网站构建与包内容检查。
- Node.js 24：当前 tarball 的 React、Vue、Next.js、Webpack 与 Rollup 生产构建。
- Chromium、Firefox 和 WebKit：真实浏览器端到端测试。
- Vercel：生产文档站部署成功。

不要在 CI 失败时创建正式 Release。修复后应让同一提交重新通过完整检查。

## 3. 创建 GitHub Release

1. 创建与包版本完全一致的 tag，例如 `package.json` 为 `x.y.z` 时使用 `vx.y.z`。
2. Release 标题建议使用 `Tracelet vx.y.z`。
3. 从 `CHANGELOG.md` 复制本版本的 Fixed、Added 和 Changed 内容作为 Release Notes。
4. 发布正式 Release；不要勾选 prerelease，除非版本本身是预发布版本。

`Publish npm package` 工作流会再次执行检查，校验 tag 与包版本，然后使用 npm Trusted Publishing 将版本提交到暂存区。

## 4. 批准 npm 暂存版本

1. 打开 npm 包页面的 **Staged Packages**。
2. 核对版本、文件列表、README、包大小和来源工作流。
3. 使用 Passkey 或账户配置的 2FA 批准发布。

Passkey 不会生成六位验证码；浏览器弹出 Passkey 验证时，直接用 Touch ID、设备 PIN 或安全密钥完成即可。

## 5. 发布后验证

```bash
npm view tracelet-browser version
npm view tracelet-browser@<version> dist.integrity
```

再在一个空目录中安装公开版本，验证最小导入：

```bash
npm init -y
npm install tracelet-browser@<version>
```

最后确认 npm badge、Vercel 文档站、GitHub Release 和 `CHANGELOG.md` 展示的是同一版本。

## 6. 恢复开发版本

公开版本验证完成后，将 `main` 的 `package.json` 切换到下一里程碑的开发版本，例如 `0.3.0-dev.0`，在 Changelog 顶部创建对应的 `Unreleased` 段，并运行：

```bash
pnpm version:sync
pnpm check
```

开发版本只用于仓库后续迭代，不要发布到 npm 的 `latest`。这样可以避免在已公开且不可覆盖的版本号上继续生成内容不同的 tarball。

## 发布失败时

- `You cannot publish over the previously published versions`：该版本已存在，更新为新的 SemVer 版本后重新发布；npm 版本不能覆盖。
- `EOTP`：若账户使用验证码，重新执行并传入 `--otp=<code>`；若使用 Passkey，应在网页暂存审批流程中完成验证。
- tag/version 不一致：删除尚未发布的错误 Release 或 tag，修正 `package.json` 后重新走 CI；已经公开到 npm 的版本不能重用。
- 暂存包内容异常：不要批准，先修复源码并发布新版本。
