export type EventType = "track" | "page" | "identify" | "group";

export type EventProperties = Record<string, unknown>;

export interface EventIdentity {
  anonymousId: string;
  sessionId: string;
  userId?: string;
}

export interface EventContext {
  app: {
    id: string;
    version?: string;
    environment?: string;
  };
  page?: {
    url: string;
    path: string;
    title?: string;
    referrer?: string;
  };
  device?: {
    language?: string;
    timezone?: string;
    screenWidth?: number;
    screenHeight?: number;
  };
  sdk: {
    name: string;
    version: string;
  };
}

export interface AnalyticsEvent<TProperties extends EventProperties = EventProperties> {
  eventId: string;
  type: EventType;
  name: string;
  timestamp: string;
  identity: EventIdentity;
  properties: TProperties;
  context: EventContext;
  schemaVersion: string;
}

export interface EventBatch {
  protocolVersion: string;
  sentAt: string;
  events: AnalyticsEvent[];
}

export type EventMap = Record<string, EventProperties>;

export interface TrackOptions {
  timestamp?: Date;
}
