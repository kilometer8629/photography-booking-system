#!/usr/bin/env node

require('dotenv').config();

const fetch = global.fetch || ((...args) => import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args)));
const { DateTime } = require('luxon');

const {
  ZOHO_OAUTH_CLIENT_ID,
  ZOHO_OAUTH_CLIENT_SECRET,
  ZOHO_OAUTH_REFRESH_TOKEN,
  ZOHO_ACCOUNTS_BASE_URL,
  ZOHO_CALENDAR_BASE_URL,
  ZOHO_CALENDAR_ID,
  ZOHO_FREEBUSY_USER,
  ZOHO_TIMEZONE
} = process.env;

console.log('\n=== ZOHO API DIAGNOSTIC TEST ===\n');

// Check environment variables
console.log('1. Checking Environment Variables:');
console.log(`   ✓ ZOHO_OAUTH_CLIENT_ID: ${ZOHO_OAUTH_CLIENT_ID ? '✓ Configured' : '✗ Missing'}`);
console.log(`   ✓ ZOHO_OAUTH_CLIENT_SECRET: ${ZOHO_OAUTH_CLIENT_SECRET ? '✓ Configured' : '✗ Missing'}`);
console.log(`   ✓ ZOHO_OAUTH_REFRESH_TOKEN: ${ZOHO_OAUTH_REFRESH_TOKEN ? '✓ Configured' : '✗ Missing'}`);
console.log(`   ✓ ZOHO_ACCOUNTS_BASE_URL: ${ZOHO_ACCOUNTS_BASE_URL}`);
console.log(`   ✓ ZOHO_CALENDAR_BASE_URL: ${ZOHO_CALENDAR_BASE_URL}`);
console.log(`   ✓ ZOHO_CALENDAR_ID: ${ZOHO_CALENDAR_ID}`);
console.log(`   ✓ ZOHO_FREEBUSY_USER: ${ZOHO_FREEBUSY_USER}`);
console.log(`   ✓ ZOHO_TIMEZONE: ${ZOHO_TIMEZONE}`);

if (!ZOHO_OAUTH_CLIENT_ID || !ZOHO_OAUTH_CLIENT_SECRET || !ZOHO_OAUTH_REFRESH_TOKEN) {
  console.log('\n✗ CRITICAL: Missing OAuth credentials. Cannot proceed.\n');
  process.exit(1);
}

// Test token refresh
async function testTokenRefresh() {
  console.log('\n2. Testing OAuth Token Refresh:');

  try {
    const params = new URLSearchParams({
      refresh_token: ZOHO_OAUTH_REFRESH_TOKEN,
      client_id: ZOHO_OAUTH_CLIENT_ID,
      client_secret: ZOHO_OAUTH_CLIENT_SECRET,
      grant_type: 'refresh_token'
    });

    const tokenUrl = `${ZOHO_ACCOUNTS_BASE_URL}/oauth/v2/token`;
    console.log(`   URL: ${tokenUrl}`);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorBody = await response.text();
      console.log(`   ✗ Error: ${errorBody}`);
      return null;
    }

    const data = await response.json();
    console.log(`   ✓ Token refreshed successfully`);
    console.log(`   ✓ Access Token: ${data.access_token?.substring(0, 20)}...`);
    console.log(`   ✓ Expires In: ${data.expires_in} seconds`);

    return data.access_token;
  } catch (error) {
    console.log(`   ✗ Exception: ${error.message}`);
    return null;
  }
}

// Test free/busy fetch
async function testFreeBusy(accessToken) {
  console.log('\n3. Testing Free/Busy Fetch:');

  try {
    const now = DateTime.now().setZone(ZOHO_TIMEZONE);
    const start = now.startOf('day');
    const end = now.plus({ days: 7 }).endOf('day');

    const url = new URL(`${ZOHO_CALENDAR_BASE_URL}/api/v1/calendars/freebusy`);
    url.searchParams.set('uemail', ZOHO_FREEBUSY_USER);
    url.searchParams.set('sdate', start.toFormat("yyyyMMdd'T'HHmmss"));
    url.searchParams.set('edate', end.toFormat("yyyyMMdd'T'HHmmss"));
    url.searchParams.set('ftype', 'timebased');

    console.log(`   URL: ${url.toString()}`);
    console.log(`   Date Range: ${start.toISO()} to ${end.toISO()}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorBody = await response.text();
      console.log(`   ✗ Error: ${errorBody}`);
      return false;
    }

    const data = await response.json();
    console.log(`   ✓ Free/Busy data fetched successfully`);
    console.log(`   ✓ Response keys: ${Object.keys(data).join(', ')}`);

    if (data.freebusy && data.freebusy[ZOHO_FREEBUSY_USER]) {
      const userBusy = data.freebusy[ZOHO_FREEBUSY_USER];
      console.log(`   ✓ User busy slots: ${Object.keys(userBusy).length} days`);
    }

    return true;
  } catch (error) {
    console.log(`   ✗ Exception: ${error.message}`);
    return false;
  }
}

// Main test flow
(async () => {
  const token = await testTokenRefresh();

  if (token) {
    await testFreeBusy(token);
  }

  console.log('\n=== END DIAGNOSTIC ===\n');
})();
