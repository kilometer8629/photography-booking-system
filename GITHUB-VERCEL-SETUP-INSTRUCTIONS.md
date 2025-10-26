# 📝 Complete GitHub & Vercel Setup Instructions

## Step 1: Initialize Git Repository (First Time Only)

### On Your Local Machine (PowerShell)

```powershell
# Navigate to your project directory
cd "c:\Users\amy\Downloads\PhotographyBooking-main\PhotographyBooking-main"

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - Photography Booking System ready for Vercel"
```

---

## Step 2: Create GitHub Repository

### On GitHub.com

1. **Go to GitHub**: https://github.com/new
2. **Create Repository**:
   - Repository name: `photography-booking` (or your preferred name)
   - Description: "Photography Booking System with Stripe Integration"
   - Select: **Public** or **Private** (your choice)
   - Do NOT initialize with README (you already have one)
   - Click **"Create repository"**

3. **GitHub will show you commands** (look for the section "...or push an existing repository from the command line")

---

## Step 3: Connect Local Repository to GitHub

### Copy these commands from GitHub and run them:

```powershell
# Add remote origin (GitHub will show the exact URL)
git remote add origin https://github.com/YOUR_USERNAME/photography-booking.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**Replace:**
- `YOUR_USERNAME` with your actual GitHub username
- `photography-booking` with your repository name

---

## Step 4: Verify on GitHub

1. Refresh your GitHub repository page
2. You should see all your files
3. Confirm `vercel.json`, `api/index.js`, and `.env.production` are visible

---

## Step 5: Connect Vercel to GitHub

### On Vercel.com

1. **Go to Vercel**: https://vercel.com
2. **Sign In**: Click "Sign In" → Choose "Continue with GitHub"
3. **Authorize**: Click "Authorize Vercel" (grants access to your repositories)
4. **Create New Project**:
   - Click **"Add New Project"**
   - Select **"Import Git Repository"**
   - Search for your repository: `photography-booking`
   - Click on it to select

### Configure Project Settings

**Vercel should auto-detect these:**
- **Framework Preset**: Express.js ✓
- **Build Command**: `npm run build:frontend` ✓
- **Output Directory**: `dist` ✓
- **Root Directory**: `.` ✓

**Don't click Deploy yet!** Let it finish importing first (it may show a build error - that's OK, we'll add env vars next).

---

## Step 6: Add Environment Variables to Vercel

### On Vercel Dashboard

1. **After import completes**, click **"Settings"** (or go to project settings)
2. Click **"Environment Variables"** in left menu
3. **Add each variable individually**:

```
For production environment:

