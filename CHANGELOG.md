# Changelog

本项目的所有重要变更都会记录在此文件中。

## 0.3.0 - 2026-10-23

### Added

- Chromium、Firefox 与 WebKit 的真实离线到在线恢复测试，验证 IndexedDB 队列会保留事件并在网络恢复后自动投递。
- 响应头 CSP `connect-src 'none'` 浏览器夹具，验证被策略阻断的请求不会误删队列。
- 独立的 `visibilitychange` 隐藏页 Flush 测试，并把已有的真实双标签页共享队列测试纳入稳定版兼容性声明。
- 从当前 npm tarball 安装并构建 React/Vite、Vue/Vite、Next.js/Turbopack、Webpack 与 Rollup 消费者的生态冒烟测试。
- 可直接运行的 Next.js App Router starter，展示客户端边界、应用级单例与显式业务事件采集。
- `createBrowserEventStorage()` 启动探测器：优先使用 IndexedDB，无法打开时返回内存或调用方提供的后备队列，并暴露一次性降级回调。

### Changed

- 兼容性矩阵更新为已由三浏览器 CI 证明的离线恢复、CSP、隐藏页 Flush 与跨标签页锁状态。
- 0.3 的分发范围固定为原生 ESM；CDN/IIFE 构建在出现真实无打包器需求前暂缓。

## 0.3.0-beta.1 - 2026-10-21

### Added

- 可直接运行真实 SDK 的中英文 Playground，支持事件入队、EventBatch 检查、模拟 503 与手动重试，无需准备后端。
- 可由 StackBlitz 直接运行的 React/Vite、Vue/Vite 模板，以及可独立部署的 Vercel Collector 模板。
- 《如何设计一个与后端解耦的浏览器埋点 SDK》中英文架构文章，覆盖契约、可靠投递、隐私与 Protobuf 边界。
- GitHub Discussions 的 Q&A / Ideas 表单、支持边界说明与首条社区欢迎帖草稿。
- 可重复生成 Product Hunt / Show HN Playground、架构文章与 starter 截图的 Playwright 脚本。
- Vercel Web Analytics 官网访问统计，并增加无 Cookie 注入的跨浏览器验证。
- npm 包体积、发布文件边界和公开运行时导出的 CI 防回归检查。
- 官网首屏与总 JavaScript gzip 体积预算。
- 贡献指南、安全报告政策、Issue 模板和 Pull Request 模板。
- `getQueueSnapshot()` 队列与投递状态快照，以及支持多个运行时观察者的 `subscribeDiagnostics()`。
- Flush 诊断事件的 `attemptId` 关联、重试时间与不可变快照语义。
- 具备 Origin 白名单、gzip、双层请求体限制、可选鉴权和持久化 Sink 契约的 Vercel Collector 实现与协议测试。

### Changed

- npm 与 GitHub README 调整为英文优先的双语入口，并补充下载量、CI、TypeScript 标识和更完整的 npm 检索关键词。
- 官网重构为独立的首页、Quickstart、Examples 和 API Reference 路由，文档页增加桌面粘性侧栏与移动端折叠目录。
- 文档搜索改为跨页面跳转，并为六个新增中英文文档 URL 补齐 canonical、`hreflang` 和 sitemap。
- 新增 TypeScript 前端埋点 SDK 中英文选型指南、可直接抓取的首屏 HTML 摘要和文章结构化数据，强化 `Tracelet Browser` / `tracelet-browser` 品牌消歧。
- 长篇文档按路由懒加载，降低首页首屏 JavaScript 体积。
- 语法高亮运行时改为接近视口时按需加载，降低官网首屏 JavaScript。
- 发布文档不再建议绕过 staged publishing 直接发布。
- 用户手册新增 SDK 对象选型表、生产配置模板，以及 Transport、Storage、Codec、Compression、Plugin 和高级工具的逐对象示例。
- 发布工作流支持预发布版本，并强制预发布版本使用 npm `beta` dist-tag 后进入 staged approval。

## 0.2.0 - 2026-10-20

Tracelet 的生产队列治理与可发现性增强版本。

### Added

