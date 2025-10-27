# 🔴 Zoho API Environment Variables - Still Not Configured

## The Issue

Your Zoho API is returning **500 errors** with: `"Zoho OAuth credentials are missing"`

**Why?** You redployed, but you **didn't add the environment variables to Vercel** yet.

---

## ✅ What You Need To Do (5 minutes)

### Step 1: Open Vercel Dashboard

Go to: <https://vercel.com/kilometer8629/photography-booking-system>

### Step 2: Click "Settings" Tab

### Step 3: Click "Environment Variables"

### Step 4: Add These 9 Variables

Copy each variable name and value from below:

| Variable Name | Value |
|---|---|
| `ZOHO_OAUTH_CLIENT_ID` | `1000.O1CBYGO0DUYERR7RP26DDGQMD0BW7A` |
| `ZOHO_OAUTH_CLIENT_SECRET` | `761d6c48e400efd85328c736d7ea045410df22c08d` |
| `ZOHO_OAUTH_REFRESH_TOKEN` | `1000.32d9e5e118d5084d6ad33606609076f5.d2b537d10807...` |
| `ZOHO_ACCOUNTS_BASE_URL` | `https://accounts.zoho.com.au` |
| `ZOHO_CALENDAR_BASE_URL` | `https://calendar.zoho.com.au` |
| `ZOHO_CALENDAR_ID` | `83ce9529c56a45f8b2b0375e74acc648` |
| `ZOHO_FREEBUSY_USER` | `notification@southsydney.net` |
| `ZOHO_OAUTH_REDIRECT_URI` | `https://photography-booking-system.vercel.app/api/zoho/callback` |
| `ZOHO_TIMEZONE` | `Australia/Sydney` |

**Get the full `ZOHO_OAUTH_REFRESH_TOKEN` value from your local `.env` file**

### Step 5: Save

Click "Save" button

### Step 6: Redeploy

1. Go to **Deployments** tab
2. Click on latest deployment: `345537e`
3. Click **"Redeploy"** button
4. Wait 2-3 minutes for build to complete

### Step 7: Test

Visit: <https://photography-booking-system.vercel.app/booking.html>

**Expected result:** Calendar loads with available dates ✅

---

## 🧪 How to Verify It's Working

Open DevTools (F12) → **Console** tab

You should see logs like:

```
✅ handleBooking is now a function!
GET /api/availability?start=2025-10-01&end=2025-10-31 200 OK
[Zoho] Got availability range: { "2025-10-27": [...], ... }
```

NOT:

```
❌ 500 (Internal Server Error)
"Zoho OAuth credentials are missing"
```

---

## 📋 Current Status

| Item | Status |
|---|---|
| Hero Images | ✅ FIXED |
| Zoho API Code | ✅ WORKING |
| Environment Variables | 🔴 **NOT SET IN VERCEL** |
| Booking Availability | 🔴 BLOCKED (waiting for env vars) |

---

## ⏱️ Timeline

- **Now:** Add 9 env vars to Vercel (5 min)
- **+3 min:** Vercel rebuilds
- **+5 min:** Zoho API working, bookings loading ✅

**Total: ~10 minutes to full functionality**

---

## Quick Reference

**Vercel URL:** <https://vercel.com/kilometer8629/photography-booking-system/settings/environment-variables>

**Production Site:** <https://photography-booking-system.vercel.app>

**Your .env file has all the values you need** - just copy them over!
