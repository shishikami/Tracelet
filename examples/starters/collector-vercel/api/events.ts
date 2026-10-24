import {
  createTraceletCollector,
  parseAllowedOrigins,
  type CollectorSink,
} from "../src/collector.js";
import { createPostgresCollectorSink } from "../src/postgres-sink.js";
import { Pool } from "pg";

declare const process: { env: Record<string, string | undefined> };

const databaseUrl = process.env.POSTGRES_URL;
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      max: 2,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    })
  : undefined;

const sink: CollectorSink = pool
  ? createPostgresCollectorSink({
      async query(text, values = []) {
        return pool.query(text, [...values]);
      },
    })
  : {
      write() {
        // Fail closed: returning 202 without durable storage would make the
        // browser delete events that this Function only held in memory.
        throw new Error("POSTGRES_URL is required for durable ingestion");
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
