import pino from 'pino';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';

const isProd = process.env.NODE_ENV === 'production';

// Structured JSON logger → stdout. Loki scrapes container/file stdout.
// In dev, pretty-print only if pino-pretty present; otherwise raw JSON.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
  base: { service: 'faculty-appraisal-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    censor: '[redacted]',
  },
});

// HTTP access logger — one JSON line per request, with a correlation id.
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'];
    const id = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  // Trim noisy default serializers
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  autoLogging: {
    ignore: (req) => req.url === '/metrics' || req.url === '/health',
  },
});
