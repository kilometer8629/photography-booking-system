# 🚀 Vercel Deployment Guide - Photography Booking System

Complete step-by-step instructions to deploy your Photography Booking system to Vercel.

---

## 📋 Prerequisites

Before deploying, ensure you have:

- ✅ GitHub account (for easy deployment linking)
- ✅ Vercel account (free at vercel.com)
- ✅ MongoDB Atlas account (free tier available)
- ✅ Stripe account with live keys
- ✅ Zoho Calendar account configured
- ✅ Email service credentials (Zoho SMTP configured)
- ✅ All environment variables ready

---

## 🔧 Step 1: Prepare Your Local Environment

### 1.1 Update Your Environment Variables

Your `.env` file should contain all necessary variables. For Vercel, we'll set these in the dashboard.

**Required Variables:**
```
NODE_ENV=production
CLIENT_URL=https://your-domain.vercel.app
SESSION_SECRET=your_super_secret_session_key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure_password
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
EMAIL_HOST=smtp.zoho.com.au
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-email-password
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=https://your-domain.vercel.app/thank-you.html
STRIPE_CANCEL_URL=https://your-domain.vercel.app/booking.html
```

### 1.2 Update package.json

Ensure your `package.json` has the correct build and start scripts:

```json
{
  "scripts": {
    "start": "node server/index.js",
    "dev": "nodemon server/index.js",
    "build:frontend": "vite build",
    "build": "npm run build:frontend"
  }
}
```

### 1.3 Verify MongoDB Connection

Make sure your MongoDB URI is:
- For **MongoDB Atlas**: `mongodb+srv://username:password@cluster.mongodb.net/database`
- Whitelist Vercel IP addresses in MongoDB Atlas (or allow all: `0.0.0.0/0`)

---

## 📦 Step 2: Push Code to GitHub

### 2.1 Initialize Git Repository (if not already done)

```powershell
git init
git add .
git commit -m "Ready for Vercel deployment"
```

### 2.2 Create Repository on GitHub

1. Go to https://github.com/new
2. Create a new repository (e.g., `photography-booking`)
3. Add remote and push:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/photography-booking.git
git branch -M main
git push -u origin main
```

---

## 🌐 Step 3: Connect to Vercel

### 3.1 Sign In to Vercel

1. Go to https://vercel.com
2. Click **"Sign Up"** or **"Sign In"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub account

### 3.2 Create New Project

1. Click **"Add New Project"**
2. Select your **"photography-booking"** repository
3. Click **"Import"**

### 3.3 Configure Project Settings

In the **Import Project** screen:

**Framework Preset:** Express.js  
**Build Command:** `npm run build:frontend`  
**Output Directory:** `dist`  
**Install Command:** `npm install`

Click **"Deploy"** (don't worry, we'll add environment variables next)

---

## 🔐 Step 4: Add Environment Variables

### 4.1 Access Environment Variables

1. Go to your project on Vercel dashboard
2. Click **"Settings"** → **"Environment Variables"**

### 4.2 Add Each Variable

Add all variables from your `.env` file:

**Critical Variables to Update:**

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | **Must be production** |
| `CLIENT_URL` | `https://your-project.vercel.app` | Replace with your Vercel URL |
| `SESSION_SECRET` | Generate strong secret | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `MONGODB_URI` | Your Atlas connection | Must be on MongoDB Atlas |
| `STRIPE_SECRET_KEY` | sk_live_... | Use live keys for production |
| `STRIPE_WEBHOOK_SECRET` | whsec_... | Get from Stripe webhook settings |
| `EMAIL_HOST` | smtp.zoho.com.au | For Zoho SMTP |
| `EMAIL_USER` | your-email@domain.com | Your Zoho email |
| `EMAIL_PASS` | your-app-password | Generate app-specific password in Zoho |

**Quick Add Multiple Variables:**

You can paste all at once in the format:
```
NODE_ENV=production
CLIENT_URL=https://your-project.vercel.app
SESSION_SECRET=your-secret-key
...
```

### 4.3 Deploy Changes

