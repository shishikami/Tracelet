# Changelog

本项目的所有重要变更都会记录在此文件中。

## 0.1.2 - Unreleased

Tracelet 的可靠性和用户手册增强版本。

### Fixed

- 内部 HTTP 超时现在保留事件并进入重试，不再被当作不可重试的主动取消。
- 事件上下文中的 SDK 名称与 npm 包名统一为 `tracelet-browser`。
- `Retry-After` 只在值有效时生效，并同时支持秒数和 HTTP 日期格式。
- LocalStorage 不可用或抛出安全异常时自动降级到内存存储。
- IndexedDB 打开失败后允许后续重试，并在版本变化时正确关闭旧连接。

### Added

- 根包版本生成和一致性检查，官网构建时自动读取版本。
- HTTP Transport、存储降级、SDK 元数据和 Session 生命周期测试，单元测试由 4 个增加到 13 个。
- 配置参考、Consent、服务端契约、投递语义和故障排查用户手册。
- Quickstart 作为真实 TypeScript 示例进入 CI 类型检查。
- Chromium、Firefox 和 WebKit 共 12 个端到端测试，覆盖 Collector 投递、Consent、刷新恢复和多 Tab 协调。
- 基于 Web Locks API 的同源多 Tab 发送锁。
- 默认 30 分钟空闲 Session 超时以及 `sessionTimeoutMs` 配置。

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

[0.1.2]: https://github.com/shishikami/Tracelet/releases/tag/v0.1.2
[0.1.1]: https://github.com/shishikami/Tracelet/releases/tag/v0.1.1
[0.1.0]: https://github.com/shishikami/Tracelet/releases/tag/v0.1.0
