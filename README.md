# Tracelet

[![npm version](https://img.shields.io/npm/v/tracelet-browser?color=34d399)](https://www.npmjs.com/package/tracelet-browser)
[![license](https://img.shields.io/github/license/shishikami/Tracelet)](./LICENSE)
[![website](https://img.shields.io/badge/docs-tracelet--opal.vercel.app-0f172a)](https://tracelet-opal.vercel.app)

Backend-agnostic、隐私优先的浏览器埋点 SDK。SDK 核心保持框架无关，React 官网作为独立 workspace 维护。

## 安装

npm 包：[tracelet-browser](https://www.npmjs.com/package/tracelet-browser)

```bash
npm install tracelet-browser
pnpm add tracelet-browser
yarn add tracelet-browser
```

> `tracelet` 已在 npm 被其他项目占用，因此本项目使用 `tracelet-browser` 作为 npm 包名。

一个后端无关的浏览器埋点 SDK 初始实现。核心只依赖抽象协议，JSON、Protobuf、压缩算法和网络传输都可以替换。

- 官网：[tracelet-opal.vercel.app](https://tracelet-opal.vercel.app)
- npm：[tracelet-browser](https://www.npmjs.com/package/tracelet-browser)
- 源码：[shishikami/Tracelet](https://github.com/shishikami/Tracelet)

## 项目状态与浏览器支持

当前版本见页面顶部的 npm badge，适合评估、原型和对投递行为有明确验证方案的早期项目。

Tracelet 以现代 Chrome、Edge、Firefox 和 Safari 为目标。核心逻辑、npm JavaScript 导入和 TypeScript 声明已经验证；Chromium、Firefox 和 WebKit 会在 CI 中运行真实浏览器测试。使用 `CompressionStream` 等可选浏览器能力前，仍应结合目标版本验证支持情况。

## 数据链路

```text
track / page / identify
  -> standard event
  -> plugins
  -> event storage
  -> batch
  -> codec
  -> compression
  -> transport
```

## 快速使用

```ts
import {
  BrowserLocalStorage,
  HttpTransport,
  IndexedDbEventStorage,
  createAnalytics,
} from "tracelet-browser";

interface Events {
  order_submitted: {
    orderId: string;
    amount: number;
  };
}

const analytics = createAnalytics<Events>({
  appId: "shop-web",
  identityStorage: new BrowserLocalStorage(),
  eventStorage: new IndexedDbEventStorage(),
  transport: new HttpTransport({
    endpoint: "https://events.example.com/v1/batch",
  }),
});

await analytics.track("order_submitted", {
  orderId: "o_123",
  amount: 199,
});
```

## 低侵入自动采集

自动采集是可选插件，不会扫描 DOM，也不会读取元素文本、表单值或 `data-*` 属性。它目前只处理 SPA 页面浏览和浏览器全局错误：

```ts
import {
  createAnalytics,
  createAutoCapturePlugin,
} from "tracelet-browser";

const analytics = createAnalytics({
  appId: "shop-web",
  transport,
  plugins: [
    createAutoCapturePlugin({
      pageViews: {
        initial: true,
        // Hash 可能包含敏感信息，仅 Hash Router 项目显式开启。
        includeHash: false,
      },
      errors: {
        // 堆栈可能包含文件路径或参数，因此默认关闭。
        includeStack: false,
      },
    }),
  ],
});

await analytics.init();
```

页面浏览通过 `page()` 事件进入统一管线。URL 上下文默认移除 query 和 hash；Hash Router 可以用 `includeHash: true` 开启 fragment 路由采集。`window.error` 生成 `$error`，未处理的 Promise 拒绝生成 `$unhandled_rejection`。它们都会遵守 Consent，调用 `shutdown()` 后会移除监听器并恢复被包装的 History 方法。

关键业务事实仍应使用显式 `track()`，例如支付成功或订单创建；自动采集适合补充页面访问和技术异常，而不是替代业务事件设计。

## Consent

需要用户授权后才能采集时，将初始状态设为 `pending`：

```ts
const analytics = createAnalytics({
  appId: "shop-web",
  transport,
  consent: {
    initialState: "pending",
    clearQueueOnDenied: true,
  },
});

await analytics.track("ignored_before_consent", {});
await analytics.setConsent("granted");
await analytics.track("collected_after_consent", {});

// 撤回授权会清空未发送队列并重置身份。
await analytics.setConsent("denied");
```

默认值仍为 `granted`，便于服务端已统一处理授权的项目保持兼容。

## 可靠投递

- `IndexedDbEventStorage` 按写入顺序持久化未发送事件。
- 单事件默认限制为 64 KiB，编码后单批次默认限制为 256 KiB，可通过 `maxEventBytes` 和 `maxBatchBytes` 调整。
- `visibilitychange` 和 `pagehide` 会触发最后一次 Flush。
- Web Locks API 会协调同源多 Tab 的共享队列发送，避免并发 Flush 重复读取同一批事件。
- Session 默认在连续 30 分钟无事件后自动续期，可通过 `sessionTimeoutMs` 调整。
- 网络、HTTP 408、429 和 5xx 使用指数退避与随机抖动重试。
- HTTP 4xx 等不可重试错误会从队列移除，防止永久阻塞。
- 每个事件拥有稳定 `eventId`，服务端应按该字段幂等去重。

可通过 `onDiagnostic` 观察 SDK 自身状态，不会生成新的业务埋点：

```ts
const analytics = createAnalytics({
  appId: "shop-web",
  transport,
  onDiagnostic(event) {
    console.debug("[analytics]", event);
  },
});
```

完整示例见 `examples/browser.ts`；官网 Quickstart 来自 `examples/quickstart.ts`，并在 CI 中执行 TypeScript 类型检查。

## 接入 Protobuf

Core 不依赖具体 Protobuf Runtime。使用 `protobufjs`、`ts-proto` 或 Buf 生成编码器后，通过 `ProtobufCodec` 注入：

```ts
import { ProtobufCodec, createAnalytics } from "tracelet-browser";
import { EventBatch } from "./generated/analytics.js";

const codec = new ProtobufCodec((batch) => {
  return EventBatch.encode(EventBatch.fromJSON(batch)).finish();
});

const analytics = createAnalytics({
  appId: "shop-web",
  codec,
  transport,
});
```

示例协议位于 `proto/analytics.proto`。实际项目建议把生成代码放在独立包，例如 `@tracelet/codec-protobuf`。

## 当前限制

- 默认队列仍是内存存储；浏览器生产环境应显式使用 `IndexedDbEventStorage`。
- gzip 使用浏览器原生 `CompressionStream`，不支持时不会自动降级。
- 尚未实现多 Transport 路由。
- 自动采集暂不包含点击、输入和 DOM 内容采集；这是有意的隐私与稳定性边界。
- `properties` 和 `context` 在示例 Protobuf 中以 JSON bytes 保存，优先保持通用性；稳定后可以逐步强类型化。

## 本地端到端测试

```bash
pnpm build
pnpm build:docs
pnpm local:server
pnpm test:browser
```

浏览器访问 `http://127.0.0.1:4318` 查看网页版使用手册；访问 `http://127.0.0.1:4318/lab` 打开完整的 SDK 验证台。页面支持：

- 自定义事件名、Properties 和批量数量。
- 仅入队或立即 Flush，并实时查看 IndexedDB 队列长度。
- Identify、身份重置和 Consent 状态切换。
- 注入 503、429、500、400 以及服务端响应延迟。
- 观察指数退避、失败保留、不可重试丢弃等行为。
- 查看服务端事件、批次统计、请求日志和 SDK 诊断日志。

Collector 同时提供以下调试接口：

```text
http://127.0.0.1:4318/health
http://127.0.0.1:4318/v1/events
http://127.0.0.1:4318/v1/stats
```

| 方法 | 路径 | 用途 |
|---|---|---|
| `POST` | `/v1/batch` | 接收 SDK 批量事件 |
| `GET` | `/v1/events?limit=100` | 查询最近事件 |
| `DELETE` | `/v1/events` | 清空事件和统计 |
| `GET` | `/v1/stats` | 查询批次、失败、事件名和请求日志 |
| `POST` | `/v1/control/failure` | 配置后续请求的失败状态与延迟 |

本地 Collector 仅用于开发验证：事件只保存在内存中，进程退出即清空，不包含生产鉴权、限流和持久化能力。

## 构建和部署手册站点

官网采用 React、Vite、Tailwind CSS 和 shadcn/ui 的源码组件模式；这些依赖只存在于私有的 `website` workspace，不会进入 SDK 的 npm 包：

```bash
pnpm dev:docs
pnpm build:docs
```

官网源码位于 `website/`，构建产物位于 `out/`。中文入口为 `/`，英文入口为 `/en/`；两者共享组件，并具有独立的 canonical、`hreflang` 和搜索元数据。首页包含 Quickstart，用户手册覆盖配置、Consent、服务端契约、投递语义和故障排查，并提供独立的公开 API Reference。仓库附带 `vercel.json`，导入 Vercel 后会自动安装 workspace 依赖、运行构建并发布 `out/`。其他静态托管平台只需把构建命令设为 `pnpm build:docs`、输出目录设为 `out`。框架演进判断见 [docs/website-framework.md](./docs/website-framework.md)。

## 仓库结构

```text
src/       SDK 源码（不依赖 React）
tests/     SDK 行为测试
examples/  浏览器接入和本地验证示例
website/   React + Vite + Tailwind 官网
proto/     可选的 Protobuf 协议示例
```

## 发布 npm 包

项目通过 GitHub Actions 自动完成持续集成与 npm 发布：

- Pull Request 和 `main` 分支推送会在 Node.js 20、24 上运行类型检查、测试、官网构建和 npm 包内容检查。
- CI 会把 `npm pack` 生成的 tarball 安装进空白项目，验证 JavaScript 导入、TypeScript 声明和 Vite 构建，避免“源码能用但发布包不可用”。
- Node.js 检查通过后，会在 Chromium、Firefox 和 WebKit 上运行浏览器端到端测试。
- 发布正式 GitHub Release 后，工作流会校验 Git tag 与 `package.json` 版本一致，再通过 npm Trusted Publishing 提交待审核版本。
- Vercel 保持 Git 集成：Pull Request 生成 Preview，`main` 更新生产站点，不在 Actions 中重复部署。

首次启用自动发布时，需要在 npm 包的 **Settings → Trusted Publisher** 中添加 GitHub Actions：

- Organization or user：`shishikami`
- Repository：`Tracelet`
- Workflow filename：`publish.yml`
- Environment：留空
- Allowed action：保持直接 `npm publish` 关闭；`npm stage publish` 默认允许

日常发布步骤：

1. 更新 `package.json` 版本和 `CHANGELOG.md`。
2. 合并到 `main`，等待 CI 通过。
3. 创建同版本 tag（例如版本 `0.2.0` 对应 `v0.2.0`）。
4. 发布 GitHub Release；`Publish npm package` 工作流会把版本提交到 npm 暂存区。
5. 在 npm 的 **Staged Packages** 中检查包内容，并通过 Passkey/2FA 批准，版本才会正式公开。

本地发布前检查仍可使用：

```bash
pnpm check
pnpm smoke:package
pnpm pack:check
```

完整发布检查表和故障处理见 [RELEASING.md](./RELEASING.md)。

紧急情况下也可以手动发布：

```bash
npm login
npm version patch
npm publish
```

正式发布前请更新 `package.json` 版本号。npm 包只包含 `dist/`、README、CHANGELOG 和 LICENSE，不包含官网与测试文件。

## Roadmap

- 浏览器测试覆盖 pagehide、gzip 和异常恢复
- 多 Transport 路由与条件投递
- 存储配额估算与 IndexedDB 配额诊断
- 文档搜索和框架适配示例

版本变化见 [CHANGELOG.md](./CHANGELOG.md)。
