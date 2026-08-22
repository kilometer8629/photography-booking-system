/**
<<<<<<< HEAD
 * Twilio SMS Client Service
 * Handles SMS notifications for booking confirmations, reminders, and updates
=======
 * Twilio SMS Service
 * Handles sending SMS notifications for bookings
>>>>>>> origin/main
 */

const twilio = require('twilio');

// Initialize Twilio client
let twilioClient = null;
<<<<<<< HEAD

const initializeTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('⚠️ Twilio credentials not configured. SMS notifications are disabled.');
    console.warn('Required environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
    return null;
  }

  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('✅ Twilio SMS client initialized successfully');
    return twilioClient;
  } catch (error) {
    console.error('❌ Failed to initialize Twilio client:', error.message);
    return null;
  }
};

// Initialize client on module load
initializeTwilioClient();

/**
 * Send SMS message using Twilio
 * @param {string} to - Recipient phone number (E.164 format)
 * @param {string} message - Message body
 * @returns {Promise<Object>} - Result object with success status and details
 */
const sendSMS = async (to, message) => {
  if (!twilioClient) {
    console.warn('⚠️ Twilio client not initialized. SMS not sent.');
    return {
      success: false,
      error: 'SMS service not configured'
    };
  }

  if (!to || !message) {
    return {
      success: false,
      error: 'Missing recipient phone number or message'
    };
  }

  try {
    // Normalize phone number to E.164 format if needed
    const normalizedPhone = normalizePhoneNumber(to);

    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: normalizedPhone
    });

    // Log success without including recipient-identifying data
    console.log('✅ SMS sent successfully.');
    return {
      success: true,
      messageSid: result.sid,
      status: result.status,
      to: normalizedPhone
    };
  } catch (error) {
    console.error('❌ SMS sending failed:', error.message);
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

/**
 * Normalize phone number to E.164 format
 * @param {string} phone - Phone number in various formats
 * @returns {string} - Normalized phone number
 */
const normalizePhoneNumber = (phone) => {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // If the number doesn't start with +, add country code
  if (!phone.startsWith('+')) {
    // Default to Australia (+61) if no country code
    if (cleaned.startsWith('0')) {
      // Remove leading 0 and add +61
      cleaned = '+61' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
      // Australian mobile without leading 0
      cleaned = '+61' + cleaned;
    } else if (cleaned.length === 10) {
      // Australian mobile with leading 0
      cleaned = '+61' + cleaned.substring(1);
    } else {
      // Assume it already has country code
      cleaned = '+' + cleaned;
    }
  } else {
    // Keep '+' but strip any other formatting characters
    cleaned = '+' + phone.slice(1).replace(/\D/g, '');
  }

  return cleaned;
};

/**
 * Send booking confirmation SMS
 * @param {Object} booking - Booking object with client details
 * @returns {Promise<Object>} - SMS send result
 */
const sendBookingConfirmationSMS = async (booking) => {
  const { clientPhone, clientName, eventDate, startTime, package: packageName, location } = booking;

  if (!clientPhone) {
    return { success: false, error: 'No phone number provided' };
  }

  const eventDateStr = new Date(eventDate).toLocaleDateString('en-AU', {
=======
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

    console.log(`✅ SMS sent successfully to ${maskPhoneNumber(to)}. Message SID: ${result.sid}`);
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
  if (!digits) return '';

  // If starts with '0' (Australian mobile), replace with country code
  if (digits.startsWith('0')) {
    digits = '61' + digits.substring(1); // Australian country code
  }

  // Always format with + prefix
  return '+' + digits;
}

function maskPhoneNumber(phone) {
  if (!phone) return '';
  const visibleDigits = phone.replace(/\D/g, '').slice(-4);
  return visibleDigits ? `***${visibleDigits}` : '***';
}

/**
 * Send booking confirmation SMS
 * @param {Object} booking - Booking object with customer details
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendBookingConfirmationSMS(booking) {
  const phoneNumber = formatPhoneNumber(booking.clientPhone);
  const eventDate = new Date(booking.eventDate).toLocaleDateString('en-AU', {
>>>>>>> origin/main
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

<<<<<<< HEAD
  const message = `Hi ${clientName}! Your Santa photo session is confirmed! 🎅
📅 ${eventDateStr} at ${startTime}
📍 ${location}
📦 Package: ${packageName}

We can't wait to capture your special moments! See you soon!
- Ami Photography`;

  return await sendSMS(clientPhone, message);
};
=======
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
>>>>>>> origin/main

/**
 * Send payment confirmation SMS
 * @param {Object} booking - Booking object with payment details
<<<<<<< HEAD
 * @returns {Promise<Object>} - SMS send result
 */
const sendPaymentConfirmationSMS = async (booking) => {
  const { clientPhone, clientName, packageAmount, packageCurrency } = booking;

  if (!clientPhone) {
    return { success: false, error: 'No phone number provided' };
  }

  const amount = ((packageAmount / 100) || 0).toFixed(2);
  const currency = packageCurrency || '$';

  const message = `Hi ${clientName}! Payment confirmed! ✅
Amount: ${currency}${amount}

Your booking is now fully confirmed. A tax receipt has been sent to your email.
Thank you for choosing Ami Photography! 📸`;

  return await sendSMS(clientPhone, message);
};

/**
 * Send booking reschedule notification SMS
 * @param {Object} booking - Booking object
 * @param {string} newDate - Requested new date
 * @param {string} newTime - Requested new time
 * @returns {Promise<Object>} - SMS send result
 */
const sendRescheduleNotificationSMS = async (booking, newDate, newTime) => {
  const { clientPhone, clientName } = booking;

  if (!clientPhone) {
    return { success: false, error: 'No phone number provided' };
  }

  const newDateStr = new Date(newDate).toLocaleDateString('en-AU', {
    weekday: 'long',
=======
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
>>>>>>> origin/main
    month: 'long',
    day: 'numeric'
  });

<<<<<<< HEAD
  const message = `Hi ${clientName}! We've received your reschedule request for ${newDateStr} at ${newTime}. 

We'll confirm availability within 24 hours and send you a confirmation email.
- Ami Photography`;

  return await sendSMS(clientPhone, message);
};

/**
 * Send booking cancellation SMS
 * @param {Object} booking - Booking object
 * @param {number} refundAmount - Refund amount in cents
 * @returns {Promise<Object>} - SMS send result
 */
const sendCancellationSMS = async (booking, refundAmount = 0) => {
  const { clientPhone, clientName, packageCurrency } = booking;

  if (!clientPhone) {
    return { success: false, error: 'No phone number provided' };
  }

  const refund = ((refundAmount / 100) || 0).toFixed(2);
  const currency = packageCurrency || '$';

  const message = `Hi ${clientName}, your booking has been cancelled.${refundAmount > 0 ? `\n\nRefund of ${currency}${refund} will be processed within 5-7 business days.` : ''}

We're sorry to see you go. If you'd like to rebook, visit our website anytime.
- Ami Photography`;

  return await sendSMS(clientPhone, message);
};

/**
 * Send booking reminder SMS (for upcoming bookings)
 * @param {Object} booking - Booking object
 * @param {number} daysUntil - Days until the booking
 * @returns {Promise<Object>} - SMS send result
 */
const sendBookingReminderSMS = async (booking, daysUntil = 1) => {
  const { clientPhone, clientName, eventDate, startTime, location } = booking;

  if (!clientPhone) {
    return { success: false, error: 'No phone number provided' };
  }

  const eventDateStr = new Date(eventDate).toLocaleDateString('en-AU', {
    weekday: 'long',
=======
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
>>>>>>> origin/main
    month: 'long',
    day: 'numeric'
  });

<<<<<<< HEAD
  const reminderText = daysUntil === 1 
    ? 'tomorrow' 
    : daysUntil === 0 
      ? 'today' 
      : `in ${daysUntil} days`;

  const message = `🎅 Reminder: Your Santa photo session is ${reminderText}!

📅 ${eventDateStr} at ${startTime}
📍 ${location}

Tips: Arrive 10 mins early, bring props/outfits if desired.
Looking forward to seeing you!
- Ami Photography`;

  return await sendSMS(clientPhone, message);
};

/**
 * Check if Twilio is configured and available
 * @returns {boolean} - True if Twilio is available
 */
const isTwilioConfigured = () => {
  return twilioClient !== null;
};

module.exports = {
  sendSMS,
  sendBookingConfirmationSMS,
  sendPaymentConfirmationSMS,
  sendRescheduleNotificationSMS,
  sendCancellationSMS,
  sendBookingReminderSMS,
  isTwilioConfigured,
  normalizePhoneNumber
=======
  const message = `Hi ${booking.clientName}! Reminder: Your ${booking.package} session is tomorrow (${eventDate}) at ${booking.startTime} at ${booking.location}. Looking forward to seeing you! - Ami Photography`;

  return await sendSMS(phoneNumber, message);
}

module.exports = {
  sendSMS,
  formatPhoneNumber,
  maskPhoneNumber,
  sendBookingConfirmationSMS,
  sendBookingStatusChangeSMS,
  sendRescheduleConfirmationSMS,
  sendPaymentConfirmationSMS,
  sendCancellationSMS,
  sendBookingReminderSMS,
  twilioEnabled
>>>>>>> origin/main
};
