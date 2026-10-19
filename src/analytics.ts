import type {
  AnalyticsPlugin,
  Codec,
  Compression,
  DiagnosticEvent,
  DiagnosticHandler,
  EventStorage,
  KeyValueStorage,
  Transport,
  TransportContext,
  TransportResolver,
} from "./contracts.js";
import { JsonCodec } from "./codecs.js";
import { NoCompression } from "./compression.js";
import { ConsentManager, type ConsentState } from "./consent.js";
import { IdentityManager, createId } from "./identity.js";
import { MemoryEventStorage, MemoryKeyValueStorage } from "./storage.js";
import { SDK_NAME, SDK_VERSION } from "./version.js";
import { BrowserDeliveryLock, type DeliveryLock } from "./locking.js";
import type {
  AnalyticsEvent,
  EventContext,
  EventProperties,
  EventType,
  TrackOptions,
} from "./types.js";

export interface AnalyticsOptions {
  /** Stable identifier for the browser application that produces events. */
  appId: string;
  appVersion?: string;
  environment?: string;
  schemaVersion?: string;
  protocolVersion?: string;
  /** A single delivery adapter or an event-aware resolver for multiple adapters. */
  transport: Transport | TransportResolver;
  codec?: Codec;
  compression?: Compression;
  eventStorage?: EventStorage;
  identityStorage?: KeyValueStorage;
  plugins?: AnalyticsPlugin[];
  flushIntervalMs?: number;
  maxBatchSize?: number;
  /** Maximum encoded bytes sent in one batch. Defaults to 256 KiB. */
  maxBatchBytes?: number;
  maxQueueSize?: number;
  /** Maximum JSON byte size of one processed event. Defaults to 64 KiB. */
  maxEventBytes?: number;
  deliveryLock?: DeliveryLock;
  /** Idle time after which the next event starts a new session. Defaults to 30 minutes. */
  sessionTimeoutMs?: number;
  consent?: {
    initialState?: ConsentState;
    clearQueueOnDenied?: boolean;
  };
  retry?: {
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitterRatio?: number;
  };
  pageLifecycle?: boolean;
  onDiagnostic?: DiagnosticHandler;
}

/**
 * Framework-independent analytics client.
 *
 * Create one long-lived instance per application and call shutdown when the
 * owning application or micro-frontend is permanently unmounted.
 */
export class Analytics<TEvents extends object = Record<string, EventProperties>> {
  private readonly codec: Codec;
  private readonly compression: Compression;
  private readonly eventStorage: EventStorage;
  private readonly identity: IdentityManager;
  private readonly consent: ConsentManager;
  private readonly plugins: AnalyticsPlugin[];
  private readonly deliveryLock: DeliveryLock;
  private flushTimer?: number;
  private flushPromise: Promise<void> | undefined;
  private initialized = false;
  private retryAttempt = 0;
  private readonly pageHideHandler = () => void this.flush("page-hide");
  private readonly visibilityHandler = () => {
    if (globalThis.document?.visibilityState === "hidden") void this.flush("page-hide");
  };

  constructor(private readonly options: AnalyticsOptions) {
    this.codec = options.codec ?? new JsonCodec();
    this.compression = options.compression ?? new NoCompression();
    this.eventStorage = options.eventStorage ?? new MemoryEventStorage();
    this.identity = new IdentityManager(
      options.identityStorage ?? new MemoryKeyValueStorage(),
      options.sessionTimeoutMs,
    );
    this.consent = new ConsentManager(options.consent?.initialState ?? "granted");
    this.plugins = options.plugins ?? [];
    this.deliveryLock = options.deliveryLock ?? new BrowserDeliveryLock(`tracelet:${options.appId}:delivery`);
  }

