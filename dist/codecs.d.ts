import type { Codec } from "./contracts.js";
import type { EventBatch } from "./types.js";
export declare class JsonCodec implements Codec {
    readonly name = "json";
    readonly contentType = "application/json";
    encode(batch: EventBatch): Promise<string>;
}
export type ProtobufEncoder = (batch: EventBatch) => Uint8Array | Promise<Uint8Array>;
/**
 * Keeps the core SDK independent from protobufjs, ts-proto or buf-generated code.
 * Pass a generated encoder from a separate package/application boundary.
 */
export declare class ProtobufCodec implements Codec {
    private readonly encoder;
    readonly name = "protobuf";
    readonly contentType = "application/x-protobuf";
    constructor(encoder: ProtobufEncoder);
    encode(batch: EventBatch): Promise<Uint8Array>;
}
//# sourceMappingURL=codecs.d.ts.map