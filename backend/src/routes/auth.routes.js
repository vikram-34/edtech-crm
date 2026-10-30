import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, me } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Brute-force protection: 10 login attempts per IP per 15 minutes.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

router.post('/login', loginLimiter, asyncHandler(login));
router.get('/me', requireAuth, asyncHandler(me));

export default router;
