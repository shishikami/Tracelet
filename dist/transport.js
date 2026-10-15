export class HttpTransport {
    options;
    name = "http";
    constructor(options) {
        this.options = options;
    }
    async send(batch, context) {
        const controller = new AbortController();
        const timeout = globalThis.setTimeout(() => controller.abort(), this.options.timeoutMs ?? 10_000);
        const abort = () => controller.abort();
        context.signal?.addEventListener("abort", abort, { once: true });
        try {
            const headers = {
                "content-type": batch.contentType,
                "x-analytics-event-count": String(batch.eventIds.length),
                ...this.options.headers,
            };
            if (batch.contentEncoding)
                headers["content-encoding"] = batch.contentEncoding;
            const body = typeof batch.body === "string"
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
            const retryAfter = response.headers.get("retry-after");
            return {
                success: response.ok,
                retryable: response.status === 408 || response.status === 429 || response.status >= 500,
                status: response.status,
                ...(retryAfter ? { retryAfterMs: Number(retryAfter) * 1_000 } : {}),
            };
        }
        catch (error) {
            return {
                success: false,
                retryable: !(error instanceof DOMException && error.name === "AbortError"),
            };
        }
        finally {
            globalThis.clearTimeout(timeout);
            context.signal?.removeEventListener("abort", abort);
        }
    }
}
export class ConsoleTransport {
    name = "console";
    async send(batch) {
        console.info("[analytics] batch", batch);
        return { success: true };
    }
}
//# sourceMappingURL=transport.js.map