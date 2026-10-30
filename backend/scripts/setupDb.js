// Applies ../schema.sql (repo root) to the database in DATABASE_URL.
// The schema is idempotent, so this is safe to re-run.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, '../../schema.sql');

try {
  const sql = await fs.readFile(schemaPath, 'utf8');
  await pool.query(sql);

  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('admins', 'inquiries')
     ORDER BY table_name`,
  );
  console.log(`[db:setup] Schema applied from ${schemaPath}`);
  console.log(`[db:setup] Tables present: ${rows.map((r) => r.table_name).join(', ')}`);
} catch (err) {
  console.error('[db:setup] Failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
