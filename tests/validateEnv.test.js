import { describe, it, expect } from 'vitest';
import { validateEnv, REQUIRED_VARS, OPTIONAL_VARS } from '../server/utils/validateEnv';

describe('validateEnv', () => {
  it('exports REQUIRED_VARS and OPTIONAL_VARS arrays', () => {
    expect(Array.isArray(REQUIRED_VARS)).toBe(true);
    expect(REQUIRED_VARS.length).toBeGreaterThan(0);
    expect(Array.isArray(OPTIONAL_VARS)).toBe(true);
  });

  it('returns missing vars when env is empty', () => {
    // In test env, most vars are not set
    const result = validateEnv({ strict: false });
    expect(result).toHaveProperty('missing');
    expect(result).toHaveProperty('placeholder');
    expect(result).toHaveProperty('optionalMissing');
    expect(Array.isArray(result.missing)).toBe(true);
  });

  it('detects placeholder values', () => {
    const originalVal = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = 'sk_live_your_secret_key';
    try {
      const result = validateEnv({ strict: false });
      expect(result.placeholder).toContain('STRIPE_SECRET_KEY');
    } finally {
      if (originalVal !== undefined) {
        process.env.STRIPE_SECRET_KEY = originalVal;
      } else {
        delete process.env.STRIPE_SECRET_KEY;
      }
    }
  });

  it('throws in strict mode when required vars are missing', () => {
    expect(() => validateEnv({ strict: true })).toThrow('Environment validation failed');
  });
});
