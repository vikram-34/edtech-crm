// Express 4 doesn't catch rejected promises from async handlers; forward them to errorHandler.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

// Central error handler: logs details server-side, never sends stack traces to clients.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }

  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl} -> ${err.code ? `${err.code} ` : ''}${err.message}`);
  }

  res.status(status).json({
    error: status >= 500 ? 'Something went wrong on our side. Please try again later.' : err.message,
  });
}
