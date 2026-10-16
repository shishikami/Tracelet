import type { EncodedBatch, Transport, TransportContext, TransportResult } from "./contracts.js";

export interface HttpTransportOptions {
  endpoint: string;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  timeoutMs?: number;
}

export class HttpTransport implements Transport {
  readonly name = "http";

  constructor(private readonly options: HttpTransportOptions) {}

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

      const body: BodyInit =
        typeof batch.body === "string"
          ? batch.body
          : new Blob([new Uint8Array(batch.body)], { type: batch.contentType });

      const response = await fetch(this.options.endpoint, {
        method: "POST",
        headers,
        body,
        credentials: this.options.credentials ?? "omit",
        keepalive: context.reason === "page-hide" || context.reason === "shutdown",
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
