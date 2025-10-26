const { DateTime } = require('luxon');

const fetch = global.fetch || ((...args) => import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args)));
const { buildSlotsForDay, filterSlots } = require('../utils/slots');

const {
  ZOHO_OAUTH_CLIENT_ID,
  ZOHO_OAUTH_CLIENT_SECRET,
  ZOHO_OAUTH_REFRESH_TOKEN,
  ZOHO_OAUTH_REDIRECT_URI,
  ZOHO_ACCOUNTS_BASE_URL,
  ZOHO_CALENDAR_BASE_URL,
  ZOHO_CALENDAR_ID,
  ZOHO_FREEBUSY_USER,
  ZOHO_TIMEZONE,
  BOOKING_SLOT_MINUTES,
  BOOKING_START_HOUR,
  BOOKING_END_HOUR
} = process.env;

if (!ZOHO_OAUTH_CLIENT_ID || !ZOHO_OAUTH_CLIENT_SECRET || !ZOHO_OAUTH_REFRESH_TOKEN) {
  console.warn('[Zoho] OAuth credentials are not fully configured. Calendar sync will be disabled.');
}

const accountsBaseUrl = (ZOHO_ACCOUNTS_BASE_URL || 'https://accounts.zoho.com.au').replace(/\/+$/, '');
const calendarBaseUrl = (ZOHO_CALENDAR_BASE_URL || 'https://calendar.zoho.com.au').replace(/\/+$/, '');
const calendarId = ZOHO_CALENDAR_ID || 'primary';
const freeBusyUser = ZOHO_FREEBUSY_USER || ZOHO_OAUTH_CLIENT_ID || '';
const calendarTimezone = ZOHO_TIMEZONE || 'Australia/Sydney';
const slotMinutes = Number(BOOKING_SLOT_MINUTES || 5);
const operatingStartHour = Number(BOOKING_START_HOUR || 10);
const operatingEndHour = Number(BOOKING_END_HOUR || 16);

let cachedAccessToken = null;
let cachedAccessExpiry = 0;

const buildOAuthParams = () => {
  const params = new URLSearchParams({
    refresh_token: ZOHO_OAUTH_REFRESH_TOKEN || '',
    client_id: ZOHO_OAUTH_CLIENT_ID || '',
    client_secret: ZOHO_OAUTH_CLIENT_SECRET || '',
    grant_type: 'refresh_token'
  });

  if (ZOHO_OAUTH_REDIRECT_URI) {
    params.append('redirect_uri', ZOHO_OAUTH_REDIRECT_URI);
  }

  return params;
};

