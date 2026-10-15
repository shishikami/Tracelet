import type { AnalyticsPlugin, Codec, Compression, DiagnosticHandler, EventStorage, KeyValueStorage, Transport, TransportContext } from "./contracts.js";
import { type ConsentState } from "./consent.js";
import type { EventProperties, TrackOptions } from "./types.js";
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
export declare class Analytics<TEvents extends object = Record<string, EventProperties>> {
    private readonly options;
    private readonly codec;
    private readonly compression;
    private readonly eventStorage;
    private readonly identity;
    private readonly consent;
    private readonly plugins;
    private flushTimer?;
    private flushPromise;
    private initialized;
    private retryAttempt;
    private readonly pageHideHandler;
    private readonly visibilityHandler;
    constructor(options: AnalyticsOptions);
    init(): Promise<void>;
    track<K extends keyof TEvents & string>(name: K, properties: TEvents[K] extends EventProperties ? TEvents[K] : never, options?: TrackOptions): Promise<void>;
    page(name: string, properties?: EventProperties): Promise<void>;
    identify(userId: string, traits?: EventProperties): Promise<void>;
    getConsent(): ConsentState;
    setConsent(state: ConsentState): Promise<void>;
    reset(): void;
    flush(reason?: TransportContext["reason"]): Promise<void>;
    shutdown(): Promise<void>;
    private enqueue;
    private performFlush;
    private scheduleFlush;
    private nextRetryDelay;
    private bindPageLifecycle;
    private unbindPageLifecycle;
    private emit;
    private createContext;
}
export declare function createAnalytics<TEvents extends object = Record<string, EventProperties>>(options: AnalyticsOptions): Analytics<TEvents>;
//# sourceMappingURL=analytics.d.ts.map