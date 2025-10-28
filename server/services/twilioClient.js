/**
 * Twilio SMS Client Service
 * Handles SMS notifications for booking confirmations, reminders, and updates
 */

const twilio = require('twilio');

// Initialize Twilio client
let twilioClient = null;

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

    // Log success without exposing full phone number
    const maskedPhone = normalizedPhone.slice(0, -4).replace(/\d/g, '*') + normalizedPhone.slice(-4);
    console.log(`✅ SMS sent successfully to ${maskedPhone}. SID: ${result.sid}`);
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
    cleaned = phone;
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
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const message = `Hi ${clientName}! Your Santa photo session is confirmed! 🎅
📅 ${eventDateStr} at ${startTime}
📍 ${location}
📦 Package: ${packageName}

We can't wait to capture your special moments! See you soon!
- Ami Photography`;

  return await sendSMS(clientPhone, message);
};

/**
 * Send payment confirmation SMS
 * @param {Object} booking - Booking object with payment details
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
    month: 'long',
    day: 'numeric'
  });

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
    month: 'long',
    day: 'numeric'
  });

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
};
