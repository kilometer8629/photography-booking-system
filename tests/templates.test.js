import { describe, it, expect } from 'vitest';
import { renderTemplate, clearTemplateCache } from '../server/utils/templateRenderer';

describe('templateRenderer', () => {
  it('renders simple placeholders', () => {
    clearTemplateCache();
    const html = renderTemplate('contact', {
      name: 'Alice',
      subject: 'Test Subject',
      message: 'Hello world',
      submittedDate: '01/01/2025'
    });
    expect(html).toContain('Alice');
    expect(html).toContain('Test Subject');
    expect(html).toContain('Hello world');
    expect(html).toContain('01/01/2025');
  });

  it('renders tax receipt template', () => {
    const html = renderTemplate('taxReceipt', {
      clientName: 'Bob',
      clientEmail: 'bob@test.com',
      clientPhone: '0400000000',
      receiptId: 'AMI-TEST1234-2025',
      receiptDate: '27/10/2025',
      sessionIdShort: 'cs_test_abc123',
      package: 'Rudolph',
      eventDate: '01/12/2025',
      startTime: '10:00',
      endTime: '10:05',
      location: 'Sydney',
      currency: '$',
      amount: '45.00'
    });
    expect(html).toContain('Bob');
    expect(html).toContain('AMI-TEST1234-2025');
    expect(html).toContain('Rudolph');
    expect(html).toContain('$45.00');
  });

  it('renders cancellation template', () => {
    const html = renderTemplate('cancellation', {
      clientName: 'Carol',
      currency: '$',
      amount: '50.00',
      refundReason: 'Customer requested',
      refund: '25.00'
    });
    expect(html).toContain('Carol');
    expect(html).toContain('$25.00');
    expect(html).toContain('Customer requested');
  });

  it('handles conditional blocks in reschedule template', () => {
    const htmlWithReason = renderTemplate('reschedule', {
      clientName: 'Dave',
      currentDate: 'Monday, December 1, 2025',
      startTime: '10:00',
      location: 'Sydney',
      package: 'Vixen',
      newDate: 'Tuesday, December 2, 2025',
      newTime: '11:00',
      reason: 'Work conflict'
    });
    expect(htmlWithReason).toContain('Work conflict');

    const htmlNoReason = renderTemplate('reschedule', {
      clientName: 'Dave',
      currentDate: 'Monday, December 1, 2025',
      startTime: '10:00',
      location: 'Sydney',
      package: 'Vixen',
      newDate: 'Tuesday, December 2, 2025',
      newTime: '11:00',
      reason: ''
    });
    expect(htmlNoReason).not.toContain('Reason:');
  });
});
