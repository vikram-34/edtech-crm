import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createInquiry, listInquiries, updateInquiryStatus } from '../controllers/inquiry.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Light spam protection for the public form: 30 submissions per IP per 15 minutes.
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many inquiries from this network. Please try again later.' },
});

// Public
router.post('/', submitLimiter, asyncHandler(createInquiry));

// Admin only
router.get('/', requireAuth, asyncHandler(listInquiries));
router.patch('/:id/status', requireAuth, asyncHandler(updateInquiryStatus));

export default router;
