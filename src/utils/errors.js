const INTERNAL_ERROR_PATTERNS = [
  /schema cache/i,
  /function .* does not exist/i,
  /relation .* does not exist/i,
  /column .* does not exist/i,
  /syntax error/i,
  /permission denied/i,
  /row-level security/i,
  /violates row-level security/i,
  /JWT/i,
  /access token/i,
  /refresh token/i,
  /authorization/i,
  /PGRST/i,
  /SQLSTATE/i,
];

const AUTH_ERROR_MAP = [
  [/invalid login credentials/i, 'Email or password is incorrect.'],
  [/email not confirmed/i, 'Confirm your email before logging in.'],
  [/user already registered/i, 'An account already exists for this email.'],
  [/password should be at least/i, 'Use a stronger password and try again.'],
  [/rate limit/i, 'Too many attempts. Wait a moment and try again.'],
];

export function getSafeErrorMessage(error, fallback = 'Something went wrong. Try again.') {
  const rawMessage = typeof error === 'string' ? error : error?.message;
  const message = String(rawMessage || '').trim();

  if (!message) return fallback;

  const authMatch = AUTH_ERROR_MAP.find(([pattern]) => pattern.test(message));
  if (authMatch) return authMatch[1];

  if (/duplicate key|unique constraint/i.test(message)) {
    return 'That record already exists.';
  }

  if (/not authorized|not allowed|only .* can|must be logged in/i.test(message)) {
    return 'You do not have permission to perform this action.';
  }

  if (INTERNAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return fallback;
  }

  if (message.length > 180) {
    return fallback;
  }

  return message;
}
