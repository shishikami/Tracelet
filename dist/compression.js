export class NoCompression {
    name = "none";
    async compress(payload) {
        return payload;
    }
}
export class GzipCompression {
    name = "gzip";
    contentEncoding = "gzip";
    async compress(payload) {
        if (typeof CompressionStream === "undefined") {
            throw new Error("CompressionStream is not supported in this environment");
        }
        // Copy binary payloads so the backing buffer is always an ArrayBuffer,
        // rather than the wider ArrayBufferLike type that may include SharedArrayBuffer.
        const bytes = typeof payload === "string" ? new TextEncoder().encode(payload) : new Uint8Array(payload);
        const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }
}
//# sourceMappingURL=compression.js.map