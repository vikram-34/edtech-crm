import jwt from 'jsonwebtoken';

/**
 * Protects admin routes. Expects `Authorization: Bearer <jwt>`, verifies the
 * signature and expiry with JWT_SECRET, and exposes the admin as `req.admin`.
 */
export function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token, ...rest] = header.trim().split(/\s+/);

  if (!header) {
    return res.status(401).json({ error: 'Authentication required: missing Authorization header' });
  }
  if (scheme !== 'Bearer' || !token || rest.length) {
    return res.status(401).json({ error: 'Authentication required: expected "Authorization: Bearer <token>"' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired: please log in again' });
    }
    return res.status(401).json({ error: 'Invalid token: please log in again' });
  }

  if (payload.role !== 'admin' || !payload.sub) {
    return res.status(401).json({ error: 'Invalid token: admin access required' });
  }

  req.admin = { id: payload.sub, email: payload.email, role: payload.role };
  return next();
}