  /** Initialize plugins and lifecycle listeners. Safe to call more than once. */
  async init(): Promise<void> {
    if (this.initialized) return;
    // Mark the instance ready before plugin setup so capture plugins can safely
    // emit an initial event without recursively entering init().
    this.initialized = true;
    const initializedPlugins: AnalyticsPlugin[] = [];
    try {
      for (const plugin of this.plugins) {
        await plugin.setup?.({
          appId: this.options.appId,
          track: (name, properties = {}) => this.enqueue("track", name, properties),
          page: (name, properties = {}) => this.page(name, properties),
        });
        initializedPlugins.push(plugin);
      }
      this.bindPageLifecycle();
      this.scheduleFlush();
      this.emit({ type: "sdk_initialized" });
    } catch (error) {
      this.initialized = false;
      for (const plugin of initializedPlugins.reverse()) await plugin.teardown?.();
      throw error;
    }
  }

  /** Record a typed business event. */
  async track<K extends keyof TEvents & string>(
    name: K,
    properties: TEvents[K] extends EventProperties ? TEvents[K] : never,
    options?: TrackOptions,
  ): Promise<void> {
    await this.enqueue("track", name, properties, options);
  }

  /** Record a semantic page view. */
  async page(name: string, properties: EventProperties = {}): Promise<void> {
    await this.enqueue("page", name, properties);
  }

  /** Associate subsequent events with an authenticated user. */
  async identify(userId: string, traits: EventProperties = {}): Promise<void> {
    if (!this.consent.canCollect()) {
      this.emit({ type: "event_dropped", eventName: "$identify", reason: "consent" });
      return;
    }
    this.identity.identify(userId);
    await this.enqueue("identify", "$identify", traits);
  }

  /** Read the current in-memory collection consent state. */
  getConsent(): ConsentState {
    return this.consent.get();
  }

  /** Update consent and optionally clear queued events and identity. */
  async setConsent(state: ConsentState): Promise<void> {
    this.consent.set(state);
    if (state === "denied" && (this.options.consent?.clearQueueOnDenied ?? true)) {
      await this.eventStorage.clear();
      this.identity.clear();
    }
  }

  /** Rotate anonymous and session identifiers, typically after sign-out. */
  reset(): void {
    this.identity.reset();
  }

  /** Attempt to deliver one batch immediately. Concurrent calls are coalesced. */
  async flush(reason: TransportContext["reason"] = "manual"): Promise<void> {
    if (this.flushPromise) return this.flushPromise;
    this.flushPromise = this.performFlush(reason).finally(() => {
      this.flushPromise = undefined;
    });
    return this.flushPromise;
  }

  /** Flush once, remove listeners, and tear down plugins. */
  async shutdown(): Promise<void> {
    if (this.flushTimer !== undefined) globalThis.clearTimeout(this.flushTimer);
    this.unbindPageLifecycle();
    // Mark inactive before flushing so performFlush does not schedule another timer.
    this.initialized = false;
    await this.flush("shutdown");
    // Reverse order mirrors nested resource acquisition during plugin setup.
    for (const plugin of [...this.plugins].reverse()) await plugin.teardown?.();
    this.emit({ type: "sdk_shutdown" });
  }

  private async enqueue(
    type: EventType,
    name: string,
    properties: EventProperties,
    options?: TrackOptions,
  ): Promise<void> {
    if (!this.initialized) await this.init();
    if (!this.consent.canCollect()) {
      this.emit({ type: "event_dropped", eventName: name, reason: "consent" });
      return;
    }

    let event: AnalyticsEvent | null = {
      eventId: createId(),
      type,
      name,
      timestamp: (options?.timestamp ?? new Date()).toISOString(),
      identity: this.identity.current(),
      properties,
      context: this.createContext(),
      schemaVersion: this.options.schemaVersion ?? "1",
    };

    for (const plugin of this.plugins) {
      if (!event) break;
      const processed: AnalyticsEvent | null | undefined = await plugin.beforeTrack?.(event);
      if (processed !== undefined) event = processed;
    }
    if (!event) {
      this.emit({ type: "event_dropped", eventName: name, reason: "plugin" });
      return;
    }

    let eventBytes: number;
    try {
      eventBytes = byteLength(JSON.stringify(event));
    } catch {
      this.emit({ type: "event_dropped", eventName: name, reason: "serialization" });
      return;
    }
    if (eventBytes > (this.options.maxEventBytes ?? 64 * 1_024)) {
      this.emit({ type: "event_dropped", eventName: name, reason: "event-too-large" });
      return;
    }

    if (await this.eventStorage.size() >= (this.options.maxQueueSize ?? 2_000)) {
      const oldest = await this.eventStorage.peek(1);
      if (oldest[0]) {
        await this.eventStorage.remove([oldest[0].eventId]);
        this.emit({ type: "event_dropped", eventName: oldest[0].name, reason: "queue-limit" });
      }
    }

    await this.eventStorage.push(event);
    const queueSize = await this.eventStorage.size();
    this.emit({ type: "event_enqueued", eventId: event.eventId, eventName: event.name, queueSize });
    for (const plugin of this.plugins) await plugin.afterTrack?.(event);

    if (await this.eventStorage.size() >= (this.options.maxBatchSize ?? 30)) {
      await this.flush("queue-full");
    }
  }

