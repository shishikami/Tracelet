import {
  createTraceletCollector,
  parseAllowedOrigins,
  type CollectorSink,
} from "../src/collector.js";

declare const process: { env: Record<string, string | undefined> };

const sink: CollectorSink = {
  async write(batch, context) {
    // Replace this with a durable queue or database transaction. Enforce a
    // unique constraint on eventId and return duplicates through the sink API.
    console.info(JSON.stringify({
      type: "tracelet_sink_write",
      requestId: context.requestId,
      protocolVersion: batch.protocolVersion,
      eventCount: batch.events.length,
    }));
  },
};

const expectedToken = process.env.TRACELET_INGEST_TOKEN;
const handle = createTraceletCollector({
  sink,
  allowedOrigins: parseAllowedOrigins(process.env.TRACELET_ALLOWED_ORIGINS),
  ...(expectedToken
    ? {
        authorize(request: Request) {
          return request.headers.get("authorization") === `Bearer ${expectedToken}`;
        },
      }
    : {}),
});

export function OPTIONS(request: Request) {
  return handle(request);
}

export function POST(request: Request) {
  return handle(request);
}
