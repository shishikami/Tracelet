import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const port = Number(process.env.PORT ?? 4318);
const host = process.env.HOST ?? "127.0.0.1";
const receivedEvents = [];
const requestLog = [];
const metrics = { batchRequests: 0, acceptedEvents: 0, failedRequests: 0 };
const failureControl = { remaining: 0, status: 503, delayMs: 0 };
const maxBodyBytes = 1024 * 1024;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

function json(response, status, value) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type, content-encoding",
  });
  response.end(JSON.stringify(value, null, 2));
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) throw new Error("PAYLOAD_TOO_LARGE");
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks);
  return request.headers["content-encoding"] === "gzip" ? gunzipSync(body) : body;
}

async function readJson(request) {
  const body = await readBody(request);
  return body.length === 0 ? {} : JSON.parse(body.toString("utf8"));
}

function addRequestLog(entry) {
  requestLog.unshift({ at: new Date().toISOString(), ...entry });
  if (requestLog.length > 100) requestLog.length = 100;
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, delayMs)));
}

function serveFile(response, relativePath) {
  const safePath = normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const absolutePath = join(projectRoot, safePath);
  if (!absolutePath.startsWith(projectRoot)) {
    json(response, 403, { error: "forbidden" });
    return;
  }

  try {
    const stat = statSync(absolutePath);
    if (!stat.isFile()) throw new Error("not a file");
    response.writeHead(200, {
      "content-type": contentTypes[extname(absolutePath)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    createReadStream(absolutePath).pipe(response);
  } catch {
    json(response, 404, { error: "not_found" });
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? host}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
      "access-control-allow-headers": "content-type, content-encoding",
    });
    response.end();
    return;
  }

  if (request.method === "POST" && url.pathname === "/v1/batch") {
    metrics.batchRequests += 1;
    try {
      if (failureControl.delayMs > 0) await wait(failureControl.delayMs);
      if (failureControl.remaining > 0) {
        failureControl.remaining -= 1;
        metrics.failedRequests += 1;
        addRequestLog({ method: "POST", path: url.pathname, status: failureControl.status, accepted: 0 });
        json(response, failureControl.status, {
          error: "injected_failure",
          remainingFailures: failureControl.remaining,
        });
        return;
      }
      const contentType = request.headers["content-type"] ?? "";
      if (!contentType.includes("application/json")) {
        json(response, 415, { error: "local server currently expects JSON" });
        return;
      }
      const batch = await readJson(request);
      if (!Array.isArray(batch.events)) {
        json(response, 400, { error: "events must be an array" });
        return;
      }
      receivedEvents.push(...batch.events);
      metrics.acceptedEvents += batch.events.length;
      addRequestLog({ method: "POST", path: url.pathname, status: 202, accepted: batch.events.length });
      console.log(`[collector] received ${batch.events.length} event(s):`, batch.events.map((e) => e.name));
      json(response, 202, {
        accepted: batch.events.length,
        eventIds: batch.events.map((event) => event.eventId),
      });
    } catch (error) {
      metrics.failedRequests += 1;
      const status = error instanceof Error && error.message === "PAYLOAD_TOO_LARGE" ? 413 : 400;
      addRequestLog({ method: "POST", path: url.pathname, status, accepted: 0 });
      json(response, status, { error: error instanceof Error ? error.message : "invalid_request" });
    }
    return;
  }

  if (request.method === "GET" && url.pathname === "/v1/events") {
    const requestedLimit = Number(url.searchParams.get("limit") ?? 100);
    const limit = Math.min(500, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 100));
    json(response, 200, { count: receivedEvents.length, events: receivedEvents.slice(-limit).reverse() });
    return;
  }

  if (request.method === "DELETE" && url.pathname === "/v1/events") {
    receivedEvents.length = 0;
    requestLog.length = 0;
    metrics.acceptedEvents = 0;
    metrics.batchRequests = 0;
    metrics.failedRequests = 0;
    json(response, 200, { cleared: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/v1/stats") {
    const byName = Object.create(null);
    for (const event of receivedEvents) byName[event.name] = (byName[event.name] ?? 0) + 1;
    json(response, 200, {
      ...metrics,
      storedEvents: receivedEvents.length,
      uniqueEventNames: Object.keys(byName).length,
      byName,
      failureControl,
      requestLog,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/v1/control/failure") {
    try {
      const body = await readJson(request);
      failureControl.remaining = Math.min(20, Math.max(0, Number(body.count ?? 1)));
      failureControl.status = Math.min(599, Math.max(400, Number(body.status ?? 503)));
      failureControl.delayMs = Math.min(10_000, Math.max(0, Number(body.delayMs ?? 0)));
      json(response, 200, { configured: true, failureControl });
    } catch (error) {
      json(response, 400, { error: error instanceof Error ? error.message : "invalid_request" });
    }
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    json(response, 200, { status: "ok", received: receivedEvents.length });
    return;
  }

  if (request.method === "GET" && url.pathname === "/") {
    serveFile(response, "docs/index.html");
    return;
  }

  if (request.method === "GET" && (url.pathname === "/lab" || url.pathname === "/lab/")) {
    serveFile(response, "examples/local-test.html");
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/docs/")) {
    serveFile(response, url.pathname.slice(1));
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/dist/")) {
    serveFile(response, url.pathname.slice(1));
    return;
  }

  json(response, 404, { error: "not_found" });
});

server.listen(port, host, () => {
  console.log(`Local analytics test server: http://${host}:${port}`);
  console.log(`Collector endpoint:          http://${host}:${port}/v1/batch`);
  console.log(`Received events:             http://${host}:${port}/v1/events`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
