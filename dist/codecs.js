export class JsonCodec {
    name = "json";
    contentType = "application/json";
    async encode(batch) {
        return JSON.stringify(batch);
    }
}
/**
 * Keeps the core SDK independent from protobufjs, ts-proto or buf-generated code.
 * Pass a generated encoder from a separate package/application boundary.
 */
export class ProtobufCodec {
    encoder;
    name = "protobuf";
    contentType = "application/x-protobuf";
    constructor(encoder) {
        this.encoder = encoder;
    }
    async encode(batch) {
        return this.encoder(batch);
    }
}
//# sourceMappingURL=codecs.js.map