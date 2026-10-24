export interface CollectorAnalyticsEvent {
  eventId: string;
  type: "track" | "page" | "identify" | "group";
  name: string;
  timestamp: string;
  identity: {
    anonymousId: string;
    sessionId: string;
    userId?: string;
  };
  properties: Record<string, unknown>;
  context: Record<string, unknown>;
  schemaVersion: string;
}

export interface CollectorEventBatch {
  protocolVersion: string;
  sentAt: string;
  events: CollectorAnalyticsEvent[];
}

export interface CollectorRequestContext {
  requestId: string;
  receivedAt: string;
  origin?: string;
}

export interface CollectorSinkResult {
  /** Event IDs that were already committed by the durable sink. */
  duplicateEventIds?: readonly string[];
}

export interface CollectorSink {
  /**
   * Persist or enqueue the complete batch before resolving.
   *
   * A production sink should enforce a unique constraint on eventId and return
   * IDs that were already present. In-memory state is not durable on Functions.
   */
  write(
    batch: CollectorEventBatch,
    context: CollectorRequestContext,
  ): void | CollectorSinkResult | Promise<void | CollectorSinkResult>;
}

export interface TraceletCollectorOptions {
  sink: CollectorSink;
  /** Explicit browser origins. An empty list denies cross-origin browser requests. */
  allowedOrigins?: readonly string[];
  /** Maximum bytes accepted before decompression. Defaults to 512 KiB. */
  maxCompressedBytes?: number;
  /** Maximum bytes accepted after decompression. Defaults to 1 MiB. */
  maxDecodedBytes?: number;
  /** Maximum events in one EventBatch. Defaults to 100. */
  maxEvents?: number;
  /** Accepted EventBatch protocol versions. Defaults to only version "1". */
  supportedProtocolVersions?: readonly string[];
  /** Optional server-side authentication hook. Never embed a long-lived secret in browser code. */
  authorize?: (request: Request) => boolean | Promise<boolean>;
  logger?: Pick<Console, "info" | "error">;
}

interface CollectorProblem {
  error: string;
  message: string;
  requestId: string;
}

class CollectorRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const allowedEventTypes = new Set(["track", "page", "identify", "group"]);

