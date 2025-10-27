# 🔍 Debug Zoho Environment Variables in Vercel

## The Problem

The Zoho API is returning "Zoho OAuth credentials are missing" even though we believe they're configured.

## What I Just Did

Added enhanced logging to show EXACTLY what environment variables are available when the code runs in Vercel.

## How To Check The Logs

### Step 1: Wait for New Deployment

- Vercel is auto-deploying commit `af170b1`
- Wait 30-60 seconds for deployment to complete
- Go to: <https://vercel.com/kilometer8629/photography-booking-system/deployments>

### Step 2: Trigger the API

Visit the booking page:

- <https://photography-booking-system.vercel.app/booking.html>

### Step 3: View Real-Time Logs

In Vercel Dashboard:

1. Go to: <https://vercel.com/kilometer8629/photography-booking-system>
2. Click "Deployments" tab
3. Click on the latest deployment (af170b1)
4. Click "Logs" → "Runtime"
5. Look for lines starting with:

   ```
   [Zoho Init] Checking environment variables...
   [Zoho Init] ZOHO_OAUTH_CLIENT_ID set: (true/false)
   [Zoho Init] ZOHO_OAUTH_CLIENT_SECRET set: (true/false)
   [Zoho Init] ZOHO_OAUTH_REFRESH_TOKEN set: (true/false)
   [Zoho Init] All process.env keys: (list of ZOHO_ variables)
   ```

## What The Logs Will Tell Us

### If TRUE for all three

✅ Environment variables ARE in Vercel
❌ Problem is elsewhere (need to check error message)

### If FALSE for any

🔴 Environment variables are NOT set in Vercel
✅ We know exactly which ones are missing
🔧 We'll add them manually

## IMPORTANT ACTION NEEDED

If the logs show FALSE for any variables, you MUST:

1. Go to Vercel Settings → Environment Variables
2. For each MISSING variable, add it with value from your `.env` file
3. Redeploy

The variables that need to be in Vercel:

- ZOHO_OAUTH_CLIENT_ID
- ZOHO_OAUTH_CLIENT_SECRET  
- ZOHO_OAUTH_REFRESH_TOKEN
- ZOHO_OAUTH_REDIRECT_URI
- ZOHO_ACCOUNTS_BASE_URL
- ZOHO_CALENDAR_BASE_URL
- ZOHO_CALENDAR_ID
- ZOHO_FREEBUSY_USER
- ZOHO_TIMEZONE

## Quick Test

Visit this URL after deployment (wait 2 minutes):

```
https://photography-booking-system.vercel.app/booking.html
```

Then check Vercel Logs for the `[Zoho Init]` messages.

---

Let me know what the logs show and we'll fix it from there!
