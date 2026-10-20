# Tracelet launch kit

这份文档用于准备公开发布。发布前先确认线上 Playground、Quickstart、示例模板和 npm 安装均可用；不要在多个社区逐字复制同一段内容，也不要请求点赞。

## 核心定位

- **一句话**：A backend-agnostic, privacy-first browser analytics SDK for TypeScript.
- **解决的问题**：把事件建模、Consent、本地可靠队列、编码和传输从具体分析后端中拆开。
- **最值得演示的路径**：打开 [Playground](https://tracelet-opal.vercel.app/en/playground)，创建事件，模拟一次 `503`，观察事件留在队列中，再次 flush 后成功送达。
- **首要 CTA**：`npm install tracelet-browser`
- **次要 CTA**：[Quickstart](https://tracelet-opal.vercel.app/en/quickstart)

## 发布前检查

- [ ] `pnpm check` 与 `pnpm test:browser` 通过。
- [ ] npm 上的安装版本与文档示例一致。
- [ ] Playground、Quickstart、Examples、Reference 的中英文 URL 可访问。
- [ ] React、Vue StackBlitz 链接可直接打开。
- [ ] GitHub description、topics、social preview 和 Discussions 已配置。
- [ ] 所有外部链接附带对应的 UTM 参数。
- [ ] 发布当天预留时间回答问题并记录真实反馈。

## Product Hunt

### Name

Tracelet

### Tagline

Reliable browser analytics without backend lock-in

### Short description

Tracelet is an open-source TypeScript SDK for reliable, privacy-aware browser event collection. It keeps consent, durable queues, codecs and transports behind replaceable contracts, so teams can send data to their own API instead of coupling frontend instrumentation to a vendor. Try the real SDK in the browser, including a simulated delivery failure and retry.

### First maker comment

Hi Product Hunt — I built Tracelet after repeatedly seeing frontend tracking code become coupled to one vendor or backend contract.

The SDK keeps a small stable core and makes storage, encoding and transport replaceable. It includes explicit consent controls, a durable browser queue, SPA autocapture, diagnostics and optional Protobuf/gzip plugins. The interactive Playground runs the real SDK locally in your browser and lets you simulate a failed delivery without sending data anywhere.

I would especially value feedback on the public API, privacy defaults and the boundary between the core SDK and optional plugins.

### Gallery plan

1. Social preview: `website/public/tracelet-social-preview.png`.
2. Playground retry flow: queued event → simulated `503` → successful retry.
3. Architecture overview: Core → Storage / Codec / Transport.
4. Quickstart and React/Vue starter templates.

## Show HN

### Title

Show HN: Tracelet – a backend-agnostic browser analytics SDK

### Body

I built Tracelet, an open-source TypeScript SDK for collecting browser events without coupling the frontend to a specific analytics vendor or backend schema.

The core exposes replaceable Storage, Codec and Transport contracts. It includes consent controls, a durable IndexedDB queue, SPA autocapture, diagnostics, and optional Protobuf/gzip plugins. The live Playground runs the actual SDK entirely in the browser, so you can create an event, force a `503`, inspect the queued EventBatch and retry it without signing up or sending data to a server.

Playground: https://tracelet-opal.vercel.app/en/playground?utm_source=hacker_news&utm_medium=community&utm_campaign=launch

GitHub: https://github.com/shishikami/Tracelet

npm: https://www.npmjs.com/package/tracelet-browser

I would appreciate technical feedback on the API contracts, failure semantics and privacy defaults. What would you need before using this in a real application?

## 中文社区

### 掘金文章标题

从 0 设计一个后端无关的前端埋点 SDK：队列、Consent 与可插拔传输

### 掘金文章结构

1. 为什么前端埋点不应该绑定特定后端。
2. `Storage / Codec / Transport` 三个边界如何划分。
3. 投递失败时事件如何可靠保留。
4. Consent 为什么必须先于用户标识。
5. 为什么 Protobuf 与 gzip 是插件而不是 SDK Core。
6. 用 Playground 复现一次失败与重试。
7. 真实接入代码、限制和下一步路线图。

### V2EX / 社区短帖

我做了一个后端无关的浏览器埋点 SDK Tracelet。它把 Storage、Codec 和 Transport 设计成可替换接口，内置 Consent、本地可靠队列、SPA 自动采集和诊断事件，也提供可选的 Protobuf / gzip 插件。

在线 Playground 跑的是真实 SDK，不需要注册，也不会把数据发到服务器；可以直接模拟一次 503，观察队列保留和重试过程。

Playground：https://tracelet-opal.vercel.app/playground?utm_source=v2ex&utm_medium=community&utm_campaign=launch

GitHub：https://github.com/shishikami/Tracelet

目前最想听到的是：API 是否直观、隐私默认值是否合理，以及你会怎样接入自己的 collector。

## UTM 规范

对外链接统一使用：

```text
utm_source=<平台>
utm_medium=community
utm_campaign=launch
utm_content=<帖子或素材变体>
```

推荐 `utm_source`：`product_hunt`、`hacker_news`、`juejin`、`v2ex`、`github`、`npm`。

## 发布节奏

1. 先更新 npm / GitHub 门面和社交预览。
2. 发布一篇有技术深度、可被搜索长期发现的架构文章。
3. 用真实 Playground 发布 Show HN，集中收集技术反馈。
4. 根据反馈修正文档与 API，再发布 Product Hunt。
5. 每周整理问题，转成 Discussions、Issues、FAQ 或下一篇文章。

公开发布是代表项目发言的动作。执行前应由维护者复核文案、选择账号并明确确认。