After adding all variables:
1. Click **"Save"**
2. Vercel will automatically redeploy with the new variables

---

## 🔄 Step 5: Update Stripe Webhook

### 5.1 Configure Webhook Endpoint

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Set **Endpoint URL** to:
   ```
   https://your-project.vercel.app/api/webhooks/stripe
   ```
4. Select **Events to send:**
   - ✅ checkout.session.completed
   - ✅ payment_intent.succeeded
   - ✅ charge.failed

5. Copy the **Signing Secret** (whsec_...)
6. Add it to Vercel as `STRIPE_WEBHOOK_SECRET`

### 5.2 Test Webhook (Optional)

In Stripe Dashboard:
1. Click webhook endpoint you just created
2. Click **"Send test webhook"**
3. Check Vercel logs for successful processing

---

## 🌍 Step 6: Update URLs & Redirects

### 6.1 Update Stripe Success/Cancel URLs

In Vercel Environment Variables:
```
STRIPE_SUCCESS_URL=https://your-project.vercel.app/thank-you.html?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=https://your-project.vercel.app/booking.html?status=cancelled
```

### 6.2 Update Zoho OAuth Redirect URI

In Zoho Accounts Settings:
```
https://your-project.vercel.app/api/zoho/callback
```

### 6.3 Update Cookie Domain

In Vercel Environment Variables:
```
COOKIE_DOMAIN=.vercel.app
```

---

## ✅ Step 7: Verify Deployment

### 7.1 Test Your Site

Visit: `https://your-project.vercel.app`

**Check these pages:**
- ✅ **Homepage** → `/` (loads correctly)
- ✅ **Booking Page** → `/booking.html` (responsive, calendar works)
- ✅ **Admin Panel** → `/admin.html` (login accessible)
- ✅ **About Page** → `/about.html` (displays content)

### 7.2 Test API Endpoints

**Health Check:**
```bash
curl https://your-project.vercel.app/api/admin/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-27T..."
}
```

**Get Packages:**
```bash
curl https://your-project.vercel.app/api/packages
```

Expected response:
```json
{
  "packages": [
    {
      "id": "santa-gift-pack",
      "name": "Santa's Gift Pack",
      "available": true,
      "formattedPrice": "$150.00"
    }
    ...
  ]
}
```

### 7.3 Test Booking Flow

1. Click "Book Now"
2. Select date from calendar
3. Choose time slot
4. Select package
5. Enter details
6. Click "Confirm Booking"
7. Should redirect to Stripe checkout

### 7.4 Admin Login

1. Go to `/admin.html`
2. Login with credentials from `.env`:
   - Username: `ADMIN_USERNAME`
   - Password: `ADMIN_PASSWORD`

---

## 🛠️ Step 8: Monitor & Maintain

### 8.1 View Logs

In Vercel Dashboard:
1. Go to your project
2. Click **"Deployments"**
3. Select latest deployment
4. Click **"Functions"** tab to see API logs
5. Click **"Runtime logs"** to see real-time logs

### 8.2 Monitor Performance

Check:
- **Response Times** → Should be <500ms
- **Database Connections** → Should see successful MongoDB connections
- **Error Rates** → Should be 0%

### 8.3 Set Up Alerts (Optional)

In Vercel Dashboard → **Settings** → **Notifications**:
- ✅ Enable deployment notifications
- ✅ Enable error notifications

---

## 🚨 Troubleshooting

### Issue: MongoDB Connection Failed

**Problem:** `Error: connect ECONNREFUSED`

**Solutions:**
1. Check MongoDB URI format (must include password)
2. Verify database name exists in MongoDB Atlas
3. Whitelist Vercel IP addresses:
   - Go to MongoDB Atlas → Network Access
   - Add IP `0.0.0.0/0` (or specific Vercel IPs)

### Issue: Stripe Checkout Not Working

**Problem:** "Cannot find price" error

**Solutions:**
1. Verify all `STRIPE_PRICE_*` variables are set
2. Check prices exist in Stripe account (must be in same account as secret key)
3. Ensure `STRIPE_SECRET_KEY` uses **live** keys (starts with `sk_live_`)