/** Create a stateless Web Request/Response handler for a Tracelet JSON collector. */
export function createTraceletCollector(options: TraceletCollectorOptions) {
  const maxCompressedBytes = positiveInteger(options.maxCompressedBytes, 512 * 1_024);
  const maxDecodedBytes = positiveInteger(options.maxDecodedBytes, 1_024 * 1_024);
  const maxEvents = positiveInteger(options.maxEvents, 100);
  const supportedProtocolVersions = new Set(options.supportedProtocolVersions ?? ["1"]);
  const allowedOrigins = new Set(options.allowedOrigins ?? []);
  const logger = options.logger ?? console;

  return async function handleTraceletRequest(request: Request): Promise<Response> {
    const requestId = request.headers.get("x-request-id")?.slice(0, 128) || crypto.randomUUID();
    const origin = request.headers.get("origin") ?? undefined;
    const context: CollectorRequestContext = {
      requestId,
      receivedAt: new Date().toISOString(),
      ...(origin === undefined ? {} : { origin }),
    };
    const originAllowed = isOriginAllowed(origin, allowedOrigins);
    const responseHeaders = createResponseHeaders(origin, allowedOrigins, requestId);

    if (request.method === "OPTIONS") {
      if (!originAllowed) {
        return problem(
          403,
          "origin_not_allowed",
          "The request origin is not allowed.",
          requestId,
          responseHeaders,
        );
      }
      return new Response(null, { status: 204, headers: responseHeaders });
    }

    if (request.method !== "POST") {
      responseHeaders.set("allow", "POST, OPTIONS");
      return problem(
        405,
        "method_not_allowed",
        "Use POST to submit an EventBatch.",
        requestId,
        responseHeaders,
      );
    }

    if (!originAllowed) {
      return problem(
        403,
        "origin_not_allowed",
        "The request origin is not allowed.",
        requestId,
        responseHeaders,
      );
    }

    try {
      if (options.authorize && !(await options.authorize(request))) {
        responseHeaders.set("www-authenticate", "Bearer");
        throw new CollectorRequestError(401, "unauthorized", "Collector authentication failed.");
      }

      const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
      if (contentType !== "application/json") {
        throw new CollectorRequestError(
          415,
          "unsupported_media_type",
          "This starter accepts application/json EventBatch payloads.",
        );
      }

      const contentEncoding = request.headers.get("content-encoding")?.trim().toLowerCase() || "identity";
      if (contentEncoding !== "identity" && contentEncoding !== "gzip") {
        throw new CollectorRequestError(
          415,
          "unsupported_content_encoding",
          "Only identity and gzip content encodings are supported.",
        );
      }

      const declaredLength = parseOptionalInteger(request.headers.get("content-length"));
      if (declaredLength !== undefined && declaredLength > maxCompressedBytes) {
        throw new CollectorRequestError(413, "payload_too_large", "The compressed request body is too large.");
      }

      const compressed = new Uint8Array(await request.arrayBuffer());
      if (compressed.byteLength > maxCompressedBytes) {
        throw new CollectorRequestError(413, "payload_too_large", "The compressed request body is too large.");
      }

      const decoded = contentEncoding === "gzip"
        ? await decompressGzip(compressed, maxDecodedBytes)
        : compressed;
      if (decoded.byteLength > maxDecodedBytes) {
        throw new CollectorRequestError(413, "payload_too_large", "The decoded request body is too large.");
      }

      let value: unknown;
      try {
        value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(decoded));
      } catch {
        throw new CollectorRequestError(400, "invalid_json", "The request body is not valid UTF-8 JSON.");
      }

      const batch = validateBatch(value, maxEvents, supportedProtocolVersions);
      const declaredEventCount = parseOptionalInteger(request.headers.get("x-analytics-event-count"));
      if (declaredEventCount !== undefined && declaredEventCount !== batch.events.length) {
        throw new CollectorRequestError(
          400,
          "event_count_mismatch",
          "x-analytics-event-count does not match the EventBatch.",
        );
      }

      const sinkResult = await options.sink.write(batch, context);
      const duplicateEventIds = validateSinkResult(sinkResult, batch);
      const duplicateSet = new Set(duplicateEventIds);
      const acceptedEventIds = batch.events
        .map((event) => event.eventId)
        .filter((eventId) => !duplicateSet.has(eventId));

      logger.info(JSON.stringify({
        type: "tracelet_batch_accepted",
        requestId,
        eventCount: batch.events.length,
        accepted: acceptedEventIds.length,
        duplicates: duplicateEventIds.length,
      }));

      return json({
        requestId,
        accepted: acceptedEventIds.length,
        duplicates: duplicateEventIds.length,
        eventIds: acceptedEventIds,
      }, 202, responseHeaders);
    } catch (error) {
      if (error instanceof CollectorRequestError) {
        return problem(error.status, error.code, error.message, requestId, responseHeaders);
      }

      logger.error(JSON.stringify({ type: "tracelet_collector_error", requestId }));
      return problem(
        500,
        "collector_failure",
        "The collector could not commit this batch.",
        requestId,
        responseHeaders,
      );
    }
  };
}

/** Parse a comma-separated allowlist without silently enabling wildcard CORS. */
export function parseAllowedOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function validateBatch(
  value: unknown,
  maxEvents: number,
  supportedProtocolVersions: ReadonlySet<string>,
): CollectorEventBatch {
  if (!isRecord(value)) {
    throw new CollectorRequestError(400, "invalid_batch", "EventBatch must be a JSON object.");
  }
  if (!validString(value.protocolVersion, 32)) {
    throw new CollectorRequestError(400, "invalid_batch", "protocolVersion is required.");
  }
  if (!supportedProtocolVersions.has(value.protocolVersion)) {
    throw new CollectorRequestError(
      400,
      "unsupported_protocol_version",
      `protocolVersion ${value.protocolVersion} is not supported.`,
    );
  }
  if (!validTimestamp(value.sentAt)) {
    throw new CollectorRequestError(400, "invalid_batch", "sentAt must be an ISO-compatible timestamp.");
  }
  if (!Array.isArray(value.events) || value.events.length === 0 || value.events.length > maxEvents) {
    throw new CollectorRequestError(
      400,
      "invalid_batch",
      `events must contain between 1 and ${maxEvents} items.`,
    );
  }

  const seenEventIds = new Set<string>();
  const events = value.events.map((event, index) => validateEvent(event, index, seenEventIds));
  return { protocolVersion: value.protocolVersion, sentAt: value.sentAt, events };
}

