# Contributing to Tracelet

感谢你帮助改进 Tracelet。仓库同时包含浏览器 SDK、示例与文档官网；提交变更时请保持 SDK 的后端无关边界和隐私优先原则。

## 开始之前

- Bug 与兼容性问题请使用 Bug Report 模板。
- 新能力请先创建 Feature Request，说明真实接入场景、预期 API 和兼容性影响。
- 安全问题不要创建公开 Issue，请按照 [SECURITY.md](./SECURITY.md) 私下报告。
- 参与 Issue、Discussion、PR 与 Review 时请遵守 [Code of Conduct](./CODE_OF_CONDUCT.md)。

## 本地开发

需要 Node.js 20 或 24，以及 pnpm 10.18.3：

```bash
corepack enable
corepack prepare pnpm@10.18.3 --activate
pnpm install --frozen-lockfile
pnpm check
pnpm test:browser
```

官网开发服务器：

```bash
pnpm dev:docs
```

## 变更原则

- 公共 API 必须从包根入口导出，并同步更新类型、测试、README 和 API Reference。
- 不要在 SDK Core 中绑定具体后端、Protobuf Runtime 或业务事件模型。
- 自动采集功能默认应低侵入、隐私安全，并允许显式关闭。
- 修复投递与存储问题时必须补充相应的单元测试或浏览器测试。
- 不要提交构建产物、凭据、Token、用户数据或本地环境文件。

## Pull Request 检查

提交前请确认：

- [ ] `pnpm check` 通过。
- [ ] 涉及浏览器行为时，`pnpm test:browser` 通过。
- [ ] 公共 API 变化已更新文档和 Changelog。
- [ ] npm 包体积与公开导出检查没有被绕过。
- [ ] PR 只包含同一主题的必要修改。

维护者会重点检查向后兼容性、隐私边界、失败恢复以及对包体积的影响。

## 维护者资料

- [公开发布素材](./docs/launch-kit.md)
- [曝光漏斗与每周指标](./docs/growth-metrics.md)
- [支持渠道与问题边界](./SUPPORT.md)
- [无障碍承诺与反馈方式](./ACCESSIBILITY.md)
- [0.3 可观测 API 设计稿](./docs/rfcs/0001-observability-api.md)
- [兼容性与韧性测试矩阵](./docs/compatibility-matrix.md)
