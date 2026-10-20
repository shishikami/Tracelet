import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  FlaskConical,
  Radio,
  RotateCcw,
  Send,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  MemoryEventStorage,
  MemoryKeyValueStorage,
  createAnalytics,
  type Analytics,
  type DiagnosticEvent,
  type EncodedBatch,
  type EventBatch,
  type EventProperties,
  type Transport,
  type TransportContext,
  type TransportResult,
} from "../../../src/index";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/code-block";
import { useLocale } from "@/i18n";

interface PlaygroundLog {
  id: number;
  at: string;
  kind: "info" | "success" | "failure";
  title: string;
  detail: string;
}

interface MockRequest {
  payload: EventBatch;
  context: TransportContext;
  failed: boolean;
}

class PlaygroundTransport implements Transport {
  readonly name = "browser-mock-collector";
  private shouldFail = false;

  constructor(private readonly onRequest: (request: MockRequest) => void) {}

  failNextRequest(): void {
    this.shouldFail = true;
  }

  async send(batch: EncodedBatch, context: TransportContext): Promise<TransportResult> {
    const source = typeof batch.body === "string" ? batch.body : new TextDecoder().decode(batch.body);
    const payload = JSON.parse(source) as EventBatch;
    const failed = this.shouldFail;
    this.shouldFail = false;
    this.onRequest({ payload, context, failed });
    return failed
      ? { success: false, retryable: true, status: 503, retryAfterMs: 60_000 }
      : { success: true, status: 202 };
  }
}

const exampleCode = `import { createAnalytics, HttpTransport } from "tracelet-browser";

const analytics = createAnalytics({
  appId: "storefront",
  transport: new HttpTransport({
    endpoint: "https://events.example.com/v1/batch",
  }),
});

await analytics.track("product_viewed", {
  productId: "sku_123",
  price: 129,
});

await analytics.flush();`;

function logFromDiagnostic(event: DiagnosticEvent, en: boolean): Omit<PlaygroundLog, "id" | "at"> {
  if (event.type === "event_enqueued") {
    return {
      kind: "info",
      title: en ? `Queued ${event.eventName}` : `已入队 ${event.eventName}`,
      detail: en ? `${event.queueSize} event(s) waiting` : `队列中有 ${event.queueSize} 个事件`,
    };
  }
  if (event.type === "flush_succeeded") {
    return {
      kind: "success",
      title: en ? "Collector accepted the batch" : "Collector 已接收批次",
      detail: `${event.eventCount} event(s) · HTTP ${event.status ?? 200}`,
    };
  }
  if (event.type === "flush_failed") {
    return {
      kind: "failure",
      title: en ? "Delivery failed; events stay queued" : "投递失败，事件继续留在队列",
      detail: `HTTP ${event.status ?? 503} · retryable=${String(event.retryable)}`,
    };
  }
  if (event.type === "flush_retry_scheduled") {
    return {
      kind: "info",
      title: en ? "Retry scheduled" : "已安排重试",
      detail: en ? `Attempt ${event.attempt} after ${event.delayMs}ms` : `第 ${event.attempt} 次，将在 ${event.delayMs}ms 后重试`,
    };
  }
  if (event.type === "flush_started") {
    return {
      kind: "info",
      title: en ? "Encoding and sending a batch" : "正在编码并发送批次",
      detail: `${event.eventCount} event(s) · ${event.reason}`,
    };
  }
  return {
    kind: "info",
    title: event.type,
    detail: en ? "SDK lifecycle diagnostic" : "SDK 生命周期诊断",
  };
}

