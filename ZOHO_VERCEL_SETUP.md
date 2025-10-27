# 🔧 Zoho API - Vercel Environment Variables Setup

## ✅ What Just Happened

Hero images are now fixed and deployed! Vercel is deploying the fix right now.

## 🔴 What Still Needs To Do

The Zoho API requires environment variables to be set in Vercel.

## 📋 Quick Setup (2 minutes)

### 1. Open Vercel Dashboard

Go to: <https://vercel.com/kilometer8629/photography-booking-system>

### 2. Click "Settings" Tab

Then navigate to "Environment Variables"

### 3. Add These Variables

Copy and paste each one:

| Variable Name | Value | Source |
|---|---|---|
| `ZOHO_OAUTH_CLIENT_ID` | `[Your Client ID]` | From Zoho OAuth app setup |
| `ZOHO_OAUTH_CLIENT_SECRET` | `[Your Secret]` | From Zoho OAuth app setup |
| `ZOHO_OAUTH_REFRESH_TOKEN` | `[Your Refresh Token]` | From your local `.env` file |
| `ZOHO_OAUTH_REDIRECT_URI` | `https://photography-booking-system.vercel.app/api/oauth/callback` | Vercel deployment URL |
| `ZOHO_ACCOUNTS_BASE_URL` | `https://accounts.zoho.com.au` | Fixed value |
| `ZOHO_CALENDAR_BASE_URL` | `https://calendar.zoho.com.au` | Fixed value |
| `ZOHO_CALENDAR_ID` | `primary` | Fixed value |
| `ZOHO_FREEBUSY_USER` | `notification@southsydney.net` | Your Zoho email |
| `ZOHO_TIMEZONE` | `Australia/Sydney` | Fixed value |

### 4. Get Values From Local `.env`

Run this to see your current values:

```bash
grep "ZOHO_" /workspaces/photography-booking-system/.env
```

Copy those values to Vercel.

### 5. Save and Redeploy

1. Click "Save" in Vercel
2. Go to "Deployments" tab
3. Click the latest deployment (345537e)
4. Click "Redeploy" button
5. Wait 2-3 minutes for deployment to complete

### 6. Test It Works

Visit booking page and check if availability loads:
<https://photography-booking-system.vercel.app/booking.html>

Open DevTools Network tab → should see `/api/availability` returning 200 with data ✅

---

## 🎯 Summary

| What | Status | Next Step |
|---|---|---|
| Hero Images | ✅ Fixed & Deployed | Wait for Vercel (2 min) |
| Zoho API Config | 🔴 Needs Setup | Add env vars to Vercel |
| Old Deployments | 🧹 Optional | Delete old ones in dashboard |

After both are done → Site will be fully functional! 🚀