function validateEvent(
  value: unknown,
  index: number,
  seenEventIds: Set<string>,
): CollectorAnalyticsEvent {
  if (!isRecord(value)) return invalidEvent(index, "must be an object");
  if (!validString(value.eventId, 128)) return invalidEvent(index, "eventId is required");
  if (seenEventIds.has(value.eventId)) return invalidEvent(index, "eventId is duplicated in this batch");
  seenEventIds.add(value.eventId);
  if (!validString(value.type, 16) || !allowedEventTypes.has(value.type)) {
    return invalidEvent(index, "type is invalid");
  }
  if (!validString(value.name, 128)) return invalidEvent(index, "name is required");
  if (!validTimestamp(value.timestamp)) return invalidEvent(index, "timestamp is invalid");
  if (!validString(value.schemaVersion, 32)) return invalidEvent(index, "schemaVersion is required");
  if (!isRecord(value.identity)) return invalidEvent(index, "identity is required");
  if (!validString(value.identity.anonymousId, 128)) return invalidEvent(index, "anonymousId is required");
  if (!validString(value.identity.sessionId, 128)) return invalidEvent(index, "sessionId is required");
  if (value.identity.userId !== undefined && !validString(value.identity.userId, 256)) {
    return invalidEvent(index, "userId is invalid");
  }
  if (!isRecord(value.properties)) return invalidEvent(index, "properties must be an object");
  if (!isRecord(value.context)) return invalidEvent(index, "context must be an object");

  return value as unknown as CollectorAnalyticsEvent;
}

function invalidEvent(index: number, message: string): never {
  throw new CollectorRequestError(400, "invalid_event", `events[${index}] ${message}.`);
}

function validateSinkResult(
  value: void | CollectorSinkResult,
  batch: CollectorEventBatch,
): string[] {
  const duplicates = [...(value?.duplicateEventIds ?? [])];
  const inputIds = new Set(batch.events.map((event) => event.eventId));
  const unique = new Set<string>();
  for (const eventId of duplicates) {
    if (!inputIds.has(eventId) || unique.has(eventId)) {
      throw new Error("Collector sink returned an invalid duplicateEventIds result");
    }
    unique.add(eventId);
  }
  return duplicates;
}

async function decompressGzip(input: Uint8Array, maxBytes: number): Promise<Uint8Array> {
  try {
    const copy = new Uint8Array(input.byteLength);
    copy.set(input);
    const stream = new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream("gzip"));
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new CollectorRequestError(413, "payload_too_large", "The decoded request body is too large.");
      }
      chunks.push(value);
    }

    const output = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return output;
  } catch (error) {
    if (error instanceof CollectorRequestError) throw error;
    throw new CollectorRequestError(400, "invalid_gzip", "The gzip request body could not be decoded.");
  }
}

function createResponseHeaders(
  origin: string | undefined,
  allowedOrigins: ReadonlySet<string>,
  requestId: string,
): Headers {
  const headers = new Headers({
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-tracelet-request-id": requestId,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, content-encoding, x-analytics-event-count, x-request-id",
    "access-control-expose-headers": "x-tracelet-request-id",
    vary: "origin",
  });
  if (origin && isOriginAllowed(origin, allowedOrigins)) {
    headers.set("access-control-allow-origin", allowedOrigins.has("*") ? "*" : origin);
  }
  return headers;
}

function isOriginAllowed(origin: string | undefined, allowedOrigins: ReadonlySet<string>): boolean {
  return origin === undefined || allowedOrigins.has("*") || allowedOrigins.has(origin);
}

function json(value: unknown, status: number, headers = new Headers()): Response {
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(value), { status, headers });
}

function problem(
  status: number,
  error: string,
  message: string,
  requestId: string,
  headers = new Headers(),
): Response {
  return json({ error, message, requestId } satisfies CollectorProblem, status, headers);
}

function validString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function validTimestamp(value: unknown): value is string {
  return validString(value, 64) && !Number.isNaN(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseOptionalInteger(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new CollectorRequestError(400, "invalid_header", "A numeric request header is invalid.");
  }
  return parsed;
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isSafeInteger(value) && value > 0 ? value : fallback;
}