export default function PlaygroundPage() {
  const locale = useLocale();
  const en = locale === "en";
  const storageRef = useRef<MemoryEventStorage | undefined>(undefined);
  const transportRef = useRef<PlaygroundTransport | undefined>(undefined);
  const analyticsRef = useRef<Analytics<Record<string, EventProperties>> | undefined>(undefined);
  const sequenceRef = useRef(0);
  const [eventName, setEventName] = useState("product_viewed");
  const [properties, setProperties] = useState('{\n  "productId": "sku_123",\n  "price": 129\n}');
  const [logs, setLogs] = useState<PlaygroundLog[]>([]);
  const [payload, setPayload] = useState<EventBatch | undefined>();
  const [queueSize, setQueueSize] = useState(0);
  const [delivered, setDelivered] = useState(0);
  const [failArmed, setFailArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const addLog = (log: Omit<PlaygroundLog, "id" | "at">) => {
    sequenceRef.current += 1;
    setLogs((current) => [{ ...log, id: sequenceRef.current, at: new Date().toLocaleTimeString() }, ...current].slice(0, 12));
  };

  useEffect(() => {
    let active = true;
    const storage = new MemoryEventStorage();
    const transport = new PlaygroundTransport((request) => {
      if (!active) return;
      setPayload(request.payload);
      setFailArmed(false);
      if (!request.failed) setDelivered((count) => count + request.payload.events.length);
      addLog({
        kind: request.failed ? "failure" : "success",
        title: request.failed
          ? (en ? "Mock collector returned 503" : "模拟 Collector 返回 503")
          : (en ? "Mock collector returned 202" : "模拟 Collector 返回 202"),
        detail: `${request.payload.events.length} event(s) · reason=${request.context.reason}`,
      });
    });
    const analytics = createAnalytics<Record<string, EventProperties>>({
      appId: "tracelet-playground",
      appVersion: "web",
      environment: "demo",
      eventStorage: storage,
      identityStorage: new MemoryKeyValueStorage(),
      transport,
      flushIntervalMs: 60 * 60 * 1_000,
      retry: { baseDelayMs: 60_000, maxDelayMs: 60_000, jitterRatio: 0 },
      pageLifecycle: false,
      onDiagnostic: (event) => {
        if (active && event.type !== "sdk_initialized" && event.type !== "sdk_shutdown") {
          addLog(logFromDiagnostic(event, en));
        }
      },
    });
    storageRef.current = storage;
    transportRef.current = transport;
    analyticsRef.current = analytics;
    void analytics.init();
    return () => {
      active = false;
      void analytics.shutdown();
      analyticsRef.current = undefined;
    };
  }, [en]);

  const payloadText = useMemo(
    () => payload ? JSON.stringify(payload, null, 2) : (en ? "// Flush the queue to inspect the EventBatch." : "// 点击发送队列后，在这里检查 EventBatch。"),
    [en, payload],
  );

  const parseProperties = (): EventProperties | undefined => {
    try {
      const value = JSON.parse(properties) as unknown;
      if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("object");
      setError("");
      return value as EventProperties;
    } catch {
      setError(en ? "Properties must be a valid JSON object." : "事件属性必须是有效的 JSON 对象。");
      return undefined;
    }
  };

  const refreshQueueSize = async () => setQueueSize(await storageRef.current?.size() ?? 0);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      await refreshQueueSize();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (en ? "The action failed." : "操作失败。"));
    } finally {
      setBusy(false);
    }
  };

  const queueTrack = () => {
    const parsed = parseProperties();
    if (!parsed || !eventName.trim()) return;
    void run(() => analyticsRef.current?.track(eventName.trim(), parsed) ?? Promise.resolve());
  };

  const queuePage = () => {
    const parsed = parseProperties();
    if (!parsed || !eventName.trim()) return;
    void run(() => analyticsRef.current?.page(eventName.trim(), parsed) ?? Promise.resolve());
  };

  const identify = () => {
    void run(() => analyticsRef.current?.identify("demo_user_42", { plan: "starter" }) ?? Promise.resolve());
  };

  const flush = () => void run(() => analyticsRef.current?.flush("manual") ?? Promise.resolve());

  const armFailure = () => {
    transportRef.current?.failNextRequest();
    setFailArmed(true);
    addLog({
      kind: "failure",
      title: en ? "Next delivery will fail" : "下一次投递将会失败",
      detail: en ? "The mock collector is armed to return HTTP 503." : "模拟 Collector 已设置为返回 HTTP 503。",
    });
  };

  const clear = () => void run(async () => {
    await storageRef.current?.clear();
    setLogs([]);
    setPayload(undefined);
    setDelivered(0);
    setFailArmed(false);
    setError("");
  });

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/8 px-5 py-16 lg:px-8 lg:py-20">
        <div className="hero-glow" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl">
          <Badge><FlaskConical className="mr-2 size-3.5" />{en ? "Runs the real SDK in your browser" : "在浏览器中运行真实 SDK"}</Badge>
          <h1 className="mt-7 max-w-5xl text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
            {en ? "See every step from track() to delivery." : "亲手观察从 track() 到投递的每一步。"}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            {en ? "No account and no backend. Events run through Tracelet's real queue, codec and transport contract into a browser-only mock collector." : "无需账号，也无需准备后端。事件会经过 Tracelet 真实的队列、编码与 Transport 契约，最终进入浏览器内的模拟 Collector。"}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><span className="section-kicker">01 / Event builder</span><h2 className="!text-2xl">{en ? "Create a real event" : "创建一个真实事件"}</h2></div>
              <Badge className="border-emerald-300/20 bg-emerald-300/8 text-emerald-200"><Activity className="mr-1.5 size-3.5" />SDK active</Badge>
            </div>

            <label className="mt-8 block text-sm font-medium text-slate-200">
              {en ? "Event or page name" : "事件或页面名称"}
              <input className="playground-field mt-2" value={eventName} onChange={(event) => setEventName(event.target.value)} spellCheck={false} />
            </label>
            <label className="mt-5 block text-sm font-medium text-slate-200">
              {en ? "Properties (JSON)" : "事件属性（JSON）"}
              <textarea className="playground-field mt-2 min-h-44 resize-y font-mono text-xs leading-6" value={properties} onChange={(event) => setProperties(event.target.value)} spellCheck={false} />
            </label>
            {error ? <p className="mt-3 flex items-center gap-2 text-sm text-rose-300" role="alert"><AlertTriangle className="size-4" />{error}</p> : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Button type="button" onClick={queueTrack} disabled={busy}><Radio className="size-4" />track()</Button>
              <Button type="button" variant="outline" onClick={queuePage} disabled={busy}>page()</Button>
              <Button type="button" variant="outline" onClick={identify} disabled={busy}><UserRound className="size-4" />identify()</Button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Metric icon={Database} label={en ? "Queued" : "队列"} value={queueSize} />
              <Metric icon={CheckCircle2} label={en ? "Delivered" : "已投递"} value={delivered} />
              <Metric icon={AlertTriangle} label={en ? "Failure armed" : "故障模拟"} value={failArmed ? (en ? "Yes" : "已开启") : (en ? "No" : "未开启")} wide />
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-white/8 pt-6">
              <Button type="button" onClick={flush} disabled={busy || queueSize === 0}><Send className="size-4" />{en ? "Flush queue" : "发送队列"}</Button>
              <Button type="button" variant="outline" onClick={armFailure} disabled={busy || failArmed}><RotateCcw className="size-4" />{en ? "Fail next request" : "模拟下次失败"}</Button>
              <Button type="button" variant="ghost" onClick={clear} disabled={busy}><Trash2 className="size-4" />{en ? "Reset" : "重置"}</Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#050809]">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div className="flex items-center gap-3"><span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" /><strong className="text-sm">browser-mock-collector</strong></div>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-600">EventBatch · JSON</span>
            </div>
            <pre className="max-h-[650px] min-h-[520px] overflow-auto p-5 text-xs leading-6 text-slate-300"><code>{payloadText}</code></pre>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6" aria-labelledby="playground-timeline">
            <div className="flex items-center justify-between"><div><span className="section-kicker">02 / Diagnostics</span><h2 id="playground-timeline" className="!text-2xl">{en ? "Live lifecycle" : "实时生命周期"}</h2></div><span className="text-xs text-slate-600">{logs.length}/12</span></div>
            <div className="mt-6 space-y-3" aria-live="polite">
              {logs.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">{en ? "Create an event to start the timeline." : "创建事件后，这里会展示 SDK 的诊断时间线。"}</p> : logs.map((log) => <TimelineItem key={log.id} log={log} />)}
            </div>
          </section>
          <section>
            <span className="section-kicker">03 / Production code</span>
            <h2 className="!text-2xl">{en ? "Replace only the transport" : "生产环境只需替换 Transport"}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">{en ? "The playground uses an in-browser mock. Your application uses the same lifecycle with an HTTP endpoint or a custom adapter." : "Playground 使用浏览器内 Mock；真实项目保持同一套生命周期，只需接入 HTTP Endpoint 或自定义 Adapter。"}</p>
            <div className="mt-6"><CodeBlock code={exampleCode} filename="analytics.ts" /></div>
          </section>
        </div>
      </section>
    </>
  );
}

function Metric({ icon: Icon, label, value, wide = false }: { icon: typeof Database; label: string; value: number | string; wide?: boolean }) {
  return <div className={`rounded-xl border border-white/8 bg-black/20 p-4 ${wide ? "col-span-2 sm:col-span-1" : ""}`}><Icon className="size-4 text-emerald-300" /><span className="mt-3 block text-xs text-slate-500">{label}</span><strong className="mt-1 block text-lg font-semibold">{value}</strong></div>;
}

function TimelineItem({ log }: { log: PlaygroundLog }) {
  const colors = log.kind === "success" ? "bg-emerald-300" : log.kind === "failure" ? "bg-rose-300" : "bg-sky-300";
  return <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-xl border border-white/8 bg-black/20 px-4 py-3"><span className={`mt-1.5 size-2 rounded-full ${colors}`} /><span><strong className="block text-sm font-medium text-slate-200">{log.title}</strong><span className="mt-1 block font-mono text-[11px] leading-5 text-slate-500">{log.detail}</span></span><time className="font-mono text-[10px] text-slate-600">{log.at}</time></div>;
}