NODE_ENV = production
CLIENT_URL = https://your-project-name.vercel.app
SESSION_SECRET = (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ADMIN_USERNAME = admin
ADMIN_PASSWORD = your-secure-password
MONGODB_URI = mongodb+srv://user:password@cluster.mongodb.net/database
EMAIL_HOST = smtp.zoho.com.au
EMAIL_PORT = 465
EMAIL_SECURE = true
EMAIL_USER = your-email@domain.com
EMAIL_PASS = your-app-password
STRIPE_SECRET_KEY = sk_live_... (LIVE key only!)
STRIPE_WEBHOOK_SECRET = whsec_...
STRIPE_SUCCESS_URL = https://your-project-name.vercel.app/thank-you.html?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL = https://your-project-name.vercel.app/booking.html?status=cancelled
STRIPE_PRICE_SANTAS_GIFT_PACK = price_1SMR8RAY4Cs3JypYKT6JUY8O
STRIPE_PRICE_RUDOLPH = price_1SMR9SAY4Cs3JypYbcqhL4CG
STRIPE_PRICE_BLITZEN = price_1SMRACAY4Cs3JypYjRdbgNmC
STRIPE_PRICE_DIGITAL_PACKAGE = price_1SMRAwAY4Cs3JypYsUlEZSZs
STRIPE_PRICE_VIXEN = price_1SMRBXAY4Cs3JypY1wHoDU79
ZOHO_OAUTH_ACCESS_TOKEN = 1000.your_token
ZOHO_OAUTH_CLIENT_ID = 1000.your_id
ZOHO_OAUTH_CLIENT_SECRET = your_secret
ZOHO_CALENDAR_ID = your_calendar_id
COOKIE_DOMAIN = .vercel.app
```

4. **After adding all variables**, click **"Save"**
5. Vercel will automatically **redeploy** with new environment variables

---

## Step 7: Monitor Deployment

### On Vercel Dashboard

1. Click **"Deployments"** tab
2. Wait for new deployment to complete (should show green checkmark ✓)
3. Click **"Visit"** button to see your live site

**If deployment fails:**
- Click the failed deployment
- Click **"View Logs"**
- Look for error messages
- Common issues: missing env vars, wrong MongoDB URI, wrong Stripe keys

---

## Step 8: Configure After Deployment

### Stripe Webhook Setup

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com
2. Click **"Developers"** → **"Webhooks"**
3. Click **"Add an endpoint"**
4. **Endpoint URL**: `https://your-project-name.vercel.app/api/webhooks/stripe`
5. **Select events**:
   - ✓ checkout.session.completed
   - ✓ payment_intent.succeeded
   - ✓ charge.failed
6. Click **"Add endpoint"**
7. Copy the **Signing secret** (starts with `whsec_`)
8. Go back to Vercel → Environment Variables
9. Update `STRIPE_WEBHOOK_SECRET` with this new value
10. Redeploy from Vercel dashboard

---

## Step 9: Test Your Live Site

### Verify Everything Works

Visit: `https://your-project-name.vercel.app`

Check:
- ✓ Homepage loads
- ✓ Booking page shows (click "Book Now")
- ✓ Calendar displays with dates
- ✓ Admin page accessible (/admin.html)
- ✓ Mobile responsive (F12 Device Emulation)

### Test API

```
https://your-project-name.vercel.app/api/admin/health
```

Should return:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-27T..."
}
```

---

## Quick Reference: Commands to Run

### First Time Setup
```powershell
# In your project directory
cd "c:\Users\amy\Downloads\PhotographyBooking-main\PhotographyBooking-main"

# Initialize git
git init
git add .
git commit -m "Initial commit - ready for Vercel"

# Add GitHub remote (from your GitHub repo page)
git remote add origin https://github.com/YOUR_USERNAME/photography-booking.git
git branch -M main
git push -u origin main
```

### Future Updates
```powershell
# When you make changes
git add .
git commit -m "Your message here"
git push origin main

# Vercel automatically deploys!
```

---

## Troubleshooting

### Git Command Not Found
- Install Git for Windows: https://git-scm.com/download/win
- Restart PowerShell after installation

### Can't Connect to GitHub
- Check internet connection
- Verify GitHub username and token
- Try using GitHub Desktop: https://desktop.github.com

### Vercel Build Fails
- Check environment variables are set
- Verify all required vars have values
- Check for typos in variable names
- Look at build logs for specific errors

### MongoDB Connection Fails
- Verify connection string format
- Whitelist Vercel IP: MongoDB Atlas → Network Access → 0.0.0.0/0

### Stripe Errors
- Verify using LIVE keys (sk_live_), not test keys (sk_test_)
- Confirm webhook endpoint is accessible
- Check webhook secret is correct

---

## Summary

1. ✅ Initialize Git: `git init` + `git add .` + `git commit`
2. ✅ Create GitHub Repository at github.com/new
3. ✅ Push to GitHub: `git push -u origin main`
4. ✅ Import to Vercel: vercel.com → "Add New Project"
5. ✅ Add Environment Variables in Vercel Settings
6. ✅ Redeploy and Wait for Green Checkmark
7. ✅ Configure Stripe Webhook
8. ✅ Test Your Live Site

**Total Time: 20-30 minutes**

---

*Instructions: October 27, 2025*  
*Status: Ready to Follow*
