/**
 * Load local environment variables for development only.
 * In managed hosts like Vercel, environment variables are defined
 * via the platform, so we intentionally skip reading the .env file.
 */
if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