- `maxEventBytes` 单事件字节上限，避免异常 Payload 占满本地队列。
- `maxBatchBytes` 编码后批次字节上限，适用于 JSON、Protobuf 等任意 Codec。
- 事件序列化失败、事件过大和编码后批次过大的诊断原因。
- 官网 canonical、Open Graph、结构化数据、robots、sitemap 和面向 AI 工具的文本入口。
- 中文 `/` 与英文 `/en` 双语入口，以及本地化导航、手册、API Reference、canonical 和 `hreflang`。
- Google Search Console 所有权验证标记。
- Chromium、Firefox 和 WebKit 浏览器测试覆盖 pagehide Flush、gzip 投递和可重试服务端故障恢复。
- 本地 Collector 请求日志记录 Content-Type、Content-Encoding 和声明的事件数量，方便验证真实传输行为。
- `EventRouter` 按事件条件选择多个 Transport，并在编码前隔离不同目标的批次。
- `HttpTransport` 支持自定义诊断名称，Flush 诊断事件会报告实际 Transport。
- `getStorageEstimate()` 和 `estimateBrowserStorage()` 提供原点级浏览器存储容量估算。
- IndexedDB 配额耗尽时安全丢弃当前事件，并报告 `storage_quota_exceeded` 与 `storage-quota` 诊断。
- 官网中英文文档搜索，支持 `⌘/Ctrl + K`、键盘导航和章节直达。
- React、Vue 与 Next.js 生命周期适配示例，并纳入独立 TypeScript 检查。

## 0.1.2 - 2026-10-19

Tracelet 的可靠性和用户手册增强版本。

### Fixed

- 内部 HTTP 超时现在保留事件并进入重试，不再被当作不可重试的主动取消。
- 事件上下文中的 SDK 名称与 npm 包名统一为 `tracelet-browser`。
- `Retry-After` 只在值有效时生效，并同时支持秒数和 HTTP 日期格式。
- LocalStorage 不可用或抛出安全异常时自动降级到内存存储。
- IndexedDB 打开失败后允许后续重试，并在版本变化时正确关闭旧连接。

### Added

- 根包版本生成和一致性检查，官网构建时自动读取版本。
- HTTP Transport、存储降级、SDK 元数据、Session 生命周期和插件回滚测试，单元测试由 4 个增加到 15 个。
- 配置参考、Consent、服务端契约、投递语义和故障排查用户手册。
- Quickstart 作为真实 TypeScript 示例进入 CI 类型检查。
- Chromium、Firefox 和 WebKit 共 18 个端到端测试，覆盖 Collector 投递、Consent、刷新恢复、多 Tab 协调及自动采集边界。
- 基于 Web Locks API 的同源多 Tab 发送锁。
- 默认 30 分钟空闲 Session 超时以及 `sessionTimeoutMs` 配置。
- 低侵入 `createAutoCapturePlugin`，支持 SPA 页面浏览、全局错误和 Promise 拒绝采集。
- 面向首次接入者的分步骤用户手册、生产检查清单和更多可复制代码示例。
- 用户手册代码块增加语法高亮、行号、文件名和更明确的复制反馈。
- 新增公开 API Reference，集中查询 Analytics 方法、内置 Adapter、插件和诊断事件。
- 新增发布包冒烟测试：安装本地 tarball 后验证运行时导入、TypeScript 声明和空白 Vite 项目构建。

## 0.1.1 - 2026-10-16

Tracelet 的发布基础设施补丁版本，不包含 SDK API 的破坏性变更。

### Added

- GitHub Actions 持续集成，在 Node.js 20 和 24 上执行类型检查、测试、官网构建及 npm 包检查。
- 基于 npm Trusted Publishing 和 OIDC 的 staged publishing 流程。
- Git tag 与 `package.json` 版本一致性检查。

### Changed

- 固定 pnpm 与 npm 发布工具版本，提高本地和 CI 构建的可复现性。
- 使用 `npm pack --dry-run` 验证最终包内容，兼容 pnpm 10。

## 0.1.0 - 2026-10-16

Tracelet 首个公开版本。

### Added

- 类型安全的浏览器事件采集 API。
- `track`、`page`、`identify`、`reset`、`flush` 和 `shutdown` 生命周期。
- Consent 感知的事件采集和本地数据清理。
- IndexedDB 与内存事件队列。
- 可插拔的 Plugin、Codec、Compression、Storage 和 Transport 契约。
- JSON 编码及 Protobuf 编码接入点。
- 指数退避、随机抖动和可重试状态判断。
- 本地 Collector、浏览器验证台和 React 文档官网。

[0.3.0-beta.1]: https://github.com/shishikami/Tracelet/compare/v0.2.0...v0.3.0-beta.1
[0.2.0]: https://github.com/shishikami/Tracelet/releases/tag/v0.2.0
[0.1.2]: https://github.com/shishikami/Tracelet/releases/tag/v0.1.2
[0.1.1]: https://github.com/shishikami/Tracelet/releases/tag/v0.1.1
[0.1.0]: https://github.com/shishikami/Tracelet/releases/tag/v0.1.0
