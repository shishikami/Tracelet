import type {
  CollectorEventBatch,
  CollectorRequestContext,
  CollectorSink,
} from "./collector.js";

export interface PostgresQueryResult {
  rows: readonly Record<string, unknown>[];
}

/** Minimal query surface implemented by `pg`, Neon and similar clients. */
export interface PostgresQueryClient {
  query(text: string, values?: readonly unknown[]): Promise<PostgresQueryResult>;
}

/**
 * Persist a complete EventBatch with database-enforced event ID idempotency.
 *
 * The migration in `migrations/001_tracelet_events.sql` must run before this
 * sink receives traffic. One multi-row INSERT keeps each batch atomic: a query
 * failure cannot leave a partially acknowledged batch, while ON CONFLICT makes
 * a replay safe after a committed response is lost.
 */
export function createPostgresCollectorSink(client: PostgresQueryClient): CollectorSink {
  return {
    async write(batch, context) {
      const { text, values } = createInsertQuery(batch, context);
      const result = await client.query(text, values);
      const inputIds = new Set(batch.events.map((event) => event.eventId));
      const insertedIds = new Set<string>();

      for (const row of result.rows) {
        const eventId = row.event_id;
        if (typeof eventId !== "string" || !inputIds.has(eventId) || insertedIds.has(eventId)) {
          throw new Error("PostgreSQL returned an invalid event_id from the Tracelet insert");
        }
        insertedIds.add(eventId);
      }

      return {
        duplicateEventIds: batch.events
          .map((event) => event.eventId)
          .filter((eventId) => !insertedIds.has(eventId)),
      };
    },
  };
}

function createInsertQuery(
  batch: CollectorEventBatch,
  context: CollectorRequestContext,
): { text: string; values: unknown[] } {
  const values: unknown[] = [];
  const tuples = batch.events.map((event) => {
    const offset = values.length;
    values.push(
      event.eventId,
      event.type,
      event.name,
      event.timestamp,
      event.identity.anonymousId,
      event.identity.sessionId,
      event.identity.userId ?? null,
      JSON.stringify(event.properties),
      JSON.stringify(event.context),
      event.schemaVersion,
      batch.protocolVersion,
      batch.sentAt,
      context.requestId,
      context.receivedAt,
      context.origin ?? null,
    );

    const parameter = (index: number) => `$${offset + index}`;
    return [
      parameter(1),
      parameter(2),
      parameter(3),
      `${parameter(4)}::timestamptz`,
      parameter(5),
      parameter(6),
      parameter(7),
      `${parameter(8)}::jsonb`,
      `${parameter(9)}::jsonb`,
      parameter(10),
      parameter(11),
      `${parameter(12)}::timestamptz`,
      parameter(13),
      `${parameter(14)}::timestamptz`,
      parameter(15),
    ].join(", ");
  });

  return {
    text: `
      INSERT INTO tracelet_events (
        event_id,
        event_type,
        event_name,
        event_timestamp,
        anonymous_id,
        session_id,
        user_id,
        properties,
        context,
        schema_version,
        protocol_version,
        batch_sent_at,
        request_id,
        received_at,
        origin
      ) VALUES ${tuples.map((tuple) => `(${tuple})`).join(", ")}
      ON CONFLICT (event_id) DO NOTHING
      RETURNING event_id
    `,
    values,
  };
}

