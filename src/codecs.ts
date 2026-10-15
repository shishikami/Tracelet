import type { Codec } from "./contracts.js";
import type { EventBatch } from "./types.js";

export class JsonCodec implements Codec {
  readonly name = "json";
  readonly contentType = "application/json";

  async encode(batch: EventBatch): Promise<string> {
    return JSON.stringify(batch);
  }
}

export type ProtobufEncoder = (batch: EventBatch) => Uint8Array | Promise<Uint8Array>;

/**
 * Keeps the core SDK independent from protobufjs, ts-proto or buf-generated code.
 * Pass a generated encoder from a separate package/application boundary.
 */
export class ProtobufCodec implements Codec {
  readonly name = "protobuf";
  readonly contentType = "application/x-protobuf";

  constructor(private readonly encoder: ProtobufEncoder) {}

  async encode(batch: EventBatch): Promise<Uint8Array> {
    return this.encoder(batch);
  }
}
