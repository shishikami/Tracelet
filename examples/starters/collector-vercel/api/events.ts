interface AnalyticsEvent {
  eventId: string;
  name: string;
  timestamp: string;
  properties: Record<string, unknown>;
}

interface EventBatch {
  protocolVersion: string;
  sentAt: string;
  events: AnalyticsEvent[];
}

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, content-encoding, x-analytics-event-count",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return Response.json({ error: "expected_application_json" }, { status: 415, headers: corsHeaders });
    }

    const batch = await request.json() as EventBatch;
    if (!Array.isArray(batch.events) || batch.events.length === 0 || batch.events.length > 100) {
      return Response.json({ error: "events_must_contain_1_to_100_items" }, { status: 400, headers: corsHeaders });
    }

    const seen = new Set<string>();
    for (const event of batch.events) {
      if (!event?.eventId || !event.name || !event.timestamp || seen.has(event.eventId)) {
        return Response.json({ error: "invalid_or_duplicate_event" }, { status: 400, headers: corsHeaders });
      }
      seen.add(event.eventId);
    }

    // Replace this structured log with a durable database or queue in production.
    console.info(JSON.stringify({ type: "tracelet_batch", eventCount: batch.events.length, eventIds: [...seen] }));
    return Response.json({ accepted: batch.events.length, eventIds: [...seen] }, { status: 202, headers: corsHeaders });
  } catch (error) {
    console.error("tracelet_collector_error", error);
    return Response.json({ error: "invalid_json" }, { status: 400, headers: corsHeaders });
  }
}
