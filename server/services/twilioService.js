/**
 * Twilio SMS Service
 * Handles sending SMS notifications to customers for bookings and appointments
 */

const twilio = require('twilio');

// Initialize Twilio client
let twilioClient = null;

/**
 * Initialize the Twilio client with credentials from environment variables
 */
function initializeTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    console.warn('⚠️ Twilio credentials not configured. SMS notifications are disabled.');
    return null;
  }
  
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('✅ Twilio client initialized successfully');
    return twilioClient;
  } catch (error) {
    console.error('❌ Failed to initialize Twilio client:', error.message);
    return null;
  }
}

/**
 * Format phone number to E.164 format if needed
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} - Formatted phone number
 */
function formatPhoneNumber(phoneNumber) {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // If it starts with 0 (Australian local format), replace with +61
  if (cleaned.startsWith('0')) {
    return `+61${cleaned.substring(1)}`;
  }
  
  // If it doesn't start with +, assume Australian number
  if (!phoneNumber.startsWith('+')) {
    // If it starts with 61, add +
    if (cleaned.startsWith('61')) {
      return `+${cleaned}`;
    }
    // Otherwise, add +61
    return `+61${cleaned}`;
  }
  
  return phoneNumber;
}

/**
 * Send a booking confirmation SMS
 * @param {Object} booking - Booking details
 * @returns {Promise<Object>} - Result of SMS send operation
 */
