import type { Compression } from "./contracts.js";

export class NoCompression implements Compression {
  readonly name = "none";

  async compress(payload: string | Uint8Array): Promise<string | Uint8Array> {
    return payload;
  }
}

export class GzipCompression implements Compression {
  readonly name = "gzip";
  readonly contentEncoding = "gzip";

  async compress(payload: string | Uint8Array): Promise<Uint8Array> {
    if (typeof CompressionStream === "undefined") {
      throw new Error("CompressionStream is not supported in this environment");
    }

    // Copy binary payloads so the backing buffer is always an ArrayBuffer,
    // rather than the wider ArrayBufferLike type that may include SharedArrayBuffer.
    const bytes =
      typeof payload === "string" ? new TextEncoder().encode(payload) : new Uint8Array(payload);
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
}
