import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pool } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import inquiryRoutes from './routes/inquiry.routes.js';
import { asyncHandler, errorHandler, notFound } from './middleware/errorHandler.js';

if (!process.env.JWT_SECRET) {
  console.error('[config] JWT_SECRET is not set. Copy backend/.env.example to backend/.env and fill it in.');
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.warn('[config] JWT_SECRET is shorter than 32 characters; use a long random value in production.');
}

const PORT = Number(process.env.PORT) || 4000;
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const app = express();

// Behind a reverse proxy (Render etc.) set TRUST_PROXY=1 so rate limits see the real client IP.
const trustProxy = Number(process.env.TRUST_PROXY || 0);
if (trustProxy > 0) app.set('trust proxy', trustProxy);

app.use(helmet());
app.use(
  cors({
    // Requests without an Origin header (curl, server-to-server) are allowed;
    // browsers are only allowed from the configured frontend origin(s).
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  }),
);
app.use(express.json({ limit: '10kb' }));

app.get(
  '/api/health',
  asyncHandler(async (_req, res) => {
    let database = 'up';
    try {
      await pool.query('SELECT 1');
    } catch (err) {
      console.error('[health] Database check failed:', err.message);
      database = 'down';
    }
    res.status(database === 'up' ? 200 : 503).json({
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  }),
);

app.use('/api/auth', authRoutes);
app.use('/api/inquiries', inquiryRoutes);

app.use(notFound);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`[server] API listening on http://localhost:${PORT}/api`);
  console.log(`[server] CORS allowed origins: ${allowedOrigins.join(', ')}`);
});

function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
