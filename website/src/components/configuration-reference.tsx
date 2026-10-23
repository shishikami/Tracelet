import { Gauge } from "lucide-react";
import { useLocale } from "@/i18n";

const options = [
  ["appId", "string", "—", "应用的稳定标识，必填"],
  ["appVersion", "string", "—", "随事件发送的应用版本"],
  ["environment", "string", "—", "例如 development、staging 或 production"],
  ["schemaVersion", "string", '"1"', "单事件的数据 Schema 版本"],
  ["protocolVersion", "string", '"1"', "批次传输协议版本"],
  ["transport", "Transport | TransportResolver", "—", "向单个后端投递，或按事件选择多个 Transport；必填"],
  ["codec", "Codec", "JsonCodec", "把 EventBatch 编码成字符串或二进制"],
  ["compression", "Compression", "NoCompression", "在 Transport 发送前压缩编码结果"],
  ["eventStorage", "EventStorage", "Memory", "未发送事件队列；生产环境推荐 createBrowserEventStorage()"],
  ["identityStorage", "KeyValueStorage", "Memory", "匿名 ID、用户 ID 和 Session ID 的存储"],
  ["plugins", "AnalyticsPlugin[]", "[]", "自动采集、脱敏、采样等扩展"],
  ["flushIntervalMs", "number", "5000", "定时 Flush 间隔"],
  ["maxBatchSize", "number", "30", "单次投递的最大事件数"],
  ["maxBatchBytes", "number", "262144", "Codec 编码后单批次的最大字节数"],
  ["maxQueueSize", "number", "2000", "本地队列的最大事件数"],
  ["maxEventBytes", "number", "65536", "插件处理后单事件的最大 JSON 字节数"],
  ["sessionTimeoutMs", "number", "1800000", "连续无事件多久后创建新 Session"],
  ["deliveryLock", "DeliveryLock", "Web Locks", "协调同源多 Tab 对共享队列的 Flush"],
  ["pageLifecycle", "boolean", "true", "页面隐藏或退出时尝试最后一次 Flush"],
  ["consent.initialState", "pending | granted | denied", "granted", "首次采集前的授权状态"],
  ["consent.clearQueueOnDenied", "boolean", "true", "拒绝或撤回授权时清理队列与身份"],
  ["retry", "object", "指数退避", "基础延迟、最大延迟和随机抖动"],
  ["onDiagnostic", "DiagnosticHandler", "—", "观察 SDK 状态，不产生新的业务事件"],
] as const;

const englishOptions = [
  ["appId", "string", "—", "Stable application identifier; required"],
  ["appVersion", "string", "—", "Application version attached to each event"],
  ["environment", "string", "—", "For example development, staging or production"],
  ["schemaVersion", "string", '"1"', "Schema version attached to each event"],
  ["protocolVersion", "string", '"1"', "Batch delivery protocol version"],
  ["transport", "Transport | TransportResolver", "—", "Delivers to one backend or selects among multiple transports per event; required"],
  ["codec", "Codec", "JsonCodec", "Encodes EventBatch as text or binary"],
  ["compression", "Compression", "NoCompression", "Compresses encoded output before the Transport sends it"],
  ["eventStorage", "EventStorage", "Memory", "Pending-event queue; use createBrowserEventStorage() in production"],
  ["identityStorage", "KeyValueStorage", "Memory", "Stores anonymous, user and session identifiers"],
  ["plugins", "AnalyticsPlugin[]", "[]", "Autocapture, redaction, sampling and other extensions"],
  ["flushIntervalMs", "number", "5000", "Scheduled flush interval"],
  ["maxBatchSize", "number", "30", "Maximum events in one delivery attempt"],
  ["maxBatchBytes", "number", "262144", "Maximum encoded bytes in one batch"],
  ["maxQueueSize", "number", "2000", "Maximum events in the local queue"],
  ["maxEventBytes", "number", "65536", "Maximum JSON bytes after plugin processing"],
  ["sessionTimeoutMs", "number", "1800000", "Idle time before creating a new session"],
  ["deliveryLock", "DeliveryLock", "Web Locks", "Coordinates flushes across same-origin tabs"],
  ["pageLifecycle", "boolean", "true", "Attempts a final flush when the page is hidden or closed"],
  ["consent.initialState", "pending | granted | denied", "granted", "Consent state before the first event"],
  ["consent.clearQueueOnDenied", "boolean", "true", "Clears queued events and identity when consent is denied or withdrawn"],
  ["retry", "object", "Exponential", "Base delay, maximum delay and jitter"],
  ["onDiagnostic", "DiagnosticHandler", "—", "Observes SDK state without creating a product event"],
] as const;

export function ConfigurationReference() {
  const en = useLocale() === "en";
  const rows = en ? englishOptions : options;
  return (
    <article id="api-options">
      <div className="manual-heading"><Gauge className="size-5" /><h3>{en ? "createAnalytics options" : "createAnalytics 配置项"}</h3></div>
      <p className="manual-copy">{en ? "Only appId and transport are required. Every other boundary has a safe default or can be replaced for the target environment." : "只有 appId 和 transport 必填；其他边界均有默认实现，或可以按目标环境替换。"}</p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-white/10 bg-black/15">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-white/5 text-slate-300"><tr>{(en ? ["Option", "Type", "Default", "Description"] : ["选项", "类型", "默认值", "说明"]).map((heading) => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
          <tbody>{rows.map(([name, type, defaultValue, description]) => (
            <tr key={name} className="border-t border-white/8"><td><code className="text-emerald-300">{name}</code></td><td className="font-mono text-slate-300">{type}</td><td>{defaultValue}</td><td className="text-slate-400">{description}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </article>
  );
}
