CREATE TABLE IF NOT EXISTS tracelet_events (
  event_id varchar(128) PRIMARY KEY,
  event_type varchar(16) NOT NULL
    CHECK (event_type IN ('track', 'page', 'identify', 'group')),
  event_name varchar(128) NOT NULL,
  event_timestamp timestamptz NOT NULL,
  anonymous_id varchar(128) NOT NULL,
  session_id varchar(128) NOT NULL,
  user_id varchar(256),
  properties jsonb NOT NULL
    CHECK (jsonb_typeof(properties) = 'object'),
  context jsonb NOT NULL
    CHECK (jsonb_typeof(context) = 'object'),
  schema_version varchar(32) NOT NULL,
  protocol_version varchar(32) NOT NULL,
  batch_sent_at timestamptz NOT NULL,
  request_id varchar(128) NOT NULL,
  received_at timestamptz NOT NULL,
  origin text
);

CREATE INDEX IF NOT EXISTS tracelet_events_timestamp_idx
  ON tracelet_events (event_timestamp DESC);

CREATE INDEX IF NOT EXISTS tracelet_events_name_timestamp_idx
  ON tracelet_events (event_name, event_timestamp DESC);

