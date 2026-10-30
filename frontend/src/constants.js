// Shared option lists and validation rules.
// Mirrors backend/src/utils/validators.js so users see the same rules before submitting.

export const USER_TYPES = ['Parent', 'Student', 'School'];
export const CATEGORIES = ['Scholarship', 'Concert', 'Admission', 'General Query'];
export const STATUSES = ['New', 'In Progress', 'Resolved'];

export const NAME_MIN = 2;
export const NAME_MAX = 100;
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 2000;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?\d{10,15}$/;

// "General Query" -> "general-query", used for badge CSS modifiers.
export const slugify = (value) => String(value).toLowerCase().trim().replace(/\s+/g, '-');

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

/** Returns { field: message } for every invalid field (empty object when valid). */
export function validateInquiry(values) {
  const userType = clean(values.userType);
  const category = clean(values.category);
  const name = clean(values.name);
  const email = clean(values.email);
  const phone = clean(values.phone).replace(/[\s-]/g, '');
  const message = clean(values.message);
  const errors = {};

  if (!userType) errors.userType = 'User type is required';
  else if (!USER_TYPES.includes(userType)) errors.userType = `User type must be one of: ${USER_TYPES.join(', ')}`;

  if (!category) errors.category = 'Category is required';
  else if (!CATEGORIES.includes(category)) errors.category = `Category must be one of: ${CATEGORIES.join(', ')}`;

  if (!name) errors.name = 'Name is required';
  else if (name.length < NAME_MIN || name.length > NAME_MAX) {
    errors.name = `Name must be between ${NAME_MIN} and ${NAME_MAX} characters`;
  }

  if (!email) errors.email = 'Email is required';
  else if (email.length > 254 || !EMAIL_RE.test(email)) errors.email = 'Please enter a valid email address';

  if (!phone) errors.phone = 'Phone number is required';
  else if (!PHONE_RE.test(phone)) errors.phone = 'Phone must be 10-15 digits, optionally starting with +';

  if (!message) errors.message = 'Message is required';
  else if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
    errors.message = `Message must be between ${MESSAGE_MIN} and ${MESSAGE_MAX} characters`;
  }

  return errors;
}
