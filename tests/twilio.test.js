/**
 * Twilio SMS Integration Tests
 * Tests for SMS notification functionality
 */

import { describe, it, expect, beforeAll } from 'vitest';

let formatPhoneNumber;
let twilioEnabled;

beforeAll(async () => {
  const twilioModule = await import('../server/services/twilioClient.js');
  formatPhoneNumber = twilioModule.formatPhoneNumber;
  twilioEnabled = twilioModule.twilioEnabled;
});

describe('Twilio SMS Service', () => {
  describe('formatPhoneNumber', () => {
    it('should format Australian mobile number with leading 0', () => {
      const result = formatPhoneNumber('0412345678');
      expect(result).toBe('+61412345678');
    });

    it('should add + prefix if missing', () => {
      const result = formatPhoneNumber('61412345678');
      expect(result).toBe('+61412345678');
    });

    it('should preserve already formatted E.164 number', () => {
      const result = formatPhoneNumber('+61412345678');
      expect(result).toBe('+61412345678');
    });

    it('should remove non-digit characters', () => {
      const result = formatPhoneNumber('0412-345-678');
      expect(result).toBe('+61412345678');
    });

    it('should handle empty string', () => {
      const result = formatPhoneNumber('');
      expect(result).toBe('');
    });

    it('should handle null/undefined', () => {
      const result = formatPhoneNumber(null);
      expect(result).toBe('');
    });

    it('should format US numbers', () => {
      const result = formatPhoneNumber('15551234567');
      expect(result).toBe('+15551234567');
    });

    it('should handle parentheses and spaces', () => {
      const result = formatPhoneNumber('(04) 1234 5678');
      expect(result).toBe('+61412345678');
    });
  });

  describe('Twilio Configuration', () => {
    it('should report Twilio enabled status', () => {
      // twilioEnabled is based on environment variables
      expect(typeof twilioEnabled).toBe('boolean');
    });
  });
});
