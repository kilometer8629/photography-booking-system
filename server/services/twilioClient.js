/**
 * Twilio SMS Service
 * Handles sending SMS notifications for bookings
 */

const twilio = require('twilio');

// Initialize Twilio client
let twilioClient = null;
const twilioEnabled = !!(
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_PHONE_NUMBER
);

if (twilioEnabled) {
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('✅ Twilio SMS client initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Twilio client:', error.message);
  }
} else {
  console.warn('⚠️ Twilio SMS not configured. SMS notifications are disabled.');
}

/**
 * Send SMS notification
 * @param {string} to - Recipient phone number (E.164 format recommended)
 * @param {string} message - SMS message text
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendSMS(to, message) {
  if (!twilioEnabled || !twilioClient) {
    console.warn('⚠️ Twilio not configured. SMS not sent.');
    return { success: false, error: 'Twilio SMS not configured' };
  }

  try {
    // Validate phone number format
    if (!to || typeof to !== 'string') {
      throw new Error('Invalid phone number provided');
    }

    // Send SMS
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    console.log(`✅ SMS sent successfully to ${to}. Message SID: ${result.sid}`);
    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error('❌ SMS sending failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Format phone number to E.164 format for Twilio
 * @param {string} phone - Phone number in various formats
 * @returns {string} - Formatted phone number
 */
function formatPhoneNumber(phone) {
  if (!phone) return '';

  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');

  // If starts with '0' (Australian mobile), replace with country code
  if (digits.startsWith('0')) {
    digits = '61' + digits.substring(1); // Australian country code
  }

  // Always format with + prefix
  return '+' + digits;
}

/**
 * Send booking confirmation SMS
 * @param {Object} booking - Booking object with customer details
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendBookingConfirmationSMS(booking) {
  const phoneNumber = formatPhoneNumber(booking.clientPhone);
  const eventDate = new Date(booking.eventDate).toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const message = `Hi ${booking.clientName}! Your ${booking.package} booking is confirmed for ${eventDate} at ${booking.startTime} at ${booking.location}. See you soon! - Ami Photography`;

  return await sendSMS(phoneNumber, message);
}

/**
 * Send booking status change SMS
 * @param {Object} booking - Booking object
 * @param {string} newStatus - New status of the booking
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendBookingStatusChangeSMS(booking, newStatus) {
  const phoneNumber = formatPhoneNumber(booking.clientPhone);
  const eventDate = new Date(booking.eventDate).toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let message = '';
  switch (newStatus) {
    case 'confirmed':
      message = `Hi ${booking.clientName}! Your booking for ${eventDate} at ${booking.startTime} has been confirmed. Thank you! - Ami Photography`;
      break;
    case 'cancelled':
      message = `Hi ${booking.clientName}, your booking for ${eventDate} has been cancelled. If you have questions, please contact us. - Ami Photography`;
      break;
    case 'completed':
      message = `Hi ${booking.clientName}! Thanks for choosing Ami Photography. Your photos from ${eventDate} will be ready soon. We'll notify you when they're available!`;
      break;
    default:
      message = `Hi ${booking.clientName}, your booking status has been updated to: ${newStatus}. - Ami Photography`;
  }

  return await sendSMS(phoneNumber, message);
}

/**
 * Send reschedule confirmation SMS
 * @param {Object} booking - Booking object
 * @param {string} newDate - New date for the booking
 * @param {string} newTime - New time for the booking
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendRescheduleConfirmationSMS(booking, newDate, newTime) {
  const phoneNumber = formatPhoneNumber(booking.clientPhone);
  const formattedNewDate = new Date(newDate).toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const message = `Hi ${booking.clientName}! Your reschedule request for ${formattedNewDate} at ${newTime} has been received. We'll confirm within 24 hours. - Ami Photography`;

  return await sendSMS(phoneNumber, message);
}

/**
 * Send payment confirmation SMS
 * @param {Object} booking - Booking object with payment details
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendPaymentConfirmationSMS(booking) {
  const phoneNumber = formatPhoneNumber(booking.clientPhone);
  // packageAmount is in cents, estimatedCost is in dollars
  const amount = booking.packageAmount 
    ? (booking.packageAmount / 100).toFixed(2)
    : (booking.estimatedCost || 0).toFixed(2);
  const eventDate = new Date(booking.eventDate).toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const message = `Hi ${booking.clientName}! Payment of ${booking.packageCurrency || '$'}${amount} received for your ${booking.package} session on ${eventDate}. Receipt sent to your email. - Ami Photography`;

  return await sendSMS(phoneNumber, message);
}

/**
 * Send cancellation SMS with refund information
 * @param {Object} booking - Booking object
 * @param {number} refundAmount - Refund amount in cents
 * @param {string} refundReason - Reason for refund
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendCancellationSMS(booking, refundAmount, refundReason) {
  const phoneNumber = formatPhoneNumber(booking.clientPhone);
  const refund = (refundAmount / 100).toFixed(2);

  const message = `Hi ${booking.clientName}, your booking has been cancelled. Refund of ${booking.packageCurrency || '$'}${refund} will be processed to your card within 5-7 days. - Ami Photography`;

  return await sendSMS(phoneNumber, message);
}

/**
 * Send reminder SMS for upcoming booking
 * @param {Object} booking - Booking object
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendBookingReminderSMS(booking) {
  const phoneNumber = formatPhoneNumber(booking.clientPhone);
  const eventDate = new Date(booking.eventDate).toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const message = `Hi ${booking.clientName}! Reminder: Your ${booking.package} session is tomorrow (${eventDate}) at ${booking.startTime} at ${booking.location}. Looking forward to seeing you! - Ami Photography`;

  return await sendSMS(phoneNumber, message);
}

module.exports = {
  sendSMS,
  formatPhoneNumber,
  sendBookingConfirmationSMS,
  sendBookingStatusChangeSMS,
  sendRescheduleConfirmationSMS,
  sendPaymentConfirmationSMS,
  sendCancellationSMS,
  sendBookingReminderSMS,
  twilioEnabled
};
