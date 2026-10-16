# Changelog

本项目的所有重要变更都会记录在此文件中。

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

[0.1.0]: https://github.com/shishikami/Tracelet/releases/tag/v0.1.0
