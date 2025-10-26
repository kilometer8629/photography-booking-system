require('dotenv').config();
const fetch = global.fetch || ((...args) => import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args)));

const {
  ZOHO_OAUTH_CLIENT_ID,
  ZOHO_OAUTH_CLIENT_SECRET,
  ZOHO_OAUTH_REFRESH_TOKEN,
  ZOHO_ACCOUNTS_BASE_URL,
  ZOHO_CALENDAR_BASE_URL
} = process.env;

const accountsBaseUrl = (ZOHO_ACCOUNTS_BASE_URL || 'https://accounts.zoho.com.au').replace(/\/+$/, '');
const calendarBaseUrl = (ZOHO_CALENDAR_BASE_URL || 'https://calendar.zoho.com.au').replace(/\/+$/, '');

async function getAccessToken() {
  const params = new URLSearchParams({
    refresh_token: ZOHO_OAUTH_REFRESH_TOKEN,
    client_id: ZOHO_OAUTH_CLIENT_ID,
    client_secret: ZOHO_OAUTH_CLIENT_SECRET,
    grant_type: 'refresh_token'
  });

  const response = await fetch(`${accountsBaseUrl}/oauth/v2/token`, {
    method: 'POST',
    body: params
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function listCalendars() {
  const token = await getAccessToken();
  const url = new URL('/api/v1/calendars', calendarBaseUrl);

  console.log('Fetching calendars from:', url.toString());

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Error:', response.status, errorBody);
    return;
  }

  const data = await response.json();
  console.log('Calendars:', JSON.stringify(data, null, 2));
}

listCalendars().catch(console.error);
