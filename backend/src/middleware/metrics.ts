import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// Single global registry
export const registry = new client.Registry();

// App-level default labels
registry.setDefaultLabels({ app: 'faculty-appraisal-api' });

// Node process + GC + event-loop metrics
client.collectDefaultMetrics({ register: registry });

// HTTP request duration histogram (seconds)
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

// HTTP request counter
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

// In-flight gauge
const httpRequestsInFlight = new client.Gauge({
  name: 'http_requests_in_flight',
  help: 'In-flight HTTP requests',
  registers: [registry],
});

// Resolve a low-cardinality route label. Prefer matched route path; fall back to the
// path with numeric/uuid segments collapsed so we don't explode label cardinality.
function routeLabel(req: Request): string {
  const matched = (req as any).route?.path;
  const base = (req as any).baseUrl ?? '';
  if (matched) return `${base}${matched}`;
  return req.path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip self-scrape
  if (req.path === '/metrics') return next();

  httpRequestsInFlight.inc();
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const labels = {
      method: req.method,
      route: routeLabel(req),
      status_code: String(res.statusCode),
    };
    end(labels);
    httpRequestsTotal.inc(labels);
    httpRequestsInFlight.dec();
  });

  next();
}

export async function metricsHandler(_req: Request, res: Response) {
  res.set('Content-Type', registry.contentType);
  res.send(await registry.metrics());
}
