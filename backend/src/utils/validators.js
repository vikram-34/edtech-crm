export const USER_TYPES = ['Parent', 'Student', 'School'];
export const CATEGORIES = ['Scholarship', 'Concert', 'Admission', 'General Query'];
export const STATUSES = ['New', 'In Progress', 'Resolved'];

export const NAME_MIN = 2;
export const NAME_MAX = 100;
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 2000;
export const SEARCH_MAX = 100;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?\d{10,15}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Non-string input (numbers, objects, arrays) is treated as missing.
export const clean = (value) => (typeof value === 'string' ? value.trim() : '');

// Spaces and dashes are allowed while typing but not stored.
export const normalizePhone = (value) => clean(value).replace(/[\s-]/g, '');

export const isValidEmail = (value) => value.length <= 254 && EMAIL_RE.test(value);
export const isUuid = (value) => UUID_RE.test(value);

const result = (data, errors) => ({ data, errors: Object.keys(errors).length ? errors : null });

export function validateInquiry(body) {
  const input = body ?? {};
  const data = {
    userType: clean(input.userType),
    category: clean(input.category),
    name: clean(input.name),
    email: clean(input.email).toLowerCase(),
    phone: normalizePhone(input.phone),
    message: clean(input.message),
  };
  const errors = {};

  if (!data.userType) errors.userType = 'User type is required';
  else if (!USER_TYPES.includes(data.userType)) errors.userType = `User type must be one of: ${USER_TYPES.join(', ')}`;

  if (!data.category) errors.category = 'Category is required';
  else if (!CATEGORIES.includes(data.category)) errors.category = `Category must be one of: ${CATEGORIES.join(', ')}`;

  if (!data.name) errors.name = 'Name is required';
  else if (data.name.length < NAME_MIN || data.name.length > NAME_MAX) {
    errors.name = `Name must be between ${NAME_MIN} and ${NAME_MAX} characters`;
  }

  if (!data.email) errors.email = 'Email is required';
  else if (!isValidEmail(data.email)) errors.email = 'Please enter a valid email address';

  if (!data.phone) errors.phone = 'Phone number is required';
  else if (!PHONE_RE.test(data.phone)) errors.phone = 'Phone must be 10-15 digits, optionally starting with +';

  if (!data.message) errors.message = 'Message is required';
  else if (data.message.length < MESSAGE_MIN || data.message.length > MESSAGE_MAX) {
    errors.message = `Message must be between ${MESSAGE_MIN} and ${MESSAGE_MAX} characters`;
  }

  return result(data, errors);
}

export function validateLogin(body) {
  const input = body ?? {};
  const data = {
    email: clean(input.email).toLowerCase(),
    // Passwords are compared exactly as typed - never trimmed.
    password: typeof input.password === 'string' ? input.password : '',
  };
  const errors = {};

  if (!data.email) errors.email = 'Email is required';
  else if (!isValidEmail(data.email)) errors.email = 'Please enter a valid email address';
  if (!data.password) errors.password = 'Password is required';

  return result(data, errors);
}

export function validateStatus(body) {
  const status = clean((body ?? {}).status);
  const errors = {};
  if (!STATUSES.includes(status)) errors.status = `Status must be one of: ${STATUSES.join(', ')}`;
  return result({ status }, errors);
}

export function validateInquiryFilters(query) {
  const input = query ?? {};
  const data = {
    category: clean(input.category),
    userType: clean(input.userType),
    search: clean(input.search).slice(0, SEARCH_MAX),
  };
  const errors = {};

  if (data.category && !CATEGORIES.includes(data.category)) {
    errors.category = `Category must be one of: ${CATEGORIES.join(', ')}`;
  }
  if (data.userType && !USER_TYPES.includes(data.userType)) {
    errors.userType = `User type must be one of: ${USER_TYPES.join(', ')}`;
  }

  return result(data, errors);
}
