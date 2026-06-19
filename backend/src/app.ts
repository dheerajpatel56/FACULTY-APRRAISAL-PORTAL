import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { startEmailWorker } from './services/emailWorker';
import { startReminderCrons } from './cron/reminders';
import { startFpgpEvaluationCron } from './cron/fpgpEvaluation';
import { httpLogger } from './middleware/logger';
import { generalLimiter } from './middleware/rateLimit';
import { metricsMiddleware, metricsHandler } from './middleware/metrics';
import { health, ready } from './controllers/healthController';

const app = express();

// Structured request logging (JSON → stdout for Loki) + Prometheus timing.
// Registered first so they observe every request.
app.use(httpLogger);
app.use(metricsMiddleware);

// Observability endpoints — root path, no auth (scraped on internal network).
app.get('/metrics', metricsHandler);   // Prometheus
app.get('/health', health);            // liveness
app.get('/health/ready', ready);       // readiness (DB ping)

// Security headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)
app.use(helmet({
  contentSecurityPolicy: false, // SPA fetches handle CSP separately; disable for API
  crossOriginEmbedderPolicy: false,
}));

// Strict CORS — only allow configured FRONTEND_URL (multi-origin via comma-split)
const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow tools without origin (curl, Postman, server-to-server)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin "${origin}" not allowed`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// JSON body cap kept small — file uploads go through multer, not JSON.
app.use(express.json({ limit: '1mb' }));

// Static proof files. UUID filenames; deny dotfiles + directory listing.
// NOTE: still unauthenticated (inline <img>/<a> can't send a bearer token).
// Residual risk tracked — see follow-up to serve these via an authed stream.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  dotfiles: 'deny',
  index: false,
}));

// Trust proxy when behind reverse proxy (nginx/heroku/render) — needed for rate-limit IP
app.set('trust proxy', 1);

// Global per-IP rate limit on the API surface (auth routes add stricter limits).
app.use('/api', generalLimiter, routes);
app.use(errorHandler as any);

// Start server + background workers — skipped under test (supertest imports app directly).
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startEmailWorker();
    startReminderCrons();
    startFpgpEvaluationCron();
  });
}

export default app;
