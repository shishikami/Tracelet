import type { AnalyticsEvent, EventBatch } from "./types.js";

export interface Codec {
  readonly name: string;
  readonly contentType: string;
  encode(batch: EventBatch): Promise<string | Uint8Array>;
}

export interface Compression {
  readonly name: string;
  readonly contentEncoding?: string;
  compress(payload: string | Uint8Array): Promise<string | Uint8Array>;
}

export interface EncodedBatch {
  body: string | Uint8Array;
  contentType: string;
  contentEncoding?: string;
  eventIds: string[];
}

export interface TransportContext {
  reason: "interval" | "queue-full" | "manual" | "page-hide" | "shutdown";
  signal?: AbortSignal;
}

export interface TransportResult {
  success: boolean;
  retryable?: boolean;
  status?: number;
  retryAfterMs?: number;
}

export interface Transport {
  readonly name: string;
  send(batch: EncodedBatch, context: TransportContext): Promise<TransportResult>;
}

/** Origin-wide browser storage estimate; values are advisory, not guarantees. */
export interface StorageEstimate {
  usageBytes?: number;
  quotaBytes?: number;
  availableBytes?: number;
  usageRatio?: number;
  persisted?: boolean;
  usageDetails?: Readonly<Record<string, number>>;
}

/** Current delivery lifecycle exposed by QueueSnapshot. */
export type DeliveryPhase = "idle" | "sending" | "waiting-retry";

/**
 * Best-effort view of the local queue and current delivery attempt.
 *
 * Queue reads are observational rather than transactional: storage may change
 * while the snapshot is assembled. The object is frozen before it is returned.
 */
export interface QueueSnapshot {
  readonly pendingEvents: number;
  /** Event timestamp of the oldest queued item, not its persistence time. */
  readonly oldestEventTimestamp?: string;
  /** Origin-wide advisory values when the configured storage exposes them. */
  readonly storageEstimate?: Readonly<StorageEstimate>;
  readonly delivery: Readonly<{
    phase: DeliveryPhase;
    retryAttempt: number;
    nextRetryAt?: string;
    activeAttemptId?: string;
    transport?: string;
  }>;
}

/**
 * Selects one delivery transport for an event before the event is encoded.
 *
 * Resolving before encoding lets the SDK keep events for different backends in
 * separate batches. Implementations should return stable Transport instances;
 * the SDK compares them by identity while collecting a batch.
 */
export interface TransportResolver {
  readonly kind: "transport-resolver";
  readonly name: string;
  resolve(event: AnalyticsEvent): Transport;
}

export interface EventStorage {
  push(event: AnalyticsEvent): Promise<void>;
  peek(limit: number): Promise<AnalyticsEvent[]>;
  remove(eventIds: readonly string[]): Promise<void>;
  size(): Promise<number>;
  clear(): Promise<void>;
  /** Optional origin-wide quota estimate for persistent browser storage. */
  estimate?(): Promise<StorageEstimate | undefined>;
}

export interface KeyValueStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface PluginContext {
  readonly appId: string;
  /** Enqueue a regular analytics event through consent, storage, and delivery. */
  track(name: string, properties?: Record<string, unknown>): Promise<void>;
  /** Enqueue a page-view event through the same lifecycle as manual page calls. */
  page(name: string, properties?: Record<string, unknown>): Promise<void>;
}

/**
 * Extension point for observing or transforming the event lifecycle.
 * Plugins are initialized in declaration order and torn down in reverse order.
 */
export interface AnalyticsPlugin {
  readonly name: string;
  setup?(context: PluginContext): void | Promise<void>;
  beforeTrack?(event: AnalyticsEvent): AnalyticsEvent | null | Promise<AnalyticsEvent | null>;
  afterTrack?(event: AnalyticsEvent): void | Promise<void>;
  teardown?(): void | Promise<void>;
}

export type DiagnosticEvent =
  | { type: "sdk_initialized" }
  | { type: "event_enqueued"; eventId: string; eventName: string; queueSize: number }
  | {
      type: "event_dropped";
      eventName: string;
      reason:
        | "consent"
        | "plugin"
        | "queue-limit"
        | "serialization"
        | "event-too-large"
        | "batch-byte-limit"
        | "storage-quota"
        | "adapter-error"
        | "shutdown";
    }
  | { type: "plugin_error"; plugin: string; stage: "setup" | "before-track" | "after-track" | "teardown" }
  | {
      type: "adapter_error";
      adapter: "identity-storage" | "event-storage" | "codec" | "compression" | "transport" | "delivery-lock";
      operation: string;
    }
  | { type: "storage_quota_exceeded"; eventName: string; estimate?: StorageEstimate }
  | {
      type: "flush_started";
      attemptId: string;
      eventCount: number;
      reason: TransportContext["reason"];
      transport: string;
    }
  | { type: "flush_succeeded"; attemptId: string; eventCount: number; transport: string; status?: number }
  | { type: "flush_failed"; attemptId: string; eventCount: number; retryable: boolean; transport?: string; status?: number }
  | { type: "flush_retry_scheduled"; attemptId: string; attempt: number; delayMs: number; nextRetryAt: string }
  | { type: "sdk_shutdown" };

export type DiagnosticListener = (event: DiagnosticEvent) => void;
/** Backward-compatible name for the constructor-level diagnostic listener. */
export type DiagnosticHandler = DiagnosticListener;
