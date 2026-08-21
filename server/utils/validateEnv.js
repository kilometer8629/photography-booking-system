/**
 * Environment variable validation utility.
 * Audits all env vars referenced across the application and warns about
 * missing or placeholder values so production deployments fail-fast.
 */

const REQUIRED_VARS = [
  // Core
  'NODE_ENV',
  'MONGODB_URI',
  'SESSION_SECRET',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',

  // Email
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASS',

  // Stripe
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_SUCCESS_URL',
  'STRIPE_CANCEL_URL'
];

const OPTIONAL_VARS = [
  'PORT',
  'CLIENT_URL',
  'CONTACT_EMAIL',
  'EMAIL_SECURE',
  'EMAIL_FROM',
  'SESSION_NAME',
  'COOKIE_DOMAIN',
  'COOKIE_SECRET',
  'CSRF_COOKIE_NAME',
  'TRUST_PROXY',
  'SENTRY_DSN',

  // Stripe price IDs
  'STRIPE_ACCOUNT_ID',
  'STRIPE_PRICE_SANTAS_GIFT_PACK',
  'STRIPE_PRICE_RUDOLPH',
  'STRIPE_PRICE_BLITZEN',
  'STRIPE_PRICE_DIGITAL_PACKAGE',
  'STRIPE_PRICE_VIXEN',

  // Zoho
  'ZOHO_ACCOUNTS_BASE_URL',
  'ZOHO_OAUTH_ACCESS_TOKEN',
  'ZOHO_OAUTH_REDIRECT_URI',
  'ZOHO_OAUTH_CLIENT_SECRET',
  'ZOHO_OAUTH_CLIENT_ID',
  'ZOHO_OAUTH_SCOPE',
  'ZOHO_OAUTH_REFRESH_TOKEN',
  'ZOHO_FREEBUSY_USER',
  'ZOHO_CALENDAR_BASE_URL',
  'ZOHO_CALENDAR_ID',
  'ZOHO_TIMEZONE',

  // Booking
  'BOOKING_SLOT_MINUTES',
  'BOOKING_START_HOUR',
  'BOOKING_END_HOUR',

  // Twilio
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER'
];

const PLACEHOLDER_PATTERNS = [
  /^your[_-]/i,
  /^replace[_-]/i,
  /^generate[_-]/i,
  /^sk_live_your/i,
  /^whsec_your/i,
  /^acct_your/i,
  /^1000\.your/i,
  /^https:\/\/your-domain/i
];

/**
 * Validate environment variables. Logs warnings for missing or placeholder
 * values. In production, throws if any required var is missing.
 *
 * @param {{ strict?: boolean }} options
 * @returns {{ missing: string[], placeholder: string[], optionalMissing: string[] }}
 */
function validateEnv(options = {}) {
  const strict = options.strict ?? (process.env.NODE_ENV === 'production');
  const missing = [];
  const placeholder = [];
  const optionalMissing = [];

  for (const key of REQUIRED_VARS) {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
    } else if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value))) {
      placeholder.push(key);
    }
  }

  for (const key of OPTIONAL_VARS) {
    const value = process.env[key];
    if (!value) {
      optionalMissing.push(key);
    } else if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value))) {
      placeholder.push(key);
    }
  }

  if (missing.length > 0) {
    console.warn(`⚠️  Missing required env vars: ${missing.join(', ')}`);
  }
  if (placeholder.length > 0) {
    console.warn(`⚠️  Env vars still using placeholder values: ${placeholder.join(', ')}`);
  }
  if (optionalMissing.length > 0 && process.env.NODE_ENV !== 'test') {
    console.info(`ℹ️  Optional env vars not set: ${optionalMissing.join(', ')}`);
  }

  if (strict && (missing.length > 0 || placeholder.length > 0)) {
    const problems = [...missing.map((k) => `${k} (missing)`), ...placeholder.map((k) => `${k} (placeholder)`)];
    throw new Error(`Environment validation failed in production:\n  ${problems.join('\n  ')}`);
  }

  return { missing, placeholder, optionalMissing };
}

module.exports = { validateEnv, REQUIRED_VARS, OPTIONAL_VARS };
