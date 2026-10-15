import type { Compression } from "./contracts.js";
export declare class NoCompression implements Compression {
    readonly name = "none";
    compress(payload: string | Uint8Array): Promise<string | Uint8Array>;
}
export declare class GzipCompression implements Compression {
    readonly name = "gzip";
    readonly contentEncoding = "gzip";
    compress(payload: string | Uint8Array): Promise<Uint8Array>;
}
//# sourceMappingURL=compression.d.ts.map