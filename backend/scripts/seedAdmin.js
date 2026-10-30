// Creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD, or resets its password if it exists.
import bcrypt from 'bcrypt';
import { pool } from '../src/config/db.js';
import { isValidEmail } from '../src/utils/validators.js';

const BCRYPT_ROUNDS = 12;

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';

try {
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in backend/.env');
  }
  if (!isValidEmail(email)) {
    throw new Error(`ADMIN_EMAIL "${email}" is not a valid email address`);
  }
  if (password.length < 8) {
    console.warn('[seed:admin] Warning: ADMIN_PASSWORD is shorter than 8 characters.');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const { rows } = await pool.query(
    `INSERT INTO admins (email, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id, email, (xmax = 0) AS inserted`,
    [email, passwordHash],
  );

  const admin = rows[0];
  console.log(`[seed:admin] ${admin.inserted ? 'Created' : 'Updated password for'} admin ${admin.email} (id ${admin.id})`);
} catch (err) {
  console.error('[seed:admin] Failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
