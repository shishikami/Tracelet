import {
  Boxes,
  Database,
  Network,
  Puzzle,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/code-block";
import { useLocale } from "@/i18n";
import objectRecipesCode from "../../../examples/object-recipes.ts?raw";

const transportCode = `import {
  ConsoleTransport,
  EventRouter,
  HttpTransport,
} from "tracelet-browser";

// 生产环境：把批次提交给自己的 Collector。
const http = new HttpTransport({
  name: "product-api",
  endpoint: "https://events.example.com/v1/batch",
  headers: { "x-public-client": "web" },
  credentials: "omit",
  timeoutMs: 10_000,
  // 页面退出时，仅在 Payload 不超过该预算时启用 fetch keepalive。
  keepaliveMaxBytes: 60 * 1024,
});

// 本地调试：只打印批次，不发网络请求。
const consoleTransport = new ConsoleTransport();

// 多后端：第一条匹配规则获胜，其余事件进入 fallback。
const router = new EventRouter({
  routes: [{
    name: "errors",
    match: (event) => event.name.startsWith("$"),
    transport: new HttpTransport({
      name: "error-api",
      endpoint: "https://errors.example.com/v1/batch",
    }),
  }],
  fallback: http,
});`;

const storageCode = `import {
  BrowserLocalStorage,
  IndexedDbEventStorage,
  MemoryEventStorage,
  MemoryKeyValueStorage,
  createBrowserEventStorage,
} from "tracelet-browser";

// 需要强制持久化时，可以直接使用 IndexedDB Adapter。
const eventStorage = new IndexedDbEventStorage({
  databaseName: "shop-analytics",
  storeName: "events",
  version: 1,
});

// 普通生产接入推荐：启动时探测 IndexedDB，失败则安全退回内存。
const resilientEventStorage = await createBrowserEventStorage({
  databaseName: "shop-analytics",
  onFallback(error) {
    console.warn("Tracelet storage fallback", error);
  },
});

// 使用独立前缀，避免和应用自己的 LocalStorage Key 冲突。
const identityStorage = new BrowserLocalStorage("shop_analytics_");

// 单元测试或一次性 Demo：数据只存在于当前页面内存中。
const testEventStorage = new MemoryEventStorage();
const testIdentityStorage = new MemoryKeyValueStorage();

// 测试结束或永久卸载微前端时，可关闭 IndexedDB 连接。
await eventStorage.close();`;

const processingCode = `import {
  GzipCompression,
  JsonCodec,
  NoCompression,
  ProtobufCodec,
} from "tracelet-browser";

// 默认组合：JSON + 不压缩，无需显式配置。
const json = new JsonCodec();
const plain = new NoCompression();

// 可选：浏览器支持 CompressionStream 时启用 gzip。
const gzip = new GzipCompression();

// Protobuf Runtime 和生成代码留在业务项目或独立插件包中。
const protobuf = new ProtobufCodec((batch) => {
  return GeneratedEventBatch.encode(
    GeneratedEventBatch.fromJSON(batch),
  ).finish();
});

const analytics = createAnalytics({
  appId: "shop-web",
  transport,
  codec: json,       // 或 protobuf
  compression: gzip, // 不支持 CompressionStream 时改用 plain
});`;

const pluginCode = `import {
  createAutoCapturePlugin,
  redactPlugin,
  samplingPlugin,
} from "tracelet-browser";

const plugins = [
  // 插件按数组顺序处理事件：先移除敏感字段，再执行采样。
  redactPlugin(["password", "token", "phone"]),
  samplingPlugin({
    debug_log: 0.1, // 只保留约 10%
    heartbeat: 0,   // 完全丢弃
  }),
  createAutoCapturePlugin({
    pageViews: { initial: true, includeHash: false },
    errors: { includeStack: false },
  }),
];

const analytics = createAnalytics({
  appId: "shop-web",
  transport,
  plugins,
});`;

const advancedCode = `import {
  BrowserDeliveryLock,
  ConsentManager,
  IdentityManager,
  MemoryKeyValueStorage,
  SDK_NAME,
  SDK_VERSION,
  createId,
  estimateBrowserStorage,
  isStorageQuotaExceededError,
} from "tracelet-browser";

// Analytics 默认会创建 BrowserDeliveryLock；通常不必手动传入。
const deliveryLock = new BrowserDeliveryLock("shop:analytics:delivery");

// 以下 Manager 适合自定义 Adapter 或单元测试；普通接入请使用
// analytics.setConsent()、identify() 和 reset()。
const keyValueStorage = new MemoryKeyValueStorage();
const consent = new ConsentManager("pending");
const identity = new IdentityManager(keyValueStorage, 30 * 60 * 1_000);

consent.set("granted");
identity.identify("user_42");
console.log(identity.current());

const eventId = createId();
const estimate = await estimateBrowserStorage();
console.log({ eventId, estimate, sdk: SDK_NAME + "@" + SDK_VERSION });

function handleCustomStorageError(error: unknown) {
  if (isStorageQuotaExceededError(error)) {
    console.warn("Origin storage is full");
  }
}`;

const customPluginCode = `import type { AnalyticsPlugin, Transport } from "tracelet-browser";

// 自定义插件：为所有事件添加发布渠道。
const releaseChannelPlugin: AnalyticsPlugin = {
  name: "release-channel",
  beforeTrack(event) {
    return {
      ...event,
      properties: { ...event.properties, releaseChannel: "stable" },
    };
  },
  afterTrack(event) {
    console.debug("queued", event.eventId);
  },
};

// 自定义 Transport：只要实现 name 和 send()。
const customTransport: Transport = {
  name: "custom-collector",
  async send(batch, context) {
    const response = await fetch("/analytics/batch", {
      method: "POST",
      headers: {
        "content-type": batch.contentType,
        ...(batch.contentEncoding
          ? { "content-encoding": batch.contentEncoding }
          : {}),
      },
      body: typeof batch.body === "string"
        ? batch.body
        : new Blob([new Uint8Array(batch.body)]),
      keepalive: context.reason === "page-hide" || context.reason === "shutdown",
      signal: context.signal,
    });
    return {
      success: response.ok,
      retryable: response.status === 429 || response.status >= 500,
      status: response.status,
    };
  },
};`;

const chineseComments: ReadonlyArray<readonly [string, string]> = [
  ["生产环境：把批次提交给自己的 Collector。", "Production: send batches to your own collector."],
  ["本地调试：只打印批次，不发网络请求。", "Local debugging: print batches without making network requests."],
  ["多后端：第一条匹配规则获胜，其余事件进入 fallback。", "Multiple backends: the first matching rule wins; remaining events use the fallback."],
  ["生产环境：刷新页面后，尚未发送的事件仍然存在。", "Production: pending events survive page reloads."],
  ["使用独立前缀，避免和应用自己的 LocalStorage Key 冲突。", "Use a dedicated prefix to avoid colliding with application LocalStorage keys."],
  ["单元测试或一次性 Demo：数据只存在于当前页面内存中。", "Unit tests and disposable demos: data lives only in page memory."],
  ["测试结束或永久卸载微前端时，可关闭 IndexedDB 连接。", "Close the IndexedDB connection after tests or permanent micro-frontend teardown."],
  ["默认组合：JSON + 不压缩，无需显式配置。", "Default combination: JSON without compression; no explicit configuration is required."],
  ["可选：浏览器支持 CompressionStream 时启用 gzip。", "Optional: enable gzip where the browser supports CompressionStream."],
  ["Protobuf Runtime 和生成代码留在业务项目或独立插件包中。", "Keep the Protobuf runtime and generated code in the application or a separate adapter package."],
  ["或 protobuf", "or protobuf"],
  ["不支持 CompressionStream 时改用 plain", "use plain when CompressionStream is unavailable"],
  ["插件按数组顺序处理事件：先移除敏感字段，再执行采样。", "Plugins process events in array order: redact sensitive fields before sampling."],
  ["只保留约 10%", "keep approximately 10%"],
  ["完全丢弃", "drop all"],
  ["以下 Manager 适合自定义 Adapter 或单元测试；普通接入请使用\n// analytics.setConsent()、identify() 和 reset()。", "These managers are intended for custom adapters or tests; regular integrations should use\n// analytics.setConsent(), identify(), and reset()."],
  ["Analytics 默认会创建 BrowserDeliveryLock；通常不必手动传入。", "Analytics creates BrowserDeliveryLock by default; normally you do not pass one manually."],
  ["自定义插件：为所有事件添加发布渠道。", "Custom plugin: add a release channel to every event."],
  ["自定义 Transport：只要实现 name 和 send()。", "Custom Transport: implement only name and send()."],
  ["在 CMP 或隐私弹窗允许采集后调用。", "Call this after your CMP or privacy dialog grants collection."],
];

function localizedCode(code: string, english: boolean): string {
  if (!english) return code;
  return chineseComments.reduce((result, [source, target]) => result.replace(source, target), code);
}

const choices = [
  ["Analytics", "createAnalytics()", "必须", "整个 SDK 的入口；应用内通常只创建一个长生命周期实例。"],
  ["Transport", "HttpTransport", "必须", "决定批次发送到哪里；本地调试可改用 ConsoleTransport。"],
  ["EventStorage", "IndexedDbEventStorage", "生产推荐", "保存尚未确认送达的事件；默认内存队列刷新即丢失。"],
  ["KeyValueStorage", "BrowserLocalStorage", "生产推荐", "保存匿名 ID、用户 ID 与 Session ID。"],
  ["Codec", "JsonCodec", "默认即可", "把 EventBatch 编码成请求体；只有后端要求时才换 Protobuf。"],
  ["Compression", "NoCompression", "按需", "默认不压缩；确认浏览器和服务端支持后可换 GzipCompression。"],
  ["Plugin", "按需组合", "可选", "在入队前脱敏、采样，或监听页面导航与全局错误。"],
] as const;

const englishChoices = [
  ["Analytics", "createAnalytics()", "Required", "The SDK entry point; normally one long-lived instance per application."],
  ["Transport", "HttpTransport", "Required", "Chooses where batches go; use ConsoleTransport for local debugging."],
  ["EventStorage", "IndexedDbEventStorage", "Production", "Stores unacknowledged events; the default in-memory queue disappears on reload."],
  ["KeyValueStorage", "BrowserLocalStorage", "Production", "Stores anonymous, user and session identifiers."],
  ["Codec", "JsonCodec", "Use default", "Encodes EventBatch; switch to Protobuf only when the backend requires it."],
  ["Compression", "NoCompression", "Optional", "No compression by default; use GzipCompression after checking browser and server support."],
  ["Plugin", "Compose as needed", "Optional", "Redact or sample before queuing, or observe navigation and global errors."],
] as const;

const groups = [
  {
    id: "manual-object-transports",
    icon: Network,
    title: "Transport：批次发到哪里",
    englishTitle: "Transport: where batches are delivered",
    badge: "Required",
    copy: "HttpTransport 是生产默认选择；ConsoleTransport 只用于观察编码结果；EventRouter 适合事件需要进入不同 Collector 的场景。浏览器里的请求头对用户可见，请勿放长期密钥。",
    englishCopy: "HttpTransport is the production default, ConsoleTransport only inspects encoded output, and EventRouter sends different events to different collectors. Browser headers are visible to users, so never place long-lived secrets in them.",
    code: transportCode,
    filename: "transports.ts",
  },
  {
    id: "manual-object-storage",
    icon: Database,
    title: "Storage：队列与身份保存在哪里",
    englishTitle: "Storage: where queues and identity live",
    badge: "Production",
    copy: "事件队列与身份存储是两个不同契约。生产环境通常使用 createBrowserEventStorage() + BrowserLocalStorage；前者优先选择 IndexedDB，并能在启动失败时显式退回内存。",
    englishCopy: "The event queue and identity store are separate contracts. Production usually uses createBrowserEventStorage() plus BrowserLocalStorage; the former prefers IndexedDB and explicitly falls back to memory when startup fails.",
    code: storageCode,
    filename: "storage.ts",
  },
  {
    id: "manual-object-processing",
    icon: Boxes,
    title: "Codec 与 Compression：请求体如何生成",
    englishTitle: "Codec and Compression: how request bodies are built",
    badge: "Optional",
    copy: "JsonCodec 与 NoCompression 已是默认值。GzipCompression 不会自动降级；ProtobufCodec 只接收编码函数，因此不会把某个 Protobuf Runtime 强塞进 SDK。",
    englishCopy: "JsonCodec and NoCompression are already the defaults. GzipCompression does not fall back automatically. ProtobufCodec accepts an encoder function so the SDK never forces a particular Protobuf runtime on the application.",
    code: processingCode,
    filename: "encoding.ts",
  },
  {
    id: "manual-object-plugins",
    icon: Puzzle,
    title: "Plugin：脱敏、采样与自动采集",
    englishTitle: "Plugins: redaction, sampling and autocapture",
    badge: "Optional",
    copy: "beforeTrack 按数组顺序运行，任一插件返回 null 都会丢弃事件。redactPlugin 只移除顶层字段；嵌套敏感数据应在业务侧清理或实现自定义插件。",
    englishCopy: "beforeTrack runs in array order and any plugin can drop an event by returning null. redactPlugin removes top-level keys only; clean nested sensitive data in the application or a custom plugin.",
    code: pluginCode,
    filename: "plugins.ts",
  },
  {
    id: "manual-object-advanced",
    icon: ShieldCheck,
    title: "高级对象与工具函数",
    englishTitle: "Advanced objects and utilities",
    badge: "Advanced",
    copy: "BrowserDeliveryLock 已由 Analytics 自动创建；ConsentManager 与 IdentityManager 也被主实例封装。它们保持公开是为了自定义 Adapter 和测试，普通业务代码优先调用 Analytics 方法。StorageQuotaExceededError 通常由 IndexedDB 实现抛出，不需要手动创建。",
    englishCopy: "Analytics creates BrowserDeliveryLock and wraps ConsentManager and IdentityManager. They remain public for custom adapters and tests; regular application code should prefer Analytics methods. IndexedDB normally throws StorageQuotaExceededError, so you do not construct it yourself.",
    code: advancedCode,
    filename: "advanced.ts",
  },
  {
    id: "manual-object-custom",
    icon: Settings2,
    title: "实现自己的 Adapter 或 Plugin",
    englishTitle: "Implement a custom adapter or plugin",
    badge: "Extension",
    copy: "Tracelet 与后端解耦的关键是契约。大多数扩展只需实现 Transport 或 AnalyticsPlugin；更复杂的项目还可以实现 EventStorage、KeyValueStorage、Codec、Compression 与 DeliveryLock。",
    englishCopy: "Contracts are what keep Tracelet backend-agnostic. Most extensions only need Transport or AnalyticsPlugin; advanced applications can also implement EventStorage, KeyValueStorage, Codec, Compression, and DeliveryLock.",
    code: customPluginCode,
    filename: "custom-adapters.ts",
  },
] as const;

export function ObjectGuide() {
  const en = useLocale() === "en";
  const localizedChoices = en ? englishChoices : choices;

  return (
    <article id="manual-objects">
      <div className="manual-heading">
        <Boxes className="size-5" />
        <h2 className="!m-0 !text-2xl">{en ? "Understand and choose SDK objects" : "认识并选择 SDK 对象"}</h2>
      </div>
      <p className="manual-copy">
        {en
          ? "You do not need to instantiate every export. Start with the required client and transport, add persistent storage for production, and enable the remaining adapters only for a concrete requirement."
          : "你不需要实例化包里的每个导出。先配置必需的客户端与 Transport，生产环境再加入持久化存储，其余 Adapter 只有在存在明确需求时才启用。"}
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-white/10 bg-black/15">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-white/5 text-slate-300">
            <tr>
              {(en ? ["Role", "Recommended object", "When", "What it does"] : ["角色", "推荐对象", "何时需要", "作用"]).map((heading) => <th key={heading} scope="col">{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {localizedChoices.map(([role, object, level, description]) => (
              <tr key={role} className="border-t border-white/8">
                <td className="font-medium text-slate-200">{role}</td>
                <td><code className="text-emerald-300">{object}</code></td>
                <td><Badge className="whitespace-nowrap border-white/10 bg-white/5 text-slate-300">{level}</Badge></td>
                <td className="text-slate-400">{description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.035] p-5 sm:p-6">
        <h4 className="text-base font-medium text-emerald-100">{en ? "Copyable production starting point" : "可直接复制的生产起点"}</h4>
        <p className="mt-2 text-sm leading-7 text-slate-400">
          {en
            ? "This complete example is type-checked in CI. Replace the app ID and collector URL, then import the exported singleton wherever events are recorded."
            : "这份完整示例会在 CI 中接受 TypeScript 检查。替换应用标识与 Collector 地址后，在需要埋点的模块中导入导出的单例即可。"}
        </p>
        <div className="mt-5"><CodeBlock code={localizedCode(objectRecipesCode, en)} filename="analytics.ts" /></div>
      </div>

      <div className="mt-12 space-y-12">
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <section key={group.id} id={group.id} className="scroll-mt-24">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-emerald-300"><Icon className="size-4" /></span>
                <h4 className="text-lg font-medium text-slate-100">{en ? group.englishTitle : group.title}</h4>
                <Badge className="border-white/10 bg-white/5 text-slate-400">{group.badge}</Badge>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-400">{en ? group.englishCopy : group.copy}</p>
              <div className="mt-5"><CodeBlock code={localizedCode(group.code, en)} filename={group.filename} /></div>
            </section>
          );
        })}
      </div>
    </article>
  );
}
