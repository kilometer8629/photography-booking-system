require('../../config/loadEnv');
const twilio = require('twilio');

// Initialize Twilio client
let twilioClient = null;
let twilioConfigured = false;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (accountSid && authToken && twilioPhoneNumber) {
  try {
    twilioClient = twilio(accountSid, authToken);
    twilioConfigured = true;
    console.log('✅ Twilio SMS service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Twilio:', error.message);
  }
} else {
  console.warn('⚠️ Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in environment variables.');
}

/**
 * Send an SMS message using Twilio
 * @param {string} to - Recipient phone number (E.164 format recommended)
 * @param {string} message - Message body (max 1600 chars)
 * @returns {Promise<object>} - Twilio message object
 */
async function sendSMS(to, message) {
  if (!twilioConfigured) {
    throw new Error('Twilio is not configured. Please set environment variables.');
  }

  if (!to || !message) {
    throw new Error('Phone number and message are required');
  }

  // Clean phone number - ensure it starts with + for international format
  let cleanedPhone = to.trim().replace(/\s/g, '');
  if (!cleanedPhone.startsWith('+')) {
    // Assume Australian number if no country code
    cleanedPhone = cleanedPhone.replace(/^0/, '+61');
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: cleanedPhone
    });

    console.log(`✅ SMS sent successfully to ${cleanedPhone}. SID: ${result.sid}`);
    return {
      success: true,
      sid: result.sid,
      status: result.status,
      to: cleanedPhone,
      sentAt: new Date()
    };
  } catch (error) {
    console.error(`❌ Failed to send SMS to ${cleanedPhone}:`, error.message);
    throw new Error(`SMS sending failed: ${error.message}`);
  }
}

/**
 * Get SMS message status from Twilio
 * @param {string} messageSid - Twilio message SID
 * @returns {Promise<object>} - Message status
 */
async function getSMSStatus(messageSid) {
  if (!twilioConfigured) {
    throw new Error('Twilio is not configured');
  }

  try {
    const message = await twilioClient.messages(messageSid).fetch();
    return {
      sid: message.sid,
      status: message.status,
      to: message.to,
      from: message.from,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage,
      dateSent: message.dateSent
    };
  } catch (error) {
    console.error(`❌ Failed to fetch SMS status for ${messageSid}:`, error.message);
    throw new Error(`Failed to fetch SMS status: ${error.message}`);
  }
}

/**
 * Create predefined message templates
 * @param {string} type - Template type
 * @param {object} data - Data to populate template
 * @returns {string} - Formatted message
 */
function createMessageTemplate(type, data = {}) {
  const templates = {
    reminder: `Hi ${data.clientName || 'there'}! Reminder: Your ${data.eventType || 'photography session'} is scheduled for ${data.eventDate} at ${data.startTime} at ${data.location}. Looking forward to seeing you! - Ami Photography`,
    
    confirmation: `Hi ${data.clientName || 'there'}! Your booking for ${data.eventDate} at ${data.startTime} has been confirmed. We'll see you at ${data.location}. Reply STOP to unsubscribe. - Ami Photography`,
    
    running_late: `Hi ${data.clientName || 'there'}! We're running about ${data.delayMinutes || '15'} minutes late for your ${data.startTime} session. We apologize for the inconvenience and will be there soon! - Ami Photography`,
    
    rescheduled: `Hi ${data.clientName || 'there'}! Your session has been rescheduled to ${data.newDate} at ${data.newTime}. Location remains ${data.location}. Reply to confirm. - Ami Photography`,
    
    cancelled: `Hi ${data.clientName || 'there'}! Your booking for ${data.eventDate} at ${data.startTime} has been cancelled as requested. Please contact us if you have any questions. - Ami Photography`
  };

  return templates[type] || data.customMessage || '';
}

module.exports = {
  sendSMS,
  getSMSStatus,
  createMessageTemplate,
  twilioConfigured
};
