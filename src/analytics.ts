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
} from "./contracts.js";
import { JsonCodec } from "./codecs.js";
import { NoCompression } from "./compression.js";
import { ConsentManager, type ConsentState } from "./consent.js";
import { IdentityManager, createId } from "./identity.js";
import { MemoryEventStorage, MemoryKeyValueStorage } from "./storage.js";
import { SDK_NAME, SDK_VERSION } from "./version.js";
import type {
  AnalyticsEvent,
  EventContext,
  EventProperties,
  EventType,
  TrackOptions,
} from "./types.js";

export interface AnalyticsOptions {
  appId: string;
  appVersion?: string;
  environment?: string;
  schemaVersion?: string;
  protocolVersion?: string;
  transport: Transport;
  codec?: Codec;
  compression?: Compression;
  eventStorage?: EventStorage;
  identityStorage?: KeyValueStorage;
  plugins?: AnalyticsPlugin[];
  flushIntervalMs?: number;
  maxBatchSize?: number;
  maxQueueSize?: number;
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

export class Analytics<TEvents extends object = Record<string, EventProperties>> {
  private readonly codec: Codec;
  private readonly compression: Compression;
  private readonly eventStorage: EventStorage;
  private readonly identity: IdentityManager;
  private readonly consent: ConsentManager;
  private readonly plugins: AnalyticsPlugin[];
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
    this.identity = new IdentityManager(options.identityStorage ?? new MemoryKeyValueStorage());
    this.consent = new ConsentManager(options.consent?.initialState ?? "granted");
    this.plugins = options.plugins ?? [];
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    for (const plugin of this.plugins) await plugin.setup?.({ appId: this.options.appId });
    this.initialized = true;
    this.bindPageLifecycle();
    this.scheduleFlush();
    this.emit({ type: "sdk_initialized" });
  }

  async track<K extends keyof TEvents & string>(
    name: K,
    properties: TEvents[K] extends EventProperties ? TEvents[K] : never,
    options?: TrackOptions,
  ): Promise<void> {
    await this.enqueue("track", name, properties, options);
  }

  async page(name: string, properties: EventProperties = {}): Promise<void> {
    await this.enqueue("page", name, properties);
  }

  async identify(userId: string, traits: EventProperties = {}): Promise<void> {
    if (!this.consent.canCollect()) {
      this.emit({ type: "event_dropped", eventName: "$identify", reason: "consent" });
      return;
    }
    this.identity.identify(userId);
    await this.enqueue("identify", "$identify", traits);
  }

  getConsent(): ConsentState {
    return this.consent.get();
  }

  async setConsent(state: ConsentState): Promise<void> {
    this.consent.set(state);
    if (state === "denied" && (this.options.consent?.clearQueueOnDenied ?? true)) {
      await this.eventStorage.clear();
      this.identity.clear();
    }
  }

  reset(): void {
    this.identity.reset();
  }

  async flush(reason: TransportContext["reason"] = "manual"): Promise<void> {
    if (this.flushPromise) return this.flushPromise;
    this.flushPromise = this.performFlush(reason).finally(() => {
      this.flushPromise = undefined;
    });
    return this.flushPromise;
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer !== undefined) globalThis.clearTimeout(this.flushTimer);
    this.unbindPageLifecycle();
    // Mark inactive before flushing so performFlush does not schedule another timer.
    this.initialized = false;
    await this.flush("shutdown");
    for (const plugin of this.plugins) await plugin.teardown?.();
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
    let nextDelayMs: number | undefined;
    let eventCount = 0;
    try {
      const events = await this.eventStorage.peek(this.options.maxBatchSize ?? 30);
      if (events.length === 0) return;
      eventCount = events.length;
      this.emit({ type: "flush_started", eventCount: events.length, reason });

      const encoded = await this.codec.encode({
        protocolVersion: this.options.protocolVersion ?? "1",
        sentAt: new Date().toISOString(),
        events,
      });
      const body = await this.compression.compress(encoded);
      const eventIds = events.map((event) => event.eventId);

      const result = await this.options.transport.send(
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
          ...(result.status === undefined ? {} : { status: result.status }),
        });
      } else {
        const retryable = result.retryable !== false;
        this.emit({
          type: "flush_failed",
          eventCount: events.length,
          retryable,
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
      this.emit({ type: "flush_failed", eventCount, retryable: true });
      this.emit({ type: "flush_retry_scheduled", attempt: this.retryAttempt, delayMs: nextDelayMs });
    } finally {
      if (this.initialized) this.scheduleFlush(nextDelayMs);
    }
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
              url: location.href,
              path: location.pathname,
              ...(document?.title ? { title: document.title } : {}),
              ...(document?.referrer ? { referrer: document.referrer } : {}),
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

export function createAnalytics<TEvents extends object = Record<string, EventProperties>>(
  options: AnalyticsOptions,
): Analytics<TEvents> {
  return new Analytics<TEvents>(options);
}