  private async performFlush(reason: TransportContext["reason"]): Promise<void> {
    const acquired = await this.deliveryLock.runExclusive(() => this.performFlushUnlocked(reason));
    if (!acquired && this.initialized) this.scheduleFlush();
  }

  private async performFlushUnlocked(reason: TransportContext["reason"]): Promise<void> {
    let nextDelayMs: number | undefined;
    let eventCount = 0;
    let transportName: string | undefined;
    try {
      const selected = await this.selectEncodedBatch();
      if (!selected) return;
      const { events, encoded, transport } = selected;
      eventCount = events.length;
      transportName = transport.name;
      this.emit({
        type: "flush_started",
        eventCount: events.length,
        reason,
        transport: transport.name,
      });
      const body = await this.compression.compress(encoded);
      const eventIds = events.map((event) => event.eventId);

      const result = await transport.send(
        {
          body,
          contentType: this.codec.contentType,
          ...(this.compression.contentEncoding
            ? { contentEncoding: this.compression.contentEncoding }
            : {}),
          eventIds,
        },
        { reason },
      );

      if (result.success || result.retryable === false) {
        await this.eventStorage.remove(eventIds);
        this.retryAttempt = 0;
      }

      if (result.success) {
        this.emit({
          type: "flush_succeeded",
          eventCount: events.length,
          transport: transport.name,
          ...(result.status === undefined ? {} : { status: result.status }),
        });
      } else {
        const retryable = result.retryable !== false;
        this.emit({
          type: "flush_failed",
          eventCount: events.length,
          retryable,
          transport: transport.name,
          ...(result.status === undefined ? {} : { status: result.status }),
        });
        if (retryable) {
          nextDelayMs = result.retryAfterMs ?? this.nextRetryDelay();
          this.emit({
            type: "flush_retry_scheduled",
            attempt: this.retryAttempt,
            delayMs: nextDelayMs,
          });
        }
      }
    } catch {
      nextDelayMs = this.nextRetryDelay();
      this.emit({
        type: "flush_failed",
        eventCount,
        retryable: true,
        ...(transportName === undefined ? {} : { transport: transportName }),
      });
      this.emit({ type: "flush_retry_scheduled", attempt: this.retryAttempt, delayMs: nextDelayMs });
    } finally {
      if (this.initialized) this.scheduleFlush(nextDelayMs);
    }
  }

  private async selectEncodedBatch(): Promise<{
    events: AnalyticsEvent[];
    encoded: string | Uint8Array;
    transport: Transport;
  } | undefined> {
    let candidates = await this.eventStorage.peek(this.options.maxBatchSize ?? 30);
    const byteLimit = this.options.maxBatchBytes ?? 256 * 1_024;

    while (candidates.length > 0) {
      const first = candidates[0];
      if (!first) return undefined;
      const transport = this.resolveTransport(first);
      const routedCandidates: AnalyticsEvent[] = [first];

      // Preserve FIFO ordering: a batch stops at the first event for another
      // destination instead of skipping past it and reordering the queue.
      for (const event of candidates.slice(1)) {
        if (this.resolveTransport(event) !== transport) break;
        routedCandidates.push(event);
      }

      for (let count = routedCandidates.length; count >= 1; count -= 1) {
        const events = routedCandidates.slice(0, count);
        const encoded = await this.encodeBatch(events);
        if (byteLength(encoded) <= byteLimit) {
          return { events, encoded, transport };
        }
      }

      const oversized = routedCandidates[0];
      if (!oversized) return undefined;
      await this.eventStorage.remove([oversized.eventId]);
      this.emit({ type: "event_dropped", eventName: oversized.name, reason: "batch-byte-limit" });
      candidates = await this.eventStorage.peek(this.options.maxBatchSize ?? 30);
    }

    return undefined;
  }

