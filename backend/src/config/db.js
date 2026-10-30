import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load backend/.env no matter which directory the process was started from.
// In production (Render etc.) variables come from the host and no file is needed.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Copy backend/.env.example to backend/.env and fill it in.');
}

// pg lets an `sslmode` query param override the explicit `ssl` option below,
// so remove it and rely on the config object instead.
function stripSslMode(connectionString) {
  if (!/[?&]sslmode=/i.test(connectionString)) return connectionString;
  const url = new URL(connectionString);
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase() === 'sslmode') url.searchParams.delete(key);
  }
  return url.toString();
}

export const pool = new pg.Pool({
  connectionString: stripSslMode(process.env.DATABASE_URL),
  // Supabase requires TLS; its pooler certificate chain isn't in Node's default CA bundle.
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client:', err.message);
});
