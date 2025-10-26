# ✅ GitHub & Vercel Setup Checklist

## Before You Start
- [ ] Install Git: https://git-scm.com/download/win
- [ ] Create GitHub account: https://github.com/join
- [ ] Create Vercel account: https://vercel.com (use GitHub login)
- [ ] Have your environment variables ready

---

## Phase 1: Git Setup (5 minutes)

### Step 1: Open PowerShell
```powershell
# Go to project directory
cd "c:\Users\amy\Downloads\PhotographyBooking-main\PhotographyBooking-main"
```

### Step 2: Initialize Git
```powershell
git init
git add .
git commit -m "Initial commit - Photography Booking System ready for Vercel"
```

**✅ Check:** Should see message like "X files changed, X insertions..."

---

## Phase 2: GitHub Setup (5 minutes)

### Step 1: Create Repository
1. Go to: https://github.com/new
2. Fill in:
   - Repository name: `photography-booking`
   - Description: "Photography booking system with Stripe"
   - Choose: Public or Private
3. Click **Create repository**

### Step 2: GitHub Shows You Commands
GitHub will display commands like:
```powershell
git remote add origin https://github.com/YOUR_USERNAME/photography-booking.git
git branch -M main
git push -u origin main
```

### Step 3: Copy & Run Those Commands
```powershell
# Copy from GitHub and paste into PowerShell
git remote add origin https://github.com/YOUR_USERNAME/photography-booking.git
git branch -M main
git push -u origin main
```

**✅ Check:** Refresh GitHub page, see your files

---

## Phase 3: Vercel Setup (10 minutes)

### Step 1: Go to Vercel
1. Visit: https://vercel.com
2. Click **Sign In** → **Continue with GitHub**
3. Click **Authorize Vercel**

### Step 2: Create New Project
1. Click **Add New Project**
2. Click **Import Git Repository**
3. Search for: `photography-booking`
4. Select your repository
5. Click **Import**

**⏳ Wait:** Vercel imports (may show build error - OK!)

### Step 3: Configure Settings
Vercel should auto-detect:
- Framework: Express.js ✓
- Build Command: `npm run build:frontend` ✓
- Output Directory: `dist` ✓

**Don't click Deploy!** Continue to environment variables.

---

## Phase 4: Environment Variables (10 minutes)

### Step 1: Go to Settings
1. Click **Settings** (in top menu or left sidebar)
2. Click **Environment Variables** in left menu

### Step 2: Add Variables
Copy these and fill in YOUR values:

```
NODE_ENV = production
CLIENT_URL = https://your-project-name.vercel.app
SESSION_SECRET = [generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]
ADMIN_USERNAME = admin
ADMIN_PASSWORD = your-secure-password
MONGODB_URI = mongodb+srv://user:password@cluster.mongodb.net/database
EMAIL_HOST = smtp.zoho.com.au
EMAIL_PORT = 465
EMAIL_SECURE = true
EMAIL_USER = your-email@domain.com
EMAIL_PASS = your-app-password
STRIPE_SECRET_KEY = sk_live_YOUR_KEY
STRIPE_WEBHOOK_SECRET = whsec_YOUR_KEY
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

### Step 3: Save
1. After adding all variables, click **Save**
2. Vercel auto-redeploys

**✅ Check:** Wait for green checkmark in Deployments

---

## Phase 5: Test Deployment (5 minutes)

### Visit Your Site
Visit: `https://your-project-name.vercel.app`

### Test These:
- [ ] Homepage loads
- [ ] Booking page shows calendar
- [ ] Admin page accessible (/admin.html)
- [ ] Mobile responsive (press F12)

### Test API
Visit: `https://your-project-name.vercel.app/api/admin/health`

Should return: `{"status":"healthy"...}`

---

## Phase 6: Stripe Webhook (5 minutes) - DO THIS NEXT

### Step 1: Stripe Dashboard
1. Go to: https://dashboard.stripe.com
2. Click **Developers** → **Webhooks**
3. Click **Add an endpoint**

### Step 2: Configure Webhook
- **Endpoint URL**: `https://your-project-name.vercel.app/api/webhooks/stripe`
- **Events**: Select these 3:
  - ✓ checkout.session.completed
  - ✓ payment_intent.succeeded
  - ✓ charge.failed

### Step 3: Copy Signing Secret
1. After creating endpoint, copy the **Signing secret** (starts with `whsec_`)
2. Go back to Vercel
3. Update environment variable: `STRIPE_WEBHOOK_SECRET`
4. Redeploy

---

## Summary Checklist

```
GITHUB & VERCEL DEPLOYMENT CHECKLIST

Phase 1: Git
  [ ] Git installed
  [ ] Ran: git init
  [ ] Ran: git add .
  [ ] Ran: git commit

Phase 2: GitHub
  [ ] Created GitHub repository
  [ ] Ran: git remote add origin
  [ ] Ran: git branch -M main
  [ ] Ran: git push -u origin main
  [ ] Files visible on GitHub

Phase 3: Vercel
  [ ] Connected Vercel to GitHub
  [ ] Imported repository
  [ ] Settings auto-detected

Phase 4: Environment Variables
  [ ] Added NODE_ENV
  [ ] Added CLIENT_URL
  [ ] Added SESSION_SECRET
  [ ] Added ADMIN credentials
  [ ] Added MONGODB_URI
  [ ] Added EMAIL settings
  [ ] Added STRIPE keys (LIVE!)
  [ ] Added all STRIPE_PRICE_* variables
  [ ] Added ZOHO settings
  [ ] Clicked Save
  [ ] Redeploy triggered

Phase 5: Testing
  [ ] Visit Vercel URL - site loads
  [ ] Booking page works
  [ ] Admin page accessible
  [ ] Mobile looks good
  [ ] API health check works

Phase 6: Stripe Webhook
  [ ] Created webhook endpoint
  [ ] Selected 3 events
  [ ] Copied signing secret
  [ ] Updated STRIPE_WEBHOOK_SECRET
  [ ] Redeployed

✅ YOU'RE LIVE! 🎉
```

---

## 🎯 Timeline

| Step | Task | Time |
|------|------|------|
| 1 | Git setup | 5 min |
| 2 | GitHub setup | 5 min |
| 3 | Vercel import | 5 min |
| 4 | Add env vars | 10 min |
| 5 | Deploy & test | 5 min |
| 6 | Stripe webhook | 5 min |
| **TOTAL** | **Live Site** | **35 min** |

---

## 📞 Help

- **Git help:** https://docs.github.com/en/get-started
- **GitHub help:** https://docs.github.com
- **Vercel help:** https://vercel.com/docs
- **Stripe help:** https://stripe.com/docs

---

**Ready? Start with Phase 1! 🚀**