### Issue: Email Not Sending

**Problem:** "Authentication failed" or "SMTP error"

**Solutions:**
1. Verify EMAIL_USER and EMAIL_PASS are correct
2. If using Zoho, generate **app password** (not account password)
3. Ensure EMAIL_HOST is `smtp.zoho.com.au` (not `.com`)
4. Check EMAIL_PORT is `465`

### Issue: 502 Bad Gateway

**Problem:** Deploying returns 502 error

**Solutions:**
1. Check build logs: `npm run build:frontend`
2. Verify all imports in API files are correct
3. Check MongoDB connection timeout (increase to 10s)
4. Redeploy: Go to Deployments → Click latest → Redeploy

### Issue: CORS Errors

**Problem:** Requests blocked from frontend

**Solutions:**
1. Update `CLIENT_URL` in environment variables
2. Verify CORS middleware in `api/index.js`:
   ```javascript
   origin: process.env.CLIENT_URL
   ```
3. Clear browser cache (Ctrl+Shift+Delete)

---

## 📊 Performance Tips

### Optimize Cold Starts
- Keep dependencies minimal
- Use serverless-optimized packages
- Increase function timeout if needed

### Database Optimization
- Create indexes on frequently queried fields
- Use connection pooling (MongoDB Atlas)
- Cache package prices in memory

### Frontend Optimization
- Already using CSS media queries ✅
- Minimize bundle size
- Enable gzip compression ✅

---

## 🔄 Continuous Deployment

### Auto-Deploy on Push

Vercel automatically deploys when you push to GitHub:

1. Make changes locally
2. Commit: `git commit -am "Update booking page"`
3. Push: `git push origin main`
4. Vercel deploys automatically (2-3 minutes)
5. Check deployment status on Vercel dashboard

### Rollback Previous Deployment

If something breaks:
1. Go to **Deployments** on Vercel
2. Find working previous deployment
3. Click **"Promote to Production"**

---

## 📱 Testing on Devices

After deployment, test on:

- ✅ Desktop (1920x1080)
- ✅ Tablet (768x1024)
- ✅ Mobile (375x667)
- ✅ Small mobile (360x640)

Use browser DevTools (F12) → Device Emulation to test

---

## 💳 Production Checklist

Before going live:

- [ ] All environment variables set in Vercel
- [ ] Stripe using **live** keys (not test keys)
- [ ] MongoDB Atlas whitelist configured
- [ ] Stripe webhook endpoint configured
- [ ] All URLs updated (success_url, cancel_url, etc.)
- [ ] Email service tested
- [ ] Admin login works
- [ ] Booking flow works end-to-end
- [ ] Mobile responsive verified
- [ ] Performance acceptable (<500ms)
- [ ] Error logs reviewed
- [ ] Backup of database configured
- [ ] Domain name configured (optional)

---

## 🎯 Next Steps

### Add Custom Domain (Optional)

1. Vercel Dashboard → Project Settings → Domains
2. Add your custom domain
3. Update Vercel nameservers in domain registrar
4. Wait 24-48 hours for propagation

### Set Up Email Domain (Optional)

1. Configure email provider for your domain
2. Update `EMAIL_FROM` to use your domain
3. Test sending emails

### Enable Advanced Monitoring (Optional)

1. Set up Sentry for error tracking
2. Configure NewRelic for performance monitoring
3. Set up automated backups for MongoDB

---

## 📞 Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **MongoDB Atlas:** https://docs.atlas.mongodb.com
- **Stripe Webhooks:** https://stripe.com/docs/webhooks
- **Express.js:** https://expressjs.com

---

## ✨ Success!

Your Photography Booking system is now live on Vercel! 🎉

**Your site is available at:**
```
https://your-project.vercel.app
```

**Key Endpoints:**
- Booking Page: `/booking.html`
- Admin Panel: `/admin.html`
- API Health: `/api/admin/health`
- Packages: `/api/packages`

**Deployment Time:** Typically 2-3 minutes from push to production.

---

*Last Updated: October 27, 2025*  
*Vercel Deployment Guide v1.0*
