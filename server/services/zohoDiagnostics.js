/**
 * Zoho API Diagnostics Utility
 * Provides diagnostic information about Zoho API configuration and status
 */

const { getAvailabilityForDate } = require('./zohoClient');

/**
 * Get Zoho API diagnostics information
 * @param {Object} options - Options for diagnostics
 * @param {boolean} options.includeSamples - Whether to include sample slot data (default: false)
 * @returns {Promise<Object>} Diagnostics information
 */
async function getZohoDiagnostics(options = {}) {
  const { includeSamples = false } = options;
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    configuration: {
      oauth_client_id: process.env.ZOHO_OAUTH_CLIENT_ID ? 'Configured' : 'Missing',
      oauth_client_secret: process.env.ZOHO_OAUTH_CLIENT_SECRET ? 'Configured' : 'Missing',
      oauth_refresh_token: process.env.ZOHO_OAUTH_REFRESH_TOKEN ? 'Configured' : 'Missing',
      accounts_base_url: process.env.ZOHO_ACCOUNTS_BASE_URL || 'Not set (using default)',
      calendar_base_url: process.env.ZOHO_CALENDAR_BASE_URL || 'Not set (using default)',
      calendar_id: process.env.ZOHO_CALENDAR_ID || 'Not set (using default: primary)',
      freebusy_user: process.env.ZOHO_FREEBUSY_USER ? 'Configured' : 'Not set',
      timezone: process.env.ZOHO_TIMEZONE || 'Not set (using default)',
      slot_minutes: process.env.BOOKING_SLOT_MINUTES || 'Not set (using default)',
      operating_hours: `${process.env.BOOKING_START_HOUR || '10'}:00 - ${process.env.BOOKING_END_HOUR || '16'}:00`
    },
    status: 'unknown',
    message: '',
    test_result: null
  };

  // Check if credentials are configured
  if (!process.env.ZOHO_OAUTH_CLIENT_ID || !process.env.ZOHO_OAUTH_CLIENT_SECRET || !process.env.ZOHO_OAUTH_REFRESH_TOKEN) {
    diagnostics.status = 'error';
    diagnostics.message = 'Zoho OAuth credentials are not fully configured. Calendar sync is disabled.';
    return diagnostics;
  }

  // Try to test the API by fetching availability for today
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`[Zoho Diagnostics] Testing API with availability for ${today}`);
    const slots = await getAvailabilityForDate(today);
    diagnostics.status = 'operational';
    diagnostics.message = 'Zoho API is working correctly';
    diagnostics.test_result = {
      test_date: today,
      available_slots_count: slots.length
    };
    
    // Only include sample slots if explicitly requested (for authenticated admin use)
    if (includeSamples && slots.length > 0) {
      diagnostics.test_result.sample_slots = slots.slice(0, 3);
    }
  } catch (error) {
    diagnostics.status = 'error';
    diagnostics.message = `Zoho API test failed: ${error.message}`;
    diagnostics.test_result = {
      error: error.message,
      error_type: error.constructor.name
    };
  }

  return diagnostics;
}

module.exports = {
  getZohoDiagnostics
};
