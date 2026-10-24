import type {
  EncodedBatch,
  Transport,
  TransportContext,
  TransportResolver,
  TransportResult,
} from "./contracts.js";
import type { AnalyticsEvent } from "./types.js";

export interface HttpTransportOptions {
  endpoint: string;
  /** Diagnostic name used when several HTTP collectors are configured. */
  name?: string;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  timeoutMs?: number;
  /**
   * Maximum body size that may use Fetch keepalive during page exit.
   * Defaults to 60 KiB, leaving headroom below common browser limits.
   * Larger payloads still use a regular retryable Fetch request.
   */
  keepaliveMaxBytes?: number;
}

export class HttpTransport implements Transport {
  readonly name: string;

  constructor(private readonly options: HttpTransportOptions) {
    this.name = options.name ?? "http";
  }

  async send(batch: EncodedBatch, context: TransportContext): Promise<TransportResult> {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = globalThis.setTimeout(
      () => {
        timedOut = true;
        controller.abort();
      },
      this.options.timeoutMs ?? 10_000,
    );
    const abort = () => controller.abort();
    context.signal?.addEventListener("abort", abort, { once: true });

    try {
      const headers: Record<string, string> = {
        "content-type": batch.contentType,
        "x-analytics-event-count": String(batch.eventIds.length),
        ...this.options.headers,
      };
      if (batch.contentEncoding) headers["content-encoding"] = batch.contentEncoding;

      const bodyBytes = typeof batch.body === "string"
        ? new TextEncoder().encode(batch.body).byteLength
        : batch.body.byteLength;
      const body: BodyInit = typeof batch.body === "string"
        ? batch.body
        : new Blob([new Uint8Array(batch.body)], { type: batch.contentType });
      const lifecycleRequest = context.reason === "page-hide" || context.reason === "shutdown";
      const keepaliveMaxBytes = Math.max(0, this.options.keepaliveMaxBytes ?? 60 * 1_024);

      const response = await fetch(this.options.endpoint, {
        method: "POST",
        headers,
        body,
        credentials: this.options.credentials ?? "omit",
        // Browsers enforce a small, shared quota for in-flight keepalive data.
        // A synchronous TypeError here is retryable, but avoiding keepalive for
        // a known-large payload gives the regular request a chance to finish.
        keepalive: lifecycleRequest && bodyBytes <= keepaliveMaxBytes,
        signal: controller.signal,
      });

      const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
      return {
        success: response.ok,
        retryable: response.status === 408 || response.status === 429 || response.status >= 500,
        status: response.status,
        ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
      };
    } catch (error) {
      const externallyAborted = context.signal?.aborted === true && !timedOut;
      return {
        success: false,
        retryable: !externallyAborted,
      };
    } finally {
      globalThis.clearTimeout(timeout);
      context.signal?.removeEventListener("abort", abort);
    }
  }
}

function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1_000);

  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - now);
}

export class ConsoleTransport implements Transport {
  readonly name = "console";

  async send(batch: EncodedBatch): Promise<TransportResult> {
    console.info("[analytics] batch", batch);
    return { success: true };
  }
}

export interface EventRoute {
  /** Human-readable route name used only by application code and debugging. */
  name: string;
  /** A synchronous, deterministic predicate evaluated in declaration order. */
  match(event: AnalyticsEvent): boolean;
  transport: Transport;
}

export interface EventRouterOptions {
  routes: readonly EventRoute[];
  /** Receives events that do not match any explicit route. */
  fallback: Transport;
  name?: string;
}

/**
 * Routes each event to exactly one Transport using the first matching rule.
 *
 * Routing happens before Codec and Compression run, so one encoded batch never
 * mixes destinations. The fallback makes delivery total and prevents unmatched
 * events from becoming permanently stuck in the queue.
 */
export class EventRouter implements TransportResolver {
  readonly kind = "transport-resolver" as const;
  readonly name: string;

  constructor(private readonly options: EventRouterOptions) {
    this.name = options.name ?? "event-router";
  }

  resolve(event: AnalyticsEvent): Transport {
    for (const route of this.options.routes) {
      if (route.match(event)) return route.transport;
    }
    return this.options.fallback;
  }
}
