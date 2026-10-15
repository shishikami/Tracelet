import type { EncodedBatch, Transport, TransportContext, TransportResult } from "./contracts.js";
export interface HttpTransportOptions {
    endpoint: string;
    headers?: Record<string, string>;
    credentials?: RequestCredentials;
    timeoutMs?: number;
}
export declare class HttpTransport implements Transport {
    private readonly options;
    readonly name = "http";
    constructor(options: HttpTransportOptions);
    send(batch: EncodedBatch, context: TransportContext): Promise<TransportResult>;
}
export declare class ConsoleTransport implements Transport {
    readonly name = "console";
    send(batch: EncodedBatch): Promise<TransportResult>;
}
//# sourceMappingURL=transport.d.ts.map