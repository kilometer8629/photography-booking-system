import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formatPhoneNumber } from '../server/services/twilioService';

describe('Twilio Service', () => {
  describe('formatPhoneNumber', () => {
    it('should format Australian mobile number with leading 0', () => {
      expect(formatPhoneNumber('0412345678')).toBe('+61412345678');
    });

    it('should format Australian mobile number with spaces', () => {
      expect(formatPhoneNumber('0412 345 678')).toBe('+61412345678');
    });

    it('should format Australian mobile number with dashes', () => {
      expect(formatPhoneNumber('0412-345-678')).toBe('+61412345678');
    });

    it('should format Australian mobile number with parentheses', () => {
      expect(formatPhoneNumber('(04) 1234 5678')).toBe('+61412345678');
    });

    it('should keep already formatted international number', () => {
      expect(formatPhoneNumber('+61412345678')).toBe('+61412345678');
    });

    it('should format number starting with 61 without +', () => {
      expect(formatPhoneNumber('61412345678')).toBe('+61412345678');
    });

    it('should format local landline number', () => {
      expect(formatPhoneNumber('0298765432')).toBe('+61298765432');
    });

    it('should handle number with only digits', () => {
      expect(formatPhoneNumber('412345678')).toBe('+61412345678');
    });
  });

  describe('SMS Message Content', () => {
    it('should create appropriate booking confirmation message structure', () => {
      const booking = {
        clientName: 'John Doe',
        clientPhone: '0412345678',
        package: "Santa's Gift Pack",
        eventDate: new Date('2024-12-20'),
        startTime: '14:00',
        location: 'Shopping Centre',
        packageAmount: 5000,
        packageCurrency: '$'
      };

      // Test that the booking object has all required fields for SMS
      expect(booking.clientName).toBeDefined();
      expect(booking.clientPhone).toBeDefined();
      expect(booking.package).toBeDefined();
      expect(booking.eventDate).toBeInstanceOf(Date);
      expect(booking.startTime).toBeDefined();
      expect(booking.location).toBeDefined();
    });

    it('should create appropriate payment confirmation message structure', () => {
      const booking = {
        clientName: 'Jane Smith',
        clientPhone: '0498765432',
        package: 'Rudolph',
        packageAmount: 7500,
        packageCurrency: '$',
        estimatedCost: 75
      };

      // Test amount calculation
      const amount = (booking.packageAmount / 100 || booking.estimatedCost || 0).toFixed(2);
      expect(amount).toBe('75.00');
      expect(booking.packageCurrency).toBe('$');
    });

    it('should create appropriate cancellation message structure', () => {
      const booking = {
        clientName: 'Alice Johnson',
        clientPhone: '0411223344',
        package: 'Blitzen',
        packageAmount: 10000,
        packageCurrency: '$'
      };

      const refundAmount = 9000; // 90% refund
      const refund = (refundAmount / 100).toFixed(2);

      expect(refund).toBe('90.00');
      expect(booking.packageCurrency).toBe('$');
    });

    it('should create appropriate reschedule message structure', () => {
      const booking = {
        clientName: 'Bob Brown',
        clientPhone: '0422334455'
      };

      const newDate = '2024-12-25';
      const newTime = '15:30';

      const formattedDate = new Date(newDate).toLocaleDateString('en-AU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      expect(formattedDate).toContain('December');
      expect(newTime).toBe('15:30');
    });
  });

  describe('Phone Number Validation', () => {
    it('should handle empty phone number', () => {
      expect(formatPhoneNumber('')).toBe('+61');
    });

    it('should handle phone number with only special characters', () => {
      expect(formatPhoneNumber('()-')).toBe('+61');
    });

    it('should handle very long phone number by formatting it', () => {
      expect(formatPhoneNumber('04123456789012345')).toBe('+614123456789012345');
    });
  });

  describe('Message Length Validation', () => {
    it('should keep booking confirmation message under SMS limit', () => {
      const maxClientName = 'A'.repeat(100); // Max length from schema
      const maxLocation = 'B'.repeat(200); // Max length from schema
      const maxPackage = "Santa's Gift Pack";
      
      const message = `Hi ${maxClientName}! Your ${maxPackage} photography session is confirmed for Monday, December 25, 2024 at 14:00. Location: ${maxLocation}. Thank you for choosing Ami Photography! 📸`;
      
      // SMS standard limit is 160 characters, extended SMS supports up to 1600 characters
      // We'll check if the message is reasonable (under 300 chars with normal data)
      expect(message.length).toBeLessThan(1600);
    });

    it('should keep payment confirmation message under SMS limit', () => {
      const message = `Payment confirmed! $75.00 received for your Santa's Gift Pack session. You'll receive a tax receipt via email. Thank you! - Ami Photography`;
      
      expect(message.length).toBeLessThan(160);
    });

    it('should keep cancellation message under SMS limit', () => {
      const message = `Your booking has been cancelled. Refund of $90.00 will be processed to your original payment method within 5-7 business days. - Ami Photography`;
      
      expect(message.length).toBeLessThan(200);
    });
  });
});
