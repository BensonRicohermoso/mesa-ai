import crypto from "node:crypto";

export function requestLogger(req, res, next) {
  const requestId = req.get("x-request-id") || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  const started = performance.now();
  res.on("finish", () => console.info(JSON.stringify({ level: "info", event: "http_request", requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Math.round(performance.now() - started) })));
  next();
}

export function reportError(error, req) {
  const payload = { event: "api_error", requestId: req.requestId, method: req.method, path: req.path, status: error.statusCode || 500, code: error.code || "INTERNAL_ERROR", message: error.message };
  console.error(JSON.stringify({ level: "error", ...payload }));
  // Any monitored log sink can ingest stderr. An optional webhook adds a managed
  // error-monitoring destination without exposing request bodies or credentials.
  if (process.env.ERROR_MONITOR_WEBHOOK_URL) {
    fetch(process.env.ERROR_MONITOR_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(2000) }).catch(() => {});
  }
}