  private resolveTransport(event: AnalyticsEvent): Transport {
    const configured = this.options.transport;
    return isTransportResolver(configured)
      ? configured.resolve(event)
      : configured;
  }

  private encodeBatch(events: AnalyticsEvent[]): Promise<string | Uint8Array> {
    return this.codec.encode({
      protocolVersion: this.options.protocolVersion ?? "1",
      sentAt: new Date().toISOString(),
      events,
    });
  }

  private scheduleFlush(delayMs = this.options.flushIntervalMs ?? 5_000): void {
    if (this.flushTimer !== undefined) globalThis.clearTimeout(this.flushTimer);
    this.flushTimer = globalThis.setTimeout(
      () => void this.flush("interval"),
      delayMs,
    );
  }

  private nextRetryDelay(): number {
    this.retryAttempt += 1;
    const base = this.options.retry?.baseDelayMs ?? 1_000;
    const maximum = this.options.retry?.maxDelayMs ?? 60_000;
    const jitterRatio = Math.max(0, this.options.retry?.jitterRatio ?? 0.2);
    const exponential = Math.min(maximum, base * 2 ** (this.retryAttempt - 1));
    const jitter = exponential * jitterRatio * (Math.random() * 2 - 1);
    return Math.max(0, Math.round(exponential + jitter));
  }

  private bindPageLifecycle(): void {
    if (this.options.pageLifecycle === false) return;
    globalThis.addEventListener?.("pagehide", this.pageHideHandler);
    globalThis.document?.addEventListener("visibilitychange", this.visibilityHandler);
  }

  private unbindPageLifecycle(): void {
    globalThis.removeEventListener?.("pagehide", this.pageHideHandler);
    globalThis.document?.removeEventListener("visibilitychange", this.visibilityHandler);
  }

  private emit(event: DiagnosticEvent): void {
    try {
      this.options.onDiagnostic?.(event);
    } catch {
      // Diagnostics must never affect event delivery.
    }
  }

  private createContext(): EventContext {
    const location = globalThis.location;
    const document = globalThis.document;
    const navigator = globalThis.navigator;
    const screen = globalThis.screen;

    return {
      app: {
        id: this.options.appId,
        ...(this.options.appVersion ? { version: this.options.appVersion } : {}),
        ...(this.options.environment ? { environment: this.options.environment } : {}),
      },
      ...(location
        ? {
            page: {
              // Query strings and fragments frequently carry tokens, search
              // terms, or user identifiers, so the default context omits them.
              url: sanitizeUrl(location.href),
              path: location.pathname,
              ...(document?.title ? { title: document.title } : {}),
              ...(document?.referrer ? { referrer: sanitizeUrl(document.referrer) } : {}),
            },
          }
        : {}),
      device: {
        ...(navigator?.language ? { language: navigator.language } : {}),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(screen?.width ? { screenWidth: screen.width } : {}),
        ...(screen?.height ? { screenHeight: screen.height } : {}),
      },
      sdk: { name: SDK_NAME, version: SDK_VERSION },
    };
  }
}

function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value, globalThis.location?.origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split(/[?#]/, 1)[0] ?? value;
  }
}

function isTransportResolver(
  value: Transport | TransportResolver,
): value is TransportResolver {
  return "kind" in value && value.kind === "transport-resolver";
}

function byteLength(value: string | Uint8Array): number {
  return typeof value === "string" ? new TextEncoder().encode(value).byteLength : value.byteLength;
}

/** Create a typed Analytics client without coupling it to a UI framework. */
export function createAnalytics<TEvents extends object = Record<string, EventProperties>>(
  options: AnalyticsOptions,
): Analytics<TEvents> {
  return new Analytics<TEvents>(options);
}
