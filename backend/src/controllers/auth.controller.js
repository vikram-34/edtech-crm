import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { validateLogin } from '../utils/validators.js';

const INVALID_CREDENTIALS = 'Invalid email or password';

// Compared against when the email is unknown, so a missing account takes as long
// as a wrong password and response timing doesn't reveal which emails exist.
const dummyHashPromise = bcrypt.hash('no-such-admin-account', 12);

export async function login(req, res) {
  const { data, errors } = validateLogin(req.body);
  if (errors) return res.status(400).json({ error: 'Validation failed', errors });

  const { rows } = await pool.query(
    'SELECT id, email, password_hash FROM admins WHERE email = $1',
    [data.email],
  );
  const admin = rows[0];

  const passwordMatches = await bcrypt.compare(data.password, admin ? admin.password_hash : await dummyHashPromise);
  if (!admin || !passwordMatches) {
    return res.status(401).json({ error: INVALID_CREDENTIALS });
  }

  const token = jwt.sign(
    { sub: admin.id, email: admin.email, role: 'admin' },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '1d' },
  );

  return res.json({ token, admin: { id: admin.id, email: admin.email } });
}

export async function me(req, res) {
  const { rows } = await pool.query(
    'SELECT id, email, created_at AS "createdAt" FROM admins WHERE id = $1',
    [req.admin.id],
  );
  if (!rows[0]) {
    return res.status(401).json({ error: 'Admin account no longer exists' });
  }
  return res.json({ admin: rows[0] });
}
