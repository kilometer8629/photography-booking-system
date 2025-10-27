# Zoho API Diagnostics Guide

This guide explains how to diagnose and troubleshoot Zoho API integration issues in the photography booking system.

## Quick Diagnostics

### 1. Check Zoho API Status

Visit the diagnostics endpoint to check the configuration and test the API:

```
https://your-domain.vercel.app/api/zoho/diagnostics
```

This will return a JSON response showing:
- Configuration status (which environment variables are set)
- API operational status
- Test results with sample availability data

Example response (public access):
```json
{
  "timestamp": "2025-10-27T14:00:00.000Z",
  "configuration": {
    "oauth_client_id": "Configured",
    "oauth_client_secret": "Configured",
    "oauth_refresh_token": "Configured",
    "accounts_base_url": "https://accounts.zoho.com.au",
    "calendar_base_url": "https://calendar.zoho.com.au",
    "calendar_id": "primary",
    "freebusy_user": "Configured",
    "timezone": "Australia/Sydney",
    "slot_minutes": "5",
    "operating_hours": "10:00 - 16:00"
  },
  "status": "operational",
  "message": "Zoho API is working correctly",
  "test_result": {
    "test_date": "2025-10-27",
    "available_slots_count": 72
  }
}
```

**Note:** Sample slot times are only included when accessed by authenticated admin users for security reasons.

### 2. View Vercel Logs

To see the detailed logs of API calls:

1. Go to your Vercel dashboard
2. Select your project
3. Click on "Deployments"
4. Click on the most recent deployment
5. Click on "Logs" or "Runtime Logs"

Look for log entries with prefixes like:
- `[Zoho]` - Zoho API operations
- `[API]` - Availability endpoint operations

### 3. Check Environment Variables

In Vercel dashboard:
1. Go to Settings → Environment Variables
2. Verify all Zoho-related variables are set:
   - `ZOHO_OAUTH_CLIENT_ID`
   - `ZOHO_OAUTH_CLIENT_SECRET`
   - `ZOHO_OAUTH_REFRESH_TOKEN`
   - `ZOHO_CALENDAR_ID`
   - `ZOHO_FREEBUSY_USER`
   - `ZOHO_ACCOUNTS_BASE_URL`
   - `ZOHO_CALENDAR_BASE_URL`
   - `ZOHO_TIMEZONE`

## Common Issues and Solutions

### Issue: "No sessions available" or "Fully booked" on all dates

**Possible Causes:**
1. Zoho calendar has all-day busy events blocking all slots
2. All slots are already booked in the database
3. Operating hours mismatch with calendar events
4. Timezone mismatch

**Solution:**
1. Check the diagnostics endpoint - it will show available slots count
2. Review Vercel logs for `[Zoho]` entries showing:
   - How many slots were built
   - How many busy events were found
   - How many slots were filtered out
3. Check Zoho Calendar directly for the configured user
4. Verify `BOOKING_START_HOUR` and `BOOKING_END_HOUR` match your calendar

### Issue: API not being called (no logs)

**Possible Causes:**
1. Frontend not making requests
2. API endpoint not receiving requests
3. Credentials missing/invalid

**Solution:**
1. Open browser DevTools → Network tab
2. Navigate to the booking page
3. Look for requests to `/api/availability`
4. Check the diagnostics endpoint
5. Review Vercel runtime logs

### Issue: Token refresh failures

**Symptoms:**
- Logs show "Failed to refresh access token"
- API returns 401 errors

**Solution:**
1. Verify refresh token hasn't expired (Zoho tokens expire after 6 months of inactivity)
2. Re-authorize the application in Zoho
3. Generate a new refresh token
4. Update `ZOHO_OAUTH_REFRESH_TOKEN` in Vercel

## Log Examples

### Successful API Call
```
[API] /api/availability endpoint called { start: '2025-10-27', end: '2025-11-03', timestamp: '2025-10-27T14:00:00.000Z' }
[API] Fetching booked slots from database...
[API] Found 5 booked slot(s) in database
[API] Requesting availability for date range: 2025-10-27 to 2025-11-03
[Zoho] getAvailabilityForRange called for: 2025-10-27 to 2025-11-03
[Zoho] Fetching free/busy data for user@example.com from 2025-10-27T00:00:00.000+11:00 to 2025-11-03T23:59:59.999+11:00
[Zoho] Using cached access token
[Zoho] API Request: https://calendar.zoho.com.au/api/v1/calendars/freebusy?...
[Zoho] Free/busy data received, keys: freebusy
[Zoho] User busy data contains 7 date(s)
[Zoho] Returning availability for 7 day(s) with 504 total available slot(s)
[API] Returning 499 available slot(s) across 7 day(s) (5 filtered by bookings)
```

### API Error
```
[API] /api/availability endpoint called { date: '2025-10-27', timestamp: '2025-10-27T14:00:00.000Z' }
[Zoho] getAvailabilityForDate called for: 2025-10-27
[Zoho] Built 72 slots for 2025-10-27 (10:00 - 16:00)
[Zoho] Refreshing access token...
[Zoho] Token refresh failed: 400 {"error":"invalid_client"}
[API] Availability fetch error: [Zoho] Failed to refresh access token: 400 {"error":"invalid_client"}
```

## Testing Locally

To test the enhanced logging locally (requires valid credentials):

1. Create a `.env` file with your Zoho credentials:
```bash
NODE_ENV=development
ZOHO_OAUTH_CLIENT_ID=1000.XXXXX
ZOHO_OAUTH_CLIENT_SECRET=xxxxx
ZOHO_OAUTH_REFRESH_TOKEN=1000.xxxxx
ZOHO_CALENDAR_ID=primary
ZOHO_FREEBUSY_USER=user@example.com
ZOHO_ACCOUNTS_BASE_URL=https://accounts.zoho.com.au
ZOHO_CALENDAR_BASE_URL=https://calendar.zoho.com.au
ZOHO_TIMEZONE=Australia/Sydney
MONGODB_URI=your_mongodb_uri
```

2. Run the diagnostic script:
```bash
node test_zoho_api.js
```

3. Start the server:
```bash
npm run dev:backend
```

4. Test the availability endpoint:
```bash
curl "http://localhost:3000/api/availability?date=2025-10-27"
```

5. Check the diagnostics endpoint:
```bash
curl "http://localhost:3000/api/zoho/diagnostics"
```

## Support

If you're still experiencing issues after following this guide:

1. Export the Vercel logs covering the time period when the issue occurred
2. Visit the diagnostics endpoint and save the response
3. Check the browser DevTools Network tab for any failed API requests
4. Document the specific steps that reproduce the issue

With this information, you can more effectively diagnose and resolve Zoho API integration issues.
