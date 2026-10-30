import { pool } from '../config/db.js';
import { isUuid, validateInquiry, validateInquiryFilters, validateStatus } from '../utils/validators.js';

// snake_case columns -> camelCase JSON
const COLUMNS = `
  id,
  user_type  AS "userType",
  category,
  name,
  email,
  phone,
  message,
  status,
  created_at AS "createdAt",
  updated_at AS "updatedAt"`;

// Treat %, _ and \ in the search term literally inside ILIKE.
const escapeLike = (term) => term.replace(/[\\%_]/g, '\\$&');

export async function createInquiry(req, res) {
  const { data, errors } = validateInquiry(req.body);
  if (errors) return res.status(400).json({ error: 'Validation failed', errors });

  const { rows } = await pool.query(
    `INSERT INTO inquiries (user_type, category, name, email, phone, message)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, created_at AS "createdAt"`,
    [data.userType, data.category, data.name, data.email, data.phone, data.message],
  );

  return res.status(201).json({ message: 'Inquiry submitted successfully', data: rows[0] });
}

export async function listInquiries(req, res) {
  const { data: filters, errors } = validateInquiryFilters(req.query);
  if (errors) return res.status(400).json({ error: 'Invalid filters', errors });

  const conditions = [];
  const values = [];

  if (filters.category) {
    values.push(filters.category);
    conditions.push(`category = $${values.length}`);
  }
  if (filters.userType) {
    values.push(filters.userType);
    conditions.push(`user_type = $${values.length}`);
  }
  if (filters.search) {
    values.push(`%${escapeLike(filters.search)}%`);
    const nameParam = values.length;
    // Phones are stored without spaces/dashes, so match against the same normalized form.
    const phoneTerm = filters.search.replace(/[\s-]/g, '');
    if (phoneTerm) {
      values.push(`%${escapeLike(phoneTerm)}%`);
      conditions.push(`(name ILIKE $${nameParam} OR phone ILIKE $${values.length})`);
    } else {
      conditions.push(`name ILIKE $${nameParam}`);
    }
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM inquiries ${where} ORDER BY created_at DESC`,
    values,
  );

  return res.json({ total: rows.length, data: rows });
}

export async function updateInquiryStatus(req, res) {
  const { id } = req.params;
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid inquiry id' });

  const { data, errors } = validateStatus(req.body);
  if (errors) return res.status(400).json({ error: 'Validation failed', errors });

  const { rows } = await pool.query(
    `UPDATE inquiries SET status = $1, updated_at = now() WHERE id = $2 RETURNING ${COLUMNS}`,
    [data.status, id],
  );
  if (!rows[0]) return res.status(404).json({ error: 'Inquiry not found' });

  return res.json({ message: 'Status updated', data: rows[0] });
}
