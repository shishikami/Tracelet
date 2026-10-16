# Changelog

本项目的所有重要变更都会记录在此文件中。

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

[0.1.1]: https://github.com/shishikami/Tracelet/releases/tag/v0.1.1
[0.1.0]: https://github.com/shishikami/Tracelet/releases/tag/v0.1.0
