# Security Policy

## Supported versions

Tracelet 仍处于 1.0.0 之前。安全修复优先发布到 npm 的最新版本：

| Version | Supported |
| --- | --- |
| Latest npm release | Yes |
| Older releases | Best effort |

## Reporting a vulnerability

请不要为安全问题创建公开 GitHub Issue。

优先使用 GitHub 仓库的 **Security → Report a vulnerability** 私下提交报告。如果 Private Vulnerability Reporting 暂不可用，请通过仓库所有者公开资料中的联系方式联系维护者，并且不要附带真实用户数据、生产凭据或可直接利用的公开链接。

报告中建议包含：

- 受影响的版本与浏览器。
- 最小复现步骤或测试仓库。
- 潜在影响与攻击前提。
- 已知的缓解方式。

维护者会尽快确认收到报告，在完成修复与发布前协调披露时间。请为修复和用户升级保留合理窗口。

## Scope

特别关注以下问题：

- 未经 Consent 创建身份或事件。
- 跨站数据泄漏、敏感字段意外采集或队列越权读取。
- Collector URL、Header 或 Payload 注入。
- IndexedDB、LocalStorage 与多 Tab 锁造成的数据泄漏或拒绝服务。
- npm 包、发布工作流或依赖供应链被篡改。