async function getAccessToken() {
  if (!ZOHO_OAUTH_CLIENT_ID || !ZOHO_OAUTH_CLIENT_SECRET || !ZOHO_OAUTH_REFRESH_TOKEN) {
    throw new Error('Zoho OAuth credentials are missing.');
  }

  const now = Date.now();
  if (cachedAccessToken && cachedAccessExpiry > now) {
    return cachedAccessToken;
  }

  const tokenUrl = `${accountsBaseUrl}/oauth/v2/token`;
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: buildOAuthParams()
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`[Zoho] Failed to refresh access token: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  cachedAccessToken = data.access_token;
  cachedAccessExpiry = now + ((data.expires_in || 3600) - 60) * 1000;

  return cachedAccessToken;
}

const parseZohoDateTime = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return DateTime.fromISO(value, { zone: calendarTimezone });
  }
  if (value.dateTime) {
    return DateTime.fromISO(value.dateTime, {
      zone: value.timeZone || calendarTimezone
    }).setZone(calendarTimezone);
  }
  if (value.date) {
    return DateTime.fromISO(`${value.date}T00:00:00`, { zone: calendarTimezone });
  }
  return null;
};

const normaliseEvent = (event) => {
  const start = parseZohoDateTime(
    event.start || 
    event.startTime || 
    event.when?.startTime ||
    event.dateandtime?.start  // Handle Zoho API v1 format
  );
  const end = parseZohoDateTime(
    event.end || 
    event.endTime || 
    event.when?.endTime ||
    event.dateandtime?.end  // Handle Zoho API v1 format
  );
  if (!start || !end) {
    return null;
  }
  return {
    id: event.id || event.eventId || event.uid,
    start,
    end
  };
};

function buildBusyEventsForDay(dayKey, entry, dayStart, dayEnd) {
  if (!entry) {
    return [];
  }

  let allDayFlag = false;
  let intervals = [];

  if (Array.isArray(entry)) {
    if (entry[0] && typeof entry[0] === 'object' && entry[0].allday) {
      allDayFlag = true;
    }
    if (Array.isArray(entry[1])) {
      intervals = entry[1];
    }
  } else if (entry.allday || entry.allDay) {
    allDayFlag = true;
  } else if (Array.isArray(entry.busy)) {
    intervals = entry.busy;
  }

  const events = [];

  if (allDayFlag) {
    events.push({
      start: dayStart,
      end: dayEnd
    });
  }

  intervals.forEach((range) => {
    if (typeof range !== 'string' || !range.includes('-')) {
      return;
    }
    const [startStr, endStr] = range.split('-');
    const [startHour, startMinute] = startStr.split(':').map(Number);
    const [endHour, endMinute] = endStr.split(':').map(Number);

    if (
      Number.isNaN(startHour) || Number.isNaN(startMinute) ||
      Number.isNaN(endHour) || Number.isNaN(endMinute)
    ) {
      return;
    }

    const start = dayStart.set({ hour: startHour, minute: startMinute });
    const end = dayStart.set({ hour: endHour, minute: endMinute });

    if (end <= start) {
      return;
    }

    events.push({ start, end });
  });

  return events;
}

async function fetchFreeBusy(rangeStart, rangeEnd) {
  if (!freeBusyUser) {
    throw new Error('Zoho free/busy user email is not configured.');
  }

  const token = await getAccessToken();

  const url = new URL('/api/v1/calendars/freebusy', calendarBaseUrl);
  url.searchParams.set('uemail', freeBusyUser);
  url.searchParams.set('sdate', rangeStart.toFormat("yyyyMMdd'T'HHmmss"));
  url.searchParams.set('edate', rangeEnd.toFormat("yyyyMMdd'T'HHmmss"));
  url.searchParams.set('ftype', 'timebased');

  const response = await fetch(url, {
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`[Zoho] Failed to fetch free/busy data: ${response.status} ${errorBody}`);
  }

  const payload = await response.json();
  const freeBusyMap = payload.freebusy || payload;
  return freeBusyMap[freeBusyUser] || {};
}



async function getAvailabilityForDate(date) {
  const { dayStart, dayEnd, slots } = buildSlotsForDay(date, { timezone: calendarTimezone, startHour: operatingStartHour, endHour: operatingEndHour, slotMinutes });
  const busyMap = await fetchFreeBusy(dayStart, dayEnd);
  const dayKey = dayStart.toFormat('yyyyMMdd');
  const events = buildBusyEventsForDay(dayKey, busyMap[dayKey], dayStart, dayEnd);
  return filterSlots(slots, events, { timezone: calendarTimezone, slotMinutes });
}

async function getAvailabilityForRange(startDate, endDate) {
  const start = DateTime.fromISO(startDate, { zone: calendarTimezone }).startOf('day');
  const end = DateTime.fromISO(endDate, { zone: calendarTimezone }).endOf('day');

  const days = {};
  const busyMap = await fetchFreeBusy(start, end);
  let cursor = start;

  while (cursor <= end) {
    const dateKey = cursor.toISODate();
    const { dayStart, dayEnd, slots } = buildSlotsForDay(dateKey, { timezone: calendarTimezone, startHour: operatingStartHour, endHour: operatingEndHour, slotMinutes });
    const busyEvents = buildBusyEventsForDay(cursor.toFormat('yyyyMMdd'), busyMap[cursor.toFormat('yyyyMMdd')], dayStart, dayEnd);
    days[dateKey] = filterSlots(slots, busyEvents, { timezone: calendarTimezone, slotMinutes });
    cursor = cursor.plus({ days: 1 });
  }

  return days;
}

async function createZohoEvent({ date, time, durationMinutes = slotMinutes, summary, description, location }) {
  const startDateTime = DateTime.fromISO(`${date}T${time}`, { zone: calendarTimezone });
  if (!startDateTime.isValid) {
    throw new Error('Invalid date/time supplied for Zoho event.');
  }

  const endDateTime = startDateTime.plus({ minutes: durationMinutes });

  const token = await getAccessToken();
  // Don't URL-encode the calendar UID - use it directly in the path
  const url = new URL(`/api/v1/calendars/${calendarId}/events`, calendarBaseUrl);

  // Correct Zoho Calendar API v1: eventdata goes in QUERY parameters, not body!
  // Per official documentation, the payload structure uses title, dateandtime with start/end/timezone
  const eventdata = {
    title: summary || 'Santa Photo Session',
    dateandtime: {
      start: startDateTime.toFormat("yyyyMMdd'T'HHmmss'Z'"),
      end: endDateTime.toFormat("yyyyMMdd'T'HHmmss'Z'"),
      timezone: calendarTimezone
    },
    description: description || '',
    location: location || ''
  };

  // Add eventdata as URL query parameter
  url.searchParams.set('eventdata', JSON.stringify(eventdata));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`[Zoho] Failed to create event: ${response.status} ${errorBody}`);
  }

  const body = await response.json();
  
  // Zoho API returns {events: [...]} array for POST create
  let eventData = body;
  if (body.events && Array.isArray(body.events) && body.events.length > 0) {
    eventData = body.events[0];
  }
  
  const event = normaliseEvent(eventData);

  if (!event) {
    throw new Error('[Zoho] Invalid event response.');
  }

  return {
    id: event.id,
    start: event.start,
    end: event.end
  };
}

async function deleteZohoEvent(eventId) {
  if (!eventId) {
    return;
  }
  const token = await getAccessToken();
  const url = new URL(`/api/v1/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, calendarBaseUrl);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok && response.status !== 404) {
    const errorBody = await response.text();
    throw new Error(`[Zoho] Failed to delete event: ${response.status} ${errorBody}`);
  }
}

module.exports = {
  getAvailabilityForDate,
  getAvailabilityForRange,
  createZohoEvent,
  deleteZohoEvent,
  settings: {
    slotMinutes,
    calendarTimezone,
    operatingStartHour,
    operatingEndHour
  }
};


