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
export interface EventStorage {
    push(event: AnalyticsEvent): Promise<void>;
    peek(limit: number): Promise<AnalyticsEvent[]>;
    remove(eventIds: readonly string[]): Promise<void>;
    size(): Promise<number>;
    clear(): Promise<void>;
}
export interface KeyValueStorage {
    get(key: string): string | null;
    set(key: string, value: string): void;
    remove(key: string): void;
}
export interface PluginContext {
    readonly appId: string;
}
export interface AnalyticsPlugin {
    readonly name: string;
    setup?(context: PluginContext): void | Promise<void>;
    beforeTrack?(event: AnalyticsEvent): AnalyticsEvent | null | Promise<AnalyticsEvent | null>;
    afterTrack?(event: AnalyticsEvent): void | Promise<void>;
    teardown?(): void | Promise<void>;
}
export type DiagnosticEvent = {
    type: "sdk_initialized";
} | {
    type: "event_enqueued";
    eventId: string;
    eventName: string;
    queueSize: number;
} | {
    type: "event_dropped";
    eventName: string;
    reason: "consent" | "plugin" | "queue-limit";
} | {
    type: "flush_started";
    eventCount: number;
    reason: TransportContext["reason"];
} | {
    type: "flush_succeeded";
    eventCount: number;
    status?: number;
} | {
    type: "flush_failed";
    eventCount: number;
    retryable: boolean;
    status?: number;
} | {
    type: "flush_retry_scheduled";
    attempt: number;
    delayMs: number;
} | {
    type: "sdk_shutdown";
};
export type DiagnosticHandler = (event: DiagnosticEvent) => void;
//# sourceMappingURL=contracts.d.ts.map