async function sendBookingConfirmationSMS(booking) {
  if (!twilioClient) {
    twilioClient = initializeTwilioClient();
  }
  
  if (!twilioClient) {
    return { success: false, error: 'Twilio client not configured' };
  }
  
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) {
    return { success: false, error: 'Twilio phone number not configured' };
  }
  
  try {
    const eventDate = new Date(booking.eventDate);
    const formattedDate = eventDate.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const message = `Hi ${booking.clientName}! Your ${booking.package} photography session is confirmed for ${formattedDate} at ${booking.startTime}. Location: ${booking.location}. Thank you for choosing Ami Photography! 📸`;
    
    const toNumber = formatPhoneNumber(booking.clientPhone);
    
    const result = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: toNumber
    });
    
    console.log(`✅ Booking confirmation SMS sent to ${toNumber}:`, result.sid);
    return { success: true, messageSid: result.sid };
  } catch (error) {
    console.error('❌ Failed to send booking confirmation SMS:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send a payment confirmation SMS
 * @param {Object} booking - Booking details
 * @returns {Promise<Object>} - Result of SMS send operation
 */
async function sendPaymentConfirmationSMS(booking) {
  if (!twilioClient) {
    twilioClient = initializeTwilioClient();
  }
  
  if (!twilioClient) {
    return { success: false, error: 'Twilio client not configured' };
  }
  
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) {
    return { success: false, error: 'Twilio phone number not configured' };
  }
  
  try {
    const amount = ((booking.packageAmount || 0) / 100 || booking.estimatedCost || 0).toFixed(2);
    const currency = booking.packageCurrency || '$';
    
    const message = `Payment confirmed! ${currency}${amount} received for your ${booking.package} session. You'll receive a tax receipt via email. Thank you! - Ami Photography`;
    
    const toNumber = formatPhoneNumber(booking.clientPhone);
    
    const result = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: toNumber
    });
    
    console.log(`✅ Payment confirmation SMS sent to ${toNumber}:`, result.sid);
    return { success: true, messageSid: result.sid };
  } catch (error) {
    console.error('❌ Failed to send payment confirmation SMS:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send a booking cancellation SMS
 * @param {Object} booking - Booking details
 * @param {number} refundAmount - Refund amount in cents
 * @param {string} refundReason - Reason for refund
 * @returns {Promise<Object>} - Result of SMS send operation
 */
async function sendCancellationSMS(booking, refundAmount, refundReason) {
  if (!twilioClient) {
    twilioClient = initializeTwilioClient();
  }
  
  if (!twilioClient) {
    return { success: false, error: 'Twilio client not configured' };
  }
  
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) {
    return { success: false, error: 'Twilio phone number not configured' };
  }
  
  try {
    const refund = (refundAmount / 100).toFixed(2);
    const currency = booking.packageCurrency || '$';
    
    // Include refund information or no-refund reason
    let message;
    if (refundAmount > 0) {
      message = `Your booking has been cancelled. Refund of ${currency}${refund} will be processed to your original payment method within 5-7 business days. - Ami Photography`;
    } else {
      message = `Your booking has been cancelled. ${refundReason || 'No refund applicable per cancellation policy'}. - Ami Photography`;
    }
    
    const toNumber = formatPhoneNumber(booking.clientPhone);
    
    const result = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: toNumber
    });
    
    console.log(`✅ Cancellation SMS sent to ${toNumber}:`, result.sid);
    return { success: true, messageSid: result.sid };
  } catch (error) {
    console.error('❌ Failed to send cancellation SMS:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send a reschedule confirmation SMS
 * @param {Object} booking - Booking details
 * @param {string} newDate - New booking date
 * @param {string} newTime - New booking time
 * @returns {Promise<Object>} - Result of SMS send operation
 */
async function sendRescheduleSMS(booking, newDate, newTime) {
  if (!twilioClient) {
    twilioClient = initializeTwilioClient();
  }
  
  if (!twilioClient) {
    return { success: false, error: 'Twilio client not configured' };
  }
  
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) {
    return { success: false, error: 'Twilio phone number not configured' };
  }
  
  try {
    const formattedDate = new Date(newDate).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const message = `Your reschedule request has been received. New requested date: ${formattedDate} at ${newTime}. We'll confirm availability within 24 hours. - Ami Photography`;
    
    const toNumber = formatPhoneNumber(booking.clientPhone);
    
    const result = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: toNumber
    });
    
    console.log(`✅ Reschedule SMS sent to ${toNumber}:`, result.sid);
    return { success: true, messageSid: result.sid };
  } catch (error) {
    console.error('❌ Failed to send reschedule SMS:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send a booking reminder SMS (for future use)
 * @param {Object} booking - Booking details
 * @param {number} hoursUntil - Hours until the booking
 * @returns {Promise<Object>} - Result of SMS send operation
 */
async function sendBookingReminderSMS(booking, hoursUntil = 24) {
  if (!twilioClient) {
    twilioClient = initializeTwilioClient();
  }
  
  if (!twilioClient) {
    return { success: false, error: 'Twilio client not configured' };
  }
  
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) {
    return { success: false, error: 'Twilio phone number not configured' };
  }
  
  try {
    const eventDate = new Date(booking.eventDate);
    const formattedDate = eventDate.toLocaleDateString('en-AU', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    
    // Dynamic message based on hours until booking
    let timePhrase;
    if (hoursUntil <= 2) {
      timePhrase = 'in a few hours';
    } else if (hoursUntil <= 12) {
      timePhrase = 'later today';
    } else if (hoursUntil <= 24) {
      timePhrase = 'tomorrow';
    } else if (hoursUntil <= 48) {
      timePhrase = 'in 2 days';
    } else {
      const days = Math.round(hoursUntil / 24);
      timePhrase = `in ${days} days`;
    }
    
    const message = `Reminder: Your ${booking.package} session is ${timePhrase}, ${formattedDate} at ${booking.startTime}. Location: ${booking.location}. See you soon! 📸 - Ami Photography`;
    
    const toNumber = formatPhoneNumber(booking.clientPhone);
    
    const result = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: toNumber
    });
    
    console.log(`✅ Booking reminder SMS sent to ${toNumber}:`, result.sid);
    return { success: true, messageSid: result.sid };
  } catch (error) {
    console.error('❌ Failed to send booking reminder SMS:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initializeTwilioClient,
  sendBookingConfirmationSMS,
  sendPaymentConfirmationSMS,
  sendCancellationSMS,
  sendRescheduleSMS,
  sendBookingReminderSMS,
  formatPhoneNumber
};
